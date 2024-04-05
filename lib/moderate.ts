import { AppBskyFeedDefs, AtpAgent, BskyAgent } from "@atproto/api";
import { ImageClassificationSingle } from "@xenova/transformers";

export const createLabel = async (
  post: AppBskyFeedDefs.PostView,
  label: string = "uncategorised-screenshot",
  score: number,
  model: string,
  labeler: AtpAgent
) => {
  try {
    const { uri, cid } = post;
    // console.info(
    //   `ADDING LABEL:\n\n${uri} -- ${cid}\n\n${uri
    //     .replace("at://", "https://bsky.app/profile/")
    //     .replace("app.bsky.feed.post", "post")}`
    // );

    return labeler.api.tools.ozone.moderation.emitEvent({
      // specify the label event
      event: {
        $type: "tools.ozone.moderation.defs#modEventLabel",
        createLabelVals: [label],
        negateLabelVals: [],
        comment: `Inferred by model ${model} (${score})`,
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
      subjectBlobCids: [], // TODO add subjectBlobCids
    });
  } catch (e) {
    console.error(e);
  }
};

export const addTag = async (
  post: AppBskyFeedDefs.PostView,
  detections: any,
  models: string[] = [],
  labeler: AtpAgent
) => {
  try {
    const { uri, cid } = post;

    return labeler.api.tools.ozone.moderation.emitEvent({
      // specify the label event
      event: {
        $type: "tools.ozone.moderation.defs#modEventTag",
        add: models.map((model) => `model:${model}`),
        remove: [],
        comment: detections
          .map(
            (d: [string, ImageClassificationSingle[]]) =>
              `${d[0]}:\n\n${d[1].map((dd) => JSON.stringify(dd)).join("\n")}`
          )
          .join("\n\n"),
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
  detections: [string, ImageClassificationSingle[]][] = [],
  agent: BskyAgent
) => {
  // console.info(
  //   `ADDING REPORT:\n\n${post.uri} -- ${post.cid}\n\n${post.uri
  //     .replace("at://", "https://bsky.app/profile/")
  //     .replace("app.bsky.feed.post", "post")}`
  // );

  const bestLabel = detections
    .map(
      ([k, dts]) =>
        dts
          .filter(
            (d) =>
              !["twitter", "unrecognised-screenshot", "uncategorised"].includes(
                d.label
              )
          )
          .sort((a, b) => b.score - a.score)
          .shift()!
    )
    .sort(
      (a: ImageClassificationSingle, b: ImageClassificationSingle) =>
        b.score - a.score
    )
    .shift();

  if (bestLabel && bestLabel.score > 0.2) {
    try {
      const res = await agent.com.atproto.moderation.createReport(
        {
          reasonType: "com.atproto.moderation.defs#reasonOther",
          reason: `${bestLabel.label} (${bestLabel.score})`,
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
  }
};
