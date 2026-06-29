import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import UsersDatastore from "../datastores/users_datastore.ts";
import { ALL_TEAMS } from "../utils/tournament.ts";
import { getFlag } from "../utils/flags.ts";
import { resolveTeam } from "../utils/teamData.ts";

export const HandleMessageDefinition = DefineFunction({
  callback_id: "handle_message",
  title: "Handle DM message",
  description: "Fuzzy-matches a team name from a DM and saves user preference",
  source_file: "functions/handle_message.ts",
  input_parameters: {
    properties: {
      userId: { type: Schema.slack.types.user_id },
      messageText: { type: Schema.types.string },
    },
    required: ["userId", "messageText"],
  },
  output_parameters: {
    properties: {
      reply: { type: Schema.types.string },
      teamFound: { type: Schema.types.boolean },
    },
    required: ["reply", "teamFound"],
  },
});

export default SlackFunction(
  HandleMessageDefinition,
  async ({ inputs, client }) => {
    const { userId, messageText } = inputs;
    const text = messageText.toLowerCase();

    // Try to find a team name mentioned in the message
    const match = ALL_TEAMS.find((t) =>
      text.includes(t.name.toLowerCase())
    );

    if (!match) {
      const teamList = ALL_TEAMS.map((t) => `${getFlag(t.name)} ${t.name}`).join(", ");
      return {
        outputs: {
          reply: `I couldn't find a team in that message. Try saying something like "I support Brazil" or "set my team to England".\n\nQualified teams: ${teamList}`,
          teamFound: false,
        },
      };
    }

    const info = resolveTeam(match.name);
    if (!info) {
      return {
        outputs: {
          reply: `Found *${match.name}* but couldn't resolve team details. Please try selecting from the App Home tab.`,
          teamFound: false,
        },
      };
    }

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

    return {
      outputs: {
        reply: `${info.flag} Got it! I've set your team to *${info.name}* (Group ${info.group}). Head to the *Home* tab to see your dashboard.`,
        teamFound: true,
      },
    };
  },
);
