import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { HandleMessageDefinition } from "../functions/handle_message.ts";

const MessageWorkflow = DefineWorkflow({
  callback_id: "message_workflow",
  title: "Handle DM Message",
  description: "Handles a direct message to the app bot",
  input_parameters: {
    properties: {
      userId: { type: Schema.slack.types.user_id },
      channelId: { type: Schema.slack.types.channel_id },
      messageText: { type: Schema.types.string },
    },
    required: ["userId", "channelId", "messageText"],
  },
});

const handleStep = MessageWorkflow.addStep(HandleMessageDefinition, {
  userId: MessageWorkflow.inputs.userId,
  messageText: MessageWorkflow.inputs.messageText,
});

MessageWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: MessageWorkflow.inputs.channelId,
  message: handleStep.outputs.reply,
});

export default MessageWorkflow;
