import e0 from './events/0.mjs';
import e1 from './events/1.mjs';
import e2 from './events/2.mjs';
import e3 from './events/3.mjs';
import e4 from './events/4.mjs';
import e5 from './events/5.mjs';
import e6 from './events/6.mjs';
import e7 from './events/7.mjs';
import e8 from './events/8.mjs';
import e9 from './events/9.mjs';
import ea from './events/a.mjs';
import eb from './events/b.mjs';
import ec from './events/c.mjs';
import ed from './events/d.mjs';
import ee from './events/e.mjs';
import ef from './events/f.mjs';

export const manifest = Object.freeze({
  "format": "eslm-public-kb-v1",
  "id": "atomic-2020",
  "title": "ATOMIC 2020",
  "version": "February 2021",
  "kind": "defeasible-event-commonsense",
  "generatedBy": "coding-agent+deterministic-node-compiler",
  "sourceArchive": "atomic2020_data-feb2021.zip",
  "sourceDigest": "47c5f362ab4a3ea58c4962eebfdfd1c5420d3780e74cd3fe09efeef64f941c2b",
  "sourceSplit": "train.tsv",
  "license": "CC BY; retain ATOMIC 2020 paper and dataset attribution",
  "trainOnly": true,
  "benchmarkEligible": false,
  "counts": {
    "sourceTrainRows": 1076880,
    "retainedUniqueNonNoneTuples": 940426,
    "ignoredNoneRows": 120282,
    "malformedRows": 1,
    "uniqueEvents": 36940
  },
  "relations": {
    "oReact": 27534,
    "oWant": 47116,
    "xAttr": 113096,
    "xEffect": 83711,
    "xIntent": 49699,
    "xNeed": 91161,
    "xReact": 62424,
    "xWant": 109072,
    "oEffect": 31544,
    "AtLocation": 17423,
    "ObjectUse": 140181,
    "Desires": 2718,
    "HasProperty": 4971,
    "NotDesires": 2807,
    "Causes": 329,
    "HasSubEvent": 10894,
    "xReason": 292,
    "CapableOf": 7216,
    "MadeUpOf": 2911,
    "isAfter": 16461,
    "isBefore": 17076,
    "isFilledBy": 24174,
    "HinderedBy": 77616
  },
  "capabilities": [
    "intent",
    "precondition",
    "effect",
    "reaction",
    "desire",
    "event-order",
    "defeasible-cause"
  ],
  "limitations": [
    "answers are plausible candidates, not certain facts",
    "event matching is lexical and bounded",
    "dev/test tuples are not compiled"
  ]
});
export const data = Object.freeze({ events: Object.freeze(Object.assign({}, e0, e1, e2, e3, e4, e5, e6, e7, e8, e9, ea, eb, ec, ed, ee, ef)) });
export default Object.freeze({ manifest, data });
