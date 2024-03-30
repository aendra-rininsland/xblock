import {
  ZeroShotImageClassificationOutput,
  pipeline,
  env,
  RawImage,
} from "@xenova/transformers";
// import { execa } from "execa";
// import { readFileSync } from "fs";
// import { HfInference } from "@huggingface/inference";
// import { pipeline as transformers } from "@xenova/transformers";

// const hf = new HfInference(process.env.HUGGING_FACE);

// env.backends.onnx.wasm.wasmPaths =
//   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/";
// env.backends.onnx.wasm.numThreads = 1;

env.backends.onnx.wasm.numThreads = 1;
env.allowRemoteModels = false;
env.localModelPath = "../transformers.js/models";
console.log(env);

export const classify = async (url: string) => {
  const classifier = await pipeline(
    "image-classification",
    "howdyaendra/autotrain-xblock-twitter-1"
  );
  return await classifier(url);
};

// const pipeline = transformers(
//   "image-classification",
//   "Xenova/vit-base-patch16-224"
// );

// export const isScreenshot = async (urls: string[]) => {
//   try {
//     const classifier = await pipeline;
//     const result = await classifier(urls);
//     const flat = (!Array.isArray(result) ? [result] : result).flat();
//     if (flat.some((d) => d.label.includes("website")))
//       console.log(result, urls);
//     return flat.some(
//       (d: { score: number; label: string }) =>
//         d.label === "web site, website, internet site, site" && d.score > 0.9
//     );
//   } catch (e) {
//     console.error(e);
//     return false;
//   }
// };

// export const isScreenshot = async (url: string): Promise<Boolean> =>
//   hf
//     .imageClassification(
//       {
//         data: await (await fetch(url)).blob(), //new Blob([readFileSync(url)]),
//       },
//       { retry_on_error: true }
//     )
//     .then((result) => {
//       const [top] = result.sort((a, b) => b.score - a.score);
//       return top.label.includes("website");
//     })
//     .catch((e: any) => {
//       console.error(e);
//       return false;
//     });

// export const infer = async (
//   url: string
// ): Promise<{ Twitter: number; "not Twitter": number }> =>
//   hf
//     .zeroShotImageClassification({
//       model: "openai/clip-vit-large-patch14-336",
//       inputs: {
//         image: await (await fetch(url)).blob(), //new Blob([readFileSync(url)]),
//       },
//       parameters: {
//         candidate_labels: ["Twitter", "not Twitter"],
//       },
//     })
//     .then((result) =>
//       result.reduce((a, c) => ({ ...a, [c.label]: c.score }), {
//         Twitter: 0,
//         "not Twitter": 0,
//       })
//     )
//     .catch(() => ({ Twitter: 0, "not Twitter": 0 }));

// export const classify = async (url: string) => {
//   const classifier = await pipeline(
//     "image-classification",
//     "Xenova/vit-base-patch16-224"
//   );
//   return await classifier(url);
// };

// export default async function detect(url: string, debug = false) {
//   const TEMPLATE = "This image is {}";
//   try {
//     const img = await RawImage.read(url);
//     // console.log(img);
//     const p = await pipeline(
//       "zero-shot-image-classification",
//       "Xenova/clip-vit-large-patch14"
//       // "Xenova/siglip-large-patch16-384"
//       // "Xenova/clip-vit-base-patch32"
//     );

//     const hypothesisScreenshot = (await p(
//       img,
//       ["screenshot", "not a screenshot"],
//       {
//         // hypothesis_template: TEMPLATE,
//       }
//     )) as ZeroShotImageClassificationOutput[];

//     const hypothesisTwitter = (await p(img, ["Twitter", "not Twitter"], {
//       // hypothesis_template: TEMPLATE,
//     })) as ZeroShotImageClassificationOutput[];

//     return [...hypothesisScreenshot, ...hypothesisTwitter].reduce(
//       (a: any, c: { score: number; label: string }) => {
//         a[c.label] = c.score;
//         return a;
//       },
//       {}
//     );
//   } catch (e) {
//     console.error(e);
//     return { "not screenshot": 0, screenshot: 0, "not Twitter": 0, Twitter: 0 };
//   }
// }

// export const detectPython = async (url: string, debug = false) => {
//   // console.log(url);

//   try {
//     const { stdout, stderr } = await execa("./venv/bin/python", [
//       "./lib/detect.py",
//       url,
//     ]);

//     if (stderr) console.error(stderr);

//     return JSON.parse(stdout);
//   } catch (e) {
//     console.error(e);
//     return false;
//   }
// };
