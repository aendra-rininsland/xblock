import { BskyAgent } from "@atproto/api";

export const agent = new BskyAgent({ service: "https://bsky.social" });
export const loggedIn = agent.login({
  identifier: process.env.BSKY_HANDLE!,
  password: process.env.BSKY_PASSWORD!,
});
