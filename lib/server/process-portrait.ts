import { buildThemePrompt } from "../theme-prompts";
import { blockGeminiImageGeneration, editPortraitWithGemini } from "./gemini-image";
import { classifyGeminiProviderError } from "./gemini-provider-error";
import {
  getStoredPortraitJob,
  readStoredPortraitInput,
  updateStoredPortraitJob,
  wasStoredPortraitDeleted,
  writeStoredPortraitOutput,
} from "./portrait-job-store";

const globalProcessing = globalThis as typeof globalThis & {
  __alterEgoActivePortraitJobsV2?: Map<string, AbortController>;
};

const activeJobs =
  globalProcessing.__alterEgoActivePortraitJobsV2 ?? new Map<string, AbortController>();
globalProcessing.__alterEgoActivePortraitJobsV2 = activeJobs;

async function processPortrait(token: string, controller: AbortController) {
  try {
    const job = await getStoredPortraitJob(token);
    if (!job || job.status === "completed" || job.status === "failed") return;

    await updateStoredPortraitJob(token, {
      status: "generating",
      error: undefined,
      errorCode: undefined,
      retryable: undefined,
      retryAfterSeconds: undefined,
    });
    const input = await readStoredPortraitInput(job);
    const generated = await editPortraitWithGemini({
      input,
      inputMimeType: job.inputMimeType,
      prompt: buildThemePrompt(job.themeId),
      signal: controller.signal,
    });

    if (controller.signal.aborted || wasStoredPortraitDeleted(token)) return;
    await updateStoredPortraitJob(token, { status: "processing" });
    const updated = await writeStoredPortraitOutput(token, generated.data, generated.mimeType);
    if (!updated || controller.signal.aborted || wasStoredPortraitDeleted(token)) return;
    await updateStoredPortraitJob(token, {
      status: "completed",
      error: undefined,
      errorCode: undefined,
      retryable: undefined,
      retryAfterSeconds: undefined,
    });
  } catch (error) {
    if (controller.signal.aborted || wasStoredPortraitDeleted(token)) return;
    const failure = classifyGeminiProviderError(error);
    if (failure.code === "billing_required") {
      blockGeminiImageGeneration(failure.message);
    }
    console.error("Portrait generation failed:", {
      code: failure.code,
      status: failure.status,
      retryAfterSeconds: failure.retryAfterSeconds,
    });
    await updateStoredPortraitJob(token, {
      status: "failed",
      error: failure.message,
      errorCode: failure.code,
      retryable: failure.retryable,
      retryAfterSeconds: failure.retryAfterSeconds,
    });
  }
}

export function startPortraitProcessing(token: string) {
  if (activeJobs.has(token)) return;
  const controller = new AbortController();
  activeJobs.set(token, controller);
  void processPortrait(token, controller).finally(() => activeJobs.delete(token));
}

export function cancelPortraitProcessing(token: string) {
  activeJobs.get(token)?.abort();
  activeJobs.delete(token);
}
