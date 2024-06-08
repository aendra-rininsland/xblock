---
layout: page
title: About
permalink: /about/
---

XBlock is an experiment by [Ændra Rininsland][1] build a system that
automatically labels screenshots on the [Bluesky][2] social network.

The tech stack currently consists of
- An [Ozone-based][4] moderation queue that receives reports from users about unlabelled/mislabelled screenshots
- An open source [image classification model][3] based on [google/vit-large-patch16-224][7], available with Onnx weights
- A [bot for automatically labelling images][5] using the Bluesky firehose

For more information about subscribing to [XBlock][6], please visit [Getting Started](/getting-started).

[1]: https://bsky.app/profile/aendra.com
[2]: https://www.bsky.social
[3]: https://huggingface.co/howdyaendra/xblock-large-patch3-224
[4]: https://github.com/bluesky-social/ozone
[5]: https://github.com/aendra-rininsland/xblock
[6]: https://bsky.app/profile/xblock.aendra.dev
[7]: https://huggingface.co/google/vit-large-patch16-224