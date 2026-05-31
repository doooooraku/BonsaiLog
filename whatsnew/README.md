# whatsnew — Google Play リリースノート (Sess61 PR1〜)

EAS Submit が Play Console アップロード時に **言語別リリースノート** として取り込む `.txt` ファイル群。 ファイル名は BCP-47 形式 (例: `whatsnew-en-US.txt` / `whatsnew-ja-JP.txt`)。 1 ファイル 500 文字以内 (Google Play ルール)。

## 使い方

- このディレクトリにファイルを置いて `pnpm release:android` を実行すると、 EAS Submit が **言語ごとに** Play Console の「リリースノート」 欄に自動投稿する。
- ストア掲載に未登録の言語の `whatsnew-*.txt` は無視される (Sess61 議論結論)。
- 内容は `fastlane/metadata/<lang>/release_notes.txt` を流用するのが基本。
- 詳細は `docs/how-to/workflow/google_play_release.md` (Sess61 PR5 で全面更新予定)。

## 言語別ファイル

- `whatsnew-en-US.txt` — 英語 (Play Console 登録済み、 必須)
- `whatsnew-ja-JP.txt` — 日本語 (Sess61 PR4 で ja-JP ストア掲載自動追加と同時に整備予定)

## 参考

- ADR-0050 (Sess61 PR5 で起票予定) — Android リリース自動化方針
- `.claude/skills/release-android/SKILL.md` (Sess61 PR5 で新規) — `/release-android` Skill
