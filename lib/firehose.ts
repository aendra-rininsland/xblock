import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { AppBskyEmbedImages } from "@atproto/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import { queue } from "./queue";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;

    const ops = await getOpsByType(evt).catch((e) => {
      console.error("repo subscription could not handle message", e);
      return undefined;
    });

    if (!ops) return;

    const postsToCreate = ops.posts.filter((create) =>
      AppBskyEmbedImages.isMain(create.record.embed)
    );

    if (postsToCreate.length > 0) {
      queue
        .createJob(postsToCreate)
        .timeout(30000)
        .backoff("exponential", 2000)
        .retries(5)
        .save();
    }
  }
}
