import http from "http";
import events from "events";
import express from "express";
import { DidResolver, MemoryCache } from "@atproto/identity";
import { createServer } from "@atproto/bsky/src/lexicon";
import { createDb, Database, migrateToLatest } from "./db";
import { FirehoseSubscription } from "./firehose";
import { AppContext, Config } from "./config";
import wellKnown from "./well-known";

export class Labeler {
  public app: express.Application;
  public server?: http.Server;
  public db: Database;
  public firehose: FirehoseSubscription;
  public cfg: Config;

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config
  ) {
    this.app = app;
    this.db = db;
    this.firehose = firehose;
    this.cfg = cfg;
  }

  static create(cfg: Config) {
    const app = express();
    const db = createDb(cfg.sqliteLocation);
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint);

    const didCache = new MemoryCache();
    const didResolver = new DidResolver({
      plcUrl: "https://plc.directory",
      didCache,
    });

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    });
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    };
    // feedGeneration(server, ctx);
    // getService(server, ctx);
    app.use(server.xrpc.router);
    app.use(wellKnown(ctx));

    return new Labeler(app, db, firehose, cfg);
  }

  async start(): Promise<http.Server> {
    await migrateToLatest(this.db);
    this.firehose.run(this.cfg.subscriptionReconnectDelay);
    this.server = this.app.listen(this.cfg.port, this.cfg.listenhost);
    await events.once(this.server, "listening");
    return this.server;
  }
}

export default Labeler;
