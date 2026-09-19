import { barjeelAfterDarkPrompt } from "./barjeel-after-dark";
import { falconFrequencyPrompt } from "./falcon-frequency";
import { karakClubPrompt } from "./karak-club";
import { liwaDriftPrompt } from "./liwa-drift";
import { mangroveMiragePrompt } from "./mangrove-mirage";
import { pearlProtocolPrompt } from "./pearl-protocol";

export type PortraitPrompt = {
  version: string;
  prompt: string;
};

export const sharedPortraitPrompt = `Transform the supplied portrait into the selected visual theme.
Preserve the same person's identity: facial structure, skin tone, age, expression, hairstyle, facial hair, and other distinctive visible features.
Preserve glasses, accessibility devices, jewelry, and head coverings when present. Keep one person with a clear, centered head-and-shoulders composition.
Preserve the subject's pose, body proportions, and the coverage of their original clothing. Keep both eyes visible and render hands naturally when they appear.
Create a polished, inviting portrait with a clean focal point and a visually rich but secondary background.
Do not add extra people, duplicate features, text, letters, logos, signatures, borders, or watermarks.`;

export const portraitPrompts = {
  "liwa-drift": liwaDriftPrompt,
  "pearl-protocol": pearlProtocolPrompt,
  "falcon-frequency": falconFrequencyPrompt,
  "barjeel-after-dark": barjeelAfterDarkPrompt,
  "mangrove-mirage": mangroveMiragePrompt,
  "karak-club": karakClubPrompt,
} satisfies Record<string, PortraitPrompt>;

export type PortraitPromptId = keyof typeof portraitPrompts;

export function buildPortraitPrompt(themeId: PortraitPromptId) {
  return `${sharedPortraitPrompt}\n\nSELECTED THEME:\n${portraitPrompts[themeId].prompt}`;
}
