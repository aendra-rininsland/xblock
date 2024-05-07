const Arena = require("bull-arena");

// Mandatory import of queue library.
const Bee = require("bee-queue");

Arena({
  // All queue libraries used must be explicitly imported and included.
  Bee,

  // Provide a `Bull` option when using bull, similar to the `Bee` option above.

  queues: [
    {
      // Required for each queue definition.
      name: "posts",

      // User-readable display name for the host. Required.
      hostId: "Love",

      // Queue type (Bull or Bee - default Bull).
      type: "bee",
    },
  ],
});
