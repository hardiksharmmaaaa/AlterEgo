export type ThemeId = "cyberpunk" | "mysterious" | "doodle";

export type Theme = {
  id: ThemeId;
  name: string;
  shortName: string;
  description: string;
  image: string;
  accent: string;
  number: string;
};

export const themes: Theme[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    shortName: "Neon future",
    description: "Neon city. Future-you energy.",
    image: "/images/cyberpunk.png",
    accent: "#4DECF5",
    number: "01",
  },
  {
    id: "mysterious",
    name: "Mysterious",
    shortName: "Moonlit myth",
    description: "Moonlit fog. Cinematic presence.",
    image: "/images/mysterious.png",
    accent: "#A98BFF",
    number: "02",
  },
  {
    id: "doodle",
    name: "Doodle",
    shortName: "Drawn different",
    description: "Bold lines. Maximum personality.",
    image: "/images/doodle.png",
    accent: "#FFCF40",
    number: "03",
  },
];

export function getTheme(id: string | null | undefined) {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}
