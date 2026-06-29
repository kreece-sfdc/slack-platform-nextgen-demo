import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import UsersDatastore from "../datastores/users_datastore.ts";
import { resolveTeam } from "../utils/teamData.ts";

export const HandleActionDefinition = DefineFunction({
  callback_id: "handle_action",
  title: "Handle block action",
  description: "Processes block_actions: team selection, tab switching, change_team",
  source_file: "functions/handle_action.ts",
  input_parameters: {
    properties: {
      userId: { type: Schema.slack.types.user_id },
      actionId: { type: Schema.types.string },
      actionValue: { type: Schema.types.string },
    },
    required: ["userId", "actionId"],
  },
  output_parameters: {
    properties: {
      handled: { type: Schema.types.boolean },
    },
    required: ["handled"],
  },
});

export default SlackFunction(
  HandleActionDefinition,
  async ({ inputs, client }) => {
    const { userId, actionId, actionValue } = inputs;

    if (actionId === "change_team") {
      // Clear team selection so user sees the team-select view
      await client.apps.datastore.put<typeof UsersDatastore.definition>({
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
    } else if (actionId.startsWith("select_team_")) {
      const teamName = actionValue || "";
      const info = resolveTeam(teamName);
      if (info) {
        await client.apps.datastore.put<typeof UsersDatastore.definition>({
          datastore: "users",
          item: {
            userId,
            teamName: info.name,
            teamGroup: info.group,
            teamFdId: info.fdId ?? 0,
            teamApiSportsId: info.apiSportsId ?? 0,
            activeTab: "myGames",
          },
        });
      }
    } else if (actionId.startsWith("tab_")) {
      const newTab = actionId.replace("tab_", "");
      // Get existing record to preserve team info
      const getResp = await client.apps.datastore.get<
        typeof UsersDatastore.definition
      >({
        datastore: "users",
        id: userId,
      });
      if (getResp.ok && getResp.item?.teamName) {
        await client.apps.datastore.put<typeof UsersDatastore.definition>({
          datastore: "users",
          item: {
            userId,
            teamName: getResp.item.teamName as string,
            teamGroup: (getResp.item.teamGroup as string) || "",
            teamFdId: (getResp.item.teamFdId as number) || 0,
            teamApiSportsId: (getResp.item.teamApiSportsId as number) || 0,
            activeTab: newTab,
          },
        });
      }
    }

    return { outputs: { handled: true } };
  },
);
