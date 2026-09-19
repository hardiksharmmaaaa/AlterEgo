# Portrait prompts

This server-owned catalog contains six concise prompts for transforming a visitor photo:

1. Liwa Drift
2. Pearl Protocol
3. Falcon Frequency
4. Barjeel After Dark
5. Mangrove Mirage
6. Karak Club

Each theme file contains only its visual direction. `index.ts` adds the shared identity, composition, and safety instructions through `buildPortraitPrompt(themeId)`.

`lib/theme-prompts.ts` maps every selectable theme ID to this catalog and composes the selected direction with the shared portrait rules before the photo is sent to Gemini.

Keep this folder on the server. The browser should send only an approved theme ID, never arbitrary prompt text.
