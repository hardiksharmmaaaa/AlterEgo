"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowIcon, BrandMark, CameraIcon, CheckIcon, CopyIcon, SparkIcon } from "./brand-mark";
import QRCodeImage from "./qr-code";
import { getTheme, themes, type ThemeId } from "@/lib/themes";

type BoothStep = "welcome" | "choose" | "consent" | "camera" | "review" | "processing";
type CameraState = "idle" | "starting" | "ready" | "blocked";
type JobStatus = "queued" | "generating" | "processing" | "completed";

type DemoJob = {
  token: string;
  managementToken?: string;
  theme: ThemeId;
  themeName: string;
  status: JobStatus;
  resultUrl: string | null;
  createdAt: number;
  expiresAt: number;
};

const statusCopy: Record<JobStatus, { title: string; detail: string }> = {
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
};

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function PhotoBooth() {
  const [step, setStep] = useState<BoothStep>("welcome");
  const [themeId, setThemeId] = useState<ThemeId>("cyberpunk");
  const [consented, setConsented] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraMessage, setCameraMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDevice, setActiveDevice] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureCue, setCaptureCue] = useState(false);
  const [portrait, setPortrait] = useState("");
  const [job, setJob] = useState<DemoJob | null>(null);
  const [origin, setOrigin] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const submissionKey = useRef(crypto.randomUUID());

  const theme = getTheme(themeId);
  const ready = job?.status === "completed" && Boolean(job.resultUrl);
  const managementFragment = job?.managementToken ? `#manage=${job.managementToken}` : "";
  const portraitUrl = job && origin ? `${origin}/p/${job.token}${managementFragment}` : "";

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const resetBooth = useCallback(() => {
    stopCamera();
    setStep("welcome");
    setThemeId("cyberpunk");
    setConsented(false);
    setCameraState("idle");
    setCameraMessage("");
    setDevices([]);
    setActiveDevice("");
    setCountdown(null);
    setPortrait("");
    setJob(null);
    setSubmitting(false);
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
    if (step !== "processing" || !job || job.status === "completed") return;
    const load = async () => {
      const response = await fetch(`/api/jobs?token=${encodeURIComponent(job.token)}`, { cache: "no-store" });
      if (response.ok) setJob((await response.json()) as DemoJob);
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
    if (!file.type.startsWith("image/")) {
      setCameraMessage("Choose a JPEG, PNG, or another image file.");
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
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId, submissionKey: submissionKey.current }),
      });
      if (!response.ok) throw new Error("Your photo couldn’t upload. Please try again.");
      setJob((await response.json()) as DemoJob);
      setStep("processing");
    } catch (error) {
      setCameraMessage(error instanceof Error ? error.message : "Your photo couldn’t upload. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      <main className="booth-shell theme-cyberpunk">
        {header("Interactive demo")}
        <section className="welcome-layout">
          <div className="welcome-copy">
            <p className="organization-label">Khalifa University · AI Club</p>
            <h1 ref={titleRef} tabIndex={-1}>Pick your universe.</h1>
            <p>One photo. A different version of you.</p>
            <button className="primary-button" type="button" onClick={() => setStep("choose")}>Create my alter ego <ArrowIcon /></button>
            <small>The camera is off until you choose to open it.</small>
          </div>
          <div className="example-portraits" aria-label="Example AI portraits">
            {themes.map((item) => (
              <figure key={item.id} className={`example-card example-card--${item.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={`${item.name} example portrait`} />
                <figcaption><span>Example</span><strong>{item.name}</strong></figcaption>
              </figure>
            ))}
          </div>
        </section>
        <footer className="booth-footer"><span>KU Alter Ego</span><span>Private by default</span></footer>
      </main>
    );
  }

  if (step === "choose") {
    return (
      <main className={`booth-shell theme-${theme.id}`}>
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
      <main className={`booth-shell theme-${theme.id}`}>
        {header("Step 2 of 5", true)}
        <section className="two-column-screen consent-screen">
          <div className="selected-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.image} alt={`${theme.name} example portrait`} />
            <div><span>Selected universe</span><strong>{theme.name}</strong></div>
          </div>
          <div className="instruction-panel">
            <p className="section-kicker">Before the camera opens</p>
            <h1 ref={titleRef} tabIndex={-1}>Your photo stays in your session.</h1>
            <p>This interactive demo uses your photo only in this browser session. It does not upload the photo or send it to an AI provider.</p>
            <details className="privacy-details">
              <summary>Read the demo privacy notice</summary>
              <div><p>Your captured photo remains in temporary browser memory and is cleared when you choose Next person or the kiosk resets.</p><p>The local demo server stores only a random result token, selected theme, and creation time. Production provider and retention wording must replace this notice before event use.</p></div>
            </details>
            <label className="consent-check">
              <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
              <span><CheckIcon /></span>
              <strong>I agree to use my photo in this demo experience.</strong>
            </label>
            <button className="primary-button" type="button" disabled={!consented} onClick={() => setStep("camera")}>Continue to camera <ArrowIcon /></button>
          </div>
        </section>
      </main>
    );
  }

  if (step === "camera") {
    return (
      <main className={`booth-shell theme-${theme.id}`}>
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
              <label className="secondary-button file-button">Choose a photo<input type="file" accept="image/*" capture="user" onChange={choosePhoto} /></label>
              {cameraState === "blocked" && <span className="help-note">A volunteer can help if the camera remains unavailable.</span>}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main className={`booth-shell theme-${theme.id}`}>
        {header("Step 4 of 5")}
        <section className="two-column-screen review-screen">
          <div>{cameraStage(true)}</div>
          <div className="instruction-panel">
            <p className="section-kicker">Review</p>
            <h1 ref={titleRef} tabIndex={-1}>Ready for {theme.name}?</h1>
            <p>This is the photo we’ll use. Check your framing before starting generation.</p>
            <button className="theme-change-button" type="button" onClick={() => setStep("choose")}><span style={{ background: theme.accent }} /> {theme.name} <em>Change theme</em></button>
            {cameraMessage && <p className="error-message" role="alert">{cameraMessage}</p>}
            <div className="review-actions"><button className="secondary-button" type="button" onClick={retake}>Retake</button><button className="primary-button" type="button" onClick={() => void createPortrait()} disabled={submitting}><SparkIcon /> {submitting ? "Starting generation…" : "Generate my portrait"}</button></div>
            <p className="help-note">This prototype returns a theme example; it does not send your photo to an AI service.</p>
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
    <main className={`booth-shell theme-${theme.id}`}>
      {header("Step 5 of 5")}
      {job && (
        <section className={`processing-layout ${ready ? "is-ready" : ""}`}>
          <div className="result-stage">
            {ready ? (
              <div className="portrait-result">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.resultUrl!} alt={`Your ${theme.name} demo portrait`} />
                <span>Demo result · {theme.name}</span>
              </div>
            ) : (
              <div className="generation-visual" aria-hidden="true"><div className="generation-orbit generation-orbit--one" /><div className="generation-orbit generation-orbit--two" /><span style={{ background: theme.accent }}><SparkIcon /></span></div>
            )}
          </div>
          <div className="processing-content">
            <div className="processing-copy" aria-live="polite">
              <p className="status-label"><i data-status={job.status} /> {job.status}</p>
              <h1 ref={titleRef} tabIndex={-1}>{statusCopy[job.status].title}</h1>
              <p>{statusCopy[job.status].detail}</p>
              {!ready && <span className="no-countdown">No guessed countdown — this status comes from the demo job.</span>}
              <div className="processing-actions">
                <a className="primary-button" href={portraitUrl} target="_blank" rel="noreferrer" onClick={() => setHandoffConfirmed(true)}>Open portrait link <ArrowIcon /></a>
                {!handoffConfirmed && !emailSaved && <button className="text-button" type="button" onClick={() => setHandoffConfirmed(true)}>I’ve opened the link</button>}
                {(ready || handoffConfirmed || emailSaved) && <button className="secondary-button" type="button" onClick={resetBooth}>Next person</button>}
              </div>
              {!ready && (handoffConfirmed || emailSaved) && <p className="handoff-note"><CheckIcon /> Processing continues after the booth resets.</p>}
            </div>
            {collectionPanel}
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
