import { ModerationService } from "@atproto/ozone/dist/mod-service";
import { lexicons } from "../lexicons/lexicons";
import { loggedIn } from "../old/agent";

export const createLabel = async (
  uri: string,
  cid: string,
  modService: ModerationService
) => {
  try {
    console.info(`ADDING LABEL -- ${uri} ${cid} (noop)`);
    // await modService.formatAndCreateLabels(uri, cid, {
    //   create: ["twitter-screenshot"],
    // });
  } catch (e) {
    console.error(e);
  }
};
