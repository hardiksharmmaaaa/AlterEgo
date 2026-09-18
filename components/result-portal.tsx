"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandMark, DownloadIcon, SparkIcon } from "./brand-mark";

type PortalStatus = "queued" | "generating" | "processing" | "completed";

type PortalJob = {
  token: string;
  theme: string;
  themeName: string;
  status: PortalStatus;
  resultUrl: string | null;
  expiresAt: number;
};

const pendingCopy: Record<Exclude<PortalStatus, "completed">, { title: string; detail: string }> = {
  queued: {
    title: "Your portrait is in the queue.",
    detail: "Keep this private page open. Your portrait will appear here automatically.",
  },
  generating: {
    title: "Creating your portrait…",
    detail: "Rendering your main character arc. You can leave the booth while this continues.",
  },
  processing: {
    title: "Adding the finishing touches…",
    detail: "We’re preparing the final image for download.",
  },
};

export default function ResultPortal({ token }: { token: string }) {
  const [job, setJob] = useState<PortalJob | null>(null);
  const [unavailable, setUnavailable] = useState<"expired" | "deleted" | null>(null);
  const [managementToken, setManagementToken] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/jobs?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { state?: string };
      setUnavailable(body.state === "deleted" ? "deleted" : "expired");
      return;
    }
    setJob((await response.json()) as PortalJob);
  }, [token]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    setManagementToken(parameters.get("manage") ?? "");
  }, []);

  useEffect(() => {
    void load();
    if (job?.status === "completed" || unavailable) return;
    const timer = window.setInterval(() => void load(), 1600);
    return () => window.clearInterval(timer);
  }, [job?.status, load, unavailable]);

  async function removePortrait() {
    setDeleteError("");
    const response = await fetch(`/api/jobs?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
      headers: { "x-management-token": managementToken },
    });
    if (!response.ok) {
      setDeleteError("This link cannot delete the portrait. Open the original QR link or ask a volunteer.");
      return;
    }
    setUnavailable("deleted");
    setJob(null);
  }

  if (unavailable) {
    const deleted = unavailable === "deleted";
    return (
      <main className="portal-shell centered-screen">
        <header className="portal-header"><BrandMark /><span className="demo-badge">Private result</span></header>
        <section className="portal-message">
          {deleted && <span className="status-orb"><SparkIcon /></span>}
          <p className="micro-label">{deleted ? "Photo deleted" : "Link expired"}</p>
          <h1>{deleted ? "Your portrait has been removed." : "This portrait is no longer available."}</h1>
          <p>{deleted ? "The demo job and its private result access have been cleared." : "Ask a volunteer for help if you are still at the event."}</p>
        </section>
      </main>
    );
  }

  const ready = job?.status === "completed" && job.resultUrl;
  const expiry = job
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(job.expiresAt))
    : "";

  return (
    <main className={`portal-shell portal-shell--${job?.theme ?? "cyberpunk"}`}>
      <header className="portal-header"><BrandMark /><span className="demo-badge">Private result</span></header>
      {!ready ? (
        <section className="portal-wait" aria-live="polite">
          <div className="portal-visual" aria-hidden="true">
            <div className="portal-ring portal-ring--one" />
            <div className="portal-ring portal-ring--two" />
            <span><SparkIcon /></span>
          </div>
          <p className="status-pill"><i /> {job?.status ?? "Finding portrait"}</p>
          <h1>{job ? pendingCopy[job.status as Exclude<PortalStatus, "completed">].title : "Opening your private link…"}</h1>
          <p>{job ? pendingCopy[job.status as Exclude<PortalStatus, "completed">].detail : "This will only take a moment."}</p>
        </section>
      ) : (
        <section className="portal-result">
          <div className={`final-portrait final-portrait--${job.theme}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.resultUrl!} alt={`Your ${job.themeName} demo portrait`} />
            <div className="portrait-brand"><BrandMark compact /><span>{job.themeName} · Demo result</span></div>
          </div>
          <div className="portal-copy">
            <p className="micro-label">{job.themeName} universe</p>
            <h1>Your alter ego is ready.</h1>
            <p>Save the portrait to your phone before this private demo link expires.</p>
            <p className="expiry-copy">Available until {expiry}</p>
            <a className="primary-button" href={job.resultUrl!} download={`ku-alter-ego-${job.theme}.png`}><DownloadIcon /> Download photo</a>
            {managementToken && (
              <div className="danger-zone">
                {!confirmDelete ? (
                  <button className="danger-button" type="button" onClick={() => setConfirmDelete(true)}>Delete my portrait</button>
                ) : (
                  <div className="delete-confirm">
                    <p>This removes the demo portrait and disables this link. This cannot be undone.</p>
                    <div className="delete-actions"><button className="text-button" type="button" onClick={() => setConfirmDelete(false)}>Keep portrait</button><button className="danger-button" type="button" onClick={() => void removePortrait()}>Delete portrait</button></div>
                  </div>
                )}
                {deleteError && <p className="field-error" role="alert">{deleteError}</p>}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
