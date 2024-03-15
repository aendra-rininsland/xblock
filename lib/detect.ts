// import {
//   ZeroShotImageClassificationOutput,
//   pipeline,
//   env,
//   RawImage,
// } from "@xenova/transformers";
// import { execa } from "execa";
// import { readFileSync } from "fs";
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE);

// env.backends.onnx.wasm.wasmPaths =
//   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/";
// env.backends.onnx.wasm.numThreads = 1;

// env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = false;
// console.log(env);

export const isScreenshot = async (url: string): Promise<Boolean> =>
  hf
    .imageClassification(
      {
        data: await (await fetch(url)).blob(), //new Blob([readFileSync(url)]),
      },
      { retry_on_error: true }
    )
    .then((result) => {
      // console.log(result);
      return result.some(
        (d) =>
          d.label === "web site, website, internet site, site" && d.score > 0.98
      );
    })
    .catch(() => {
      return false;
    });

export const infer = async (
  url: string
): Promise<{ Twitter: number; "not Twitter": number }> =>
  hf
    .zeroShotImageClassification({
      model: "openai/clip-vit-large-patch14-336",
      inputs: {
        image: await (await fetch(url)).blob(), //new Blob([readFileSync(url)]),
      },
      parameters: {
        candidate_labels: ["Twitter", "not Twitter"],
      },
    })
    .then((result) =>
      result.reduce((a, c) => ({ ...a, [c.label]: c.score }), {
        Twitter: 0,
        "not Twitter": 0,
      })
    )
    .catch(() => ({ Twitter: 0, "not Twitter": 0 }));

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
//   try {
//     const { stdout, stderr } = await execa(
//       "/Users/aendra.rininsland/Projects/simplemod/.venv/bin/python",
//       ["/Users/aendra.rininsland/Projects/simplemod/lib/detect.py", url]
//     );

//     const result = JSON.parse(stdout);
//     return result.reduce((a: any, c: any) => {
//       a[c.label] = c.score;
//       return a;
//     }, {});
//   } catch (e) {
//     return { "not screenshot": 0, screenshot: 0, "not Twitter": 0, Twitter: 0 };
//   }
// };
