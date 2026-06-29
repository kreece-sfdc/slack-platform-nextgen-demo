import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { HandleActionDefinition } from "../functions/handle_action.ts";
import { BuildDashboardDefinition } from "../functions/build_dashboard.ts";

const ActionWorkflow = DefineWorkflow({
  callback_id: "action_workflow",
  title: "Handle Block Action",
  description: "Processes a block action and republishes the App Home view",
  input_parameters: {
    properties: {
      userId: { type: Schema.slack.types.user_id },
      actionId: { type: Schema.types.string },
      actionValue: { type: Schema.types.string },
    },
    required: ["userId", "actionId"],
  },
});

ActionWorkflow.addStep(HandleActionDefinition, {
  userId: ActionWorkflow.inputs.userId,
  actionId: ActionWorkflow.inputs.actionId,
  actionValue: ActionWorkflow.inputs.actionValue,
});

ActionWorkflow.addStep(BuildDashboardDefinition, {
  userId: ActionWorkflow.inputs.userId,
});

export default ActionWorkflow;
