import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { AppBskyEmbedImages } from "@atproto/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import * as detect from "./detect";
import { createReport, createLabel } from "./moderate";
import PQueue from "p-queue";

let i = 0;
const IGNORED_HANDLES = [
  "nowbreezing.ntw.app",
  "moinbot.bsky.social",
  "kctv.bsky.social",
  "aerialcolorado.bsky.social",
];

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  backgroundQueue = new PQueue({ autoStart: true });

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
        const { posts } = await this.agent.app.bsky.feed
          .getPosts({
            uris: postsToCreate.map((post) => post.uri),
          })
          .then((resp) => resp.data);
        // .then((posts) =>
        //   posts.data.posts.map((post) => ({
        //     ...post,
        //     evt: postsToCreate.find(
        //       (p) => p.did === post.did && p.cid === post.cid
        //     ),
        //   }))
        // );

        for (const post of posts) {
          if (AppBskyEmbedImages.isView(post.embed))
            this.backgroundQueue.add(async () => {
              try {
                const images = post?.embed
                  ?.images as AppBskyEmbedImages.ViewImage[];
                const detections = await Promise.all(
                  // images.map((d) => detect.detectPython(d.fullsize))
                  images.flatMap((d) => detect.classify(d.fullsize))
                );

                const maxScreenshotScore = Math.max(
                  ...detections
                    .flat()
                    // .filter((d: any) => d.label === "twitter")
                    .filter((d: any) => d.label === "social-media-screenshot")
                    .map((d: any) => d.score)
                );

                if (
                  maxScreenshotScore >= 0.99 &&
                  !IGNORED_HANDLES.includes(post.author.handle.toLowerCase())
                  // detections.some(
                  //   (d) => d.label === "twitter" && d.score > 0.92
                  // )
                ) {
                  // console.log(detections);
                  console.info(
                    ++i,
                    maxScreenshotScore,
                    detections,
                    post.uri
                      .replace("at://", "https://bsky.app/profile/")
                      .replace("app.bsky.feed.post", "post")
                  );
                  await createLabel(post, this.labeler);
                  await createReport(post, maxScreenshotScore, this.agent);
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
