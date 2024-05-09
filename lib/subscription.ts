import { Subscription } from "@atproto/xrpc-server";
import { cborToLexRecord, readCar } from "@atproto/repo";
import { BlobRef } from "@atproto/lexicon";
import { ids, lexicons } from "@atproto/bsky/src/lexicon/lexicons";
import { Record as PostRecord } from "@atproto/bsky/src/lexicon/types/app/bsky/feed/post";
import { Record as RepostRecord } from "@atproto/bsky/src/lexicon/types/app/bsky/feed/repost";
import { Record as LikeRecord } from "@atproto/bsky/src/lexicon/types/app/bsky/feed/like";
import { Record as FollowRecord } from "@atproto/bsky/src/lexicon/types/app/bsky/graph/follow";
import {
  Commit,
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos";
import { BskyAgent, AtpAgent } from "@atproto/api";
import { Database } from "./db";

export abstract class FirehoseSubscriptionBase {
  public sub: Subscription<RepoEvent>;
  public db: Database;
  public agent: BskyAgent;
  public labeler: AtpAgent;

  constructor(public service: string, db: Database, agent: BskyAgent) {
    this.agent = agent;
    this.labeler = agent.withProxy("atproto_labeler", agent.session!.did);
    this.labeler.login({
      identifier: process.env.BSKY_HANDLE!,
      password: process.env.BSKY_PASSWORD!,
    });

    this.db = db;

    this.sub = new Subscription({
      service: service,
      method: ids.ComAtprotoSyncSubscribeRepos,
      getParams: () => this.getCursor(),
      validate: (value: unknown) => {
        try {
          return lexicons.assertValidXrpcMessage<RepoEvent>(
            ids.ComAtprotoSyncSubscribeRepos,
            value
          );
        } catch (err) {
          console.error("repo subscription skipped invalid message", err);
        }
      },
    });
  }

  abstract handleEvent(evt: RepoEvent): Promise<void>;

  async run(subscriptionReconnectDelay: number) {
    try {
      for await (const evt of this.sub) {
        this.handleEvent(evt);

        // update stored cursor every 20 events or so
        if (isCommit(evt) && evt.seq % 20 === 0) {
          await this.updateCursor(evt.seq);
        }
      }
    } catch (err) {
      console.error("repo subscription errored", err);
      setTimeout(
        () => this.run(subscriptionReconnectDelay),
        subscriptionReconnectDelay
      );
    }
  }

  async updateCursor(cursor: number) {
    await this.db
      .updateTable("sub_state")
      .set({ cursor })
      .where("service", "=", this.service)
      .execute();
  }

  async getCursor(): Promise<{ cursor?: number }> {
    const res = await this.db
      .selectFrom("sub_state")
      .selectAll()
      .where("service", "=", this.service)
      .executeTakeFirst();
    return res ? { cursor: res.cursor } : {};
  }
}

export const getOpsByType = async (evt: Commit): Promise<OperationsByType> => {
  const car = await readCar(evt.blocks);
  const opsByType: OperationsByType = {
    posts: [],
  };

  for (const op of evt.ops) {
    const uri = `at://${evt.repo}/${op.path}`;
    const [collection] = op.path.split("/");

    if (op.action === "update") continue; // updates not supported yet

    if (op.action === "create") {
      if (!op.cid) continue;
      const recordBytes = car.blocks.get(op.cid);
      if (!recordBytes) continue;
      const record = cborToLexRecord(recordBytes);
      const create = { uri, cid: op.cid.toString(), author: evt.repo };
      if (collection === ids.AppBskyFeedPost && isPost(record)) {
        opsByType.posts.push({ record, ...create });
      }
    }
  }

  return opsByType;
};

type OperationsByType = {
  posts: CreateOp[];
};

export type CreateOp = {
  uri: string;
  cid: string;
  author: string;
  record: PostRecord;
};

export const isPost = (obj: unknown): obj is PostRecord => {
  return isType(obj, ids.AppBskyFeedPost);
};

const isType = (obj: unknown, nsid: string) => {
  try {
    lexicons.assertValidRecord(nsid, fixBlobRefs(obj));
    return true;
  } catch (err) {
    return false;
  }
};

// @TODO right now record validation fails on BlobRefs
// simply because multiple packages have their own copy
// of the BlobRef class, causing instanceof checks to fail.
// This is a temporary solution.
const fixBlobRefs = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(fixBlobRefs);
  }
  if (obj && typeof obj === "object") {
    if (obj.constructor.name === "BlobRef") {
      const blob = obj as BlobRef;
      return new BlobRef(blob.ref, blob.mimeType, blob.size, blob.original);
    }
    return Object.entries(obj).reduce((acc, [key, val]) => {
      return Object.assign(acc, { [key]: fixBlobRefs(val) });
    }, {} as Record<string, unknown>);
  }
  return obj;
};
