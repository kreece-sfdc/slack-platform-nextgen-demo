import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { APISPORTS_IDS } from "../utils/teamData.ts";
import { getFlag } from "../utils/flags.ts";

export const AiGetPlayersDefinition = DefineFunction({
  callback_id: "ai_get_players",
  title: "Get World Cup squad for a team",
  description:
    "Returns the squad list for a FIFA World Cup 2026 team, grouped by position. Use this when a user asks about players, squad, roster, or who is in the team.",
  source_file: "functions/ai_get_players.ts",
  input_parameters: {
    properties: {
      team_name: {
        type: Schema.types.string,
        description:
          "The name of the World Cup team, e.g. England, Brazil, USA",
      },
    },
    required: ["team_name"],
  },
  output_parameters: {
    properties: {
      response: {
        type: Schema.types.string,
        description: "Formatted squad list grouped by position",
      },
    },
    required: ["response"],
  },
});

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
const POSITION_EMOJI: Record<string, string> = {
  Goalkeeper: "🧤", Defender: "🛡️", Midfielder: "⚙️", Attacker: "⚡",
};

export default SlackFunction(
  AiGetPlayersDefinition,
  async ({ inputs, env }) => {
    const name = inputs.team_name.trim();
    const apiSportsId = APISPORTS_IDS[name];
    const flag = getFlag(name);

    if (!apiSportsId) {
      return { outputs: { response: `No squad data available for ${name}.` } };
    }

    const key = env["APISPORTS_KEY"] || "";
    if (!key) {
      return { outputs: { response: "Player data is not configured." } };
    }

    const resp = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${apiSportsId}`,
      { headers: { "x-apisports-key": key } },
    );
    if (!resp.ok) {
      return { outputs: { response: "Unable to fetch squad data right now." } };
    }

    const data = await resp.json();
    // deno-lint-ignore no-explicit-any
    const players: any[] = data.response?.[0]?.players || [];

    if (!players.length) {
      return { outputs: { response: `No squad data available for ${name} yet.` } };
    }

    const byPosition: Record<string, typeof players> = {};
    for (const p of players) {
      const pos = p.position || "Unknown";
      if (!byPosition[pos]) byPosition[pos] = [];
      byPosition[pos].push(p);
    }
    for (const pos of Object.keys(byPosition)) {
      byPosition[pos].sort((a, b) => (a.number || 99) - (b.number || 99));
    }

    const lines: string[] = [`${flag} *${name} — World Cup 2026 Squad*\n`];

    for (const pos of POSITION_ORDER) {
      const group = byPosition[pos];
      if (!group?.length) continue;
      const emoji = POSITION_EMOJI[pos] || "👤";
      lines.push(`${emoji} *${pos}s*`);
      for (const p of group) {
        const num = p.number ? `#${p.number}` : "—";
        lines.push(`  ${num}  ${p.name}  (age ${p.age || "?"})`);
      }
      lines.push("");
    }

    return { outputs: { response: lines.join("\n") } };
  },
);
