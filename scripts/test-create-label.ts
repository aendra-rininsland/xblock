import dotenv from "dotenv";
import { AtpAgent } from "@atproto/api";
import { lexicons } from "../lexicons/lexicons";

void (async function () {
  dotenv.config();
  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = process.env.BSKY_HANDLE!;

  // YOUR bluesky password, or preferably an App Password (found in your client settings)
  // Ex: abcd-1234-efgh-5678
  const password = process.env.BSKY_PASSWORD!;

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  const req = {
    event: {
      $type: "com.atproto.admin.defs#modEventLabel",
      comment: "Testing please ignore",
      createLabelVals: ["twitter-screenshot"],
      negateLabelVals: [],
    },
    subject: {
      $type: "com.atproto.repo.strongRef",
      uri: "at://did:plc:newitj5jo3uel7o4mnf3vj2o",
      cid: "bafyreianyjdsbapnwwfuxafutqtgv7vxmwwkllrvmfr7cm7onrqmki2dym",
    },
    subjectBlobCids: [
      "bafkreigsfhj4opcjtexw663336nmoy2sa3oaso2bbr54qeyckuh7nqvcvy",
    ],
    createdBy: "did:plc:newitj5jo3uel7o4mnf3vj2o",
  };

  const validate_label_event = lexicons.validate(
    "com.atproto.admin.defs#modEventLabel",
    req.event
  );

  console.log(validate_label_event);
  const validate_moderation_event = lexicons.assertValidXrpcInput(
    "com.atproto.admin.emitModerationEvent",
    req
  );

  if (validate_label_event.success && validate_moderation_event) {
    // await agent.api.com.atproto.admin.emitModerationEvent(req);
    console.log("success -- validate record");
  }
})();
