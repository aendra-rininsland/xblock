export const process = (postsToCreate: any) => {
  try {
    const { posts } = await this.agent.app.bsky.feed
      .getPosts({
        uris: postsToCreate.map((post) => post.uri),
      })
      .then((resp) => resp.data);

    for (const post of posts.filter(
      (d) => !IGNORED_HANDLES.includes(d.author.handle)
    )) {
      if (AppBskyEmbedImages.isView(post.embed))
        this.backgroundQueue.add(async () => {
          try {
            const images = post?.embed
              ?.images as AppBskyEmbedImages.ViewImage[];

            const detections: [string, ImageClassificationSingle[]][] =
              await Promise.all(
                images.map(async (d) => {
                  const filename = d.fullsize.split("/").pop();
                  if (!filename) throw new Error("Invalid path: " + d.fullsize);
                  try {
                    const detections = await detect.classify(d.fullsize);

                    return [filename, detections];
                  } catch (e) {
                    console.error(e);
                    return [filename, []];
                  }
                })
              );
            const url = post.uri
              .replace("at://", "https://bsky.app/profile/")
              .replace("app.bsky.feed.post", "post");
            console.log(url, detections);
            for (const image of detections) {
              const [, dets] = image;

              const irrelevantScore =
                dets.find((d) => d.label === "irrelevant")?.score || 0;

              if (dets.length) {
                const [topDet] = dets.sort((a, b) => b.score - a.score);
                if (!["irrelevant"].includes(topDet.label)) {
                  if (topDet.score > 0.85) {
                    await createLabel(
                      post,
                      `${topDet.label}-screenshot`,
                      topDet ? `${topDet.label}:${topDet.score}` : "",
                      detect.MODEL_NAME_LARGE,
                      this.labeler
                    );
                  } else if (
                    topDet.label === "ngl" &&
                    topDet.score > 0.14 // NEEDS MORE TRAINING
                  ) {
                    await createLabel(
                      post,
                      `ngl-screenshot`,
                      `${topDet.label}:${topDet.score}`,
                      detect.MODEL_NAME,
                      this.labeler
                    );
                  }

                  // await createReport(post, detections, this.agent);
                  await addTag(
                    post,
                    detections,
                    [detect.MODEL_NAME_LARGE],
                    this.labeler
                  );
                }
              }
              writer.write({
                url,
                ...dets.reduce(
                  (a, c) => ({
                    ...a,
                    [c.label]: c.score,
                  }),
                  {}
                ),
              });
            }
          } catch (e: any) {
            if (!e.toString().includes("504 Gateway")) {
              console.error(e);
            }
          }
        });
    }
  } catch (e: any) {
    if (!e?.toString()?.includes("fetch failed")) {
      console.error(e);
    }
  }
};
