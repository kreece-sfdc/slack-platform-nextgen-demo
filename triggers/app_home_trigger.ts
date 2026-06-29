import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import AppHomeWorkflow from "../workflows/app_home_workflow.ts";

const AppHomeTrigger: Trigger<typeof AppHomeWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Open World Cup Dashboard",
  description: "Opens your World Cup 2026 team dashboard",
  workflow: `#/workflows/${AppHomeWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: "{{data.interactivity}}",
    },
  },
};

export default AppHomeTrigger;
