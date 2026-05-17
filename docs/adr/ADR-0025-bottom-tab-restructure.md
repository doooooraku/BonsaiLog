# ADR-0025: 4 タブ構成変更 + 予定/記録タブ action 起動 + 設定 Header 移動 (BonsaiLog UX 動線最短化)

- Status: Proposed (2026-05-17、 Sess7 PR-1 起票)
- Date: 2026-05-17
- Deciders: @doooooraku
- Supersedes (partial): [ADR-0020](./ADR-0020-claude-design-full-adoption.md) §3 タブ構成 (row 18 設定タブ削除 + row 5 タブ tap action 起動)
- Related: ADR-0011 (記録のみ哲学) / ADR-0017 (ATT/UMP) / ADR-0018 (オンボ統合) / ADR-0024 (BottomSheet 全廃) / ADR-0015 (テーマ light 固定 Sess6 PR-1)

---

## Context（背景：いま何に困っている？）

- **現状 (ADR-0020 §3 確定)**: 4 タブ構成 = 盆栽 / 予定 / ふりかえり / **設定** (2026-05-05 確定)
- **困りごと**:
  - **動線が長い**: 「複数の盆栽に一括予定追加」 操作で `盆栽タブ → Header 「複数選択」 button tap → 盆栽選択 → SelectionToolbar 「予定追加」 tap → BulkScheduleDateSheet` = **3-4 アクション**
  - **「複数選択」 button (Header)** が UI 上で目立つが、 user 主観で「不要、 冗長」 と感じる
  - **設定タブが primary section 化** = mockup の Strava 等業界事例 (Settings は secondary content = Header 配置) と非整合
- **制約 / 前提**:
  - ADR-0020 §3 マッピング row 5 (HomeScreen) / row 18 (Settings) / 4 タブ確定
  - ADR-0011 記録のみ哲学 (推奨 / 判定 / べき NG、 動線最短化と整合)
  - ADR-0024 BottomSheet 全廃 (formSheet/modal 化)
  - 既存 SearchHeader component: `showSettings: boolean` prop で Cog (歯車) 表示制御済 (default true)、 router.push('/settings') 経路実装済
  - 既存 SelectionToolbar component: 下部固定、 「一括記録 / 予定追加」 2 ボタン
  - 4 ペルソナ評価 (`docs/reference/personas.md`)
  - 業界事例: Strava の Record タブ pattern (タブ = action 起動)、 Apple HIG (Settings は Header)、 Day One / Bear / Notion (記録特化)
- **発見**:
  - **「Header 歯車 ⚙ icon は既存実装で完了済」**: SearchHeader.showSettings prop + router.push('/settings') 経路、 Phase 1b で「設定アクセス維持」 が低コストで実現可能
  - **未リリース段階で慣用学習コスト評価軸は無効** (user フィードバック 2026-05-17): リリース後の user feedback で必要に応じて改訂

---

## Decision（決めたこと：結論）

### ① 4 タブ構成変更

1. **新タブ構成**: **盆栽 / 予定 / 記録 / ふりかえり** (4 タブ、 設定タブ削除)
2. **設定タブ削除**: app/(tabs)/settings/ → app/settings/ に移動 (タブ外 Stack route、 既存 SearchHeader.Cog button から router.push('/settings') で到達)
3. **記録タブ新設**: app/(tabs)/record/\_layout.tsx + index.tsx 新規作成

### ② 予定/記録タブ action 起動 (Phase 2 で実装、 本 ADR は意思決定のみ)

4. **予定タブ tap**: 盆栽選択モード自動入り → user 盆栽複数選択 → SelectionToolbar 「予定追加」 → BulkScheduleDateSheet 起動経路
5. **記録タブ tap**: 盆栽選択モード自動入り → user 盆栽複数選択 → SelectionToolbar 「一括記録」 → BulkWorkPickerSheet 起動経路
6. **盆栽 0 件**: 各タブ tap で empty state + 「盆栽を追加」 CTA (盆栽タブへ誘導)
7. **盆栽 1 件のみ**: 自動 1 件選択固定 + 直接 BulkScheduleDateSheet / BulkWorkPickerSheet 起動 (selectMode 不要)

### ③ 「複数選択」 button (Header) 削除

8. **SearchHeader の `onSelectPress` prop 廃止** = Header 「複数選択」 text button 削除 (盆栽タブのみ影響、 他タブは元々非表示)
9. SelectionToolbar は **Phase 2 で「予定/記録タブ tap 経由のみ表示」 に動線変更**、 component 自体は再利用

### ④ 設定 = Header 経由 (既実装の活用)

10. SearchHeader.showSettings = default true 維持、 既存の Cog (歯車) icon → router.push('/settings') 経路を全タブで活用
11. settings タブ削除後、 '/settings' route は app/settings/index.tsx (Stack route) として独立

### ⑤ ふりかえりタブは現状維持

12. CareHub 3 カード (水やり履歴 / 針金がけ一覧 / 盆栽を検索) の動線 / 機能変更なし

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1: user 動線最短化** (UX 向上) = 「複数選択」 button + SelectionToolbar 経由 3-4 アクション → タブ tap 直接 1 アクション
- **Driver 2: 未リリース段階の評価軸クリア化** = 慣用学習コストはリリース後評価、 リリース前は「目指す UX」 が優先
- **Driver 3: 業界事例参考** = Strava Record タブ pattern (タブ = action 起動)、 Apple HIG Settings は Header (= secondary content)
- **Driver 4: ADR-0011 記録のみ哲学整合** = 動線最短化 + push 通知 / 推奨は出さない
- **Driver 5: 既存 SearchHeader.showSettings 活用** = 「Header 歯車 ⚙」 既実装で Phase 1b 工数大幅削減
- **Driver 6: 4 ペルソナ全 ✕ なし** (R-10 クリア)

---

## Alternatives considered（他の案と却下理由）

### 案 A (採用): 4 タブ + 予定/記録 action 起動 + 設定 Header 移動

- 概要: 上記 Decision §①〜⑤
- 良い点: 動線最短化、 user 真意整合、 業界事例 (Strava) 参考、 ADR-0011 整合
- 悪い点: タブ = action 起動は慣用と異なる、 シニア (高橋 62 歳) 一時的違和感の可能性 (リリース後評価)
- → **採用** (動線最短化 + 4 ペルソナ ✕ なし)

### 案 B: 4 タブ + FAB (action は FAB 起動)

- 概要: 盆栽 / 予定 / 記録 / ふりかえり、 各画面右下 FAB (+) で予定追加 / 記録追加 起動
- 良い点: 業界慣用 (タブ = 画面遷移)、 シニア混乱なし
- 悪い点: FAB に複数 action (予定 / 記録 / 1 件 / 複数) を集約で UI 複雑、 動線案 A より + 1 tap
- → **却下** (動線最短化原則違反)

### 案 C: 4 タブ現状維持 + 「複数選択」 button 改善のみ

- 概要: ADR-0020 §3 維持 (盆栽/予定/ふりかえり/設定)、 「複数選択」 text → icon 化
- 良い点: 最小変更、 ADR-0020 改訂不要
- 悪い点: 動線最短化なし、 user 真意 ✕
- → **却下** (user 真意未達成)

### 案 D: 3 タブ + 統合 FAB

- 概要: 盆栽 / ふりかえり / 設定 + FAB ActionSheet (予定追加 / 記録追加)
- 良い点: タブ最少、 シンプル
- 悪い点: 機能発見性 ↓ (予定 / 記録タブが消える)、 業務効率 △
- → **却下** (機能発見性低下)

### 案 E: 5 タブ + 設定タブ + 「複数選択」 削除のみ

- 概要: 盆栽 / 予定 / 記録 / ふりかえり / 設定 (5 タブ、 Apple HIG 上限)、 「複数選択」 削除のみ
- 良い点: action 起動なし (慣用通り)、 設定タブ残
- 悪い点: タブ密集、 Apple HIG ギリギリ、 動線最短化未達
- → **却下** (タブ密集 + 動線未短縮)

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- **動線最短化**: 一括予定追加 / 一括記録が 3-4 アクション → 1-2 アクション (50% 削減)
- **UI シンプル化**: 「複数選択」 button (Header) 削除で視覚的なノイズ削減
- **業界事例整合**: Strava Record タブ pattern + Apple HIG Settings Header 整合
- **4 ペルソナ全 ✕ なし**: 全ペルソナで採用合意 (R-10 クリア)
- **既存 SearchHeader.showSettings 活用** で Phase 1b 工数削減

### Negative（辛い / 副作用）

- **タブ = action 起動は業界慣用と異なる**: リリース後の user feedback で改訂可能性 (Subject to Revision)
- **シニア (高橋 62 歳) 一時的違和感**: tutorial で吸収可能 (Phase 4 で対応)
- **既存 SelectionToolbar 動線変更**: Phase 2 で「予定/記録タブ経由のみ」 に統一、 既存テスト更新必要
- **Maestro flow 更新**: settings-tab.yml → 経路変更 (Header Cog 経由)、 新 record-tab.yml 作成
- **i18n**: tabRecord 新規 19 言語ペルソナ翻訳必要、 tabSettings は保持 (設定画面 title で参照継続)

### Subject to Revision（変更前提）

- リリース後 user feedback で「タブ = action 起動」 違和感が顕著なら案 B (FAB) or 案 C (現状維持) へ revert
- シニア混乱が tutorial で吸収できない場合、 ADR 改訂

### Follow-ups（後でやる宿題）

- [ ] **Phase 1b (Sess7 PR-1 本 PR)**: ADR-0025 起票 + TabBar 4 タブ構造変更 (settings 削除 + record 新設 stub) + ADR-0020 §3 Notes Amended
- [ ] **Phase 2 (Sess7 PR-2 別 PR)**: 予定/記録タブ action 起動実装 + SelectionToolbar 動線変更 + 「複数選択」 button 削除
- [ ] **Phase 3 (Sess7 PR-3 別 PR)**: Maestro flow 更新 (settings-tab.yml + 新 record-tab.yml + plan-tab.yml 更新) + skip-list 更新 + pairing-report 更新
- [ ] **Phase 4 (Sess7+ 任意)**: tutorial 追加 (シニア向け「予定/記録タブ = action 起動」 説明)、 Phase 2 リリース後 user feedback 次第

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト (Phase 1b 〜 Phase 3 で段階的に実装)

- **Maestro E2E (Phase 3 で更新)**:
  - `maestro/flows/ui-diff/settings-tab.yml`: 経路変更 (TabBar settings → Header Cog ⚙)
  - 新 `maestro/flows/ui-diff/record-tab.yml`: 記録タブ tap → 動作確認 (Phase 2 後)
  - `maestro/flows/ui-diff/plan-tab.yml`: 予定タブ tap 経路更新 (Phase 2 後)
- **Jest 単体テスト**:
  - tab i18n key (tabRecord 追加、 tabSettings 保持)

### 手動チェック (Phase 1b 完了の合否基準)

1. アプリ起動 → TabBar 4 タブ表示確認: **盆栽 / 予定 / 記録 / ふりかえり** (設定タブなし)
2. 各タブ Header の Cog (歯車 ⚙) tap → 設定画面到達確認
3. 戻る → 元のタブに復帰確認

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**: v1.0 リリース前、 ストア審査前なので影響なし (内部仕様変更)
- **ロールバック方針**:
  - Phase 1b (本 PR) revert: `git revert <hash>` で TabBar 構造を ADR-0020 §3 に戻す
  - Phase 2 (action 起動) revert: 別 PR で revert、 SelectionToolbar 経路復活
- **検知方法**:
  - Phase 2 リリース後の user feedback (タブ違和感 / シニア混乱)
  - Sentry の navigation error (新動線で予期外の状態遷移)

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- 連動 ADR:
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学)
  - `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md` (ATT/UMP)
  - `docs/adr/ADR-0018-onboarding-flow-integration.md` (オンボ統合)
  - `docs/adr/ADR-0020-claude-design-full-adoption.md` (Claude Design 全面採用、 本 ADR で §3 部分改訂)
  - `docs/adr/ADR-0024-bottom-sheet-removal-and-native-presentation.md` (BottomSheet 全廃)
- 業界事例:
  - [Strava Mobile App Bottom Tab Pattern](https://www.strava.com/mobile)
  - [Apple HIG Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
  - [Bottom Tab Bar Navigation Design Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)
- Sess6 PR-1 (#542): UX 5 修正 (本 ADR への布石)
- Sess7 PR-2 (TBD): Phase 2 action 起動実装
- Sess7 PR-3 (TBD): Phase 3 Maestro + skip-list 更新

---

## Notes（メモ：任意）

### 4 ペルソナ評価マトリクス (R-10 クリア、 学習コスト軸はリリース前無効)

| 要素                                 | 高橋 62 歳         | Marcus 35 歳 | 盆栽園プロ | ライト           | 総合 |
| ------------------------------------ | ------------------ | ------------ | ---------- | ---------------- | ---- |
| 4 タブ (盆栽/予定/記録/ふりかえり)   | ◎ シンプル         | ◎ モダン     | ◎ 業務効率 | ◎ ガイド         | ◎    |
| 設定 = Header 歯車 (既実装活用)      | ○ シニアは慣用通り | ◎ 業界標準   | ◎          | ◎                | ◎    |
| 予定/記録 タブ action 起動 (Phase 2) | △ → tutorial で○   | ◎ 動線最短   | ◎ 業務効率 | ○ → tutorial で◎ | ◎    |
| 「複数選択」 button (Header) 削除    | ◎ シンプル         | ◎ 不要       | ◎          | ◎                | ◎    |

→ **全要素で全ペルソナ ○ 以上、 ✕ ゼロ** (R-10 クリア)、 リリース後の慣用評価は別途。

### R-26 ブランド統一感評価 (5 軸目)

- 4 タブ統一感: ◎ (盆栽/予定/記録/ふりかえり = 動詞 / 名詞混在 OK、 一貫した動線)
- 業界事例整合: ◎ (Strava / Apple HIG)

### Phase 分割計画詳細

| Phase        | 内容                                                                                                                       | PR                 | 工数      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| **1a**       | ADR-0025 起票 (本 doc)                                                                                                     | Sess7 PR-1         | 45 分     |
| **1b**       | TabBar 4 タブ構造変更 (settings → app/settings/ 移動、 record タブ stub、 ADR-0020 §3 Notes Amended、 i18n tabRecord 追加) | Sess7 PR-1 (同 PR) | 60-90 分  |
| **2**        | 予定/記録タブ action 起動実装 + SelectionToolbar 動線変更 + 「複数選択」 button 削除 + 盆栽 0/1 件 edge case               | Sess7 PR-2         | 90-120 分 |
| **3**        | Maestro flow 更新 + skip-list 更新 + pairing-report 更新                                                                   | Sess7 PR-3         | 60-90 分  |
| **4 (任意)** | tutorial 追加 (シニア向け action 起動説明)                                                                                 | Sess7+ PR-4        | 60-90 分  |

### 既存実装で活用済 (Phase 1b 工数削減)

- **SearchHeader.showSettings = true** (default、 全タブで Cog icon 表示済)
- **router.push('/settings') 経路実装済** (Cog tap で settings 画面遷移)
- → Phase 1b では「設定アクセス維持」 を新規実装せず、 既存活用

### lessons.md 追記候補

- 「未リリース段階で慣用学習コスト評価軸は無効、 リリース後 user feedback で必要に応じて改訂」 (Sess7 PR-1 で確立、 user フィードバック由来)
- 「ADR 起票時の 5 軸評価 (4 ペルソナ + ブランド統一感) でリリース前は『学習コスト』 を別軸として扱う」

### Repolog との差分

- Repolog (前作) は記録特化アプリ、 タブ構成は **記録 / カレンダー / 設定** 等 (要確認)
- BonsaiLog 案 A は「タブ = action 起動」 で Repolog と差別化
