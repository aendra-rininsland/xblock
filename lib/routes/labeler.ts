import { Server as ServerBase } from "@atproto/bsky/src/lexicon";
import { AppContext } from "../config";
import { AtUri } from "@atproto/syntax";

interface Server extends ServerBase {}

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.label.getLabeler(async () => {
    return {
      encoding: "application/json",
      body: {
        did: ctx.cfg.serviceDid,
        feeds: [
          {
            uri: AtUri.make(
              ctx.cfg.publisherDid,
              "app.bsky.feed.generator",
              shortname
            ).toString(),
          },
        ],
      },
    };
  });
}
