import { NextResponse } from "next/server";
import {
  deleteStoredPortraitJob,
  getStoredPortraitJob,
  readStoredPortraitOutput,
  wasStoredPortraitDeleted,
} from "@/lib/server/portrait-job-store";

export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (wasStoredPortraitDeleted(token)) {
    return NextResponse.json({ error: "Portrait deleted." }, { status: 410, headers: privateHeaders });
  }

  const job = await getStoredPortraitJob(token);
  if (!job) {
    return NextResponse.json({ error: "Portrait not found." }, { status: 404, headers: privateHeaders });
  }
  if (job.expiresAt <= Date.now()) {
    await deleteStoredPortraitJob(job.token);
    return NextResponse.json({ error: "Portrait expired." }, { status: 410, headers: privateHeaders });
  }
  if (job.status !== "completed") {
    return NextResponse.json({ error: "Portrait is not ready yet." }, { status: 409, headers: privateHeaders });
  }

  try {
    const output = await readStoredPortraitOutput(job);
    if (!output) {
      return NextResponse.json({ error: "Portrait output not found." }, { status: 404, headers: privateHeaders });
    }
    return new Response(new Uint8Array(output.data), {
      headers: {
        ...privateHeaders,
        "Content-Type": output.mimeType,
        "Content-Length": String(output.data.length),
        "Content-Disposition": `inline; filename="ku-alter-ego-${job.themeId}.jpg"`,
      },
    });
  } catch (error) {
    console.error("Could not read generated portrait:", error);
    return NextResponse.json({ error: "Portrait output not found." }, { status: 404, headers: privateHeaders });
  }
}
