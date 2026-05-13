# 41 画面 ↔ ui-diff flow 対応表

> 2026-05-13 時点。本ドキュメントは ADR-0020 §Notes Amended (2026-05-13) の補助資料として、
> mockups v1.0 (OpenDesign) screenshot と `maestro/flows/ui-diff/*.yml` の対応関係を管理する。
> R-25 構造系 4 項目 (タブ構成 / セクション構成 / UI 種別 / スクロール範囲) の達成状況を一覧化。

## サマリ

| 区分                               | 件数                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| **R-25 通過 (needsReeval: false)** | 11 flow                                              |
| **永続 skip (mockup 不在)**        | 1 flow (Issue #502 追跡)                             |
| **削除済 (deadcode)**              | 1 flow (Issue #505 で実体削除追跡)                   |
| **別 flow 化 (技術制約回避)**      | 1 flow (look-back-search → look-back-search-initial) |
| **未測定 (flow 未作成)**           | 推定 25 mockup                                       |

## R-25 通過済 11 flow

| flow                       | 対応 mockup                        | artifact             | 整合度                             | 備考                                          |
| -------------------------- | ---------------------------------- | -------------------- | ---------------------------------- | --------------------------------------------- |
| `bonsai-tab`               | `bonsai-tab.png`                   | `out/20260511-2032/` | ✅ レベル 2                        | PR #442                                       |
| `bonsai-create-sheet`      | `bonsai-create-01.png`             | `out/20260513-1237/` | ✅ レベル 2                        | PR #508 (modal 化後)、Issue #507 (header bug) |
| `look-back-tab`            | `care-hub.png`                     | `out/20260511-1054/` | ✅ レベル 2                        | PR #442                                       |
| `bonsai-detail-edit-sheet` | `bonsai-create-01.png` (edit mode) | `out/20260511-1102/` | ✅ レベル 2                        | 共通 BonsaiCreateSheet (editingBonsai prop)   |
| `wiring-list`              | `wiring-list.png`                  | `out/20260513-1331/` | ✅ レベル 2                        | PR #513、look-back hub 経路                   |
| `home-bulk-sched-work`     | `home-bulk-sched-work-01.png`      | `out/20260511-1201/` | ✅ レベル 2                        |                                               |
| `plan-tab`                 | `plan-tab-01.png`                  | `out/20260513-1339/` | ✅ レベル 2                        | PR #514                                       |
| `onboarding-welcome`       | `onboarding-welcome.png`           | `out/20260513-1251/` | ✅ レベル 2                        | PR #509、flow simplify                        |
| `bonsai-detail`            | `bonsai-detail-history-01.png`     | `out/20260513-1307/` | ✅ レベル 2 (作業履歴タブ default) | PR #511、他タブは Issue #510                  |
| `paywall`                  | `paywall-01.png`                   | `out/20260513-1317/` | ✅ レベル 2                        | PR #512                                       |
| `settings-tab`             | `settings-tab-01.png`              | `out/20260511-2036/` | ✅ レベル 2                        | PR #442                                       |

## 永続 skip / Issue 追跡 1 flow

| flow                         | 理由                                | Issue |
| ---------------------------- | ----------------------------------- | ----- |
| `look-back-watering-history` | 横断版 mockup HTML 不在 (user 領域) | #502  |

## 削除済 1 flow (deadcode 整理)

| 旧 flow            | 理由                                                                          | 後続 Issue                |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------- |
| `watering-heatmap` | `bonsai/[id]/watering.tsx` 到達経路無し (Issue #440 Phase 1) → PR #506 で削除 | #505 (実体削除 follow-up) |

## 別 flow 化 1 flow

| 旧 flow                            | 新 flow                                    | 理由                                                                              |
| ---------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `look-back-search` (技術制約 skip) | `look-back-search-initial` (初期画面 only) | Maestro Android 日本語 `inputText` 非対応 + tag chip Pressable 階層問題 (PR #504) |

## 未測定 (推定 25 mockup、次セッション以降 task)

### 高優先 (Issue 追跡済)

| mockup                                                                                                             | 優先 | Issue                                     |
| ------------------------------------------------------------------------------------------------------------------ | ---- | ----------------------------------------- |
| `bonsai-detail-basic-01/02/03`                                                                                     | 高   | #510 (P3-T1 follow-up、基本情報タブ R-25) |
| `bonsai-detail-timeline-01/02`                                                                                     | 高   | #510 (予定タブ R-25)                      |
| `bonsai-detail-add-action-01/02`                                                                                   | 中   | #298 (TimelineTab + AddScheduleFlow)      |
| `bonsai-detail-add-date-01/02`                                                                                     | 中   | #298                                      |
| `bonsai-tag-add-01/02/03`                                                                                          | 中   | #216 (タグ AC4-1)                         |
| `export-hub`, `export-options`, `export-pdf-list-01/02/03`, `export-pdf-single`, `export-progress`, `export-share` | 中   | #310 (Export Hub 本実装、F-10)            |
| `monetization-home-ads-01/02/03`                                                                                   | 低   | #22 (F-14 ads)                            |

### 中優先 (ADR-0024 PoC flow 移行候補)

ADR-0024 PoC で実機検証済 (5/5 PASS) の operation flow を ui-diff/ に転用すれば、低コストで R-25 評価可能。

| mockup                              | 既存 PoC flow                              | 備考                                                   |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `species-picker.png`                | `maestro/flows/g1-species-picker.yml`      | formSheet PoC、ADR-0024 g1                             |
| `style-picker-01/02.png`            | `maestro/flows/g1-style-picker.yml`        | 同上                                                   |
| `work-picker-01/02/03.png`          | `maestro/flows/g2-work-picker.yml`         | ADR-0024 g2                                            |
| `work-log-confirm-01/02/03.png`     | `maestro/flows/g2-worklog-confirm.yml`     | 同上                                                   |
| `home-bulk-sched-date-01/02/03.png` | `maestro/flows/g3b-bulk-schedule-date.yml` | ADR-0024 g3b、既 ui-diff あり (`home-bulk-sched-date`) |

### 中優先 (ADR-0018 Onboarding)

| mockup                          | 優先 | 備考         |
| ------------------------------- | ---- | ------------ |
| `onboarding-splash.png`         | 中   | スプラッシュ |
| `onboarding-language-01/02.png` | 中   | 言語選択     |
| `onboarding-att.png`            | 中   | ATT prompt   |
| `onboarding-ump.png`            | 中   | UMP (GDPR)   |
| `onboarding-notification.png`   | 中   | 通知許諾     |

### 低優先 (variant / detail state)

| mockup                                                                                   | 優先 | 備考                                                               |
| ---------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| `bonsai-detail-history-02/03.png`                                                        | 低   | history 複数 state                                                 |
| `bonsai-detail-menu.png`                                                                 | 低   | more menu                                                          |
| `bonsai-detail-pdf-lock.png`                                                             | 低   | PDF lock                                                           |
| `bonsai-empty.png`                                                                       | 低   | empty state (bonsai-tab で擬似評価可能)                            |
| `bonsai-select-mode.png`                                                                 | 低   | 複数選択 mode                                                      |
| `paywall-02.png`                                                                         | 低   | Paywall variant                                                    |
| `plan-tab-02.png`                                                                        | 低   | plan variant                                                       |
| `settings-tab-02.png`                                                                    | 低   | settings variant                                                   |
| `monetization-archive.png`, `monetization-archive-delete.png`, `monetization-backup.png` | 低   | アーカイブ / バックアップ                                          |
| `care-search.png`                                                                        | 低   | look-back-search 結果リスト (mockup 中心、Maestro 技術制約で skip) |

## seed 自動投入の標準パターン (2026-05-13 確立、ui-diff flow で seed 必要な場合 copy)

```yaml
# 設定タブ tap (seed 投入用)
- tapOn:
    id: 'e2e_tab_settings'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 3000

# DEV seed button scroll + tap (画面下端の DEV セクション)
- scrollUntilVisible:
    element:
      id: 'e2e_dev_seed_button'
    direction: DOWN
    timeout: 15000
    speed: 40
- tapOn:
    id: 'e2e_dev_seed_button'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000

# Alert dismiss (OS 標準 dialog、R-31 例外: testID 不能のため text マッチ)
- tapOn:
    text: 'OK'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 3000
```

採用 flow: `bonsai-detail.yml`, `wiring-list.yml`, `plan-tab.yml` (2026-05-13 確立)。今後の seed 必要 flow で標準採用。

## 次セッション優先実装 (推奨順)

1. **Issue #510 follow-up** (bonsai-detail 他タブ 2 flow 追加、基本情報 / 作業予定タブ)
2. **ADR-0024 PoC flow → ui-diff/ 移行** (species-picker / style-picker / work-picker / work-log-confirm、PoC 実機検証 flow を mockup 比較 flow に転用、5 flow)
3. **Issue #310 Export Hub** (F-10 本実装 + ui-diff flow 7 件、Pro 限定)
4. **ADR-0018 Onboarding 7 screens** (シニア UX 重要)
5. **Issue #298 関連** (TimelineTab / AddScheduleFlow 完成 + ui-diff flow 2 件)

## 関連

- ADR-0020 §Notes Amended (2026-05-13、本対応表起票元)
- ADR-0021 (ui-diff pipeline)
- ADR-0024 (Phase G BottomSheet 全廃)
- `.claude/recurrence-prevention.md` R-25 / R-26 / R-30 / R-31
- `scripts/ui-diff/skip-list.json` (R-25 達成状況の正本)
- `docs/mockups/v1.0/screenshots/` (mockup screenshot 正本、69 件)
- 2026-05-13 セッション PR (#503-#514) / Issue (#502/#505/#507/#510)
