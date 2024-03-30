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

  // try {
  //   await agent.api.com.atproto.repo.deleteRecord({
  //     repo: agent.session?.did ?? "",
  //     collection: "app.bsky.labeler.service",
  //     rkey: "self",
  //   });
  //   console.log("old /self record deleted");
  // } catch (e) {}

  const platforms = [
    "Twitter",
    "Threads",
    "Fediverse",
    "Bluesky",
    "Facebook",
    "Instagram",
    "Tumblr",
    "Reddit",
  ];
  const labelValues = [
    ...platforms.map((l) => `${l}-screenshot`.toLowerCase()),
    "altright-screenshot",
  ];
  const labelValueDefinitions = [
    ...platforms.map((l) => ({
      adultsOnly: false,
      defaultSetting: "warn",
      identifier: `${l}-screenshot`.toLowerCase(),
      severity: "inform",
      blurs: "media",
      locales: [
        {
          lang: "en",
          name: `${l} screenshot`,
          description: `A screenshot taken on ${l}, contents may or may not be offensive`,
        },
      ],
    })),
    {
      adultsOnly: false,
      defaultSetting: "warn",
      identifier: `altright-screenshot`,
      severity: "inform",
      blurs: "media",
      locales: [
        {
          lang: "en",
          name: `Alt-right platform screenshot`,
          description: `A screenshot taken on an alt-right platform (Truth Social, Gab, et cetera), contents quite likely offensive`,
        },
      ],
    },
  ];

  const req = {
    repo: agent.session?.did ?? "",
    collection: "app.bsky.labeler.service",
    rkey: "self",
    record: {
      createdAt: new Date().toISOString(),
      policies: {
        description:
          "Labels screenshots from Twitter (and elsewhere) because life is too short to be that angry",
        labelValues,
        labelValueDefinitions,
      },
    },
  };
  await agent.api.com.atproto.repo.putRecord(req);
  console.log("All done 🎉");
};

run();
