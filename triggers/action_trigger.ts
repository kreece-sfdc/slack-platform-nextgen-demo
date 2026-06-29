import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import ActionWorkflow from "../workflows/action_workflow.ts";

const ACTION_IDS = [
  "change_team",
  "tab_myGames",
  "tab_groupStandings",
  "tab_bracket",
  "tab_players",
  // Group A
  "select_team_Mexico",
  "select_team_South_Africa",
  "select_team_Korea_Republic",
  // Group B
  "select_team_Canada",
  "select_team_Qatar",
  "select_team_Switzerland",
  // Group C
  "select_team_Brazil",
  "select_team_Morocco",
  "select_team_Haiti",
  "select_team_Scotland",
  // Group D
  "select_team_USA",
  "select_team_Paraguay",
  "select_team_Australia",
  // Group E
  "select_team_Germany",
  "select_team_Cura_ao",
  "select_team_C_te_d_Ivoire",
  "select_team_Ecuador",
  // Group F
  "select_team_Netherlands",
  "select_team_Japan",
  "select_team_Tunisia",
  // Group G
  "select_team_Belgium",
  "select_team_Egypt",
  "select_team_IR_Iran",
  "select_team_New_Zealand",
  // Group H
  "select_team_Spain",
  "select_team_Cabo_Verde",
  "select_team_Saudi_Arabia",
  "select_team_Uruguay",
  // Group I
  "select_team_France",
  "select_team_Senegal",
  "select_team_Norway",
  // Group J
  "select_team_Argentina",
  "select_team_Algeria",
  "select_team_Austria",
  "select_team_Jordan",
  // Group K
  "select_team_Portugal",
  "select_team_Uzbekistan",
  "select_team_Colombia",
  // Group L
  "select_team_England",
  "select_team_Croatia",
  "select_team_Ghana",
  "select_team_Panama",
];

const ActionTrigger: Trigger<typeof ActionWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "Block Action",
  description: "Fires when a user clicks a block action button in the App Home",
  workflow: `#/workflows/${ActionWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.BlockActionsInteraction,
    action_ids: ACTION_IDS,
  },
  inputs: {
    userId: {
      value: "{{data.user.id}}",
    },
    actionId: {
      value: "{{data.action.action_id}}",
    },
    actionValue: {
      value: "{{data.action.value}}",
    },
  },
};

export default ActionTrigger;
