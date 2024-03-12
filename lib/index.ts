/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */

import ozone from "@atproto/ozone";
import { config, secrets } from "./config";
import { FirehoseSubscription } from "./firehose";

void (async function main() {
  const service = await ozone.create(config, secrets, {});

  const firehose = new FirehoseSubscription(service.ctx, "wss://bsky.network");

  service.ctx.db.migrateToLatestOrThrow().then(async () => {
    // TODO make this a proper migration somehow
    try {
      await service.ctx.db.db.schema
        .createTable("sub_state")
        .addColumn("service", "varchar", (col) => col.primaryKey())
        .addColumn("cursor", "integer", (col) => col.notNull())
        .execute();
    } catch {}
  });

  await service.start();

  firehose.run(3000);

  console.log(`Running on port ${service.ctx.cfg.service.port}`);
})();
