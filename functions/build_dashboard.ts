import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import UsersDatastore from "../datastores/users_datastore.ts";
import { GROUPS } from "../utils/tournament.ts";
import { getFlag, getFlagImageUrl } from "../utils/flags.ts";
import { resolveTeam } from "../utils/teamData.ts";
import {
  Match,
  isLive,
  isFinished,
  isScheduled,
  formatDate,
  formatDateShort,
} from "../utils/matchHelpers.ts";

export const BuildDashboardDefinition = DefineFunction({
  callback_id: "build_dashboard",
  title: "Build dashboard",
  description: "Opens the World Cup dashboard modal",
  source_file: "functions/build_dashboard.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["interactivity"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

export default SlackFunction(
  BuildDashboardDefinition,
  async ({ inputs, client, env }) => {
    const userId = inputs.interactivity.interactor.id;
    const fdKey = env["FOOTBALL_DATA_API_KEY"] || "";
    const apiSportsKey = env["APISPORTS_KEY"] || "";

    const record = await getUser(client, userId);
    const view = record?.teamName
      ? await buildDashboardModal(
          record.teamName as string,
          (record.teamGroup as string) || "",
          (record.teamFdId as number) || null,
          (record.teamApiSportsId as number) || null,
          (record.activeTab as string) || "myGames",
          fdKey,
          apiSportsKey,
        )
      : buildTeamSelectModal();

    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view,
    });

    return { completed: false };
  },
)
  // ── Tab switching ────────────────────────────────────────────────────────────
  .addBlockActionsHandler(
    /^tab_/,
    async ({ action, body, client, env }) => {
      const userId = body.interactivity.interactor.id;
      const viewId = body.view?.id;
      const newTab = action.action_id.replace("tab_", "");
      const fdKey = env["FOOTBALL_DATA_API_KEY"] || "";
      const apiSportsKey = env["APISPORTS_KEY"] || "";

      // Consume the pointer immediately
      await client.views.update({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: loadingModal("Loading..."),
      });

      const record = await getUser(client, userId);
      if (!record?.teamName) return;

      await saveUser(client, userId, {
        teamName: record.teamName as string,
        teamGroup: (record.teamGroup as string) || "",
        teamFdId: (record.teamFdId as number) || null,
        teamApiSportsId: (record.teamApiSportsId as number) || null,
        activeTab: newTab,
      });

      const view = await buildDashboardModal(
        record.teamName as string,
        (record.teamGroup as string) || "",
        (record.teamFdId as number) || null,
        (record.teamApiSportsId as number) || null,
        newTab,
        fdKey,
        apiSportsKey,
      );

      await client.views.update({ view_id: viewId, view });
    },
  )
  // ── Team selection ───────────────────────────────────────────────────────────
  .addBlockActionsHandler(
    /^select_team_/,
    async ({ action, body, client, env }) => {
      const userId = body.interactivity.interactor.id;
      const viewId = body.view?.id;
      const teamName = action.value || "";
      const info = resolveTeam(teamName);
      if (!info) return;
      const fdKey = env["FOOTBALL_DATA_API_KEY"] || "";
      const apiSportsKey = env["APISPORTS_KEY"] || "";

      // Consume the pointer immediately with a loading state
      await client.views.update({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: loadingModal(`Loading ${info.name} dashboard...`),
      });

      await saveUser(client, userId, {
        teamName: info.name,
        teamGroup: info.group,
        teamFdId: info.fdId ?? null,
        teamApiSportsId: info.apiSportsId ?? null,
        activeTab: "myGames",
      });

      const view = await buildDashboardModal(
        info.name,
        info.group,
        info.fdId ?? null,
        info.apiSportsId ?? null,
        "myGames",
        fdKey,
        apiSportsKey,
      );

      // Use view_id for the second update — pointer is already consumed
      await client.views.update({ view_id: viewId, view });
    },
  )
  // ── Change team ──────────────────────────────────────────────────────────────
  .addBlockActionsHandler(
    "change_team",
    async ({ body, client }) => {
      const userId = body.interactivity.interactor.id;
      const viewId = body.view?.id;

      // deno-lint-ignore no-explicit-any
      await (client.apps.datastore.put as any)({
        datastore: "users",
        item: {
          userId,
          teamName: "",
          teamGroup: "",
          teamFdId: 0,
          teamApiSportsId: 0,
          activeTab: "myGames",
        },
      });

      await client.views.update({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: buildTeamSelectModal(),
      });

      // Fallback using view_id if pointer was already consumed
      if (viewId) {
        await client.views.update({ view_id: viewId, view: buildTeamSelectModal() });
      }
    },
  );

// ─── Datastore helpers ────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function getUser(client: any, userId: string) {
  // deno-lint-ignore no-explicit-any
  const resp = await (client.apps.datastore.get as any)({ datastore: "users", id: userId });
  return resp.ok ? resp.item : null;
}

async function saveUser(
  // deno-lint-ignore no-explicit-any
  client: any,
  userId: string,
  data: {
    teamName: string;
    teamGroup: string;
    teamFdId: number | null;
    teamApiSportsId: number | null;
    activeTab: string;
  },
) {
  // deno-lint-ignore no-explicit-any
  await (client.apps.datastore.put as any)({
    datastore: "users",
    item: {
      userId,
      teamName: data.teamName,
      teamGroup: data.teamGroup,
      teamFdId: data.teamFdId ?? 0,
      teamApiSportsId: data.teamApiSportsId ?? 0,
      activeTab: data.activeTab,
    },
  });
}

// ─── Loading modal ────────────────────────────────────────────────────────────

function loadingModal(message = "Loading..."): Record<string, unknown> {
  return {
    type: "modal",
    callback_id: "loading_modal",
    title: { type: "plain_text", text: "World Cup 2026", emoji: true },
    close: { type: "plain_text", text: "Close", emoji: true },
    blocks: [{
      type: "section",
      text: { type: "mrkdwn", text: `_${message}_` },
    }],
  };
}

// ─── Team-select modal ────────────────────────────────────────────────────────

function buildTeamSelectModal(): Record<string, unknown> {
  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Select your team from the list below.",
      },
    },
    { type: "divider" },
  ];

  for (const [groupCode, { teams }] of Object.entries(GROUPS)) {
    const qualified = teams.filter((t) => !t.startsWith("Winner"));
    if (!qualified.length) continue;

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Group ${groupCode}*` },
    });

    const elements = qualified.map((name) => ({
      type: "button",
      text: {
        type: "plain_text",
        text: `${getFlag(name)} ${name}`,
        emoji: true,
      },
      action_id: `select_team_${name.replace(/[^a-zA-Z0-9]/g, "_")}`,
      value: name,
    }));

    for (let i = 0; i < elements.length; i += 5) {
      blocks.push({ type: "actions", elements: elements.slice(i, i + 5) });
    }
  }

  return {
    type: "modal",
    callback_id: "team_select_modal",
    title: { type: "plain_text", text: "World Cup 2026", emoji: true },
    close: { type: "plain_text", text: "Close", emoji: true },
    blocks,
  };
}

// ─── Dashboard modal ──────────────────────────────────────────────────────────

const TABS = [
  { id: "groupStandings", label: "Standings" },
  { id: "myGames", label: "Games" },
  { id: "bracket", label: "Bracket" },
  { id: "players", label: "Players" },
] as const;

function tabBar(activeTab: string): Record<string, unknown> {
  return {
    type: "actions",
    elements: TABS.map((t) => ({
      type: "button",
      text: {
        type: "plain_text",
        text: activeTab === t.id ? `• ${t.label}` : t.label,
        emoji: true,
      },
      action_id: `tab_${t.id}`,
      style: activeTab === t.id ? "primary" : undefined,
    })),
  };
}

async function buildDashboardModal(
  teamName: string,
  teamGroup: string,
  fdId: number | null,
  apiSportsId: number | null,
  activeTab: string,
  fdKey: string,
  apiSportsKey: string,
): Promise<Record<string, unknown>> {
  const flag = getFlag(teamName);
  const flagImageUrl = getFlagImageUrl(teamName);

  const blocks: Record<string, unknown>[] = [];

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${flag} ${teamName}*  ·  Group ${teamGroup}`,
    },
  });

  if (flagImageUrl) {
    blocks.push({
      type: "image",
      image_url: flagImageUrl,
      alt_text: `${teamName} flag`,
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Change Team", emoji: true },
        action_id: "change_team",
        style: "danger",
      },
    ],
  });

  blocks.push({ type: "divider" });
  blocks.push(tabBar(activeTab));
  blocks.push({ type: "divider" });

  try {
    let contentBlocks: Record<string, unknown>[] = [];
    if (activeTab === "myGames") {
      const all = await fetchAllMatches(fdKey);
      const matches = filterTeamMatches(all, fdId, teamName);
      contentBlocks = buildGamesBlocks(teamName, matches);
    } else if (activeTab === "groupStandings") {
      const standings = await fetchGroupStandings(fdKey);
      contentBlocks = buildStandingsBlocks(teamName, teamGroup, standings);
    } else if (activeTab === "bracket") {
      const all = await fetchAllMatches(fdKey);
      contentBlocks = buildBracketBlocks(all);
    } else if (activeTab === "players") {
      const players = await fetchSquad(apiSportsId, apiSportsKey);
      contentBlocks = buildPlayersBlocks(teamName, players);
    }
    blocks.push(...contentBlocks);
  } catch (err) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_Unable to load data: ${(err as Error).message}_`,
      },
    });
  }

  return {
    type: "modal",
    callback_id: "dashboard_modal",
    title: { type: "plain_text", text: "World Cup 2026", emoji: true },
    close: { type: "plain_text", text: "Close", emoji: true },
    blocks,
  };
}

// ─── External data fetching ───────────────────────────────────────────────────

async function fetchAllMatches(key: string): Promise<Match[]> {
  const resp = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": key } },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return ((data.matches || []) as Record<string, unknown>[]).map(normalizeMatch);
}

function normalizeMatch(m: Record<string, unknown>): Match {
  // deno-lint-ignore no-explicit-any
  const raw = m as any;
  return {
    id: raw.id,
    status: raw.status,
    matchday: raw.matchday ?? null,
    stage: raw.stage,
    group: raw.group ?? null,
    utcDate: raw.utcDate,
    homeTeam: {
      id: raw.homeTeam?.id,
      name: raw.homeTeam?.name || "",
      shortName: raw.homeTeam?.shortName || raw.homeTeam?.tla || "",
    },
    awayTeam: {
      id: raw.awayTeam?.id,
      name: raw.awayTeam?.name || "",
      shortName: raw.awayTeam?.shortName || raw.awayTeam?.tla || "",
    },
    score: {
      winner: raw.score?.winner ?? null,
      duration: raw.score?.duration ?? null,
      fullTime: raw.score?.fullTime || { home: null, away: null },
      halfTime: raw.score?.halfTime || { home: null, away: null },
    },
    referee: raw.referees?.[0]
      ? { name: raw.referees[0].name, nationality: raw.referees[0].nationality }
      : null,
    minute: raw.minute ?? null,
  };
}

function filterTeamMatches(
  all: Match[],
  fdId: number | null,
  teamName: string,
): Match[] {
  const NAME_MAP: Record<string, string> = { "USA": "United States" };
  const apiName = NAME_MAP[teamName] || teamName;
  if (fdId) {
    return all.filter(
      (m) => m.homeTeam.id === fdId || m.awayTeam.id === fdId,
    );
  }
  return all.filter(
    (m) =>
      m.homeTeam.name === apiName ||
      m.awayTeam.name === apiName,
  );
}

// deno-lint-ignore no-explicit-any
async function fetchGroupStandings(key: string): Promise<any> {
  const resp = await fetch(
    "https://api.football-data.org/v4/competitions/WC/standings",
    { headers: { "X-Auth-Token": key } },
  );
  if (!resp.ok) return { standings: [] };
  return resp.json();
}

interface SquadPlayer {
  id: number;
  name: string;
  age: number;
  number: number | null;
  position: string;
  photo: string;
}

async function fetchSquad(apiSportsId: number | null, key: string): Promise<SquadPlayer[]> {
  if (!apiSportsId) return [];
  if (!key) return [];
  const resp = await fetch(
    `https://v3.football.api-sports.io/players/squads?team=${apiSportsId}`,
    { headers: { "x-apisports-key": key } },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.response?.[0]?.players || []) as SquadPlayer[];
}

// ─── Block builders ───────────────────────────────────────────────────────────

function stageLabel(match: Match): string {
  if (match.stage === "GROUP_STAGE") {
    return `Group ${match.group?.replace("GROUP_", "") || ""}  ·  MD${match.matchday}`;
  }
  return match.stage?.replace(/_/g, " ") || "";
}

function resultBadge(match: Match, teamName: string): string | null {
  if (!isFinished(match)) return null;
  const h = match.score.fullTime.home;
  const a = match.score.fullTime.away;
  const isHome =
    match.homeTeam.name === teamName ||
    (teamName === "USA" && match.homeTeam.name === "United States");
  const teamScore = isHome ? h : a;
  const oppScore = isHome ? a : h;
  if (teamScore === null || oppScore === null) return null;
  if (teamScore > oppScore) return "🟢  Win";
  if (teamScore < oppScore) return "🔴  Loss";
  return "🟡  Draw";
}

function durationLabel(duration: string | null): string | null {
  if (!duration || duration === "REGULAR") return null;
  if (duration === "EXTRA_TIME") return "AET";
  if (duration === "PENALTY_SHOOTOUT") return "Pens";
  return duration;
}

function matchCard(match: Match, teamName: string): Record<string, unknown>[] {
  const home = match.homeTeam.name || "TBD";
  const away = match.awayTeam.name || "TBD";
  const hFlag = match.homeTeam.name ? getFlag(home) : "";
  const aFlag = match.awayTeam.name ? getFlag(away) : "";
  const live = isLive(match);
  const finished = isFinished(match);

  const hScore = finished || live ? (match.score.fullTime.home ?? "?") : null;
  const aScore = finished || live ? (match.score.fullTime.away ?? "?") : null;
  const htHome = finished ? match.score.halfTime.home : null;
  const htAway = finished ? match.score.halfTime.away : null;

  const homeText = `${hFlag} *${home}*${hScore !== null ? `\n*${hScore}*` : ""}`;
  const awayText = `${aFlag} *${away}*${aScore !== null ? `\n*${aScore}*` : ""}`;

  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: homeText },
        { type: "mrkdwn", text: awayText },
      ],
    },
  ];

  const details: string[] = [formatDate(match.utcDate), stageLabel(match)];
  if (live) details.unshift("🔴 *LIVE*");
  const badge = resultBadge(match, teamName);
  if (badge) details.push(badge);
  const dur = durationLabel(match.score?.duration ?? null);
  if (dur) details.push(dur);
  if (htHome !== null && htAway !== null) details.push(`HT: ${htHome}–${htAway}`);

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: details.join("  ·  ") }],
  });

  if (match.referee) {
    blocks.push({
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `🟨  ${match.referee.name}${match.referee.nationality ? ` (${match.referee.nationality})` : ""}`,
      }],
    });
  }

  blocks.push({ type: "divider" });
  return blocks;
}

function buildGamesBlocks(teamName: string, matches: Match[]): Record<string, unknown>[] {
  if (!matches.length) {
    return [{
      type: "section",
      text: { type: "mrkdwn", text: `_No matches found for ${teamName}._` },
    }];
  }

  const past = matches.filter(isFinished)
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  const live = matches.filter(isLive);
  const upcoming = matches.filter(isScheduled)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  const blocks: Record<string, unknown>[] = [];

  if (live.length) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: "*🔴  Live Now*" } });
    for (const m of live) blocks.push(...matchCard(m, teamName));
  }
  if (upcoming.length) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: "*📅  Upcoming*" } });
    for (const m of upcoming.slice(0, 5)) blocks.push(...matchCard(m, teamName));
  }
  if (past.length) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: "*📋  Results*" } });
    for (const m of past.slice(0, 5)) blocks.push(...matchCard(m, teamName));
  }

  return blocks.length ? blocks : [{
    type: "section",
    text: { type: "mrkdwn", text: "_No match data available yet._" },
  }];
}

function pad(str: string | number, len: number, rightAlign = false): string {
  const s = String(str);
  return rightAlign ? s.padStart(len) : s.padEnd(len);
}

// deno-lint-ignore no-explicit-any
function buildStandingsBlocks(teamName: string, teamGroup: string, data: any): Record<string, unknown>[] {
  const standings: unknown[] = data?.standings || [];
  if (!standings.length) {
    return [{
      type: "section",
      text: { type: "mrkdwn", text: `_Group standings not yet available for Group ${teamGroup}._` },
    }];
  }

  const NAME_MAP: Record<string, string> = { "USA": "United States" };
  const lookup = NAME_MAP[teamName] || teamName;

  // deno-lint-ignore no-explicit-any
  const group = (standings as any[]).find((g: any) =>
    g.table?.some((row: any) => row.team?.name === lookup)
  );

  if (!group?.table?.length) {
    return [{
      type: "section",
      text: { type: "mrkdwn", text: `_Group standings not yet available for Group ${teamGroup}._` },
    }];
  }

  const groupLetter = group.group?.replace("GROUP_", "") || teamGroup;
  const headerRow = `${pad("#", 2)}  ${pad("Team", 18)}${pad("P", 3, true)}${pad("W", 3, true)}${pad("D", 3, true)}${pad("L", 3, true)}${pad("GD", 4, true)}${pad("Pts", 4, true)}`;
  const dividerRow = "─".repeat(headerRow.length);

  // deno-lint-ignore no-explicit-any
  const rows = group.table.map((row: any, i: number) => {
    const name = pad(row.team?.name || "", 20);
    const gd = row.goalDifference >= 0 ? `+${row.goalDifference}` : String(row.goalDifference);
    return `${pad(i + 1, 2)}  ${name}${pad(row.playedGames, 3, true)}${pad(row.won, 3, true)}${pad(row.draw, 3, true)}${pad(row.lost, 3, true)}${pad(gd, 4, true)}${pad(row.points, 4, true)}`;
  });

  return [
    { type: "section", text: { type: "mrkdwn", text: `*Group ${groupLetter} Standings*` } },
    { type: "section", text: { type: "mrkdwn", text: "```" + [headerRow, dividerRow, ...rows].join("\n") + "```" } },
    { type: "context", elements: [{ type: "mrkdwn", text: "P Played  W Won  D Drawn  L Lost  GD Goal Difference  Pts Points" }] },
  ];
}

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32", LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals", SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE: "Third Place", FINAL: "Final",
};
const STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];

function matchSummary(match: Match): string {
  const home = match.homeTeam.name || "TBD";
  const away = match.awayTeam.name || "TBD";
  const hFlag = match.homeTeam.name ? getFlag(home) : "";
  const aFlag = match.awayTeam.name ? getFlag(away) : "";
  if (isFinished(match)) {
    return `${hFlag} ${home} *${match.score.fullTime.home}–${match.score.fullTime.away}* ${aFlag} ${away}`;
  }
  if (isLive(match)) {
    return `${hFlag} ${home} *${match.score.fullTime.home ?? 0}–${match.score.fullTime.away ?? 0}* ${aFlag} ${away} 🔴`;
  }
  const date = isScheduled(match) ? ` · ${formatDateShort(match.utcDate)}` : "";
  return `${hFlag ? hFlag + " " : ""}${home} vs ${aFlag ? aFlag + " " : ""}${away}${date}`;
}

function buildBracketBlocks(matches: Match[]): Record<string, unknown>[] {
  const knockout = matches.filter((m) => m.stage !== "GROUP_STAGE" && m.stage !== "PRELIMINARY_ROUND");
  if (!knockout.length) {
    return [{
      type: "section",
      text: { type: "mrkdwn", text: "_The knockout bracket is not yet available._" },
    }];
  }

  const byStage: Record<string, Match[]> = {};
  for (const m of knockout) {
    if (!byStage[m.stage]) byStage[m.stage] = [];
    byStage[m.stage].push(m);
  }

  const blocks: Record<string, unknown>[] = [
    { type: "section", text: { type: "mrkdwn", text: "*🏆 Knockout Bracket*" } },
    { type: "divider" },
  ];

  for (const stage of STAGE_ORDER) {
    if (!byStage[stage]) continue;
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${STAGE_LABELS[stage] || stage}*` } });
    for (const m of byStage[stage]) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: matchSummary(m) } });
    }
    blocks.push({ type: "divider" });
  }

  return blocks;
}

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
const POSITION_EMOJI: Record<string, string> = {
  Goalkeeper: "🧤", Defender: "🛡️", Midfielder: "⚙️", Attacker: "⚡",
};

function buildPlayersBlocks(teamName: string, players: SquadPlayer[]): Record<string, unknown>[] {
  if (!players.length) {
    return [{
      type: "section",
      text: { type: "mrkdwn", text: `_No squad data available for ${teamName} yet._` },
    }];
  }

  const byPosition: Record<string, SquadPlayer[]> = {};
  for (const p of players) {
    const pos = p.position || "Unknown";
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(p);
  }
  for (const pos of Object.keys(byPosition)) {
    byPosition[pos].sort((a, b) => (a.number || 99) - (b.number || 99));
  }

  const blocks: Record<string, unknown>[] = [{ type: "divider" }];

  for (const pos of POSITION_ORDER) {
    const group = byPosition[pos];
    if (!group?.length) continue;
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `${POSITION_EMOJI[pos] || "👤"} *${pos}s*` } });
    for (const p of group) {
      const block: Record<string, unknown> = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${p.number ? `#${p.number}` : "—"}  ${p.name}*\nAge ${p.age || "?"}`,
        },
      };
      if (p.photo) block.accessory = { type: "image", image_url: p.photo, alt_text: p.name };
      blocks.push(block);
    }
    blocks.push({ type: "divider" });
  }

  return blocks;
}
