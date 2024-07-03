import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import { queue } from "./queue";
import { login } from "./agent";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;

    const ops = await getOpsByType(evt).catch((e) => {
      console.error("repo subscription could not handle message", e);
      // if (e.code === "EAI_AGAIN") return login().then(() => getOpsByType(evt));
    });

    if (!ops || !ops.posts?.length) return;
    const postsToCreate = ops.posts
      .filter((create) => create.record.embed?.images)
      .filter((i) => i);

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
