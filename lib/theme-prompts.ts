import type { ThemeId } from "./themes";
import {
  buildPortraitPrompt,
  portraitPrompts,
  sharedPortraitPrompt,
} from "../prompts";

export { sharedPortraitPrompt };

export const themePrompts: Record<ThemeId, { version: string; prompt: string }> = {
  "liwa-drift": portraitPrompts["liwa-drift"],
  "pearl-protocol": portraitPrompts["pearl-protocol"],
  "falcon-frequency": portraitPrompts["falcon-frequency"],
  "barjeel-after-dark": portraitPrompts["barjeel-after-dark"],
  "mangrove-mirage": portraitPrompts["mangrove-mirage"],
  "karak-club": portraitPrompts["karak-club"],
};

export function buildThemePrompt(themeId: ThemeId) {
  return buildPortraitPrompt(themeId);
}
