import { ValidationResult, BlobRef } from "@atproto/lexicon";
import lexicons from "@atproto/lexicon";
import { isObj, hasProp } from "@atproto/lexicon";
import * as AppBskyRichtextFacet from "@atproto/bsky/src/lexicon/types/app/bsky/richtext/facet";
import * as ComAtprotoLabelDefs from "@atproto/bsky/src/lexicon/types/com/atproto/label/defs";

export interface Record {
  did: string;
  displayName: string;
  description?: string;
  descriptionFacets?: AppBskyRichtextFacet.Main[];
  avatar?: BlobRef;
  labels?:
    | ComAtprotoLabelDefs.SelfLabels
    | { $type: string; [k: string]: unknown };
  createdAt: string;
  [k: string]: unknown;
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, "$type") &&
    (v.$type === "app.bsky.feed.generator#main" ||
      v.$type === "app.bsky.feed.generator")
  );
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate("app.bsky.feed.generator#main", v);
}
