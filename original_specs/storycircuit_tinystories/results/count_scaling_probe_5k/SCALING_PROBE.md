# Count Scaling Probe

Read 5000 stories: 3956 train-pool and 1044 held out.

Best held-out BPB in this grid: **1.881587** at order 4 with 3956 stories.

| train stories | order | BPB | ending acc. | structured acc. | numeric records | train s |
|---:|---:|---:|---:|---:|---:|---:|
| 500 | 1 | 4.3940 | 0.527 | 0.527 | 2449 | 0.19 |
| 500 | 2 | 3.3186 | 0.533 | 0.527 | 24824 | 0.26 |
| 500 | 4 | 2.0963 | 0.507 | 0.507 | 91018 | 0.33 |
| 2000 | 1 | 4.3931 | 0.527 | 0.527 | 4501 | 0.78 |
| 2000 | 2 | 3.3117 | 0.513 | 0.513 | 65846 | 1.10 |
| 2000 | 4 | 1.9178 | 0.520 | 0.520 | 296875 | 1.51 |
| 3956 | 1 | 4.3931 | 0.527 | 0.527 | 5614 | 1.50 |
| 3956 | 2 | 3.3103 | 0.513 | 0.513 | 99878 | 2.12 |
| 3956 | 4 | 1.8816 | 0.507 | 0.507 | 515018 | 3.21 |

The ending task is close to chance in much of the grid; lower BPB does not automatically produce narrative understanding.
