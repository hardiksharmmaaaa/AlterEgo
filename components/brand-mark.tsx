import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="Khalifa University AI Club">
      <span className="brand-logo-frame" aria-hidden="true">
        <Image
          className="brand-logo-image"
          src="/images/ku-ai-club-logo.png"
          alt=""
          width={712}
          height={692}
          sizes={compact ? "34px" : "52px"}
        />
        <i className="brand-logo-signal" />
      </span>
      <span className="brand-type">
        <strong>KU Alter Ego</strong>
        {!compact && <small>Khalifa University · AI Club</small>}
      </span>
    </div>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="1" />
      <path d="M16 8V5H5v11h3" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
    </svg>
  );
}
