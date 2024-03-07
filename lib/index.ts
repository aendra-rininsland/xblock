import FeedGenerator from "./server";
import { maybeStr, maybeInt } from "./util";

void (async function main() {
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? "example.com";
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`;
  const server = FeedGenerator.create({
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? "localhost",
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ":memory:",
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      "wss://bsky.network",
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? "did:example:alice",
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
  });
  await server.start();
})();
