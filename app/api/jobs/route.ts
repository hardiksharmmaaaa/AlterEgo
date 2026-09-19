import { NextRequest, NextResponse } from "next/server";
import {
  getGeminiImageBlockReason,
  isGeminiImageConfigured,
  getGeminiImageModel,
} from "@/lib/server/gemini-image";
import {
  createStoredPortraitJob,
  deleteStoredPortraitJob,
  findStoredPortraitJobBySubmissionKey,
  getStoredPortraitJob,
  type StoredPortraitJob,
  wasStoredPortraitDeleted,
} from "@/lib/server/portrait-job-store";
import { cancelPortraitProcessing, startPortraitProcessing } from "@/lib/server/process-portrait";
import { getTheme, themes, type ThemeId } from "@/lib/themes";
import { themePrompts } from "@/lib/theme-prompts";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function publicJob(job: StoredPortraitJob, includeManagementToken = false) {
  const theme = getTheme(job.themeId);
  return {
    token: job.token,
    ...(includeManagementToken ? { managementToken: job.managementToken } : {}),
    theme: job.themeId,
    themeName: theme.name,
    promptVersion: job.promptVersion,
    status: job.status,
    resultUrl: job.status === "completed" ? `/api/jobs/${job.token}/image` : null,
    ...(job.status === "failed" && job.error
      ? {
          error: job.error,
          errorCode: job.errorCode,
          retryable: job.retryable,
          retryAfterSeconds: job.retryAfterSeconds,
        }
      : {}),
    createdAt: job.createdAt,
    expiresAt: job.expiresAt,
  };
}

function hasExpectedImageSignature(data: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/webp") {
    return data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "The photo is too large. Choose an image under 10 MB." }, { status: 413, headers: privateHeaders });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The photo upload could not be read." }, { status: 400, headers: privateHeaders });
  }

  const themeValue = formData.get("theme");
  const submissionValue = formData.get("submissionKey");
  const photoValue = formData.get("photo");
  const validTheme = typeof themeValue === "string" && themes.some((theme) => theme.id === themeValue);

  if (
    !validTheme ||
    typeof submissionValue !== "string" ||
    submissionValue.length < 8 ||
    submissionValue.length > 200 ||
    !(photoValue instanceof File)
  ) {
    return NextResponse.json({ error: "Choose a valid theme and photo." }, { status: 400, headers: privateHeaders });
  }

  const existingJob = await findStoredPortraitJobBySubmissionKey(submissionValue);
  if (existingJob) {
    if (["queued", "generating", "processing"].includes(existingJob.status)) {
      startPortraitProcessing(existingJob.token);
    }
    return NextResponse.json(publicJob(existingJob, true), { headers: privateHeaders });
  }

  if (!isGeminiImageConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured yet. Add GEMINI_API_KEY to .env.local and restart the server." },
      { status: 503, headers: privateHeaders },
    );
  }

  const providerBlockReason = getGeminiImageBlockReason();
  if (providerBlockReason) {
    return NextResponse.json(
      { error: providerBlockReason, errorCode: "billing_required", retryable: false },
      { status: 503, headers: privateHeaders },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(photoValue.type)) {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP photo." }, { status: 415, headers: privateHeaders });
  }
  if (photoValue.size === 0 || photoValue.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Choose a non-empty photo under 10 MB." }, { status: 413, headers: privateHeaders });
  }

  const input = Buffer.from(await photoValue.arrayBuffer());
  if (!hasExpectedImageSignature(input, photoValue.type)) {
    return NextResponse.json({ error: "The uploaded file does not appear to be a valid image." }, { status: 415, headers: privateHeaders });
  }

  try {
    const themeId = themeValue as ThemeId;
    const job = await createStoredPortraitJob({
      submissionKey: submissionValue,
      themeId,
      promptVersion: themePrompts[themeId].version,
      model: getGeminiImageModel(),
      inputMimeType: photoValue.type,
      input,
    });
    startPortraitProcessing(job.token);
    return NextResponse.json(publicJob(job, true), { status: 201, headers: privateHeaders });
  } catch (error) {
    console.error("Could not create portrait job:", error);
    return NextResponse.json(
      { error: "The photo could not be stored locally. Please try again." },
      { status: 500, headers: privateHeaders },
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (wasStoredPortraitDeleted(token)) {
    return NextResponse.json({ error: "Portrait deleted.", state: "deleted" }, { status: 410, headers: privateHeaders });
  }

  const job = await getStoredPortraitJob(token);
  if (!job) {
    return NextResponse.json({ error: "Portrait link not found or expired.", state: "expired" }, { status: 404, headers: privateHeaders });
  }
  if (job.expiresAt <= Date.now()) {
    cancelPortraitProcessing(job.token);
    await deleteStoredPortraitJob(job.token);
    return NextResponse.json({ error: "Portrait link expired.", state: "expired" }, { status: 410, headers: privateHeaders });
  }

  if (["queued", "generating", "processing"].includes(job.status)) {
    startPortraitProcessing(job.token);
  }
  return NextResponse.json(publicJob(job), { headers: privateHeaders });
}

export async function DELETE(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const job = await getStoredPortraitJob(token);
  if (!job) {
    return NextResponse.json({ error: "Portrait link not found." }, { status: 404, headers: privateHeaders });
  }
  if (request.headers.get("x-management-token") !== job.managementToken) {
    return NextResponse.json({ error: "This link cannot delete the portrait." }, { status: 403, headers: privateHeaders });
  }

  cancelPortraitProcessing(job.token);
  await deleteStoredPortraitJob(job.token);
  return NextResponse.json({ deleted: true }, { headers: privateHeaders });
}
