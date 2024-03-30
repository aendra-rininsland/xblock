import { PostView } from "@atproto/bsky/dist/views/types";
import { BskyAgent } from "@atproto/api";

export const createLabel = async (
  uri: string,
  cid: string,
  agent: BskyAgent
) => {
  try {
    console.info(
      `ADDING LABEL:\n\n${uri} -- ${cid}\n\n${uri
        .replace("at://", "https://bsky.app/profile/")
        .replace("app.bsky.feed.post", "post")}`
    );
    // return modService.formatAndCreateLabels(uri, cid, {
    //   create: ["twitter-screenshot"],
    // });
  } catch (e) {
    console.error(e);
  }
};

export const createReport = async (
  post: PostView,
  score: number,
  agent: BskyAgent
) => {
  console.info(
    `ADDING REPORT:\n\n${post.uri} -- ${post.cid}\n\n${post.uri
      .replace("at://", "https://bsky.app/profile/")
      .replace("app.bsky.feed.post", "post")}`
  );

  try {
    const res = await agent.com.atproto.moderation.createReport(
      {
        reasonType: "com.atproto.moderation.defs#reasonOther",
        reason: `${score * 100}% autotrain-xblock-twitter detection`,
        subject: {
          $type: "com.atproto.repo.strongRef",
          uri: post.uri,
          cid: post.cid,
        },
      },
      {
        encoding: "application/json",
        headers: {
          "atproto-proxy": `${agent.session?.did}#atproto_labeler`,
        },
      }
    );

    return { success: true, data: res };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
};
