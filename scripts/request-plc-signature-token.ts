import dotenv from "dotenv";
import { AtpAgent } from "@atproto/api";

void (async function () {
  dotenv.config();
  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = process.env.BSKY_HANDLE!;

  // YOUR bluesky password; n.b., must not be an app password!
  const password = process.env.BSKY_PASSWORD!;

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  await agent.com.atproto.identity.requestPlcOperationSignature();
  console.log("PLC operation signature requested! Check your email. 🎉");
})();
