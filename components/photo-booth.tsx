"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowIcon, BrandMark, CameraIcon, CheckIcon, CopyIcon, SparkIcon } from "./brand-mark";
import QRCodeImage from "./qr-code";
import type { PortraitJobStatus, PublicPortraitJob } from "@/lib/portrait-job";
import { getTheme, themes, type ThemeId } from "@/lib/themes";

type BoothStep = "welcome" | "choose" | "consent" | "camera" | "review" | "processing";
type CameraState = "idle" | "starting" | "ready" | "blocked";

const statusCopy: Record<PortraitJobStatus, { title: string; detail: string }> = {
  queued: {
    title: "Your portrait is in the queue.",
    detail: "Your collection link is ready now. The portrait will appear there automatically.",
  },
  generating: {
    title: "Creating your portrait…",
    detail: "Rendering your main character arc. You can take the link with you while this continues.",
  },
  processing: {
    title: "Adding the finishing touches…",
    detail: "We’re preparing the final image for mobile download.",
  },
  completed: {
    title: "Your alter ego is ready.",
    detail: "Open the private link on your phone to download your portrait.",
  },
  failed: {
    title: "This portrait needs another try.",
    detail: "Your original photo is still available in this session, so you can retry safely.",
  },
};

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function PhotoBooth() {
  const [step, setStep] = useState<BoothStep>("welcome");
  const [themeId, setThemeId] = useState<ThemeId>("liwa-drift");
  const [consented, setConsented] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraMessage, setCameraMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDevice, setActiveDevice] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureCue, setCaptureCue] = useState(false);
  const [portrait, setPortrait] = useState("");
  const [job, setJob] = useState<PublicPortraitJob | null>(null);
  const [origin, setOrigin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generationBlocked, setGenerationBlocked] = useState(false);
  const [handoffConfirmed, setHandoffConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailReview, setEmailReview] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [resetSeconds, setResetSeconds] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const playgroundRef = useRef<HTMLButtonElement>(null);
  const submissionKey = useRef(crypto.randomUUID());

  const theme = getTheme(themeId);
  const ready = job?.status === "completed" && Boolean(job.resultUrl);
  const managementFragment = job?.managementToken ? `#manage=${job.managementToken}` : "";
  const portraitUrl = job && origin ? `${origin}/p/${job.token}${managementFragment}` : "";
  const themeStyle = {
    "--theme-accent": theme.accent,
    "--theme-glow": theme.glow,
    "--theme-backdrop": theme.backdrop,
  } as React.CSSProperties;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const resetBooth = useCallback(() => {
    stopCamera();
    setStep("welcome");
    setThemeId("liwa-drift");
    setConsented(false);
    setCameraState("idle");
    setCameraMessage("");
    setDevices([]);
    setActiveDevice("");
    setCountdown(null);
    setPortrait("");
    setJob(null);
    setSubmitting(false);
    setGenerationBlocked(false);
    setHandoffConfirmed(false);
    setCopied(false);
    setEmail("");
    setEmailError("");
    setEmailReview(false);
    setEmailSaved(false);
    setResetSeconds(null);
    submissionKey.current = crypto.randomUUID();
    window.history.replaceState(null, "", "/");
  }, [stopCamera]);

  useEffect(() => {
    setOrigin(window.location.origin);
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    titleRef.current?.focus();
    if (step !== "camera") stopCamera();
  }, [step, stopCamera]);

  useEffect(() => {
    if (step !== "processing" || !job || job.status === "completed" || job.status === "failed") return;
    const load = async () => {
      const response = await fetch(`/api/jobs?token=${encodeURIComponent(job.token)}`, { cache: "no-store" });
      if (response.ok) setJob((await response.json()) as PublicPortraitJob);
    };
    const timer = window.setInterval(() => void load(), 1400);
    return () => window.clearInterval(timer);
  }, [job, step]);

  useEffect(() => {
    if (step === "welcome" || cameraState === "starting" || resetSeconds !== null) return;
    let idleTimer = window.setTimeout(() => setResetSeconds(15), 90_000);
    const restart = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setResetSeconds(15), 90_000);
    };
    window.addEventListener("pointerdown", restart);
    window.addEventListener("keydown", restart);
    window.addEventListener("touchstart", restart);
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("pointerdown", restart);
      window.removeEventListener("keydown", restart);
      window.removeEventListener("touchstart", restart);
    };
  }, [cameraState, resetSeconds, step]);

  useEffect(() => {
    if (resetSeconds === null) return;
    if (resetSeconds <= 0) {
      resetBooth();
      return;
    }
    const timer = window.setTimeout(() => setResetSeconds((value) => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resetBooth, resetSeconds]);

  async function openCamera(deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("blocked");
      setCameraMessage("We couldn’t open the camera. Choose a photo or ask a volunteer for help.");
      return;
    }
    stopCamera();
    setCameraState("starting");
    setCameraMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1200 }, height: { ideal: 1200 } }
          : { facingMode: "user", width: { ideal: 1200 }, height: { ideal: 1200 } },
      });
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      setActiveDevice(videoTrack.getSettings().deviceId ?? deviceId ?? "");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices.filter((device) => device.kind === "videoinput"));
      setCameraState("ready");
    } catch {
      setCameraState("blocked");
      setCameraMessage("Camera access is off. Allow access in your browser, choose a photo, or ask a volunteer.");
    }
  }

  function takeSnapshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraMessage("The camera is still getting ready. Try again in a moment.");
      return;
    }
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) return;
    const sourceX = (video.videoWidth - size) / 2;
    const sourceY = (video.videoHeight - size) / 2;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height);
    setPortrait(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStep("review");
  }

  async function runCountdown() {
    if (cameraState !== "ready" || countdown !== null) return;
    setCameraMessage("");
    for (let number = 3; number >= 1; number -= 1) {
      setCountdown(number);
      await wait(800);
    }
    setCountdown(null);
    setCaptureCue(true);
    await wait(120);
    takeSnapshot();
    setCaptureCue(false);
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCameraMessage("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCameraMessage("Choose a photo under 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      stopCamera();
      setPortrait(reader.result);
      setStep("review");
    };
    reader.onerror = () => setCameraMessage("We couldn’t read that photo. Choose a different image.");
    reader.readAsDataURL(file);
  }

  function continueFromTheme() {
    if (portrait) setStep("review");
    else if (consented) setStep("camera");
    else setStep("consent");
  }

  function movePlayground(event: ReactPointerEvent<HTMLButtonElement>) {
    const node = playgroundRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    node.style.setProperty("--play-x", `${horizontal * 18}deg`);
    node.style.setProperty("--play-y", `${vertical * -14}deg`);
    node.style.setProperty("--shine-x", `${(horizontal + 0.5) * 100}%`);
    node.style.setProperty("--shine-y", `${(vertical + 0.5) * 100}%`);
  }

  function resetPlayground() {
    const node = playgroundRef.current;
    if (!node) return;
    node.style.setProperty("--play-x", "0deg");
    node.style.setProperty("--play-y", "0deg");
    node.style.setProperty("--shine-x", "50%");
    node.style.setProperty("--shine-y", "45%");
  }

  function remixTheme() {
    const currentIndex = themes.findIndex((item) => item.id === themeId);
    setThemeId(themes[(currentIndex + 1) % themes.length].id);
  }

  function retake() {
    stopCamera();
    setPortrait("");
    setCameraState("idle");
    setCameraMessage("");
    setStep("camera");
  }

  async function createPortrait() {
    if (!portrait || submitting) return;
    setSubmitting(true);
    setCameraMessage("");
    try {
      const photo = await fetch(portrait).then((response) => response.blob());
      const formData = new FormData();
      formData.set("theme", themeId);
      formData.set("submissionKey", submissionKey.current);
      formData.set("photo", photo, `portrait.${photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg"}`);
      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as Partial<PublicPortraitJob> & { error?: string };
      if (!response.ok) {
        if (body.retryable === false) setGenerationBlocked(true);
        throw new Error(body.error || "Your photo couldn’t upload. Please try again.");
      }
      setJob(body as PublicPortraitJob);
      setStep("processing");
    } catch (error) {
      setCameraMessage(error instanceof Error ? error.message : "Your photo couldn’t upload. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPortrait() {
    if (job?.managementToken) {
      await fetch(`/api/jobs?token=${encodeURIComponent(job.token)}`, {
        method: "DELETE",
        headers: { "x-management-token": job.managementToken },
      }).catch(() => undefined);
    }
    submissionKey.current = crypto.randomUUID();
    setJob(null);
    setCameraMessage("");
    setStep("review");
  }

  async function discardFailedPortrait() {
    if (job?.managementToken) {
      await fetch(`/api/jobs?token=${encodeURIComponent(job.token)}`, {
        method: "DELETE",
        headers: { "x-management-token": job.managementToken },
      }).catch(() => undefined);
    }
    resetBooth();
  }

  async function copyLink() {
    if (!portraitUrl) return;
    await navigator.clipboard.writeText(portraitUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function reviewEmail() {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailError("Enter a complete email address, such as name@example.com.");
      return;
    }
    setEmail(trimmed);
    setEmailError("");
    setEmailReview(true);
  }

  function confirmEmail() {
    setEmailSaved(true);
    setEmailReview(false);
    setHandoffConfirmed(true);
  }

  function goBack() {
    if (step === "choose") setStep("welcome");
    if (step === "consent") setStep("choose");
    if (step === "camera") setStep("consent");
    if (step === "review") setStep("camera");
  }

  const header = (label: string, back = false) => (
    <header className="booth-header">
      <button className="brand-button" type="button" onClick={resetBooth} aria-label="Return to welcome"><BrandMark /></button>
      <div className="header-actions">
        {back && <button className="quiet-button" type="button" onClick={goBack}>Back</button>}
        <span className="demo-badge"><i /> {label}</span>
      </div>
    </header>
  );

  const cameraStage = (review = false) => (
    <div className={`camera-stage ${captureCue ? "is-capturing" : ""}`}>
      {review ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="camera-media" src={portrait} alt="Your captured photo" />
      ) : (
        <video className="camera-media camera-video" ref={videoRef} muted playsInline aria-label="Live camera preview" />
      )}
      {!review && cameraState !== "ready" && (
        <div className="camera-placeholder">
          <span className="camera-placeholder-icon"><CameraIcon /></span>
          <strong>{cameraState === "starting" ? "Opening camera…" : "Camera is off"}</strong>
          <p>Your camera starts only after you choose Open camera.</p>
        </div>
      )}
      <div className="face-guide" aria-hidden="true"><span className="eye-line" /></div>
      {countdown !== null && <div className="countdown" aria-live="assertive">{countdown}</div>}
      <div className="stage-label"><span style={{ background: theme.accent }} /> {review ? "Photo review" : theme.name}</div>
    </div>
  );

  if (step === "welcome") {
    return (
      <main className={`booth-shell landing-shell theme-${theme.id}`} style={themeStyle}>
        <header className="landing-header">
          <button className="brand-button" type="button" onClick={resetBooth} aria-label="Return to welcome"><BrandMark /></button>
          <div className="landing-live"><i /> <span>Live experience</span><strong>KU AI Club</strong></div>
        </header>

        <section className="landing-hero">
          <div className="landing-copy">
            <p className="landing-intro">Born in the UAE. Powered by your face.</p>
            <h1 ref={titleRef} tabIndex={-1}>Your other self is already here.</h1>
            <p className="landing-deck">Move the world. Pick a local signal. Step through with one photo.</p>
            <div className="landing-actions">
              <button className="landing-cta" type="button" onClick={() => setStep("consent")}>
                Become {theme.name} <ArrowIcon />
              </button>
              <span>The camera stays off until you say go.</span>
            </div>
            <div className="landing-selected" aria-live="polite">
              <span style={{ background: theme.accent }} />
              <div><strong>{theme.shortName}</strong><p>{theme.description}</p></div>
            </div>
          </div>

          <button
            className="world-playground"
            type="button"
            ref={playgroundRef}
            onPointerMove={movePlayground}
            onPointerLeave={resetPlayground}
            onClick={remixTheme}
            aria-label={`Play with ${theme.name}. Click to switch to the next world.`}
          >
            <span className="world-halo world-halo--outer" aria-hidden="true" />
            <span className="world-halo world-halo--inner" aria-hidden="true" />
            <span className="world-coordinate world-coordinate--one" aria-hidden="true">24.4° N</span>
            <span className="world-coordinate world-coordinate--two" aria-hidden="true">54.4° E</span>
            <span className="world-stack" aria-hidden="true">
              <span className="world-slab world-slab--back" />
              <span className="world-slab world-slab--middle" />
              <span className="world-portrait">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={theme.id} src={theme.image} alt="" />
                <span className="world-shine" />
              </span>
              <span className="world-chip"><i /> {theme.name}</span>
            </span>
            <span className="world-play-hint">Move me. Click to remix.</span>
          </button>
        </section>

        <section className="theme-dock" aria-labelledby="theme-dock-title">
          <div className="theme-dock-heading">
            <strong id="theme-dock-title">Six local signals.</strong>
            <span>Pick your frequency.</span>
          </div>
          <div className="theme-reel" role="radiogroup" aria-label="Choose an alter ego theme">
            {themes.map((item) => {
              const selected = item.id === themeId;
              return (
                <button
                  className={`theme-reel-item ${selected ? "is-selected" : ""}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={item.id}
                  onClick={() => setThemeId(item.id)}
                  style={{ "--reel-accent": item.accent } as React.CSSProperties}
                >
                  <span className="theme-reel-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" />
                  </span>
                  <span><strong>{item.name}</strong><small>{item.shortName}</small></span>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="landing-footer"><span>KU Alter Ego</span><span>Made for play. Private by default.</span></footer>
      </main>
    );
  }

  if (step === "choose") {
    return (
      <main className={`booth-shell theme-${theme.id}`} style={themeStyle}>
        {header("Step 1 of 5", true)}
        <section className="screen-stack theme-screen">
          <div className="screen-heading">
            <p>Choose a style</p>
            <h1 ref={titleRef} tabIndex={-1}>Where does your alter ego belong?</h1>
            <span>You can change the theme again before generation.</span>
          </div>
          <div className="theme-grid" role="radiogroup" aria-label="Choose a portrait universe">
            {themes.map((item) => {
              const selected = item.id === themeId;
              return (
                <button className={`theme-card ${selected ? "is-selected" : ""}`} type="button" role="radio" aria-checked={selected} key={item.id} onClick={() => setThemeId(item.id)} style={{ "--theme-accent": item.accent } as React.CSSProperties}>
                  <span className="theme-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={`${item.name} example portrait`} />
                    <span className="example-label">Example</span>
                  </span>
                  <span className="theme-card-body">
                    <span className="theme-card-title"><strong>{item.name}</strong>{selected && <em><CheckIcon /> Selected</em>}</span>
                    <span>{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button className="primary-button screen-action" type="button" onClick={continueFromTheme}>Use this theme <ArrowIcon /></button>
        </section>
      </main>
    );
  }

  if (step === "consent") {
    return (
      <main className={`booth-shell theme-${theme.id}`} style={themeStyle}>
        {header("Step 2 of 5", true)}
        <section className="two-column-screen consent-screen">
          <div className="selected-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.image} alt={`${theme.name} example portrait`} />
            <div><span>Selected universe</span><strong>{theme.name}</strong></div>
          </div>
          <div className="instruction-panel">
            <p className="section-kicker">Before the camera opens</p>
            <h1 ref={titleRef} tabIndex={-1}>Your photo is used only for this portrait.</h1>
            <p>Your photo is uploaded to this local server, then sent securely to Gemini to create the theme you selected.</p>
            <details className="privacy-details">
              <summary>Read the photo privacy notice</summary>
              <div><p>The local server privately stores the source photo, generated portrait, selected theme, and random access tokens for up to seven days.</p><p>Choosing Delete my portrait removes the local files immediately. Gemini processing remains subject to the data terms configured for the connected Google account.</p></div>
            </details>
            <label className="consent-check">
              <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
              <span><CheckIcon /></span>
              <strong>I agree to upload my photo and use Gemini to generate this portrait.</strong>
            </label>
            <button className="primary-button" type="button" disabled={!consented} onClick={() => setStep("camera")}>Continue to camera <ArrowIcon /></button>
          </div>
        </section>
      </main>
    );
  }

  if (step === "camera") {
    return (
      <main className={`booth-shell theme-${theme.id}`} style={themeStyle}>
        {header("Step 3 of 5", true)}
        <section className="two-column-screen camera-screen">
          <div>{cameraStage()}</div>
          <div className="instruction-panel">
            <p className="section-kicker">Camera</p>
            <h1 ref={titleRef} tabIndex={-1}>Face the camera.</h1>
            <p>Keep your face inside the frame and leave a little room above your head. We’ll count down from three.</p>
            {cameraMessage && <p className="error-message" role="alert">{cameraMessage}</p>}
            {devices.length > 1 && cameraState === "ready" && (
              <label className="field-label"><span>Camera</span><select value={activeDevice} onChange={(event) => void openCamera(event.target.value)}>{devices.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>
            )}
            <div className="button-stack">
              {cameraState === "ready" ? (
                <button className="primary-button" type="button" onClick={() => void runCountdown()} disabled={countdown !== null}><CameraIcon /> {countdown === null ? "Take photo" : "Hold still"}</button>
              ) : (
                <button className="primary-button" type="button" onClick={() => void openCamera()} disabled={cameraState === "starting"}><CameraIcon /> {cameraState === "starting" ? "Opening camera…" : "Open camera"}</button>
              )}
              <label className="secondary-button file-button">Choose a photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={choosePhoto} /></label>
              {cameraState === "blocked" && <span className="help-note">A volunteer can help if the camera remains unavailable.</span>}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main className={`booth-shell theme-${theme.id}`} style={themeStyle}>
        {header("Step 4 of 5")}
        <section className="two-column-screen review-screen">
          <div>{cameraStage(true)}</div>
          <div className="instruction-panel">
            <p className="section-kicker">Review</p>
            <h1 ref={titleRef} tabIndex={-1}>Ready for {theme.name}?</h1>
            <p>This is the photo we’ll use. Check your framing before starting generation.</p>
            <button className="theme-change-button" type="button" onClick={() => setStep("choose")}><span style={{ background: theme.accent }} /> {theme.name} <em>Change theme</em></button>
            {cameraMessage && <p className="error-message" role="alert">{cameraMessage}</p>}
            <div className="review-actions"><button className="secondary-button" type="button" onClick={retake}>Retake</button><button className="primary-button" type="button" onClick={() => void createPortrait()} disabled={submitting || generationBlocked}><SparkIcon /> {submitting ? "Starting generation…" : generationBlocked ? "Organizer setup needed" : "Generate my portrait"}</button></div>
            <p className="help-note">Your photo will be stored privately on this server and sent to Gemini with the selected theme prompt.</p>
          </div>
        </section>
      </main>
    );
  }

  const collectionPanel = (
    <aside className="collection-panel">
      <p className="section-kicker">Scan to collect on your phone</p>
      <div className="qr-shell"><QRCodeImage value={portraitUrl} /></div>
      <button className="copy-button" type="button" onClick={() => void copyLink()}>{copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Private link copied" : "Copy private link"}</button>
      <div className="collection-divider" />
      {emailSaved ? (
        <div className="email-saved" role="status"><CheckIcon /><span><strong>Email request saved.</strong> This demo does not send email, but the confirmation flow is complete.</span></div>
      ) : emailReview ? (
        <div className="email-confirm"><p>Send your portrait link to <strong>{email}</strong>?</p><div><button className="text-button" type="button" onClick={() => setEmailReview(false)}>Edit address</button><button className="secondary-button" type="button" onClick={confirmEmail}>Send my portrait</button></div><small>Demo interaction only — no email will be sent.</small></div>
      ) : (
        <div className="email-form">
          <label className="field-label"><span>Email address (optional)</span><input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
          <p>We’ll send a link to this portrait.</p>
          {emailError && <span className="field-error" role="alert">{emailError}</span>}
          <button className="secondary-button" type="button" onClick={reviewEmail}>Continue</button>
        </div>
      )}
    </aside>
  );

  return (
    <main className={`booth-shell theme-${theme.id}`} style={themeStyle}>
      {header("Step 5 of 5")}
      {job && (
        <section className={`processing-layout ${ready ? "is-ready" : ""}`}>
          <div className="result-stage">
            {ready ? (
              <div className="portrait-result">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.resultUrl!} alt={`Your ${theme.name} AI portrait`} />
                <span>AI portrait · {theme.name}</span>
              </div>
            ) : (
              <div className="generation-visual" aria-hidden="true"><div className="generation-orbit generation-orbit--one" /><div className="generation-orbit generation-orbit--two" /><span style={{ background: theme.accent }}><SparkIcon /></span></div>
            )}
          </div>
          <div className="processing-content">
            <div className="processing-copy" aria-live="polite">
              <p className="status-label"><i data-status={job.status} /> {job.status}</p>
              <h1 ref={titleRef} tabIndex={-1}>{job.errorCode === "billing_required" ? "This booth needs an organizer." : statusCopy[job.status].title}</h1>
              <p>{statusCopy[job.status].detail}</p>
              {job.error && <p className="error-message" role="alert">{job.error}</p>}
              {!ready && job.status !== "failed" && <span className="no-countdown">No guessed countdown — this status comes from the generation job.</span>}
              <div className="processing-actions">
                {job.status === "failed" ? (
                  <>{job.retryable !== false && <button className="primary-button" type="button" onClick={() => void retryPortrait()}>Try again <ArrowIcon /></button>}<button className={job.retryable === false ? "primary-button" : "secondary-button"} type="button" onClick={() => void discardFailedPortrait()}>Next person</button></>
                ) : (
                  <><a className="primary-button" href={portraitUrl} target="_blank" rel="noreferrer" onClick={() => setHandoffConfirmed(true)}>Open portrait link <ArrowIcon /></a>{!handoffConfirmed && !emailSaved && <button className="text-button" type="button" onClick={() => setHandoffConfirmed(true)}>I’ve opened the link</button>}{(ready || handoffConfirmed || emailSaved) && <button className="secondary-button" type="button" onClick={resetBooth}>Next person</button>}</>
                )}
              </div>
              {!ready && job.status !== "failed" && (handoffConfirmed || emailSaved) && <p className="handoff-note"><CheckIcon /> Processing continues after the booth resets.</p>}
            </div>
            {job.status !== "failed" && collectionPanel}
          </div>
        </section>
      )}
      {resetSeconds !== null && (
        <div className="dialog-backdrop">
          <section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <p className="section-kicker">Session ending</p>
            <h2 id="reset-title">Still using the booth?</h2>
            <p>This session will clear in {resetSeconds} seconds to protect your photo and private link.</p>
            <div><button className="primary-button" type="button" onClick={() => setResetSeconds(null)}>Keep my session open</button><button className="text-button" type="button" onClick={resetBooth}>End session now</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
