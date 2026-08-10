import s0 from './synsets/0.mjs';
import s1 from './synsets/1.mjs';
import s2 from './synsets/2.mjs';
import s3 from './synsets/3.mjs';
import s4 from './synsets/4.mjs';
import s5 from './synsets/5.mjs';
import s6 from './synsets/6.mjs';
import s7 from './synsets/7.mjs';
import s8 from './synsets/8.mjs';
import s9 from './synsets/9.mjs';
import l0 from './lemmas/0.mjs';
import l1 from './lemmas/a.mjs';
import l2 from './lemmas/b.mjs';
import l3 from './lemmas/c.mjs';
import l4 from './lemmas/d.mjs';
import l5 from './lemmas/e.mjs';
import l6 from './lemmas/f.mjs';
import l7 from './lemmas/g.mjs';
import l8 from './lemmas/h.mjs';
import l9 from './lemmas/i.mjs';
import l10 from './lemmas/j.mjs';
import l11 from './lemmas/k.mjs';
import l12 from './lemmas/l.mjs';
import l13 from './lemmas/m.mjs';
import l14 from './lemmas/n.mjs';
import l15 from './lemmas/o.mjs';
import l16 from './lemmas/p.mjs';
import l17 from './lemmas/q.mjs';
import l18 from './lemmas/r.mjs';
import l19 from './lemmas/s.mjs';
import l20 from './lemmas/t.mjs';
import l21 from './lemmas/u.mjs';
import l22 from './lemmas/v.mjs';
import l23 from './lemmas/w.mjs';
import l24 from './lemmas/x.mjs';
import l25 from './lemmas/y.mjs';
import l26 from './lemmas/z.mjs';

export const manifest = Object.freeze({
  "format": "eslm-public-kb-v1",
  "id": "oewn-2025",
  "title": "Open English WordNet 2025",
  "version": "2025",
  "kind": "lexical-taxonomy",
  "generatedBy": "coding-agent+deterministic-node-compiler",
  "sourceRelease": "2025-12-31",
  "sourceArchive": "english-wordnet-2025-json.zip",
  "sourceDigest": "7d749f6e2c39e6970e4997839dcf6e42fd281f3c2fae0171d2192bae8cfa4b51",
  "license": "CC BY 4.0; Open English WordNet and Princeton WordNet attribution required",
  "trainOnly": false,
  "benchmarkEligible": false,
  "counts": {
    "synsets": 107519,
    "uniqueLemmas": 127311,
    "memberOccurrences": 185129,
    "definitions": 107524,
    "examples": 49596
  },
  "relations": {
    "attribute": 1260,
    "domain_topic": 6433,
    "similar": 23176,
    "also": 2950,
    "exemplifies": 1639,
    "domain_region": 2,
    "hypernym": 88075,
    "mero_part": 5387,
    "wikidata": 1140,
    "mero_member": 723,
    "mero_substance": 825,
    "entails": 407,
    "causes": 221
  },
  "capabilities": [
    "define",
    "list-senses",
    "synonyms",
    "bounded-hypernym-deduction"
  ],
  "limitations": [
    "no automatic word-sense disambiguation",
    "no closed-world negation",
    "no proper-noun Namenet extension"
  ]
});
export const data = Object.freeze({ synsets: Object.freeze(Object.assign({}, s0, s1, s2, s3, s4, s5, s6, s7, s8, s9)), lemmas: Object.freeze(Object.assign({}, l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23, l24, l25, l26)) });
export default Object.freeze({ manifest, data });
