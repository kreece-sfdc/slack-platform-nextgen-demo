import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { getFlag } from "../utils/flags.ts";
import { Match, isFinished, isLive, isScheduled, formatDateShort } from "../utils/matchHelpers.ts";

export const AiGetBracketDefinition = DefineFunction({
  callback_id: "ai_get_bracket",
  title: "Get World Cup knockout bracket",
  description:
    "Returns the current knockout stage bracket for FIFA World Cup 2026. Use this when a user asks about the knockout stages, Round of 32, Round of 16, quarter-finals, semi-finals, or the final.",
  source_file: "functions/ai_get_bracket.ts",
  input_parameters: {
    properties: {},
    required: [],
  },
  output_parameters: {
    properties: {
      response: {
        type: Schema.types.string,
        description: "Formatted knockout bracket",
      },
    },
    required: ["response"],
  },
});

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};
const STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];

export default SlackFunction(
  AiGetBracketDefinition,
  async ({ env }) => {
    const key = env["FOOTBALL_DATA_API_KEY"] || "";
    const resp = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": key } },
    );
    if (!resp.ok) {
      return { outputs: { response: "Unable to fetch bracket data right now." } };
    }

    const data = await resp.json();
    // deno-lint-ignore no-explicit-any
    const all: Match[] = (data.matches || []).map((m: any) => ({
      id: m.id, status: m.status, matchday: m.matchday ?? null,
      stage: m.stage, group: m.group ?? null, utcDate: m.utcDate,
      homeTeam: { id: m.homeTeam?.id, name: m.homeTeam?.name || "", shortName: m.homeTeam?.tla || "" },
      awayTeam: { id: m.awayTeam?.id, name: m.awayTeam?.name || "", shortName: m.awayTeam?.tla || "" },
      score: {
        winner: m.score?.winner ?? null, duration: m.score?.duration ?? null,
        fullTime: m.score?.fullTime || { home: null, away: null },
        halfTime: m.score?.halfTime || { home: null, away: null },
      },
      referee: null, minute: null,
    }));

    const knockout = all.filter(
      (m) => m.stage !== "GROUP_STAGE" && m.stage !== "PRELIMINARY_ROUND",
    );

    if (!knockout.length) {
      return { outputs: { response: "The knockout bracket is not yet available. Check back once the group stage is complete." } };
    }

    const byStage: Record<string, Match[]> = {};
    for (const m of knockout) {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    }

    const lines: string[] = ["🏆 *World Cup 2026 — Knockout Bracket*\n"];

    for (const stage of STAGE_ORDER) {
      if (!byStage[stage]) continue;
      lines.push(`*${STAGE_LABELS[stage] || stage}*`);
      for (const m of byStage[stage]) {
        const home = m.homeTeam.name || "TBD";
        const away = m.awayTeam.name || "TBD";
        const hFlag = m.homeTeam.name ? getFlag(home) : "";
        const aFlag = m.awayTeam.name ? getFlag(away) : "";
        if (isFinished(m)) {
          lines.push(`  ${hFlag} ${home} *${m.score.fullTime.home}–${m.score.fullTime.away}* ${aFlag} ${away}`);
        } else if (isLive(m)) {
          lines.push(`  ${hFlag} ${home} *${m.score.fullTime.home ?? 0}–${m.score.fullTime.away ?? 0}* ${aFlag} ${away} 🔴`);
        } else {
          const date = isScheduled(m) ? ` — ${formatDateShort(m.utcDate)}` : "";
          lines.push(`  ${hFlag ? hFlag + " " : ""}${home} vs ${aFlag ? aFlag + " " : ""}${away}${date}`);
        }
      }
      lines.push("");
    }

    return { outputs: { response: lines.join("\n") } };
  },
);
