import {
  OutputSchema as RepoEvent,
  isCommit,
} from "@atproto/bsky/src/lexicon/types/com/atproto/sync/subscribeRepos"; // TODO fix
import { AppBskyEmbedImages } from "@atproto/api/src"; // TODO fix
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import * as detect from "./detect";
import { createReport, createLabel, addTag } from "./moderate";
import PQueue from "p-queue";
import { ImageClassificationSingle } from "@xenova/transformers";
import { existsSync, createWriteStream } from "fs";
import csvWriter from "csv-write-stream";

const finalPathFile = "./distributions.csv";
let writer: csvWriter.CsvWriteStream;

if (!existsSync(finalPathFile))
  writer = csvWriter({
    headers: [
      "url",
      "uncategorised",
      "unrecognised-screenshot",
      "twitter",
      "bluesky",
      "facebook",
      "threads",
      "instagram",
      "reddit",
      "tumblr",
      "altright",
      "fediverse",
    ],
  });
else writer = csvWriter({ sendHeaders: false });

writer.pipe(createWriteStream(finalPathFile, { flags: "a" }));

let i = 0;
const IGNORED_HANDLES = [
  "nowbreezing.ntw.app",
  "moinbot.bsky.social",
  "kctv.bsky.social",
  "aerialcolorado.bsky.social",
  "zoops247.bsky.social",
  "gradientbot.bsky.social",
  "miq.moe",
];

const MAX_IRRELEVANCY = 0.3;

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

        for (const post of posts.filter(
          (d) => !IGNORED_HANDLES.includes(d.author.handle)
        )) {
          if (AppBskyEmbedImages.isView(post.embed))
            this.backgroundQueue.add(async () => {
              try {
                const images = post?.embed
                  ?.images as AppBskyEmbedImages.ViewImage[];

                const detections: [string, ImageClassificationSingle[]][] =
                  await Promise.all(
                    images.map(async (d) => {
                      const filename = d.fullsize.split("/").pop();
                      if (!filename)
                        throw new Error("Invalid path: " + d.fullsize);
                      try {
                        const detections = await detect.classify(d.fullsize);

                        return [filename, detections];
                      } catch (e) {
                        console.error(e);
                        return [filename, []];
                      }
                    })
                  );
                const url = post.uri
                  .replace("at://", "https://bsky.app/profile/")
                  .replace("app.bsky.feed.post", "post");

                for (const image of detections) {
                  const [, dets] = image;
                  const uncategorisedDetection = dets.find(
                    (d) => d.label === "uncategorised"
                  );
                  const unrecognisedDetection = dets.find(
                    (d) => d.label === "unrecognised-screenshot"
                  );
                  if (
                    dets.length &&
                    (uncategorisedDetection
                      ? uncategorisedDetection.score < MAX_IRRELEVANCY
                      : true) &&
                    (unrecognisedDetection
                      ? unrecognisedDetection.score < MAX_IRRELEVANCY
                      : true)
                  ) {
                    const instaScore =
                      dets.find((d) => d.label === "instagram")?.score || 0;
                    const bskyScore =
                      dets.find((d) => d.label === "bluesky")?.score || 0;
                    const twitterScore =
                      dets.find((d) => d.label === "twitter")?.score || 0;
                    if (instaScore > 0.7) {
                      await createLabel(
                        post,
                        "instagram-screenshot",
                        instaScore,
                        detect.MODEL_NAME,
                        this.labeler
                      );
                    } else if (bskyScore > 0.7) {
                      await createLabel(
                        post,
                        "bluesky-screenshot",
                        bskyScore,
                        detect.MODEL_NAME,
                        this.labeler
                      );
                    } else if (twitterScore > 0.9) {
                      await createLabel(
                        post,
                        "twitter-screenshot",
                        twitterScore,
                        detect.MODEL_NAME,
                        this.labeler
                      );
                    } else {
                      const [topDet] = dets.sort((a, b) => b.score - a.score);
                      if (
                        topDet.score > 0.4 &&
                        !["twitter", "bluesky", "instagram"].includes(
                          topDet.label
                        )
                      ) {
                        console.log(url, topDet);
                        await createLabel(
                          post,
                          "uncategorised-screenshot",
                          topDet ? `${topDet.label}:${topDet.score}` : "",
                          detect.MODEL_NAME,
                          this.labeler
                        );
                        await createReport(post, detections, this.agent);
                      }
                    }
                    await addTag(
                      post,
                      detections,
                      [detect.MODEL_NAME],
                      this.labeler
                    );
                    writer.write({
                      url,
                      ...dets.reduce(
                        (a, c) => ({ ...a, [c.label]: c.score }),
                        {}
                      ),
                    });
                  }
                }

                if (
                  detections.some(([, image]) =>
                    image.some(
                      (dt) =>
                        ["uncategorised", "unrecognised-screenshot"].includes(
                          dt.label
                        ) && dt.score < MAX_IRRELEVANCY
                    )
                  )
                ) {
                  // await addTag(
                  //   post,
                  //   detections,
                  //   [detect.MODEL_NAME],
                  //   this.labeler
                  // );
                  // await createReport(post, detections, this.agent);
                }
              } catch (e) {
                console.error(e);
              }
            });
        }
      } catch (e: any) {
        if (e.error && e.error !== "TypeError: fetch failed") {
          console.error(e);
        }
      }
    }
  }
}

process.on("SIGINT", function () {
  console.log("Caught interrupt signal");
  writer.end();
  process.exit();
});
