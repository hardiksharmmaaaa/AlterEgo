import assert from "node:assert/strict";
import test from "node:test";
import { classifyGeminiProviderError } from "../lib/server/gemini-provider-error.ts";

test("treats a zero Free Tier quota as a permanent billing configuration error", () => {
  const providerError = Object.assign(
    new Error(
      "Rate limit exceeded for model gemini-3.1-flash-image (limit: 0 input tokens per minute on Free Tier). Please upgrade your tier.",
    ),
    {
    status: 429,
    headers: new Headers({ "retry-after": "50" }),
      body: '{"error":{"code":"too_many_requests"}}',
    },
  );
  const failure = classifyGeminiProviderError(providerError);

  assert.equal(failure.code, "billing_required");
  assert.equal(failure.retryable, false);
  assert.match(failure.message, /paid tier/i);
});

test("keeps an ordinary temporary 429 retryable and preserves Retry-After", () => {
  const failure = classifyGeminiProviderError({
    statusCode: 429,
    headers: new Headers({ "retry-after": "12" }),
    message: "Rate limit exceeded. Try again later.",
  });

  assert.equal(failure.code, "rate_limited");
  assert.equal(failure.retryable, true);
  assert.equal(failure.retryAfterSeconds, 12);
});
