/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */

import { FirehoseSubscription } from "./firehose";
import { db, migrateToLatest } from "./db";
import { BskyAgent } from "@atproto/api";

void (async function main() {
  await migrateToLatest(db);

  const agent = new BskyAgent({ service: "https://bsky.social" });

  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  });

  const firehose = new FirehoseSubscription("wss://bsky.network", db, agent);
  firehose.run(3000);
  console.info("Running...");
})();
