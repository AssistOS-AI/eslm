export default Object.freeze([
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
