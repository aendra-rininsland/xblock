import dotenv from "dotenv";
import { AtpAgent } from "@atproto/api";

const run = async () => {
  dotenv.config();
  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = process.env.BSKY_HANDLE!;

  // YOUR bluesky password, or preferably an App Password (found in your client settings)
  // Ex: abcd-1234-efgh-5678
  const password = process.env.BSKY_PASSWORD!;

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
    `uncategorised-screenshot`,
    ...platforms.map((l) => `${l}-screenshot`.toLowerCase()),
    "altright-screenshot",
  ];
  const labelValueDefinitions = [
    {
      adultOnly: false,
      defaultSetting: "ignore",
      identifier: `uncategorised-screenshot`,
      severity: "inform",
      blurs: "media",
      locales: [
        {
          lang: "en",
          name: `Uncategorised screenshot`,
          description: `[EXPERIMENTAL] Miscellaneous screenshots detected by a computer vision model. After human intervention, this label is dropped and a more specific one is added.`,
        },
      ],
    },
    ...platforms.map((l) => ({
      adultOnly: false,
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
      adultOnly: false,
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
