"use client";

import Image from "next/image";
import {
  PointerEvent as ReactPointerEvent,
  RefObject,
  useRef,
  useState,
} from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "./brand-mark";
import { getTheme, themes, type ThemeId } from "@/lib/themes";

type MascotMove = "mirror" | "dance" | "drama" | "freeze";

type LandingExperienceProps = {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  onStart: () => void;
  titleRef: RefObject<HTMLHeadingElement | null>;
};

const signalWords = [
  "Dune velocity",
  "Pearl light",
  "Falcon instinct",
  "Midnight barjeel",
  "Mangrove glow",
  "Karak energy",
];

const mascotMoves: Array<{ id: MascotMove; label: string; detail: string }> = [
  { id: "mirror", label: "Mirror me", detail: "follows your pointer" },
  { id: "dance", label: "Tiny dance", detail: "maximum shoulder" },
  { id: "drama", label: "Go dramatic", detail: "full main character" },
  { id: "freeze", label: "Freeze", detail: "absolutely still-ish" },
];

export default function LandingExperience({
  themeId,
  onThemeChange,
  onStart,
  titleRef,
}: LandingExperienceProps) {
  const theme = getTheme(themeId);
  const portalRef = useRef<HTMLButtonElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const [mascotMove, setMascotMove] = useState<MascotMove>("mirror");
  const [boops, setBoops] = useState(0);

  function movePortal(event: ReactPointerEvent<HTMLButtonElement>) {
    const node = portalRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    node.style.setProperty("--portal-x", `${horizontal * 17}deg`);
    node.style.setProperty("--portal-y", `${vertical * -13}deg`);
    node.style.setProperty("--light-x", `${(horizontal + 0.5) * 100}%`);
    node.style.setProperty("--light-y", `${(vertical + 0.5) * 100}%`);
  }

  function resetPortal() {
    const node = portalRef.current;
    if (!node) return;
    node.style.setProperty("--portal-x", "0deg");
    node.style.setProperty("--portal-y", "0deg");
    node.style.setProperty("--light-x", "50%");
    node.style.setProperty("--light-y", "38%");
  }

  function remixTheme() {
    const index = themes.findIndex((item) => item.id === themeId);
    onThemeChange(themes[(index + 1) % themes.length].id);
  }

  function mimicPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (mascotMove !== "mirror") return;
    const node = mascotRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const horizontal = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const vertical = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    node.style.setProperty("--mimo-eye-x", `${horizontal * 8}px`);
    node.style.setProperty("--mimo-eye-y", `${vertical * 7}px`);
    node.style.setProperty("--mimo-tilt", `${horizontal * 7}deg`);
    node.style.setProperty("--mimo-lift", `${vertical * -5}px`);
  }

  function resetMimic() {
    const node = mascotRef.current;
    if (!node) return;
    node.style.setProperty("--mimo-eye-x", "0px");
    node.style.setProperty("--mimo-eye-y", "0px");
    node.style.setProperty("--mimo-tilt", "0deg");
    node.style.setProperty("--mimo-lift", "0px");
  }

  return (
    <>
      <header className="ae-header">
        <a className="ae-brand-link" href="#top" aria-label="KU Alter Ego home">
          <BrandMark />
        </a>
        <nav className="ae-nav" aria-label="Landing page">
          <a href="#worlds">Worlds</a>
          <a href="#mimo">Meet Mimo</a>
          <a href="#how">How it works</a>
        </nav>
        <button className="ae-header-cta" type="button" onClick={onStart}>
          Enter the booth <ArrowIcon />
        </button>
      </header>

      <section className="ae-hero" id="top">
        <div className="ae-hero-copy">
          <p className="ae-hero-note"><span /> A live AI portrait experiment from the UAE</p>
          <h1 ref={titleRef} tabIndex={-1}>
            <span>Meet the you</span>
            <span>you haven’t</span>
            <span>met yet.</span>
          </h1>
          <p className="ae-hero-deck">
            One face. Six impossible local worlds. Pick a signal, make a photo,
            and leave with an alter ego that feels suspiciously like you.
          </p>
          <div className="ae-hero-actions">
            <button className="ae-primary-cta" type="button" onClick={onStart}>
              Become {theme.name} <ArrowIcon />
            </button>
            <a className="ae-play-link" href="#worlds">
              Or play first <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="ae-camera-promise">
            <span aria-hidden="true" /> No surprise selfies. The camera stays off until you consent.
          </p>
        </div>

        <div className="ae-hero-stage">
          <p className="ae-stage-coordinate ae-stage-coordinate--top">24.4539° N</p>
          <p className="ae-stage-coordinate ae-stage-coordinate--side">54.3773° E</p>
          <button
            className="ae-portal"
            type="button"
            ref={portalRef}
            onPointerMove={movePortal}
            onPointerLeave={resetPortal}
            onClick={remixTheme}
            aria-label={`Current world is ${theme.name}. Click to remix the world.`}
          >
            <span className="ae-portal-orbit ae-portal-orbit--one" aria-hidden="true" />
            <span className="ae-portal-orbit ae-portal-orbit--two" aria-hidden="true" />
            <span className="ae-portal-card ae-portal-card--ghost" aria-hidden="true" />
            <span className="ae-portal-card ae-portal-card--image">
              <Image key={theme.id} src={theme.image} alt={`${theme.name} portrait world`} fill priority sizes="(max-width: 840px) 78vw, 42vw" />
              <span className="ae-portal-light" aria-hidden="true" />
              <span className="ae-portal-label"><i /> {theme.name}</span>
            </span>
            <span className="ae-portal-remix">Drag the light · click to remix</span>
          </button>
        </div>
      </section>

      <div className="ae-marquee" role="img" aria-label="Alter Ego themes: dune velocity, pearl light, falcon instinct, midnight barjeel, mangrove glow, and karak energy">
        <div className="ae-marquee-track" aria-hidden="true">
          {[...signalWords, ...signalWords].map((word, index) => (
            <span key={`${word}-${index}`}>
              {word} <i>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className="ae-worlds" id="worlds" aria-labelledby="worlds-title">
        <div className="ae-section-heading">
          <p>Choose your transmission</p>
          <h2 id="worlds-title">Six portals.<br />Zero boring.</h2>
          <span>Every world starts with the same you and ends somewhere gloriously else.</span>
        </div>
        <div className="ae-world-grid" role="radiogroup" aria-label="Choose an alter ego world">
          {themes.map((item, index) => {
            const selected = item.id === themeId;
            return (
              <button
                className={`ae-world-card ae-world-card--${index + 1} ${selected ? "is-selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={selected}
                key={item.id}
                onClick={() => onThemeChange(item.id)}
                style={{ "--card-accent": item.accent, "--card-glow": item.glow } as React.CSSProperties}
              >
                <span className="ae-world-image">
                  <Image src={item.image} alt="" fill sizes="(max-width: 720px) 88vw, (max-width: 1100px) 44vw, 31vw" />
                </span>
                <span className="ae-world-wash" aria-hidden="true" />
                <span className="ae-world-number">0{index + 1}</span>
                <span className="ae-world-copy">
                  <small>{item.shortName}</small>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </span>
                <span className="ae-world-pick">{selected ? "Signal locked" : "Tune in"}</span>
              </button>
            );
          })}
        </div>
        <div className="ae-worlds-handoff">
          <p>You’re tuned to <strong>{theme.name}</strong>.</p>
          <button type="button" onClick={onStart}>Take this world to the booth <ArrowIcon /></button>
        </div>
      </section>

      <section className="ae-mimo-section" id="mimo" aria-labelledby="mimo-title">
        <div className="ae-mimo-copy">
          <p>Resident chaos coordinator</p>
          <h2 id="mimo-title">Meet Mimo.<br />Mimo copies.</h2>
          <p>
            Move around and Mimo follows. Ask for a tiny dance, a dramatic pose,
            or a very serious freeze. It’s a caricature with stage fright and
            unusually good shoulders.
          </p>
          <div className="ae-mimo-controls" role="group" aria-label="Choose Mimo's move">
            {mascotMoves.map((move) => (
              <button
                type="button"
                key={move.id}
                className={mascotMove === move.id ? "is-active" : ""}
                aria-pressed={mascotMove === move.id}
                onClick={() => {
                  setMascotMove(move.id);
                  resetMimic();
                }}
              >
                <strong>{move.label}</strong>
                <span>{move.detail}</span>
              </button>
            ))}
          </div>
          <p className="ae-mimo-privacy"><span>Pointer only</span> Mimo cannot see you and never opens the camera.</p>
        </div>

        <div
          className={`ae-mimo-stage is-${mascotMove}`}
          ref={mascotRef}
          onPointerMove={mimicPointer}
          onPointerLeave={resetMimic}
        >
          <div className="ae-mimo-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <button
            className="ae-mimo-character"
            type="button"
            onClick={() => setBoops((value) => value + 1)}
            aria-label={`Boop Mimo. Booped ${boops} ${boops === 1 ? "time" : "times"}.`}
          >
            <span className="ae-mimo-shadow" aria-hidden="true" />
            <span className="ae-mimo-antenna" aria-hidden="true"><i /></span>
            <span className="ae-mimo-head">
              <span className="ae-mimo-brow ae-mimo-brow--left" />
              <span className="ae-mimo-brow ae-mimo-brow--right" />
              <span className="ae-mimo-eye ae-mimo-eye--left"><i /></span>
              <span className="ae-mimo-eye ae-mimo-eye--right"><i /></span>
              <span className="ae-mimo-mouth" />
              <span className="ae-mimo-cheek ae-mimo-cheek--left" />
              <span className="ae-mimo-cheek ae-mimo-cheek--right" />
            </span>
            <span className="ae-mimo-body"><i className="ae-mimo-core">M</i></span>
            <span className="ae-mimo-arm ae-mimo-arm--left"><i /></span>
            <span className="ae-mimo-arm ae-mimo-arm--right"><i /></span>
            <span className="ae-mimo-leg ae-mimo-leg--left"><i /></span>
            <span className="ae-mimo-leg ae-mimo-leg--right"><i /></span>
          </button>
          <div className="ae-mimo-caption" aria-live="polite">
            <span>{mascotMove === "mirror" ? "Mimic mode" : `${mascotMoves.find((move) => move.id === mascotMove)?.label} mode`}</span>
            <strong>{boops === 0 ? "Boop the character" : `${boops} ${boops === 1 ? "boop" : "boops"} received`}</strong>
          </div>
        </div>
      </section>

      <section className="ae-how" id="how" aria-labelledby="how-title">
        <div className="ae-how-intro">
          <p>From this face to that face</p>
          <h2 id="how-title">A three-act identity crisis.</h2>
          <span>About a minute. No prompt engineering. No account. No gallery of strangers.</span>
        </div>
        <div className="ae-how-steps">
          <article>
            <span className="ae-step-number">1</span>
            <div className="ae-step-art ae-step-art--signal" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <h3>Pick your frequency</h3>
            <p>Choose the universe that feels least sensible and most you.</p>
          </article>
          <article>
            <span className="ae-step-number">2</span>
            <div className="ae-step-art ae-step-art--face" aria-hidden="true">
              <i /><i /><span /></div>
            <h3>Give us one good face</h3>
            <p>Consent first. Then take a photo or choose one from your device.</p>
          </article>
          <article>
            <span className="ae-step-number">3</span>
            <div className="ae-step-art ae-step-art--reveal" aria-hidden="true">
              <span><Image src={theme.image} alt="" fill sizes="220px" /></span><i /><i />
            </div>
            <h3>Collect the impossible</h3>
            <p>Scan the private QR, download on your phone, then delete whenever you like.</p>
          </article>
        </div>
      </section>

      <section className="ae-privacy" aria-labelledby="privacy-title">
        <div className="ae-privacy-type" aria-hidden="true">
          <span>YOUR</span><span>FACE</span><span>ISN’T</span><span>CONTENT.</span>
        </div>
        <div className="ae-privacy-copy">
          <p>Private by default</p>
          <h2 id="privacy-title">A funhouse mirror.<br />Not a data trap.</h2>
          <p>
            Your photo is used for the portrait you ask for. Result links are private,
            the experience works without email, and deletion is built into the journey.
          </p>
          <ul>
            <li><span>01</span><strong>Camera after consent</strong><small>Never on page load.</small></li>
            <li><span>02</span><strong>QR before email</strong><small>Take the result without an inbox.</small></li>
            <li><span>03</span><strong>Delete means delete</strong><small>Remove the local portrait and revoke access.</small></li>
          </ul>
          <details>
            <summary>Read the plain-language promise <span>+</span></summary>
            <p>The booth explains what is stored before capture, keeps provider credentials server-side, and clears the kiosk session between visitors. Provider processing follows the connected account’s configured terms.</p>
          </details>
        </div>
      </section>

      <section className="ae-finale">
        <div className="ae-finale-orbit" aria-hidden="true"><i /><i /><i /></div>
        <p>You made it this far as yourself.</p>
        <h2>Leave as<br /><span>{theme.name}.</span></h2>
        <button type="button" onClick={onStart}>
          <SparkIcon /> Start my transformation <ArrowIcon />
        </button>
        <small>One photo · private link · optional email · delete anytime</small>
      </section>

      <footer className="ae-footer">
        <BrandMark compact />
        <p>Made for curious humans by Khalifa University AI Club.</p>
        <a href="#top">Back to the weird bit ↑</a>
      </footer>
    </>
  );
}
