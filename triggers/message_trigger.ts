import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import MessageWorkflow from "../workflows/message_workflow.ts";

const MessageTrigger: Trigger<typeof MessageWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "DM Message Received",
  description: "Fires when a user sends a direct message to the app",
  workflow: `#/workflows/${MessageWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.MessagePosted,
    // Empty channel_ids means all DMs — populated at trigger creation time by the CLI
    channel_ids: ["{{data.channel_id}}"],
  },
  inputs: {
    userId: {
      value: "{{data.user_id}}",
    },
    channelId: {
      value: "{{data.channel_id}}",
    },
    messageText: {
      value: "{{data.text}}",
    },
  },
};

export default MessageTrigger;
