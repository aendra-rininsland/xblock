import dotenv from "dotenv";
import { AtpAgent } from "@atproto/api";
import { Secp256k1Keypair } from "@atproto/crypto";
import * as ui8 from "uint8arrays";

void (async function () {
  dotenv.config();
  const serviceKey = await Secp256k1Keypair.create({ exportable: true });
  const privateKeyBytes = await serviceKey.export();
  const privateKey = ui8.toString(privateKeyBytes, "hex");

  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = process.env.BSKY_HANDLE!;

  // YOUR bluesky password; n.b., must not be an app password!
  const password = process.env.BSKY_PASSWORD!;

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  const getDidCredentials =
    await agent.com.atproto.identity.getRecommendedDidCredentials();
  const rotationKeys = getDidCredentials.data.rotationKeys ?? [];
  if (!rotationKeys) {
    throw new Error("No rotation key provided");
  }

  const credentials = {
    ...getDidCredentials.data,
    rotationKeys: [serviceKey.did(), ...rotationKeys],
    verificationMethods: {
      ...getDidCredentials.data.verificationMethods,
      atproto_labeler: serviceKey.did(),
    },
    services: {
      ...getDidCredentials.data.services,
      atproto_labeler: {
        type: "AtprotoLabeler",
        endpoint: "https://xblock.aendra.dev",
      },
    },
  };

  console.log(credentials);

  // @NOTE, this token will need to come from the email from the previous step
  const TOKEN = process.env.PLC_SIG_TOKEN;

  const plcOp = await agent.com.atproto.identity.signPlcOperation({
    token: TOKEN,
    ...credentials,
  });

  console.log(
    `❗ Your private recovery key is: ${privateKey}. Please store this in a secure location! ❗`
  );

  console.log(plcOp.data.operation);

  await agent.com.atproto.identity.submitPlcOperation({
    operation: plcOp.data.operation,
  });
})();
