import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { getFlag } from "../utils/flags.ts";

export const AiGetStandingsDefinition = DefineFunction({
  callback_id: "ai_get_standings",
  title: "Get World Cup group standings",
  description:
    "Returns the current group stage standings for a FIFA World Cup 2026 team or group. Use this when a user asks about standings, league table, group position, points, or how a team is doing in their group.",
  source_file: "functions/ai_get_standings.ts",
  input_parameters: {
    properties: {
      team_name: {
        type: Schema.types.string,
        description:
          "The name of the World Cup team to look up standings for, e.g. England, Brazil, USA",
      },
    },
    required: ["team_name"],
  },
  output_parameters: {
    properties: {
      response: {
        type: Schema.types.string,
        description: "Formatted group standings table",
      },
    },
    required: ["response"],
  },
});

export default SlackFunction(
  AiGetStandingsDefinition,
  async ({ inputs, env }) => {
    const name = inputs.team_name.trim();
    const NAME_MAP: Record<string, string> = { "USA": "United States" };
    const lookup = NAME_MAP[name] || name;

    const key = env["FOOTBALL_DATA_API_KEY"] || "";
    const resp = await fetch(
      "https://api.football-data.org/v4/competitions/WC/standings",
      { headers: { "X-Auth-Token": key } },
    );
    if (!resp.ok) {
      return { outputs: { response: "Unable to fetch standings right now." } };
    }

    const data = await resp.json();
    // deno-lint-ignore no-explicit-any
    const standings: any[] = data?.standings || [];

    // deno-lint-ignore no-explicit-any
    const group = standings.find((g: any) =>
      g.table?.some((row: any) => row.team?.name === lookup)
    );

    if (!group?.table?.length) {
      return {
        outputs: {
          response: `No standings found for ${name}. The group stage may not have started yet.`,
        },
      };
    }

    const groupLetter = group.group?.replace("GROUP_", "") || "?";
    const flag = getFlag(name);
    const lines: string[] = [`${flag} *Group ${groupLetter} Standings*\n`];

    // deno-lint-ignore no-explicit-any
    group.table.forEach((row: any, i: number) => {
      const rowFlag = getFlag(row.team?.name) || "  ";
      const gd = row.goalDifference >= 0 ? `+${row.goalDifference}` : String(row.goalDifference);
      const marker = row.team?.name === lookup ? " ◀" : "";
      lines.push(
        `${i + 1}. ${rowFlag} *${row.team?.name}*${marker}  P:${row.playedGames}  W:${row.won}  D:${row.draw}  L:${row.lost}  GD:${gd}  *${row.points} pts*`,
      );
    });

    return { outputs: { response: lines.join("\n") } };
  },
);
