import { AppBskyEmbedImages } from "@atproto/api";
import { ImageClassificationSingle } from "@xenova/transformers";
import * as detect from "./detect";
import { createLabel, addTag } from "./moderate";
import { isLoggedIn } from "./agent";
import { db } from "./db";
import { CreateOp } from "./subscription";

const MAX_IRRELEVANCY = 0.25;
const MINIMUM_CONFIDENCE = 0.85;

// TODO: compute DIDs for handles
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
  "hourlylegs.bsky.social",
];

export const worker = async ({ data: postsToCreate }: { data: CreateOp[] }) => {
  await isLoggedIn;

  for (const post of postsToCreate.filter(
    (d) => !IGNORED_HANDLES.includes(d.author)
  )) {
    const url = post.uri
      .replace("at://", "https://bsky.app/profile/")
      .replace("app.bsky.feed.post", "post");

    if (!AppBskyEmbedImages.isMain(post.record.embed)) return;

    const { images } = post.record.embed;

    const detections: [string, ImageClassificationSingle[]][] =
      await Promise.all(
        images.map(async (d) => {
          const cid = d.image.ref.toString();
          const detections = await detect.classify(
            `https://cdn.bsky.app/img/feed_fullsize/plain/${post.author}/${cid}@jpeg`
          );

          return [cid, detections];
        })
      );

    for (const image of detections) {
      const [cid, dets] = image;

      const irrelevantScore =
        dets.find((d) => d.label === "irrelevant")?.score || 0;

      if (dets.length) {
        const [topDet] = dets.sort((a, b) => b.score - a.score);

        if (
          topDet.score > MINIMUM_CONFIDENCE &&
          topDet.label !== "irrelevant"
        ) {
          // OVERRIDES FOR SPECIFIC LABELS
          if (topDet.score < 0.95 && topDet.label === "instagram") return;
          if (topDet.score < 0.98 && topDet.label === "altright") return;

          await createLabel(
            post,
            cid,
            `${topDet.label}-screenshot`,
            topDet ? `${topDet.label}:${topDet.score}` : "",
            detect.MODEL_NAME_LARGE
          );
        }

        if (irrelevantScore < MAX_IRRELEVANCY) {
          try {
            await db
              .insertInto("detections")
              .values({
                uri: url,
                blobCid: `${post.uri}/${cid}`,
                timestamp: new Date().toString(),
                topLabel: topDet.label,
                topScore: topDet.score,
                raw: JSON.stringify(dets),
              })
              .execute();
          } catch {}
        }
      }
    }

    if (
      detections.some(
        ([, dets]) =>
          !dets.some(
            (det) => det.label === "irrelevant" && det.score > MAX_IRRELEVANCY
          )
      )
    ) {
      await addTag(post, detections);
    }
  }
};
