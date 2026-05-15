// Shared theme tokens for the anime sci-fi UI.
export const colors = {
  bg: "#0A0B10",
  surface: "#13151F",
  surfaceGlass: "rgba(19, 21, 31, 0.78)",
  panel: "#1A1D2B",
  primary: "#00F0FF",
  primaryDark: "#008A99",
  primaryGlow: "rgba(0, 240, 255, 0.5)",
  secondary: "#FFB800",
  secondaryGlow: "rgba(255, 184, 0, 0.55)",
  powerRed: "#FF003C",
  deepPurple: "#8A2BE2",
  neonMagenta: "#FF00FF",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A5B5",
  textDisabled: "#4A4D5E",
  borderDefault: "#2A2D3E",
  borderActive: "#00F0FF",
  success: "#00FF94",
};

export const radii = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const ASSETS = {
  orb: "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/c3cc13176f6051b7f843d21de4b15ea7a52be64704b5e34bb63ced746a1759f7.png",
  trainingDojo:
    "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/c19b93140327b18ff0cde17f43b29b6582840454710ec85d9a65a55840a5f46c.png",
  spiritGenerator:
    "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/f665e9abb851de823a6b2fe8a485f08c00572357227553cd0324c5beaab6c756.png",
  crystalMine:
    "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/4d5612ff4d88a5c45a249df4c09f334cb52d55ac892306e29103640589d9356e.png",
  avatar:
    "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/293322ff96f51893e1143d1649de6d6b28a81c9cc66203d474cad34f84862ade.png",
  background:
    "https://static.prod-images.emergentagent.com/jobs/077a29af-05c5-4b99-ba0a-30edce77a67a/images/a3ca0d6da672542e6b72917a829c7990b685e609aad08f037925d0f56e073483.png",
};

export const BUILDING_IMAGES: Record<string, string> = {
  training_dojo: ASSETS.trainingDojo,
  spirit_generator: ASSETS.spiritGenerator,
  crystal_mine: ASSETS.crystalMine,
  energy_reactor: ASSETS.spiritGenerator,
  power_temple: ASSETS.trainingDojo,
};
