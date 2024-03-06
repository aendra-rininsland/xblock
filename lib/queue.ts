import PQueue from "p-queue";

export const queue = new PQueue({ concurrency: 1, autoStart: true });
