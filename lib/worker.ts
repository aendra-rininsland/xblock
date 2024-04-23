import { AppBskyEmbedImages } from "@atproto/api";
import { ImageClassificationSingle } from "@xenova/transformers";
import * as detect from "./detect";
import { createLabel, addTag } from "./moderate";
import { agent } from "./agent";
import { db } from "./db";

const MAX_IRRELEVANCY = 0.25;
const MINIMUM_CONFIDENCE = 0.85;
const MINIMUM_CONFIDENCE_NGL = 0.12;
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

export const worker = async (job: any) => {
  try {
    const postsToCreate: {
      did: string;
      uri: string;
      cid: string;
      replyParent: string | null;
      replyRoot: string | null;
      indexedAt: string;
      images: AppBskyEmbedImages.Image[];
    }[] = job.data;
    const { posts } = await agent.app.bsky.feed
      .getPosts({
        uris: postsToCreate.map((post) => post.uri),
      })
      .then((resp) => resp.data);

    for (const post of posts.filter(
      (d) => !IGNORED_HANDLES.includes(d.author.handle)
    )) {
      if (AppBskyEmbedImages.isView(post.embed)) {
        const images = post?.embed?.images as AppBskyEmbedImages.ViewImage[];

        const detections: [string, ImageClassificationSingle[]][] =
          await Promise.all(
            images.map(async (d) => {
              const [cid] = d.fullsize.split("/").pop()?.split("@") || [];
              if (!cid) throw new Error("Invalid path: " + d.fullsize);
              try {
                const detections = await detect.classify(d.fullsize);

                return [cid, detections];
              } catch (e) {
                console.error(e);
                return [cid, []];
              }
            })
          );
        const url = post.uri
          .replace("at://", "https://bsky.app/profile/")
          .replace("app.bsky.feed.post", "post");

        for (const image of detections) {
          const [cid, dets] = image;

          const irrelevantScore =
            dets.find((d) => d.label === "irrelevant")?.score || 0;

          const nglScore = dets.find((d) => d.label === "ngl")?.score || 0;

          if (dets.length) {
            const [topDet] = dets.sort((a, b) => b.score - a.score);

            if (nglScore > MINIMUM_CONFIDENCE_NGL) {
              await createLabel(
                post,
                cid,
                `ngl-screenshot`,
                `ngl:${nglScore}`,
                detect.MODEL_NAME_LARGE
              );
            } else if (
              topDet.score > MINIMUM_CONFIDENCE &&
              topDet.label !== "irrelevant"
            ) {
              await createLabel(
                post,
                cid,
                `${topDet.label}-screenshot`,
                topDet ? `${topDet.label}:${topDet.score}` : "",
                detect.MODEL_NAME_LARGE
              );
            }

            if (irrelevantScore < MAX_IRRELEVANCY) {
              console.log(detections);
              await addTag(post, detections, [detect.MODEL_NAME_LARGE]);
              await db
                .insertInto("detections")
                .values({
                  uri: url,
                  blobCid: cid,
                  timestamp: new Date().toString(),
                  topLabel: topDet.label,
                  topScore: topDet.score,
                  raw: JSON.stringify(dets),
                })
                .execute();
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};
