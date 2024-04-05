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
];

const MAX_IRRELEVANCY = 0.1;

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
                    // images.map((d) => detect.detectPython(d.fullsize))
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
                    (uncategorisedDetection
                      ? uncategorisedDetection.score < 0.6
                      : true) &&
                    (unrecognisedDetection
                      ? unrecognisedDetection.score < 0.6
                      : true)
                  )
                    writer.write({
                      url,
                      ...dets.reduce(
                        (a, c) => ({ ...a, [c.label]: c.score }),
                        {}
                      ),
                    });
                }

                // const filtered = detections.filter(
                //   (image: [string, ImageClassificationSingle[]]) => {
                //     const [filename, dts] = image;
                //     const maxIrrelevancyScore = dts
                //       .filter((l) =>
                //         ["unrecognised-screenshot", "uncategorised"].includes(
                //           l.label
                //         )
                //       )
                //       .reduce((a, c) => a + c.score, 0);
                //     return maxIrrelevancyScore < MAX_IRRELEVANCY;
                //   }
                // );

                // const maxSocialScreenshotScore = Math.max(
                //   ...filtered.flatMap(([filename, d]) =>
                //     d.map((result) =>
                //       result.label === "social-screenshot" ? result.score : 0
                //     )
                //   )
                // );

                // const maxTwitterScreenshotScore = Math.max(
                //   ...filtered.flatMap(([filename, d]) =>
                //     d.map((result) =>
                //       result.label === "twitter" ? result.score : 0
                //     )
                //   )
                // );

                // const maxRelevancyScore = Math.max(
                //   ...filtered.map(([filename, d]) =>
                //     d.reduce(
                //       (a, result) =>
                //         a +
                //         (["twitter", "social-screenshot"].includes(result.label)
                //           ? result.score
                //           : 0),
                //       0
                //     )
                //   )
                // );

                // const filtered = detections.filter(
                //   ([, d]) =>
                //     d.reduce(
                //       (a, c) =>
                //         ["unrecognised-screenshot", "uncategorised"].includes(
                //           c.label
                //         )
                //           ? a + c.score
                //           : a,
                //       0
                //     ) < 0.5
                // );

                // const hasStrongDetections = detections
                //   .filter(
                //     ([, d]) =>
                //       d.reduce(
                //         (a, c) =>
                //           ["unrecognised-screenshot", "uncategorised"].includes(
                //             c.label
                //           )
                //             ? a + c.score
                //             : a,
                //         0
                //       ) < 0.5
                //   )
                //   .some(([k, d]) =>
                //     d
                //       .filter(
                //         (l) =>
                //           ![
                //             "unrecognised-screenshot",
                //             "uncategorised",
                //           ].includes(l.label)
                //       )
                //       .some((l) => l.label !== "twitter" && l.score > 0.2)
                //   );

                // const hasTwitterVibes = detections
                //   .filter(
                //     ([, d]) =>
                //       d.reduce(
                //         (a, c) =>
                //           ["unrecognised-screenshot", "uncategorised"].includes(
                //             c.label
                //           )
                //             ? a + c.score
                //             : a,
                //         0
                //       ) < 0.5
                //   )
                //   .some(([k, d]) =>
                //     d
                //       .filter(
                //         (l) =>
                //           ![
                //             "unrecognised-screenshot",
                //             "uncategorised",
                //           ].includes(l.label)
                //       )
                //       .some((l) => l.label === "twitter" && l.score > 0.9)
                //   );

                // if (hasStrongDetections || hasTwitterVibes) {
                //   console.info(
                //     ++i,
                //     post.uri
                //       .replace("at://", "https://bsky.app/profile/")
                //       .replace("app.bsky.feed.post", "post")
                //   );
                //   detections.forEach(([k, d]) => console.log(`${k}: \n`, d));

                //   if (hasTwitterVibes) {
                //     const maxTwitterScreenshotScore = Math.max(
                //       ...detections.map(
                //         ([l, dt]) =>
                //           dt.find((d) => d.label === "twitter")?.score || 0
                //       )
                //     );
                //     await createLabel(
                //       post,
                //       "twitter-screenshot",
                //       maxTwitterScreenshotScore,
                //       detect.MODEL_NAME,
                //       this.labeler
                //     );
                //   } else {
                //     await createReport(post, detections, this.agent);
                //   }

                //   await addTag(
                //     post,
                //     detections,
                //     [detect.MODEL_NAME],
                //     this.labeler
                //   );
                // }
              } catch (e) {
                console.error(e);
              }
            });
        }
      } catch {}
    }
  }
}

process.on("SIGINT", function () {
  console.log("Caught interrupt signal");
  writer.end();
  process.exit();
});
