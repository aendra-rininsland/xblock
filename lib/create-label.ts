import { ModerationService } from "@atproto/ozone/dist/mod-service";

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
    return modService.formatAndCreateLabels(uri, cid, {
      create: ["twitter-screenshot"],
    });
  } catch (e) {
    console.error(e);
  }
};
