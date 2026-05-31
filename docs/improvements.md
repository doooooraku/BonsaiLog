# BonsaiLog Improvements (改善候補トラッキング)

> **このファイルの役割**: 各 PR で **意図的に妥協した実装** / **将来の改善候補** / **TODO** を 1 行で記録し、 漂流を防ぐ。
>
> **運用ルール (Sess60 PR1 で導入)**:
>
> - 各 PR で「ADR を書くほどでもないが既知の改善ポイント」 を発見したら 1 行追記
> - フォーマット: `[Status] [起票日] [対応予定 Sess] - 内容` (Status: Open / Closed)
> - PR description に当該行へのリンクを書く (例: `[improvements.md](docs/improvements.md#sess60-pr1)`)
> - **Session Start 時に Read** (`.claude/CLAUDE.md` Session Start Checklist で強制)
> - 30 日以上 Open のままは `pnpm docs:lint` で WARN 出力検討 (Sess61 以降)

---

## Closed (Sess60 で解決)

### Sess59 検証で発見 → Sess60 で対応

| #   | 起票日     | Status              | 対応 Sess         | 内容                                                                                                                                                       |
| --- | ---------- | ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-05-31 | **Closed (PR1)**    | Sess60            | タグ追加上限 Alert で `photoLimitDesc` 流用 → 「盆栽 1 つにつき 3 枚」 と表示で意味不明 → `tagLimitDesc` 専用 key に分離                                   |
| 2   | 2026-05-31 | **Closed (PR1)**    | Sess60            | カスタム樹種・樹形追加上限 Alert で同 photoLimit 流用 → `customLimitDesc` 専用 key に分離                                                                  |
| 3   | 2026-05-31 | **Open (PR2 予定)** | Sess60 PR2        | Paywall FeatureRow 6 行の値表記 (◎ / あり-なし / 数値) が 3 種混在 → 「言葉」 で統一 + 機能名「広告非表示」 整合                                           |
| 4   | 2026-05-31 | **Open (PR3 予定)** | Sess60 PR3        | カスタム樹種・樹形が SpeciesPicker / StylePicker で UNION 表示 = マスタ vs ユーザーカスタムが見分けつかず → section header + badge + 残枠 counter で差別化 |
| 5   | 2026-05-31 | **Open (PR3 予定)** | Sess60 PR3 (任意) | Settings PlanSection bullet 6 個 → 3 列表 (機能 / Free / Pro) でユーザー比較性向上                                                                         |

---

## Open (将来対応)

### Sess61 以降 候補

| #   | 起票日     | Status   | 対応 Sess   | 内容                                                                                                                                                                             |
| --- | ---------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | 2026-05-31 | **Open** | Sess61 候補 | `pnpm docs:lint` に improvements.md Open 30 日経過 items を WARN 出力する check 追加                                                                                             |
| 7   | 2026-05-31 | **Open** | Sess61 候補 | PR template (`.github/pull_request_template.md`) DoD section に「本 PR で意図的に妥協した点を improvements.md に追記したか?」 チェックボックス追加                               |
| 8   | 2026-05-31 | **Open** | v1.x 候補   | useProGuard hook の debug log 追加 (PR3-5 で `console.log('useProGuard:openPaywall', source)`)                                                                                   |
| 9   | 2026-05-31 | **Open** | v1.x 候補   | SEED_PACK_FREE / SEED_PACK_PRO 切替 UI を DevSettings に追加 (Sess10 EN button パターン拡張)                                                                                     |
| 10  | 2026-05-31 | **Open** | v1.x 候補   | カスタム樹種・樹形の Full 管理画面 (rename / 削除 menu + UndoSnackbar、 タグ管理と同パターン)                                                                                    |
| 11  | 2026-05-31 | **Open** | Sess61 候補 | Paywall「表示される」 (ja) / Settings「Not available」 (en) が FREE column width 60-64dp で 2 行折返し → 機能名 60% / FREE 20% / PRO 20% を 50%/25%/25% に調整 (Sess60 検証発見) |
| 12  | 2026-05-31 | **Open** | Sess61 候補 | SpeciesPicker カスタム counter「8/3」 (Grandfathered 5 件超過) 表示で「上限超え!?」 と一瞬戸惑う UX、 「カスタム (上限超過)」 や「8 個」 表記に変更検討 (Sess60 検証発見)        |

---

## 運用 メタ情報

- **起票元**: Sess60 PR1 で本ファイル新規作成
- **Predecessor**: Sess59 検証 audit (`docs/audit/sess59-pr1-5-real-device-verification.md`) で発見した 5 件 + 過去議論で先送りした 5 件 = 計 10 件で起票
- **次回 review**: Sess61 開始時に Open items 確認、 Closed items は履歴として残置
