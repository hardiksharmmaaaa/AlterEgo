# KU Alter Ego

A touchscreen-friendly AI portrait booth prototype for Khalifa University AI Club. Visitors choose a universe, capture or upload a selfie, get an immediate private result link by QR code, and see the portrait reveal when processing finishes.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Camera access works on `localhost`; deployed camera access requires HTTPS.

## What works in this prototype

- Three branded theme worlds: Cyberpunk, Mysterious, and Doodle
- Browser camera access, framing guide, countdown, still capture, upload fallback, and retake
- Immediate long-token result URL and real QR code
- Honest `queued`, `generating`, and `completed` states (no fake percentage)
- Shareable `/p/<token>` result page that updates while processing
- Optional email review/confirmation interaction kept separate from generation
- Download, delete, next-person reset, inactivity reset, mobile layouts, and reduced-motion support
- Server-owned, versioned theme prompts

The included job route is an intentionally self-contained demo adapter. It keeps jobs in server memory and returns the generated theme sample after a short queue. The booth UI labels itself as an interactive demo, and does not claim that the captured selfie has been sent to an AI provider.

## Production integration boundary

Replace `app/api/jobs/route.ts` with durable Supabase job creation and enqueue a Trigger.dev task. The worker should:

1. Validate the session, booth authorization, theme ID, image type, dimensions, and size.
2. Store the original in a private bucket and write the job record.
3. Use the server-only prompt in `lib/theme-prompts.ts` with an image editing endpoint.
4. Apply the approved KU AI Club frame/logo programmatically.
5. Store the output privately, update the job, and delete the input after the retry window.
6. Send an optional Resend email using a unique idempotency key.

`gpt-image-2` is the current default in `.env.example`; confirm model access and limits in the event account before benchmarking. Never expose provider, email, or privileged database keys to the browser.

The text lockup included in this prototype is an original placeholder. Replace it with the university-approved AI Club asset before the event.

## Generated assets

The three theme portraits in `public/images/` were created specifically for this project with the built-in image generation tool. They contain no text, logos, or real visitor identity.
