import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { AppBskyEmbedImages } from "@atproto/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import * as detect from "./detect";
import { createReport, createLabel, addTag } from "./moderate";
import { ImageClassificationSingle } from "@xenova/transformers";
import { existsSync, createWriteStream } from "fs";
import csvWriter from "csv-write-stream";
import { queue } from "./queue";

const finalPathFile = "./distributions.csv";
let writer: csvWriter.CsvWriteStream;

const IGNORED_HANDLES = [
  "nowbreezing.ntw.app",
  "moinbot.bsky.social",
  "kctv.bsky.social",
  "aerialcolorado.bsky.social",
  "zoops247.bsky.social",
  "gradientbot.bsky.social",
  "miq.moe",
  "adoptiedieren.nl",
  "mykeystuart.bsky.social",
  "ahistoriaemvideo.bsky.social",
  "colors.bsky.social",
  "roadside.xor.blue",
];

const MAX_IRRELEVANCY = 0.25;

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt).catch((e) => {
      console.error("repo subscription could not handle message", e);
      return undefined;
    });

    if (!ops) return;

    const postsToCreate = ops.posts.creates
      .filter((create) => AppBskyEmbedImages.isMain(create.record.embed))
      .map((create) => {
        const { images } = create.record.embed as AppBskyEmbedImages.Main;
        return {
          did: create.author,
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          images,
        };
      });

    if (postsToCreate.length > 0) {
      queue.createJob(postsToCreate).timeout(5000).retries(2).save();
    }
  }
}
