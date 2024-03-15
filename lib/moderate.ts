import { PostView } from "@atproto/bsky/dist/views/types";
import { ModerationService } from "@atproto/ozone/dist/mod-service";
import {
  ModSubject,
  RecordSubject,
} from "@atproto/ozone/dist/mod-service/subject";

export const createLabel = async (
  uri: string,
  cid: string,
  modService: ModerationService
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
  modService: ModerationService
) => {
  try {
    const subject = new RecordSubject(
      post.uri,
      post.cid
      //post.evt.embed.images.map((img) => img.image.toString())
    );
    return modService.report({
      reasonType: "com.atproto.moderation.defs.reasonOther",
      reason: "High probability screenshot",
      reportedBy: "xblock.aendra.dev",
      subject,
    });
  } catch (e) {
    console.error(e);
  }
};
