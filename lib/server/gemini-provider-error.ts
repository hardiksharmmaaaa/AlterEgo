export type GeminiProviderFailure = {
  code: "billing_required" | "rate_limited" | "authentication" | "unknown";
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  status?: number;
};

type ProviderErrorShape = {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  body?: unknown;
  headers?: { get?: (name: string) => string | null };
  error?: unknown;
  cause?: unknown;
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (!error || typeof error !== "object") return String(error).toLowerCase();
  const value = error as ProviderErrorShape;
  return [value.message, value.body, JSON.stringify(value.error), JSON.stringify(value.cause)]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
}

function statusCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = error as ProviderErrorShape;
  const status = typeof value.status === "number" ? value.status : value.statusCode;
  return typeof status === "number" ? status : undefined;
}

function retryAfterSeconds(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const header = (error as ProviderErrorShape).headers?.get?.("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

export function classifyGeminiProviderError(error: unknown): GeminiProviderFailure {
  const text = errorText(error);
  const status = statusCode(error);
  const retryAfter = retryAfterSeconds(error);

  if (
    status === 429 &&
    (text.includes("free tier") || text.includes("free_tier")) &&
    (/limit\s*:\s*0/.test(text) || /"limit"\s*:\s*0/.test(text))
  ) {
    return {
      code: "billing_required",
      message:
        "Gemini image generation is unavailable on this project's Free Tier. Ask an organizer to connect a Paid Tier Gemini project and restart the booth.",
      retryable: false,
      status,
    };
  }

  if (status === 429 || text.includes("quota") || text.includes("rate limit")) {
    return {
      code: "rate_limited",
      message: retryAfter
        ? `The AI image service is busy. Wait ${retryAfter} seconds, then try again.`
        : "The AI image service is busy right now. Please try again in a moment.",
      retryable: true,
      retryAfterSeconds: retryAfter,
      status,
    };
  }

  if (status === 401 || status === 403 || text.includes("api key") || text.includes("permission")) {
    return {
      code: "authentication",
      message: "The AI image service is not configured correctly. Please ask a volunteer for help.",
      retryable: false,
      status,
    };
  }

  return {
    code: "unknown",
    message: "We couldn’t generate this portrait. Please try again or ask a volunteer for help.",
    retryable: true,
    status,
  };
}
