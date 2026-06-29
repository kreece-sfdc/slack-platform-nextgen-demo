import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import MentionWorkflow from "../workflows/mention_workflow.ts";

const MentionTrigger: Trigger<typeof MentionWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "App Mentioned",
  description: "Fires when the app is @mentioned in a channel",
  workflow: `#/workflows/${MentionWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.AppMentioned,
    channel_ids: [], // Not used — @mention handling is in the Bolt.js app (Socket Mode handles any channel without hardcoding IDs)
  },
  inputs: {
    userId: {
      value: "{{data.user_id}}",
    },
    channelId: {
      value: "{{data.channel_id}}",
    },
    threadTs: {
      value: "{{data.message_ts}}",
    },
    messageText: {
      value: "{{data.text}}",
    },
  },
};

export default MentionTrigger;
