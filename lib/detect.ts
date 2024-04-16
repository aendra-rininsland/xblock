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

export const MODEL_NAME = "xblock-social-screenshots-4";
const p = pipeline("image-classification", `howdyaendra/${MODEL_NAME}`);

export const classify = async (
  url: string
): Promise<ImageClassificationSingle[]> => {
  try {
    const classifier = await p;
    return (await classifier(url, {
      topk: 4,
    })) as ImageClassificationOutput;
  } catch (e) {
    console.error(e);
    return [];
  }
};
