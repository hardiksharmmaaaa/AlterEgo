export type ThemeId =
  | "liwa-drift"
  | "pearl-protocol"
  | "falcon-frequency"
  | "barjeel-after-dark"
  | "mangrove-mirage"
  | "karak-club";

export type Theme = {
  id: ThemeId;
  name: string;
  shortName: string;
  description: string;
  image: string;
  accent: string;
  glow: string;
  backdrop: string;
};

export const themes: Theme[] = [
  {
    id: "liwa-drift",
    name: "Liwa Drift",
    shortName: "Dune velocity",
    description: "Sunset dunes, heat haze, and full-send desert energy.",
    image: "/images/liwa-drift.jpg",
    accent: "#ff9d42",
    glow: "#ff4f7a",
    backdrop: "#1b0d1e",
  },
  {
    id: "pearl-protocol",
    name: "Pearl Protocol",
    shortName: "Gulf iridescence",
    description: "Pearl-diving heritage reimagined as an underwater future.",
    image: "/images/pearl-protocol.jpg",
    accent: "#8ff5ff",
    glow: "#c7a7ff",
    backdrop: "#071d2d",
  },
  {
    id: "falcon-frequency",
    name: "Falcon Frequency",
    shortName: "Skyline instinct",
    description: "Mountain air, copper light, and a falcon built for speed.",
    image: "/images/falcon-frequency.jpg",
    accent: "#ffb052",
    glow: "#4c9fff",
    backdrop: "#111b2b",
  },
  {
    id: "barjeel-after-dark",
    name: "Barjeel After Dark",
    shortName: "Midnight architecture",
    description: "Wind towers, moonlight, and impossible courtyard geometry.",
    image: "/images/barjeel-after-dark.jpg",
    accent: "#d8e4ff",
    glow: "#ffbf69",
    backdrop: "#0d1324",
  },
  {
    id: "mangrove-mirage",
    name: "Mangrove Mirage",
    shortName: "Tidal future",
    description: "Bioluminescent water and Abu Dhabi roots after twilight.",
    image: "/images/mangrove-mirage.jpg",
    accent: "#63ffd1",
    glow: "#a69cff",
    backdrop: "#071c1c",
  },
  {
    id: "karak-club",
    name: "Karak Club",
    shortName: "1 a.m. energy",
    description: "Hot karak, wet neon, and one more story before home.",
    image: "/images/karak-club.jpg",
    accent: "#ffb24d",
    glow: "#ff4ead",
    backdrop: "#241023",
  },
];

export function getTheme(id: string | null | undefined) {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}
