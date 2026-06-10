# fastlane/metadata/

App Store Connect metadata managed by fastlane.

## Structure

```
fastlane/metadata/
├── ja/                  # Japanese (primary)
├── en-US/               # English (US)
└── <other locales>/     # Add as needed
```

For each locale, the following files are required:

- `name.txt` (≤30 chars)
- `subtitle.txt` (≤30 chars)
- `description.txt` (≤4000 chars)
- `keywords.txt` (≤100 chars, comma-separated, no spaces)
- `promotional_text.txt` (≤170 chars)
- `release_notes.txt` (per release)
- `privacy_url.txt`
- `support_url.txt`
- `marketing_url.txt` (optional)

## ASC locale codes

| Language              | ASC code  | Notes                        |
| --------------------- | --------- | ---------------------------- |
| Japanese              | `ja`      | NOT `ja-JP`                  |
| English (US)          | `en-US`   |                              |
| French                | `fr-FR`   | `fr-CA` is separate          |
| Spanish               | `es-ES`   | `es-MX` is separate          |
| German                | `de-DE`   |                              |
| Italian               | `it`      | No region                    |
| Portuguese (BR)       | `pt-BR`   | `pt-PT` is separate, no `pt` |
| Chinese (Simplified)  | `zh-Hans` |                              |
| Chinese (Traditional) | `zh-Hant` |                              |
| Korean                | `ko`      |                              |
| Russian               | `ru`      |                              |
| Thai                  | `th`      |                              |
| Indonesian            | `id`      |                              |
| Vietnamese            | `vi`      |                              |
| Hindi                 | `hi`      |                              |
| Turkish               | `tr`      |                              |
| Dutch                 | `nl-NL`   |                              |
| Polish                | `pl`      |                              |
| Swedish               | `sv`      |                              |

## Category Metadata (root level)

These files are NOT locale-specific — they apply globally:

| File                                | Description                       | Example values                                                                                           |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `primary_category.txt`              | Primary App Store category        | `BUSINESS`, `UTILITIES`, `PRODUCTIVITY`, `LIFESTYLE`, `ENTERTAINMENT`, `EDUCATION`, `HEALTH_AND_FITNESS` |
| `secondary_category.txt`            | Secondary category (optional)     | Same as above                                                                                            |
| `copyright.txt`                     | Copyright holder                  | `2026 doooooraku`                                                                                        |
| `primary_first_sub_category.txt`    | Primary sub-category 1 (optional) | Usually empty                                                                                            |
| `primary_second_sub_category.txt`   | Primary sub-category 2 (optional) | Usually empty                                                                                            |
| `secondary_first_sub_category.txt`  | Secondary sub-category 1          | Usually empty                                                                                            |
| `secondary_second_sub_category.txt` | Secondary sub-category 2          | Usually empty                                                                                            |

Full category list: [App Store Categories](https://developer.apple.com/app-store/categories/)

## Review Information — DO NOT commit (enter in ASC UI)

App Review contact info (name / email / phone / demo account) is **intentionally NOT
managed in this repo** (Doc-Truth Audit 2026-06 batch ②b decision):

- This repo is public (ADR-0057), so real contact values would expose personal info
- `deliver` uploads everything under `fastlane/metadata/` and has no option to skip
  `review_information/` selectively — placeholder values would be pushed to ASC as-is
- Review contact info rarely changes, so automation has little value

**Operation**: enter the values once, by hand, in App Store Connect
(App → App Review Information) when preparing the iOS release.
The app needs no login, so no demo account is required — note "No login required"
in the reviewer notes field.

`scripts/validate-metadata.mjs` (check 7) fails CI if `review_information/` reappears
or `copyright.txt` still contains placeholder text.

## Validation

```bash
pnpm metadata:check
```

This validates char limits, accent characters (for Latin-script languages), and forbidden patterns (trademarks, superlatives).

## Push to ASC

- **Automatic**: PR merged to `main` triggers `.github/workflows/push-app-store-metadata.yml`
- **Manual**: `gh workflow run "Push App Store Metadata"`

## Lessons (Repolog L-FL01〜FL07)

See `docs/how-to/workflow/app_store_localization.md` (if present).
