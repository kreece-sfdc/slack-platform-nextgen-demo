export const GROUPS: Record<string, { teams: string[] }> = {
  A: { teams: ["Mexico", "South Africa", "Korea Republic", "Winner Play-off D"] },
  B: { teams: ["Canada", "Winner Play-off A", "Qatar", "Switzerland"] },
  C: { teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  D: { teams: ["USA", "Paraguay", "Australia", "Winner Play-off C"] },
  E: { teams: ["Germany", "Curaçao", "Côte d'Ivoire", "Ecuador"] },
  F: { teams: ["Netherlands", "Japan", "Winner Play-off B", "Tunisia"] },
  G: { teams: ["Belgium", "Egypt", "IR Iran", "New Zealand"] },
  H: { teams: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"] },
  I: { teams: ["France", "Senegal", "Winner Play-off 2", "Norway"] },
  J: { teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  K: { teams: ["Portugal", "Winner Play-off 1", "Uzbekistan", "Colombia"] },
  L: { teams: ["England", "Croatia", "Ghana", "Panama"] },
};

export const ALL_TEAMS: { name: string; group: string }[] = Object.entries(GROUPS).flatMap(
  ([group, { teams }]) =>
    teams
      .filter((t) => !t.startsWith("Winner"))
      .map((name) => ({ name, group })),
);
