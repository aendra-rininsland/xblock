import {
  ZeroShotImageClassificationOutput,
  pipeline,
  env,
} from "@xenova/transformers";
import { execa } from "execa";

env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = false;
// console.log(env);

const pipe = pipeline(
  "zero-shot-image-classification",
  "Xenova/clip-vit-base-patch32"
);
const TEMPLATE = "This is a photo of {}";

export default async function detect(url: string, debug = false) {
  try {
    const p = await pipe;

    const hypothesisScreenshot = (await p(
      url,
      ["screenshot", "not screenshot"],
      {
        hypothesis_template: TEMPLATE,
      }
    )) as ZeroShotImageClassificationOutput[];

    const hypothesisTwitter = (await p(url, ["Twitter", "not Twitter"], {
      hypothesis_template: TEMPLATE,
    })) as ZeroShotImageClassificationOutput[];

    return [...hypothesisScreenshot, ...hypothesisTwitter].reduce(
      (a: any, c: any) => {
        a[c.label] = c.value;
        return a;
      },
      {}
    );
  } catch (e) {
    return { "not screenshot": 0, screenshot: 0, "not Twitter": 0, Twitter: 0 };
  }
}

export const detectPython = async (url: string, debug = false) => {
  try {
    const { stdout, stderr } = await execa(
      "/Users/aendra.rininsland/Projects/simplemod/.venv/bin/python",
      ["/Users/aendra.rininsland/Projects/simplemod/lib/detect.py", url]
    );

    const result = JSON.parse(stdout);
    return result.reduce((a: any, c: any) => {
      a[c.label] = c.value;
      return a;
    }, {});
    // const p = await pipe;

    // const { score: screenshot_score = 0 } =
    //   (
    //     (await p(url, ["screenshot", "not screenshot"], {
    //       hypothesis_template: "This is a photo of {}",
    //     })) as ZeroShotImageClassificationOutput[]
    //   ).find((a) => a.label === "screenshot") || {};

    // const { score: twitter_score = 0 } =
    //   (
    //     (await p(url, ["twitter", "not twitter"], {
    //       hypothesis_template: "This is a photo of {}",
    //     })) as ZeroShotImageClassificationOutput[]
    //   ).find((inf) => inf.label === "twitter") || {};

    // return { screenshot_score, twitter_score };
  } catch (e) {
    return { "not screenshot": 0, screenshot: 0, "not Twitter": 0, Twitter: 0 };
  }
};
