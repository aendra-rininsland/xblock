import { setGlobalDispatcher, Agent } from "undici";
setGlobalDispatcher(new Agent({ connect: { timeout: 20_000 } }));

import { BskyAgent } from "@atproto/api";
export const agent = new BskyAgent({ service: "https://bsky.social" });

export const isLoggedIn = agent
  .login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })
  .then(() => true)
  .catch(() => false);
