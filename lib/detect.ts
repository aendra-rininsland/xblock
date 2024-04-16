import {
  pipeline,
  env,
  ImageClassificationSingle,
  ImageClassificationOutput,
} from "@xenova/transformers";

env.backends.onnx.wasm.numThreads = 1;
env.allowRemoteModels = false;
env.localModelPath = "../transformers.js/models";
// console.log(env);

export const MODEL_NAME_BASE = "xblock-base-patch1-224";
export const MODEL_NAME_LARGE = "xblock-large-patch1-224";

const BASE_CLASSES = ["twitter", "bluesky"];

const pB = pipeline("image-classification", `howdyaendra/${MODEL_NAME_BASE}`);
const pL = pipeline("image-classification", `howdyaendra/${MODEL_NAME_LARGE}`);

export const classify = async (
  url: string
): Promise<ImageClassificationSingle[]> => {
  try {
    const classifier = await pB;
    const pBOutput = (await classifier(url, {
      topk: 4,
    })) as ImageClassificationOutput;

    const baseScore = pBOutput.reduce(
      (a, c) => (BASE_CLASSES.includes(c.label) ? c.score + a : a),
      0
    );

    const otherScreenshotScore =
      pBOutput.find((d) => d.label === "other-screenshot")?.score || 0;

    if (baseScore >= 0.8) {
      console.log("TWITTER_BLUESKY", url, pBOutput);
      return pBOutput; // Terminate early if high base classes
    } else if (otherScreenshotScore > 0.5) {
      const classifierLarge = await pL;
      const pLOutput = (await classifierLarge(url, {
        topk: 4,
      })) as ImageClassificationOutput;
      console.log("pL", url, pLOutput);
      return [...pBOutput, ...pLOutput];
    }

    return [];
  } catch (e: any) {
    if (!e.toString().includes("504 Gateway")) {
      console.error(e);
    }
    return [];
  }
};
