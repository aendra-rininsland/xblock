import { pipeline, env } from "@xenova/transformers";

env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = false;
// env.localModelPath = "../transformers.js/models";
// console.log(env);

export const classify = async (url: string) => {
  const classifier = await pipeline(
    "image-classification",
    "howdyaendra/xblock-social-screenshots-1"
  );
  return await classifier(url, { topk: 2 });
};
