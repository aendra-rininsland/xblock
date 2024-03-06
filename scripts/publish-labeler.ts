import dotenv from "dotenv";
import { AtpAgent, BlobRef } from "@atproto/api";
import fs from "fs/promises";
import { ids, lexicons } from "../lexicons/lexicons";

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

  // (Optional) A description of your feed
  // Ex: Top trending content from the whole network
  const description = process.env.LABELER_DESCRIPTION || "";

  // (Optional) The path to an image to be used as your feed's avatar
  // Ex: ~/path/to/avatar.jpeg
  const avatar: string = process.env.LABELER_AVATAR || "";

  // -------------------------------------
  // NO NEED TO TOUCH ANYTHING BELOW HERE
  // -------------------------------------

  if (!process.env.FEEDGEN_SERVICE_DID && !process.env.LABELER_HOSTNAME) {
    throw new Error("Please provide a hostname in the .env file");
  }
  const feedGenDid =
    process.env.FEEDGEN_SERVICE_DID ??
    `did:web:${process.env.FEEDGEN_HOSTNAME}`;

  // only update this if in a test environment
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  let avatarRef: BlobRef | undefined;
  if (avatar) {
    let encoding: string;
    if (avatar.endsWith("png")) {
      encoding = "image/png";
    } else if (avatar.endsWith("jpg") || avatar.endsWith("jpeg")) {
      encoding = "image/jpeg";
    } else {
      throw new Error("expected png or jpeg");
    }
    const img = await fs.readFile(avatar);
    const blobRes = await agent.api.com.atproto.repo.uploadBlob(img, {
      encoding,
    });
    avatarRef = blobRes.data.blob;
  }

  const req = {
    repo: agent.session?.did ?? "",
    collection: ids.AppBskyLabelerService,
    rkey: recordName || "",
    record: {
      description: description,
      avatar: avatarRef,
      createdAt: new Date().toISOString(),
      policies: {
        description:
          "Labels screenshots from Twitter because life is too short",
        labelValues: ["twitter-screenshot"],
        labelValueDefinitions: [
          {
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
        ],
      },
    },
  };
  if (
    lexicons.validate("app.bsky.labeler.service", req.record).success &&
    (
      lexicons.assertValidXrpcInput("com.atproto.repo.createRecord", req) as {
        validate: boolean;
      }
    ).validate
  ) {
    // TODO wait until launch
    // await agent.api.com.atproto.repo.createRecord(req);
  }
  console.log("All done 🎉");
};

run();
