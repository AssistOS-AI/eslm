export default Object.freeze([
  {
    "id": "child-basic:man-human",
    "when": [
      [
        "?x",
        "is_a",
        "man"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "human"
    ],
    "source": "generated-kb:child-basic:man-human"
  },
  {
    "id": "child-basic:woman-human",
    "when": [
      [
        "?x",
        "is_a",
        "woman"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "human"
    ],
    "source": "generated-kb:child-basic:woman-human"
  },
  {
    "id": "child-basic:boy-child",
    "when": [
      [
        "?x",
        "is_a",
        "boy"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "child"
    ],
    "source": "generated-kb:child-basic:boy-child"
  },
  {
    "id": "child-basic:girl-child",
    "when": [
      [
        "?x",
        "is_a",
        "girl"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "child"
    ],
    "source": "generated-kb:child-basic:girl-child"
  },
  {
    "id": "child-basic:child-human",
    "when": [
      [
        "?x",
        "is_a",
        "child"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "human"
    ],
    "source": "generated-kb:child-basic:child-human"
  },
  {
    "id": "child-basic:human-living",
    "when": [
      [
        "?x",
        "is_a",
        "human"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "living-being"
    ],
    "source": "generated-kb:child-basic:human-living"
  },
  {
    "id": "child-basic:plant-living",
    "when": [
      [
        "?x",
        "is_a",
        "plant"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "living-being"
    ],
    "source": "generated-kb:child-basic:plant-living"
  },
  {
    "id": "child-basic:living-grows",
    "when": [
      [
        "?x",
        "is_a",
        "living-being"
      ]
    ],
    "then": [
      "?x",
      "can",
      "grow"
    ],
    "source": "generated-kb:child-basic:living-grows"
  },
  {
    "id": "child-basic:living-mortal",
    "when": [
      [
        "?x",
        "is_a",
        "living-being"
      ]
    ],
    "then": [
      "?x",
      "will_die",
      "eventually"
    ],
    "source": "generated-kb:child-basic:living-mortal"
  },
  {
    "id": "animals:bird-animal",
    "when": [
      [
        "?x",
        "is_a",
        "bird"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "animal"
    ],
    "source": "generated-kb:animals:bird-animal"
  },
  {
    "id": "animals:mammal-animal",
    "when": [
      [
        "?x",
        "is_a",
        "mammal"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "animal"
    ],
    "source": "generated-kb:animals:mammal-animal"
  },
  {
    "id": "animals:amphibian-animal",
    "when": [
      [
        "?x",
        "is_a",
        "amphibian"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "animal"
    ],
    "source": "generated-kb:animals:amphibian-animal"
  },
  {
    "id": "animals:fish-animal",
    "when": [
      [
        "?x",
        "is_a",
        "fish"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "animal"
    ],
    "source": "generated-kb:animals:fish-animal"
  },
  {
    "id": "animals:animal-living",
    "when": [
      [
        "?x",
        "is_a",
        "animal"
      ]
    ],
    "then": [
      "?x",
      "is_a",
      "living-being"
    ],
    "source": "generated-kb:animals:animal-living"
  }
]);
