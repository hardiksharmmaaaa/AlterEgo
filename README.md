# KU Alter Ego

A touchscreen-friendly AI portrait booth prototype for Khalifa University AI Club. Visitors choose a universe, capture or upload a selfie, get an immediate private result link by QR code, and see the portrait reveal when processing finishes.

## Run locally

```bash
npm install
cp .env.example .env.local
# Add a Gemini API key from a Paid Tier project to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Camera access works on `localhost`; deployed camera access requires HTTPS.

Required local configuration:

```dotenv
GEMINI_API_KEY=your-key-from-a-paid-tier-gemini-project
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
PORTRAIT_STORAGE_DIR=.local-data/portraits
```

Keep the key in `.env.local`; never add a real key to `.env.example` or prefix it with `NEXT_PUBLIC_`.

## What works in this prototype

- Six UAE-inspired theme worlds with server-owned, versioned prompts
- Browser camera access, framing guide, countdown, still capture, upload fallback, and retake
- Validated multipart photo uploads with a 10 MB limit
- Private local source and result storage under `.local-data/portraits/`
- Gemini Nano Banana image editing through the official `@google/genai` SDK
- Immediate long-token result URL and real QR code
- Honest `queued`, `generating`, `processing`, `completed`, and `failed` states
- Shareable `/p/<token>` result page that updates while processing
- Optional email review/confirmation interaction kept separate from generation
- Download, local-file deletion, next-person reset, inactivity reset, mobile layouts, and reduced-motion support
- Six polished prompt definitions in `prompts/`

## Generation flow

1. The browser crops a camera capture to a 1024 × 1024 JPEG, or accepts a JPEG, PNG, or WebP upload.
2. `POST /api/jobs` validates the theme, upload size, MIME type, and file signature.
3. The source is stored outside `public/` in the configured local storage directory.
4. A server-only worker composes the selected prompt and sends the source image to Gemini.
5. The generated image is stored locally and served through the unguessable `/api/jobs/<token>/image` route.
6. Source, result, and metadata are deleted when the visitor uses Delete or when the seven-day timer expires.

The Gemini key never reaches browser JavaScript. The interaction also sets `store: false`; review the data terms and controls for the Google account used at the event.

## Production integration boundary

The included worker and filesystem storage are designed for one local booth computer. An in-process task is not durable on serverless hosting. Before deploying across machines, replace the local job store with durable Supabase records/private object storage and enqueue a Trigger.dev task. The production worker should:

1. Validate the session, booth authorization, theme ID, image type, dimensions, and size.
2. Store the original in a private bucket and write the job record.
3. Resolve the selected theme through `lib/theme-prompts.ts`, which composes the server-only definitions in `prompts/`, and use the result with an image editing endpoint.
4. Apply the approved KU AI Club frame/logo programmatically.
5. Store the output privately, update the job, and delete the input after the retry window.
6. Send an optional Resend email using a unique idempotency key.

`gemini-3.1-flash-image` is the configured default. Google does not offer Gemini image-generation API usage on the Free Tier, so the key must belong to a Paid Tier project. Confirm model access, rate limits, latency, output quality, and billed cost in the event account before benchmarking. Never expose provider, email, or privileged database keys to the browser.

The text lockup included in this prototype is an original placeholder. Replace it with the university-approved AI Club asset before the event.

## Generated assets

The six theme portraits in `public/images/` are local preview assets. Confirm that every event asset has the required display permissions before launch.
