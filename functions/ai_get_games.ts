import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FD_IDS } from "../utils/teamData.ts";
import { getFlag } from "../utils/flags.ts";
import {
  Match,
  isLive,
  isFinished,
  isScheduled,
  formatDate,
} from "../utils/matchHelpers.ts";

export const AiGetGamesDefinition = DefineFunction({
  callback_id: "ai_get_games",
  title: "Get World Cup games for a team",
  description:
    "Returns upcoming fixtures and recent results for a FIFA World Cup 2026 team. Use this when a user asks about a team's schedule, next game, last result, or match history.",
  source_file: "functions/ai_get_games.ts",
  input_parameters: {
    properties: {
      team_name: {
        type: Schema.types.string,
        description:
          "The name of the World Cup team, e.g. England, Brazil, USA, France",
      },
    },
    required: ["team_name"],
  },
  output_parameters: {
    properties: {
      response: {
        type: Schema.types.string,
        description: "Formatted match information for the team",
      },
    },
    required: ["response"],
  },
});

export default SlackFunction(
  AiGetGamesDefinition,
  async ({ inputs, env }) => {
    const name = inputs.team_name.trim();
    const fdId = FD_IDS[name];

    const key = env["FOOTBALL_DATA_API_KEY"] || "";
    const resp = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": key } },
    );
    if (!resp.ok) {
      return { outputs: { response: `Unable to fetch match data right now.` } };
    }

    const data = await resp.json();
    // deno-lint-ignore no-explicit-any
    const all: Match[] = (data.matches || []).map((m: any) => ({
      id: m.id,
      status: m.status,
      matchday: m.matchday ?? null,
      stage: m.stage,
      group: m.group ?? null,
      utcDate: m.utcDate,
      homeTeam: { id: m.homeTeam?.id, name: m.homeTeam?.name || "", shortName: m.homeTeam?.tla || "" },
      awayTeam: { id: m.awayTeam?.id, name: m.awayTeam?.name || "", shortName: m.awayTeam?.tla || "" },
      score: {
        winner: m.score?.winner ?? null,
        duration: m.score?.duration ?? null,
        fullTime: m.score?.fullTime || { home: null, away: null },
        halfTime: m.score?.halfTime || { home: null, away: null },
      },
      referee: m.referees?.[0] ? { name: m.referees[0].name, nationality: m.referees[0].nationality } : null,
      minute: m.minute ?? null,
    }));

    const NAME_MAP: Record<string, string> = { "USA": "United States" };
    const apiName = NAME_MAP[name] || name;

    const matches = fdId
      ? all.filter((m) => m.homeTeam.id === fdId || m.awayTeam.id === fdId)
      : all.filter((m) => m.homeTeam.name === apiName || m.awayTeam.name === apiName);

    if (!matches.length) {
      return { outputs: { response: `No matches found for ${name} in World Cup 2026.` } };
    }

    const flag = getFlag(name);
    const lines: string[] = [`${flag} *${name} — World Cup 2026 Matches*\n`];

    const live = matches.filter(isLive);
    const upcoming = matches.filter(isScheduled)
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    const past = matches.filter(isFinished)
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

    if (live.length) {
      lines.push("🔴 *Live Now*");
      for (const m of live) lines.push(matchLine(m, name));
    }

    if (upcoming.length) {
      lines.push("📅 *Upcoming*");
      for (const m of upcoming) lines.push(matchLine(m, name));
    }

    if (past.length) {
      lines.push("📋 *Results*");
      for (const m of past) lines.push(matchLine(m, name));
    }

    return { outputs: { response: lines.join("\n") } };
  },
);

function matchLine(match: Match, teamName: string): string {
  const home = match.homeTeam.name || "TBD";
  const away = match.awayTeam.name || "TBD";
  const hFlag = getFlag(home);
  const aFlag = getFlag(away);
  const date = formatDate(match.utcDate);
  const stage = match.stage === "GROUP_STAGE"
    ? `Group ${match.group?.replace("GROUP_", "") || ""}`
    : match.stage?.replace(/_/g, " ") || "";

  if (isFinished(match)) {
    const h = match.score.fullTime.home;
    const a = match.score.fullTime.away;
    const NAME_MAP: Record<string, string> = { "USA": "United States" };
    const apiName = NAME_MAP[teamName] || teamName;
    const isHome = match.homeTeam.name === apiName;
    const ts = isHome ? h : a;
    const os = isHome ? a : h;
    const result = ts !== null && os !== null
      ? ts > os ? " 🟢 Win" : ts < os ? " 🔴 Loss" : " 🟡 Draw"
      : "";
    return `  ${hFlag} ${home} *${h}–${a}* ${aFlag} ${away}${result} — ${date} · ${stage}`;
  }

  if (isLive(match)) {
    const h = match.score.fullTime.home ?? 0;
    const a = match.score.fullTime.away ?? 0;
    return `  ${hFlag} ${home} *${h}–${a}* ${aFlag} ${away} 🔴 — ${stage}`;
  }

  return `  ${hFlag} ${home} vs ${aFlag} ${away} — ${date} · ${stage}`;
}
