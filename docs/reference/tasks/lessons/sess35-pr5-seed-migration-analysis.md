# Sess35 PR-5 — SEED data 旧形式 migration 影響範囲調査 (Phase ι-1)

- **実施日**: 2026-05-23 (UTC) / 04:45-04:50 JST
- **検証範囲**: `src/dev/seedTestData.ts` の event SEED data が 14 種別中どれだけ Sess16 PR-E 以前の旧 field 名 / format で残っているか
- **目的**: PR-2 (#803) §5 残作業 3 件中の最後「SEED data 旧形式 type の data migration」 を消化、 Phase ι-1 として影響範囲確定 + issue 起票
- **PR scope**: lessons + issue #806 起票のみ (実 migration は Phase ι-2 で別 PR)

---

## 1. 調査結果サマリー

`src/dev/seedTestData.ts` の調査で **14 種別中 11 種別で何らかの旧 field 名 / format 不整合** を確認:

| 種別              | 不整合                                                               | 修正必要度 |
| ----------------- | -------------------------------------------------------------------- | ---------- |
| pruning           | `body_part: '枝'` (str) → 新 `parts: ['branch']` + `amount` 必要     | **High**   |
| wiring            | payload なし → `wire_size_mm` + `body_part` 必要                     | **High**   |
| unwiring          | str → enum 化                                                        | Mid        |
| repotting         | `pot_id`/`soil_mix` → `pot_size_cm`/`root_pruning` (field 名/型変更) | **High**   |
| fertilizing       | `amount` → `product` field 名変更                                    | Mid        |
| pest_control      | str → enum + `dilution_ratio` 追加                                   | **High**   |
| leaf_trimming     | str → enum 化                                                        | Mid        |
| defoliation       | 同上                                                                 | Mid        |
| deshoot           | 同上                                                                 | Mid        |
| candle_cut        | str → enum + `count` 追加                                            | **High**   |
| moss_care         | str → enum 化                                                        | Mid        |
| _position_change_ | 整合 ✅                                                              | None       |
| _watering_        | payload optional、 SEED は OK ✅                                     | None       |
| _leaf_first_aid_  | SEED ゼロ件、 修正不要 ✅                                            | None       |

詳細は [issue #806](https://github.com/doooooraku/BonsaiLog/issues/806) を参照。

---

## 2. 修正対象ファイル

**single file** で完結 (migration 工数は限定的):

- `src/dev/seedTestData.ts` (約 30+ event SEED data)
  - line 272-332 (デフォルト SEED)
  - line 561+ (watering バリエーション)
  - line 615-678 (overdue / trash)

DB migration script は **β版未配布のため不要** (prod 既存 user data なし)。

---

## 3. Phase 計画

| Phase                   | scope                                                        | 工数       | 状態                   |
| ----------------------- | ------------------------------------------------------------ | ---------- | ---------------------- |
| **Phase ι-1 (本 PR-5)** | 影響範囲調査 + issue 起票 + lessons                          | 30 分      | ✅ 完遂                |
| **Phase ι-2**           | SEED ファイル修正 PR (30+ event 適用 + unit test + 実機検証) | 1.5-2 時間 | 🔲 別 session          |
| Phase ι-3 (任意)        | DB migration script PR (prod release 前)                     | 3-4 時間   | 🔲 prod release 前判断 |

---

## 4. 緊急性評価

**Mid** — dev test 環境のみ影響、 prod release 前に Phase ι-2 完遂で十分。 Phase ι-3 は β版未配布のため現時点不要。

ただし「英語 SEED 投入」 button (`src/dev/seedTestData.ts` 経由) で SEED 投入直後に **新 EventRow detailed mode で chip がゼロ表示** する事例は user UX 観点で混乱要因。 v1.0 リリース前に Phase ι-2 完遂を強く推奨。

---

## 5. 関連

- ADR-0027 (14 種別 form schema)
- ADR-0041 D5 (EventRow Phase η/θ、 chip 表示の payload 整合性)
- Sess34 PR-Q-fix (#799、 payloadValidator schema 拡張 5 種別、 form input 側は対応済)
- Sess35 PR-2 (#803、 §1-B Note「SEED data の問題」 を構造化)
- Sess35 PR-3 (#804、 新規 event 作成は完全動作確認、 SEED 旧形式は別問題)
- GitHub issue #806

---

## 6. 結論

Sess35 PR-2 §5 残作業 **3 件すべて消化完遂**:

| 残作業                                               | PR                         | 状態                                     |
| ---------------------------------------------------- | -------------------------- | ---------------------------------------- |
| 不足 2 種別 (pest_control / candle_cut) 実機新規作成 | PR-3 (#804)                | ✅ MERGED                                |
| VoiceOver / TalkBack a11y 検証                       | PR-4 (#805)                | ✅ MERGED                                |
| SEED data 旧形式 type migration                      | **PR-5 (本) + issue #806** | ✅ Phase ι-1 完遂、 Phase ι-2 別 session |

Sess35 全 5 PR (#802-805 + #806 issue + 本 PR-5) で **「もっと見る bug fix + 14 種別検証 + 完全な残作業消化 + 影響範囲調査の構造保存」** を達成。
