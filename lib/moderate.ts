import { AppBskyFeedDefs, AtpAgent, BskyAgent } from "@atproto/api";

export const createLabel = async (
  post: AppBskyFeedDefs.PostView,
  labeler: AtpAgent
) => {
  try {
    const { uri, cid } = post;
    console.info(
      `ADDING LABEL:\n\n${uri} -- ${cid}\n\n${uri
        .replace("at://", "https://bsky.app/profile/")
        .replace("app.bsky.feed.post", "post")}`
    );

    return labeler.api.tools.ozone.moderation.emitEvent({
      // specify the label event
      event: {
        $type: "tools.ozone.moderation.defs#modEventLabel",
        createLabelVals: ["uncategorised-screenshot"],
        negateLabelVals: [],
      },
      // specify the labeled post by strongRef
      subject: {
        $type: "com.atproto.repo.strongRef",
        uri,
        cid,
      },
      // put in the rest of the metadata
      createdBy: labeler.session!.did,
      createdAt: new Date().toISOString(),
      subjectBlobCids: [],
    });
  } catch (e) {
    console.error(e);
  }
};

export const createReport = async (
  post: AppBskyFeedDefs.PostView,
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
        reason: `${score} social-media-screenshot`,
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
