import { Kysely, Migration, MigrationProvider } from "kysely";

const migrations: Record<string, Migration> = {};

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

migrations["001"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable("sub_state")
      .addColumn("service", "varchar", (col) => col.primaryKey())
      .addColumn("cursor", "integer", (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("sub_state").execute();
  },
};

migrations["002"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable("detections")
      .addColumn("blobCid", "varchar", (col) => col.primaryKey())
      .addColumn("uri", "varchar", (col) => col.notNull())
      .addColumn("timestamp", "varchar", (col) => col.notNull())
      .addColumn("topLabel", "varchar", (col) => col.notNull())
      .addColumn("topScore", "numeric", (col) => col.notNull())
      .addColumn("raw", "text", (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("detections").execute();
  },
};
