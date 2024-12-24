import assert from "node:assert";
import { suite, test } from "node:test";
import Parser from "../src/Parser";

suite("Parse document", {}, () => {
    test("Parse complex document with mappings and sequences", () => {
        const actual = Parser.parse(String.raw`
changelog:
  exclude:
    labels:
      - wontfix
      - question
      - experimental
      - epic
      - duplicate
  categories:
    - title: New Features
      labels:
        - feature
    - title: Enchancements
      labels:
        - enhancement
      exclude:
        labels:
          - feature
          - bug
    - title: Bug Fixes
      labels:
        - bug
    - title: Documentation Updates
      labels:
        - documentation
    - title: Other Changes
      labels:
        - "*"`);
        const expected = {
            "changelog": {
                "exclude": {
                    "labels": ["wontfix", "question", "experimental", "epic", "duplicate"]
                },
                "categories": [
                    {
                        "title": "New Features",
                        "labels": ["feature"]
                    },
                    {
                        "title": "Enchancements",
                        "labels": ["enhancement"],
                        "exclude": {
                            "labels": ["feature", "bug"]
                        }
                    },
                    {
                        "title": "Bug Fixes",
                        "labels": ["bug"]
                    },
                    {
                        "title": "Documentation Updates",
                        "labels": ["documentation"]
                    },
                    {
                        "title": "Other Changes",
                        "labels": ["*"]
                    }
                ]
            }
        };
        assert.deepEqual(actual, expected);
    });
})