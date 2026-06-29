import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { BuildDashboardDefinition } from "../functions/build_dashboard.ts";

const AppHomeWorkflow = DefineWorkflow({
  callback_id: "app_home_workflow",
  title: "App Home Opened",
  description: "Opens the World Cup dashboard modal",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: [],
  },
});

AppHomeWorkflow.addStep(BuildDashboardDefinition, {
  interactivity: AppHomeWorkflow.inputs.interactivity,
});

export default AppHomeWorkflow;
