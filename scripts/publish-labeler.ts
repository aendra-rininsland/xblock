import dotenv from "dotenv";
import { AtpAgent, BlobRef } from "@atproto/api";
import fs from "fs/promises";
import { ids, lexicons } from "@atproto/bsky/src/lexicon/lexicons";

const run = async () => {
  dotenv.config();
  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = process.env.BSKY_HANDLE!;

  // YOUR bluesky password, or preferably an App Password (found in your client settings)
  // Ex: abcd-1234-efgh-5678
  const password = process.env.BSKY_PASSWORD!;

  // A short name for the record that will show in urls
  // Lowercase with no spaces.
  // Ex: whats-hot
  const recordName = process.env.LABELER_SLUG;

  if (!recordName)
    throw new Error("Forgot record name; please supply LABELER_SLUG env var");

  // // (Optional) A description of your feed
  // // Ex: Top trending content from the whole network
  // const description = process.env.LABELER_DESCRIPTION || "";

  // // (Optional) The path to an image to be used as your feed's avatar
  // // Ex: ~/path/to/avatar.jpeg
  // const avatar: string = process.env.LABELER_AVATAR || "";

  // -------------------------------------
  // NO NEED TO TOUCH ANYTHING BELOW HERE
  // -------------------------------------

  // if (!process.env.FEEDGEN_SERVICE_DID && !process.env.LABELER_HOSTNAME) {
  //   throw new Error("Please provide a hostname in the .env file");
  // }
  // const labelerDid =
  //   process.env.FEEDGEN_SERVICE_DID ??
  //   `did:web:${process.env.LABELER_HOSTNAME}`;

  // only update this if in a test environment
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  await agent.api.com.atproto.repo.deleteRecord({
    repo: agent.session?.did ?? "",
    collection: "app.bsky.labeler.service",
    rkey: "self",
  });

  const req = {
    repo: agent.session?.did ?? "",
    collection: "app.bsky.labeler.service",
    rkey: "self",
    record: {
      createdAt: new Date().toISOString(),
      policies: {
        description:
          "Labels screenshots from Twitter (and elsewhere) because life is too short to be that angry",
        labelValues: [
          "twitter-screenshot",
          "twitter-screenshot-reply",
          "facebook-screenshot",
          "facebook-screenshot-reply",
          "threads-screenshot",
          "threads-screenshot-reply",
        ],
        labelValueDefinitions: [
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "twitter-screenshot",
            severity: "inform",
            blurs: "media",
            locales: [
              {
                lang: "en",
                name: "Twitter screenshot",
                description:
                  "A screenshot taken on X.com, formerly known as Twitter",
              },
            ],
          },
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "twitter-screenshot-reply",
            severity: "inform",
            blurs: "none",
            locales: [
              {
                lang: "en",
                name: "A reply to a Twitter screenshot",
                description: "A reply to a Twitter screenshot",
              },
            ],
          },
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "threads-screenshot",
            severity: "inform",
            blurs: "media",
            locales: [
              {
                lang: "en",
                name: "Threads screenshot",
                description: "A screenshot taken on Threads",
              },
            ],
          },
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "threads-screenshot-reply",
            severity: "inform",
            blurs: "none",
            locales: [
              {
                lang: "en",
                name: "Threads screenshot reply",
                description: "A reply to a Threads screenshot",
              },
            ],
          },
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "facebook-screenshot",
            severity: "inform",
            blurs: "media",
            locales: [
              {
                lang: "en",
                name: "Facebook screenshot",
                description: "A screenshot taken on Facebook",
              },
            ],
          },
          {
            adultsOnly: false,
            defaultSetting: "warn",
            identifier: "facebook-screenshot-reply",
            severity: "inform",
            blurs: "none",
            locales: [
              {
                lang: "en",
                name: "Facebook screenshot reply",
                description: "A reply to a Facebook screenshot",
              },
            ],
          },
        ],
      },
    },
  };
  await agent.api.com.atproto.repo.putRecord(req);
  console.log("All done 🎉");
};

run();
