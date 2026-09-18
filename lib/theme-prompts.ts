import type { ThemeId } from "./themes";

export const sharedPortraitPrompt = `Transform the supplied portrait into the visual style described below.
Keep the same person recognizable through their facial structure, skin tone, expression, and distinctive visible features.
Preserve glasses and head coverings if present. Keep one person, a clear face, and a centered head-and-shoulders composition.
Preserve the coverage of the original clothing. Apply the theme through illustration style, lighting, and environment.
Keep the eyes visible and avoid obscuring the face with effects. Do not add text, logos, signatures, or watermarks.`;

export const themePrompts: Record<ThemeId, { version: string; prompt: string }> = {
  cyberpunk: {
    version: "1",
    prompt:
      "Create a cinematic portrait in a futuristic neon city at night. Use cyan and magenta rim lighting, rain reflections, distant holographic shapes, and a richly detailed urban background. Keep the face unobstructed and recognizable. Add subtle futuristic styling to the environment and accessories while preserving the subject's pose and clothing coverage.",
  },
  mysterious: {
    version: "1",
    prompt:
      "Create an atmospheric cinematic portrait surrounded by moonlit fog. Use deep indigo and muted violet tones, a softly illuminated ancient doorway in the background, and subtle floating light particles. Keep the face clearly visible with gentle directional light. The mood is intriguing and elegant, with natural facial proportions.",
  },
  doodle: {
    version: "1",
    prompt:
      "Turn the portrait into a recognizable hand-drawn illustration. Use bold ink outlines, expressive but faithful facial features, playful colorful scribbles, stars, arrows, and a light sketchbook background. Keep the face as the main focus. Arrange decorative doodles around the person without covering the eyes or replacing distinctive features.",
  },
};
