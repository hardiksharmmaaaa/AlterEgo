import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PortraitJobErrorCode, PortraitJobStatus } from "../portrait-job";
import { themes, type ThemeId } from "../themes";

export const PORTRAIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const storageRoot = path.resolve(
  /* turbopackIgnore: true */
  process.cwd(),
  process.env.PORTRAIT_STORAGE_DIR?.trim() || ".local-data/portraits",
);

export type StoredPortraitJob = {
  token: string;
  managementToken: string;
  submissionKey: string;
  themeId: ThemeId;
  promptVersion: string;
  model: string;
  status: PortraitJobStatus;
  inputFilename: string;
  inputMimeType: string;
  outputFilename?: string;
  outputMimeType?: string;
  error?: string;
  errorCode?: PortraitJobErrorCode;
  retryable?: boolean;
  retryAfterSeconds?: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __alterEgoPortraitJobsV2?: Map<string, StoredPortraitJob>;
  __alterEgoDeletedPortraitTokensV2?: Set<string>;
  __alterEgoPortraitHydrationV2?: Promise<void>;
  __alterEgoPortraitExpiryTimersV2?: Map<string, NodeJS.Timeout>;
};

const jobs = globalStore.__alterEgoPortraitJobsV2 ?? new Map<string, StoredPortraitJob>();
const deletedTokens = globalStore.__alterEgoDeletedPortraitTokensV2 ?? new Set<string>();
const expiryTimers = globalStore.__alterEgoPortraitExpiryTimersV2 ?? new Map<string, NodeJS.Timeout>();
globalStore.__alterEgoPortraitJobsV2 = jobs;
globalStore.__alterEgoDeletedPortraitTokensV2 = deletedTokens;
globalStore.__alterEgoPortraitExpiryTimersV2 = expiryTimers;

function isSafeToken(token: string) {
  return /^[a-f0-9]{32}$/.test(token);
}

function directoryFor(token: string) {
  if (!isSafeToken(token)) throw new Error("Invalid portrait token.");
  return path.join(/* turbopackIgnore: true */ storageRoot, token);
}

function isStoredPortraitJob(value: unknown): value is StoredPortraitJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<StoredPortraitJob>;
  return Boolean(
    typeof job.token === "string" &&
      isSafeToken(job.token) &&
      typeof job.managementToken === "string" &&
      typeof job.submissionKey === "string" &&
      typeof job.themeId === "string" &&
      themes.some((theme) => theme.id === job.themeId) &&
      typeof job.status === "string" &&
      typeof job.inputFilename === "string" &&
      typeof job.inputMimeType === "string" &&
      typeof job.createdAt === "number" &&
      typeof job.expiresAt === "number",
  );
}

function scheduleExpiry(job: StoredPortraitJob) {
  const existingTimer = expiryTimers.get(job.token);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    void deleteStoredPortraitJob(job.token);
  }, Math.max(0, job.expiresAt - Date.now()));
  timer.unref();
  expiryTimers.set(job.token, timer);
}

async function hydrateJobs() {
  try {
    const entries = await readdir(/* turbopackIgnore: true */ storageRoot, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && isSafeToken(entry.name))
        .map(async (entry) => {
          try {
            const metadata = await readFile(path.join(storageRoot, entry.name, "job.json"), "utf8");
            const job: unknown = JSON.parse(metadata);
            if (isStoredPortraitJob(job)) {
              if (job.expiresAt <= Date.now()) {
                await rm(path.join(/* turbopackIgnore: true */ storageRoot, entry.name), { recursive: true, force: true });
              } else {
                jobs.set(job.token, job);
                scheduleExpiry(job);
              }
            }
          } catch {
            // Ignore incomplete local folders; they can be removed manually.
          }
        }),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function ensureHydrated() {
  globalStore.__alterEgoPortraitHydrationV2 ??= hydrateJobs();
  await globalStore.__alterEgoPortraitHydrationV2;
}

async function persistJob(job: StoredPortraitJob) {
  const directory = directoryFor(job.token);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `job-${process.pid}-${Date.now()}.tmp`);
  await writeFile(temporaryPath, JSON.stringify(job, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, path.join(directory, "job.json"));
  jobs.set(job.token, job);
  scheduleExpiry(job);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function createStoredPortraitJob(options: {
  submissionKey: string;
  themeId: ThemeId;
  promptVersion: string;
  model: string;
  inputMimeType: string;
  input: Buffer;
}) {
  await ensureHydrated();
  const now = Date.now();
  const token = crypto.randomUUID().replaceAll("-", "");
  const inputFilename = `input.${extensionForMimeType(options.inputMimeType)}`;
  const job: StoredPortraitJob = {
    token,
    managementToken: crypto.randomUUID().replaceAll("-", ""),
    submissionKey: options.submissionKey,
    themeId: options.themeId,
    promptVersion: options.promptVersion,
    model: options.model,
    status: "queued",
    inputFilename,
    inputMimeType: options.inputMimeType,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + PORTRAIT_RETENTION_MS,
  };

  const directory = directoryFor(token);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(path.join(directory, inputFilename), options.input, { mode: 0o600 });
    await persistJob(job);
    return job;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function findStoredPortraitJobBySubmissionKey(submissionKey: string) {
  await ensureHydrated();
  return [...jobs.values()].find((job) => job.submissionKey === submissionKey);
}

export async function getStoredPortraitJob(token: string) {
  if (!isSafeToken(token)) return undefined;
  await ensureHydrated();
  return jobs.get(token);
}

export async function updateStoredPortraitJob(
  token: string,
  update: Partial<Omit<StoredPortraitJob, "token" | "managementToken" | "submissionKey" | "createdAt">>,
) {
  const current = await getStoredPortraitJob(token);
  if (!current || deletedTokens.has(token)) return undefined;
  const next = { ...current, ...update, updatedAt: Date.now() };
  await persistJob(next);
  return next;
}

export async function readStoredPortraitInput(job: StoredPortraitJob) {
  return readFile(path.join(/* turbopackIgnore: true */ directoryFor(job.token), path.basename(job.inputFilename)));
}

export async function writeStoredPortraitOutput(token: string, data: Buffer, mimeType: string) {
  const current = await getStoredPortraitJob(token);
  if (!current || deletedTokens.has(token)) return undefined;
  const outputFilename = `output.${extensionForMimeType(mimeType)}`;
  await writeFile(path.join(directoryFor(token), outputFilename), data, { mode: 0o600 });
  return updateStoredPortraitJob(token, { outputFilename, outputMimeType: mimeType });
}

export async function readStoredPortraitOutput(job: StoredPortraitJob) {
  if (!job.outputFilename || !job.outputMimeType) return undefined;
  const data = await readFile(path.join(/* turbopackIgnore: true */ directoryFor(job.token), path.basename(job.outputFilename)));
  return { data, mimeType: job.outputMimeType };
}

export async function deleteStoredPortraitJob(token: string) {
  if (!isSafeToken(token)) return;
  deletedTokens.add(token);
  jobs.delete(token);
  const timer = expiryTimers.get(token);
  if (timer) clearTimeout(timer);
  expiryTimers.delete(token);
  await rm(directoryFor(token), { recursive: true, force: true });
}

export function wasStoredPortraitDeleted(token: string) {
  return deletedTokens.has(token);
}
