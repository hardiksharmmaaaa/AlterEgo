import type { ThemeId } from "./themes";

export type PortraitJobStatus =
  | "queued"
  | "generating"
  | "processing"
  | "completed"
  | "failed";

export type PortraitJobErrorCode =
  | "billing_required"
  | "rate_limited"
  | "authentication"
  | "unknown";

export type PublicPortraitJob = {
  token: string;
  managementToken?: string;
  theme: ThemeId;
  themeName: string;
  promptVersion: string;
  status: PortraitJobStatus;
  resultUrl: string | null;
  error?: string;
  errorCode?: PortraitJobErrorCode;
  retryable?: boolean;
  retryAfterSeconds?: number;
  createdAt: number;
  expiresAt: number;
};
