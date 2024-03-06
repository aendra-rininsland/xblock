import {
  OutputSchema as RepoEvent,
  isCommit,
} from "../atproto/packages/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos";
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import detect from "./detect";
import { queue } from "./queue";
import { AppBskyEmbedImages, PostRecord } from "../atproto/packages/api/src";
import { agent } from "./agent";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt);

    const postsToDelete = ops.posts.deletes.map((del) => del.uri);
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

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom("post")
        .where("uri", "in", postsToDelete)
        .execute();
    }
    if (postsToCreate.length > 0) {
      const {
        data: { posts },
      } = await agent.app.bsky.feed.getPosts({
        uris: postsToCreate.map((post) => post.uri),
      });
      for (const post of posts) {
        if (AppBskyEmbedImages.isView(post.embed))
          queue.add(async () => {
            try {
              const images = post?.embed
                ?.images as AppBskyEmbedImages.ViewImage[];
              const scores = await Promise.all(
                images.map((image) =>
                  detect(image.fullsize, post.author.handle === "aendra.com")
                )
              );

              if (
                scores.some(({ twitter_score }) => twitter_score >= 0.8) ||
                post.author.handle === "aendra.com"
              ) {
                console.log(
                  post.uri
                    .replace("at://", "https://bsky.app/profile/")
                    .replace("app.bsky.feed.post", "post"),
                  scores
                );
              }
              // await this.db
              //   .insertInto("post")
              //   .values(postsToCreate)
              //   .onConflict((oc) => oc.doNothing())
              //   .execute();
            } catch (e) {
              console.error(e);
            }
          });
      }
    }
  }
}
