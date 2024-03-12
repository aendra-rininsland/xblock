import {
  OutputSchema as RepoEvent,
  isCommit,
} from "../atproto/packages/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { AppBskyEmbedImages } from "../atproto/packages/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import detect from "./detect";
import { createLabel } from "./create-label";

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

    if (postsToCreate.length > 0) {
      try {
        const {
          data: { posts },
        } = await this.agent.app.bsky.feed.getPosts({
          uris: postsToCreate.map((post) => post.uri),
        });

        for (const post of posts) {
          if (AppBskyEmbedImages.isView(post.embed))
            this.ctx.backgroundQueue.add(async () => {
              try {
                const images = post?.embed
                  ?.images as AppBskyEmbedImages.ViewImage[];
                const scores = await Promise.all(
                  images.map((image) =>
                    detect(
                      image.fullsize.replace("@jpeg", "@png"),
                      post.author.handle === "xblock.aendra.dev"
                    )
                  )
                );

                if (
                  scores.some(
                    ({ Twitter, screenshot }) =>
                      Twitter >= 0.8 || screenshot >= 0.9
                  ) ||
                  post.author.handle === "xblock.aendra.dev"
                ) {
                  console.log(
                    post.uri
                      .replace("at://", "https://bsky.app/profile/")
                      .replace("app.bsky.feed.post", "post"),
                    scores
                  );
                }

                if (
                  scores.some(
                    ({ twitter, screenshot }) =>
                      twitter >= 0.8 || screenshot >= 0.8
                  ) ||
                  post.author.handle === "xblock.aendra.dev"
                ) {
                  try {
                    await createLabel(post.uri, post.cid, this.modService);
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
