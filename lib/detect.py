from transformers import pipeline
import sys
import json

pipe = pipeline("image-classification", model="howdyaendra/autotrain-xblock-twitter-1")
url = sys.argv[1]

detect = pipe(url)

# print(detect)

sys.stdout.write(json.dumps(detect))