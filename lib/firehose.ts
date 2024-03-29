import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix

import { AppBskyEmbedImages } from "@atproto/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import * as detect from "./detect";
import { createReport } from "./moderate";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;
    const ops = await getOpsByType(evt);

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
      try {
        const posts = await this.agent.app.bsky.feed
          .getPosts({
            uris: postsToCreate.map((post) => post.uri),
          })
          .then((posts) =>
            posts.data.posts.map((post) => ({
              ...post,
              evt: postsToCreate.find(
                (p) => p.did === post.did && p.cid === post.cid
              ),
            }))
          );

        for (const post of posts) {
          if (AppBskyEmbedImages.isView(post.embed))
            this.ctx.backgroundQueue.add(async () => {
              try {
                const images = post?.embed
                  ?.images as AppBskyEmbedImages.ViewImage[];
                const detections = await Promise.all(
                  images.map((image) =>
                    detect.isScreenshot(image.fullsize.replace("@jpeg", "@png"))
                  )
                );

                if (detections.some((d) => d === true)) {
                  console.info(
                    `REPORT:\n\n${post.uri} -- ${post.cid}\n\n${post.uri
                      .replace("at://", "https://bsky.app/profile/")
                      .replace("app.bsky.feed.post", "post")}`
                  );
                  try {
                    await createReport(post, this.modService);
                  } catch (e) {
                    console.error(e);
                  }
                }
              } catch (e) {
                console.error(e);
              }
            });
        }
      } catch {}
    }
  }
}
