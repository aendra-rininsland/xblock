import { lexicons } from "../lexicons/lexicons";
import { loggedIn } from "./agent";

export const createLabel = async (
  uri: string,
  cid: string,
  subjectBlobCids: string[]
) => {
  // TODO remove once detector performs with satisfactory accuracy
  if (true) {
    console.error(`ADDING LABEL -- ${uri} ${cid} (noop)`);
    return { success: true, uri, cid };
  }

  const agent = await loggedIn;
  const req = {
    event: {
      $type: "com.atproto.admin.defs#modEventLabel",
      comment:
        "Created by xblock.aendra.dev, to be used for experimental purposes ONLY",
      createLabelVals: ["twitter-screenshot"],
      negateLabelVals: [],
    },
    subject: {
      $type: "com.atproto.repo.strongRef",
      uri,
      cid,
    },
    subjectBlobCids,
    createdBy: "did:plc:newitj5jo3uel7o4mnf3vj2o",
  };

  try {
    if (
      lexicons.validate("com.atproto.admin.defs#modEventLabel", req.event)
        .success &&
      lexicons.assertValidXrpcInput(
        "com.atproto.admin.emitModerationEvent",
        req
      )
    ) {
      await agent.api.com.atproto.admin.emitModerationEvent(req);
      return { success: true, uri, cid };
    }
  } catch (e) {
    return { success: false, uri, cid, error: e };
  }
};
