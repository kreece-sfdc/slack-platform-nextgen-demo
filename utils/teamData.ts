import { ALL_TEAMS } from "./tournament.ts";
import { getFlag } from "./flags.ts";

export const APISPORTS_IDS: Record<string, number> = {
  "Mexico": 16, "Brazil": 6, "USA": 2384, "Germany": 25,
  "Netherlands": 1118, "Belgium": 1, "Spain": 9, "France": 2,
  "Argentina": 26, "Portugal": 27, "England": 10, "Canada": 5529,
  "Switzerland": 15, "Morocco": 31, "Australia": 20, "Japan": 12,
  "Ecuador": 2382, "Senegal": 13, "Croatia": 3, "Uruguay": 7,
  "Colombia": 8, "Norway": 1090, "Austria": 775, "Ghana": 1504,
};

export const FD_IDS: Record<string, number> = {
  "Mexico": 769, "Brazil": 764, "USA": 771, "Germany": 759,
  "Netherlands": 8601, "Belgium": 805, "Spain": 760, "France": 773,
  "Argentina": 762, "Portugal": 765, "England": 770, "Canada": 828,
  "Switzerland": 788, "Morocco": 815, "Australia": 779, "Japan": 766,
  "Ecuador": 791, "Senegal": 804, "Croatia": 799, "Uruguay": 758,
  "Colombia": 818, "Norway": 8872, "Austria": 816, "Ghana": 763,
};

export interface TeamInfo {
  name: string;
  group: string;
  flag: string;
  apiSportsId: number | null;
  fdId: number | null;
}

export function resolveTeam(name: string): TeamInfo | null {
  const entry = ALL_TEAMS.find((t) => t.name === name);
  if (!entry) return null;
  return {
    name,
    group: entry.group,
    flag: getFlag(name),
    apiSportsId: APISPORTS_IDS[name] ?? null,
    fdId: FD_IDS[name] ?? null,
  };
}
