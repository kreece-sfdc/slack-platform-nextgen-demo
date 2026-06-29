import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

const UsersDatastore = DefineDatastore({
  name: "users",
  primary_key: "userId",
  attributes: {
    userId: {
      type: Schema.types.string,
    },
    teamName: {
      type: Schema.types.string,
    },
    teamGroup: {
      type: Schema.types.string,
    },
    teamFdId: {
      type: Schema.types.integer,
    },
    teamApiSportsId: {
      type: Schema.types.integer,
    },
    activeTab: {
      type: Schema.types.string,
    },
  },
});

export default UsersDatastore;
