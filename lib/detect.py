from transformers import pipeline
import sys
import json

pipe = pipeline("zero-shot-image-classification", model="openai/clip-vit-large-patch14")
url = sys.argv[1]
template = "This is a photo of {}"

screenshot_detect = pipe(url, candidate_labels=['screenshot', 'not screenshot'], hypothesis_template=template)
twitter_detect = pipe(url, candidate_labels=['Twitter', 'not Twitter'], hypothesis_template=template)

sys.stdout.write(json.dumps([item for sub_list in [screenshot_detect, twitter_detect] for item in sub_list]))