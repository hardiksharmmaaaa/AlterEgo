import { NextRequest, NextResponse } from "next/server";
import { getTheme, themes, type ThemeId } from "@/lib/themes";
import { themePrompts } from "@/lib/theme-prompts";

type DemoJob = {
  token: string;
  managementToken: string;
  submissionKey: string;
  themeId: ThemeId;
  createdAt: number;
};

const globalJobs = globalThis as typeof globalThis & {
  __alterEgoJobs?: Map<string, DemoJob>;
  __alterEgoDeletedTokens?: Set<string>;
};

const jobs = globalJobs.__alterEgoJobs ?? new Map<string, DemoJob>();
const deletedTokens = globalJobs.__alterEgoDeletedTokens ?? new Set<string>();
globalJobs.__alterEgoJobs = jobs;
globalJobs.__alterEgoDeletedTokens = deletedTokens;

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function publicJob(job: DemoJob, includeManagementToken = false) {
  const elapsed = Date.now() - job.createdAt;
  const theme = getTheme(job.themeId);
  const status = elapsed < 1600 ? "queued" : elapsed < 4300 ? "generating" : elapsed < 6100 ? "processing" : "completed";

  return {
    token: job.token,
    ...(includeManagementToken ? { managementToken: job.managementToken } : {}),
    theme: job.themeId,
    themeName: theme.name,
    promptVersion: themePrompts[job.themeId].version,
    status,
    resultUrl: status === "completed" ? theme.image : null,
    createdAt: job.createdAt,
    expiresAt: job.createdAt + 7 * 24 * 60 * 60 * 1000,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { theme?: string; submissionKey?: string };
  const validTheme = themes.some((theme) => theme.id === body.theme);

  if (!body.theme || !validTheme || !body.submissionKey) {
    return NextResponse.json({ error: "Choose a valid theme and submission key." }, { status: 400, headers: privateHeaders });
  }

  const existingJob = [...jobs.values()].find((job) => job.submissionKey === body.submissionKey);
  if (existingJob) {
    return NextResponse.json(publicJob(existingJob, true), { headers: privateHeaders });
  }

  const token = crypto.randomUUID().replaceAll("-", "");
  const job: DemoJob = {
    token,
    managementToken: crypto.randomUUID().replaceAll("-", ""),
    submissionKey: body.submissionKey,
    themeId: body.theme as ThemeId,
    createdAt: Date.now(),
  };
  jobs.set(token, job);

  return NextResponse.json(publicJob(job, true), { status: 201, headers: privateHeaders });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token && deletedTokens.has(token)) {
    return NextResponse.json({ error: "Portrait deleted.", state: "deleted" }, { status: 410, headers: privateHeaders });
  }
  const job = token ? jobs.get(token) : undefined;

  if (!job) {
    return NextResponse.json({ error: "Portrait link not found or expired.", state: "expired" }, { status: 404, headers: privateHeaders });
  }

  return NextResponse.json(publicJob(job), { headers: privateHeaders });
}

export async function DELETE(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const job = token ? jobs.get(token) : undefined;
  if (!job) {
    return NextResponse.json({ error: "Portrait link not found." }, { status: 404, headers: privateHeaders });
  }
  if (request.headers.get("x-management-token") !== job.managementToken) {
    return NextResponse.json({ error: "This link cannot delete the portrait." }, { status: 403, headers: privateHeaders });
  }
  jobs.delete(job.token);
  deletedTokens.add(job.token);
  return NextResponse.json({ deleted: true }, { headers: privateHeaders });
}
