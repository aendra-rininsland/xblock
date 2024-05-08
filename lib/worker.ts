import { fetch, setGlobalDispatcher, Agent } from "undici";
setGlobalDispatcher(new Agent({ connect: { timeout: 20_000 } }));

import { AppBskyEmbedImages } from "@atproto/api";
import { ImageClassificationSingle } from "@xenova/transformers";
import * as detect from "./detect";
import { createLabel, addTag } from "./moderate";
import { agent, isLoggedIn } from "./agent";
import { db } from "./db";

const MAX_IRRELEVANCY = 0.25;
const MINIMUM_CONFIDENCE = 0.85;
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

export const worker = async (job: any) => {
  await isLoggedIn;
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

          if (dets.length) {
            const [topDet] = dets.sort((a, b) => b.score - a.score);

            if (
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
                (det) =>
                  det.label === "irrelevant" && det.score > MAX_IRRELEVANCY
              )
          )
        ) {
          await addTag(post, detections);
        }
      }
    }
  } catch (e) {
    console.error(e);
    console.info(job.data);
  }
};
