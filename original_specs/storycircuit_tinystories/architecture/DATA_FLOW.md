# Data Flow and Split Firewall

```text
OFFICIAL SOURCE FILES
        |
        v
acquisition manifest + hashes
        |
        v
canonical story stream
        |
        +-----------------------------+
        |                             |
        v                             v
  split assignment             corpus audit
        |
        +-----------+------------------+------------------+
        |           |                  |                  |
        v           v                  v                  v
     TRAIN         DEV          AGENT SHADOW          FROZEN TEST
        |           |                  |                  |
        |           |       only aggregate verdict       |
        |           |                  |                  |
        +---- induction / tuning ------+                  |
        |                                                  |
        v                                                  v
   model artifact --------------------------------> final evaluation
```

## Rules

- assignment is by whole story or story family, never sentence;
- duplicate and near-duplicate clusters are kept in one partition;
- split manifests are created before agent synthesis;
- frozen test text is inaccessible to induction processes;
- teacher annotations inherit the visibility of the source story;
- external benchmarks remain outside training unless an experiment explicitly declares transfer training;
- every metric resolves to a data manifest hash.

## Derived datasets

Question sets, minimal pairs, corruption sets, and StoryIR annotations carry parent story IDs. A derived item cannot move to another visibility class than its parent unless it is newly authored and independently partitioned.
