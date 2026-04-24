# fastlane/screenshots/

App Store Connect screenshots managed by fastlane.

## Directory Structure

```
fastlane/screenshots/
├── ja/           # Japanese
├── en-US/        # English (US)
└── <locale>/     # One directory per ASC locale
    ├── 01_*.png
    ├── 02_*.png
    └── ...       # Up to 10 screenshots per locale
```

## Required Dimensions (pixels)

| Device                   | Size (portrait) | Size (landscape) | Required |
| ------------------------ | --------------- | ---------------- | -------- |
| iPhone 6.9" (16 Pro Max) | 1320 × 2868     | 2868 × 1320      | Yes      |
| iPhone 6.7" (15 Pro Max) | 1290 × 2796     | 2796 × 1290      | Yes      |
| iPhone 6.5" (14 Plus)    | 1284 × 2778     | 2778 × 1284      | Yes      |
| iPhone 5.5" (8 Plus)     | 1242 × 2208     | 2208 × 1242      | Optional |
| iPad Pro 13" (M4)        | 2064 × 2752     | 2752 × 2064      | If iPad  |
| iPad Pro 12.9" (6th)     | 2048 × 2732     | 2732 × 2048      | If iPad  |

## Safe Area Guidelines

- **Status bar**: top 54px (iPhone), 40px (iPad) — avoid placing key content
- **Home indicator**: bottom 34px — avoid interactive elements
- **Dynamic Island**: top-center 126×37px on iPhone 15 Pro+ — avoid overlapping

## File Naming Convention

Use numbered prefixes for ordering: `01_home.png`, `02_feature.png`, `03_detail.png`, etc.

## Generation

```bash
pnpm store:screenshots    # Generate screenshots (if configured)
```

See `docs/how-to/workflow/screenshot_generation.md` for the full workflow.
