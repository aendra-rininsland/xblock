import { AppBskyActorDefs } from "../../atproto/packages/api/src";
import { Server } from "../../lexicons";
import { AppContext } from "../config";
import { AtUri } from "@atproto/syntax";

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.moderation.getService(async ({ params, req }) => {
    const uri = AtUri.make(
      ctx.cfg.publisherDid,
      "app.bsky.feed.generator",
      "screenshot"
    ).toString();
    return {
      encoding: "application/json",
      body: {
        description: "",
        descriptionFacets: [],
      },
    };
  });
}
