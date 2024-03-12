import { envToCfg, envToSecrets, readEnv } from "@atproto/ozone";

const env = readEnv();

export const config = envToCfg(env);
export const secrets = envToSecrets(env);
