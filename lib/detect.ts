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

export const MODEL_NAME_LARGE = "xblock-large-patch2-224";
export const MODEL_NAME = MODEL_NAME_LARGE;

export const PRIMARY_CLASSES = ["twitter", "bluesky"];

const p = pipeline("image-classification", `howdyaendra/${MODEL_NAME_LARGE}`);

export const classify = async (
  url: string
): Promise<ImageClassificationSingle[]> => {
  try {
    const classifier = await p;
    const result = (await classifier(url, {
      topk: 4,
    })) as ImageClassificationOutput;

    return result;
  } catch (e: any) {
    if (!e.toString().includes("504 Gateway")) {
      console.error(e);
    }
    return [];
  }
};
