import { Manifest } from "deno-slack-sdk/mod.ts";
import AppHomeWorkflow from "./workflows/app_home_workflow.ts";
import MessageWorkflow from "./workflows/message_workflow.ts";
import MentionWorkflow from "./workflows/mention_workflow.ts";
import UsersDatastore from "./datastores/users_datastore.ts";
import { AiGetGamesDefinition } from "./functions/ai_get_games.ts";
import { AiGetStandingsDefinition } from "./functions/ai_get_standings.ts";
import { AiGetBracketDefinition } from "./functions/ai_get_bracket.ts";
import { AiGetPlayersDefinition } from "./functions/ai_get_players.ts";

export default Manifest({
  name: "World Cup 2026 (NextGen)",
  description: "Follow your team's fixtures, standings, bracket, and squad",
  icon: "assets/icon.png",
  workflows: [AppHomeWorkflow, MessageWorkflow, MentionWorkflow],
  functions: [
    AiGetGamesDefinition,
    AiGetStandingsDefinition,
    AiGetBracketDefinition,
    AiGetPlayersDefinition,
  ],
  outgoingDomains: [
    "api.football-data.org",
    "v3.football.api-sports.io",
    "flagcdn.com",
    "media.api-sports.io",
  ],
  datastores: [UsersDatastore],
  botScopes: [
    "datastore:read",
    "datastore:write",
    "app_mentions:read",
    "im:history",
    "im:write",
    "chat:write",
    "chat:write.public",
  ],
});
