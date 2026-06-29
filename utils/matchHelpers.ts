export interface Match {
  id: number;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  utcDate: string;
  homeTeam: { id: number; name: string; shortName: string };
  awayTeam: { id: number; name: string; shortName: string };
  score: {
    winner: string | null;
    duration: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  referee: { name: string; nationality: string } | null;
  minute: number | null;
}

export function isLive(match: Match): boolean {
  return match.status === "IN_PLAY" || match.status === "PAUSED";
}

export function isFinished(match: Match): boolean {
  return match.status === "FINISHED";
}

export function isScheduled(match: Match): boolean {
  return match.status === "SCHEDULED" || match.status === "TIMED";
}

export function isPlaceholder(teamName: string): boolean {
  return !teamName || teamName.startsWith("Winner") || teamName === "TBD";
}

export function formatDate(utcDate: string): string {
  if (!utcDate) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(utcDate));
}

export function formatDateShort(utcDate: string): string {
  if (!utcDate) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
  }).format(new Date(utcDate));
}
