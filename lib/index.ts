/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */

import ozone, { Database } from "@atproto/ozone";
import { config, secrets } from "./config";
import { FirehoseSubscription } from "./firehose";

void (async function main() {
  // Separate migration db in case migration changes some connection state that we need in the tests, e.g. "alter database ... set ..."
  const migrationDb = new Database({
    schema: config.db.postgresSchema,
    url: config.db.postgresUrl,
  });

  try {
    await migrationDb.migrateToLatestOrThrow().then(async () => {
      return migrationDb.db.schema
        .createTable("sub_state")
        .addColumn("service", "varchar", (col) => col.primaryKey())
        .addColumn("cursor", "integer", (col) => col.notNull())
        .execute();
    });
  } catch (e) {}

  await migrationDb.close();

  const service = await ozone.create(config, secrets, {});

  const firehose = new FirehoseSubscription(service.ctx, "wss://bsky.network");

  await service.start();

  firehose.run(3000);

  console.log(`Running on port ${service.ctx.cfg.service.port}`);
})();
