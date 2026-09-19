import { GoogleGenAI } from "@google/genai";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

const geminiRuntime = globalThis as typeof globalThis & {
  __alterEgoGeminiImageBlockReason?: string;
};

export function getGeminiImageModel() {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

export function isGeminiImageConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiImageBlockReason() {
  return geminiRuntime.__alterEgoGeminiImageBlockReason;
}

export function blockGeminiImageGeneration(reason: string) {
  geminiRuntime.__alterEgoGeminiImageBlockReason = reason;
}

export async function editPortraitWithGemini(options: {
  input: Buffer;
  inputMimeType: string;
  prompt: string;
  signal?: AbortSignal;
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  });

  const interaction = await ai.interactions.create(
    {
      model: getGeminiImageModel(),
      input: [
        {
          type: "text",
          text: `${options.prompt}\n\nEdit the supplied source portrait according to these instructions. Return exactly one finished square portrait image and no explanatory text.`,
        },
        {
          type: "image",
          data: options.input.toString("base64"),
          mime_type: options.inputMimeType,
        },
      ],
      response_format: [
        {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "1:1",
          image_size: "1K",
        },
      ],
      store: false,
    },
    {
      timeout: REQUEST_TIMEOUT_MS,
      fetchOptions: options.signal ? { signal: options.signal } : undefined,
    },
  );

  const image = interaction.output_image;
  if (!image?.data) {
    throw new Error(`Gemini returned no image (status: ${interaction.status}).`);
  }

  const data = Buffer.from(image.data, "base64");
  if (data.length === 0) throw new Error("Gemini returned an empty image.");

  return {
    data,
    mimeType: image.mime_type || "image/jpeg",
  };
}
