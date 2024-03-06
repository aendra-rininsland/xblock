import {
  ZeroShotImageClassificationOutput,
  pipeline,
  env,
} from "@xenova/transformers";
import { join, resolve } from "path";
import { cwd } from "process";

// env.allowRemoteModels = false;
// env.backends.onnx.wasm.numThreads = 1;
// env.localModelPath = resolve(join(cwd()));
// console.log(env);

// const pipe = pipeline(
//   "zero-shot-image-classification",
//   "clip-vit-large-patch14"
// );

// console.log(env);

const pipe = pipeline(
  "zero-shot-image-classification",
  "Xenova/clip-vit-base-patch32"
);

export default async function detect(url: string, debug = false) {
  const p = await pipe;

  const { score: screenshot_score = 0 } =
    (
      (await p(url, [
        "screenshot",
        "not screenshot",
      ])) as ZeroShotImageClassificationOutput[]
    ).find((a) => a.label === "screenshot") || {};

  const { score: twitter_score = 0 } =
    (
      (await p(url, [
        "twitter",
        "not twitter",
      ])) as ZeroShotImageClassificationOutput[]
    ).find((inf) => inf.label === "twitter") || {};

  return { screenshot_score, twitter_score };
}
