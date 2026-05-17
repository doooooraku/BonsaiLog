# ADR-0025: 4 タブ構成変更 + 予定/記録タブ action 起動 + 設定 Header 移動 (BonsaiLog UX 動線最短化)

- Status: **Accepted (2026-05-17 Sess8 PR-1 で案 A → 案 B 切替決定、 Notes Amended 参照)**
- Date: 2026-05-17 (Sess7 PR-1 起票) → 2026-05-17 (Sess8 PR-1 案 B 切替)
- Deciders: @doooooraku
- Supersedes (partial): [ADR-0020](./ADR-0020-claude-design-full-adoption.md) §3 タブ構成 (row 18 設定タブ削除、 タブは画面切替維持 = 業界慣用整合)
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

### ② 予定/記録タブ FAB 起動 (Phase 2 で実装、 案 B 採用 2026-05-17 Sess8 PR-1)

4. **予定タブ tap**: 通常画面遷移 (月カレンダー画面表示) → 右下 FAB (+) tap → 盆栽選択モード入り → user 盆栽複数選択 → BulkScheduleDateSheet 起動経路
5. **記録タブ tap**: 通常画面遷移 (記録一覧 or empty 画面表示) → 右下 FAB (+) tap → 盆栽選択モード入り → user 盆栽複数選択 → BulkWorkPickerSheet 起動経路
6. **盆栽 0 件**: 各タブで FAB tap → empty state + 「盆栽を追加」 CTA (盆栽タブへ誘導)
7. **盆栽 1 件のみ**: FAB tap → 自動 1 件選択固定 + 直接 BulkScheduleDateSheet / BulkWorkPickerSheet 起動 (selectMode 不要)、 キャンセル時は盆栽タブに戻す
8. **盆栽 2+ 件**: 通常 selectMode + SelectionToolbar 既存パターン (盆栽タブ FAB 経由と同等)

### ③ 「複数選択」 button (Header) 削除 + 長押し経路維持

9. **SearchHeader の `onSelectPress` prop 廃止** = Header 「複数選択」 text button 削除 (盆栽タブのみ影響、 他タブは元々非表示)
10. **盆栽タブの「カード長押し → selectMode 入り」 経路は維持** (mockup v1.0 02-Home.html `onCardLongPress` 整合、 user 真意「複数選択 button のみ削除」)
11. SelectionToolbar は **Phase 2 で「予定/記録タブ FAB 経由」 + 「盆栽タブ長押し経由」 の 2 経路で表示**、 component 自体は再利用、 共通 hook `useBulkActionFlow` で経路集約

### ④ 設定 = Header 経由 (既実装の活用、 Phase 1c で hotfix 完了)

12. SearchHeader.showSettings = default true 維持、 既存の Cog (歯車) icon → router.push('/settings') 経路を全タブで活用
13. settings タブ削除後、 '/settings' route は app/settings/index.tsx (Stack route) として独立
14. **Phase 1c hotfix (2026-05-17 Sess8 PR-1)**: SearchHeader.tsx:138 path 修正 (`/(tabs)/settings` → `/settings`) + look-back/index.tsx:81 `showSettings={false}` 削除 + Maestro flow 19 個経路修正

### ⑤ ふりかえりタブは現状維持

15. CareHub 3 カード (水やり履歴 / 針金がけ一覧 / 盆栽を検索) の動線 / 機能変更なし

---

## Decision Drivers（判断の軸：何を大事にした？）

> **2026-05-17 Sess8 PR-1 Notes Amended**: 案 A (タブ tap intercept) → 案 B (FAB 起動) 切替に伴い Driver 再構成。
> Strava 業界事例の誤引用判明 + Apple HIG iOS 26 「タブはコンテンツ表示、 action 起動 NG」 認識を反映。

- **Driver 1: user 動線最短化** (UX 向上) = 「複数選択」 button + SelectionToolbar 経由 3-4 アクション → タブ tap → FAB tap 2 アクション (50% 削減)
- **Driver 2: 業界慣用整合 (Apple HIG iOS 26)** = タブはコンテンツ表示、 action は FAB が業界 best practice ([Modern iOS Navigation Patterns](https://frankrausch.com/ios-navigation/) / [iOS 26 Tab Bar](https://ryanashcraft.com/ios-26-tab-bar-beef/))
- **Driver 3: 業界事例参考 (訂正)** = **Strava Record タブは実は画面切替 + 画面内 Start ボタン** (案 C 系、 案 A ではない)、 Day One / Bear / Notion = タブ + FAB が標準、 Apple HIG Settings は Header
- **Driver 4: ADR-0011 記録のみ哲学整合** = 動線最短化 + push 通知 / 推奨は出さない
- **Driver 5: 既存 SearchHeader.showSettings + 盆栽タブ FAB パターン活用** = 「Header 歯車 ⚙」 + 「右下 FAB (+)」 既実装で Phase 2 工数大幅削減
- **Driver 6: 4 ペルソナ全 ◎ or ○** (案 B 切替後の再評価で R-10 クリア、 案 A 時の △ 3 件 → 案 B で全 ◎ or ○ に改善)

---

## Alternatives considered（他の案と却下理由）

### 案 A (却下、 2026-05-17 Sess8 PR-1 再評価): 4 タブ + 予定/記録タブ tap intercept

- 概要: 予定/記録タブ tap で `e.preventDefault()` → 画面遷移を block → sheet 直接起動
- 良い点: 動線最短 1 tap、 (当初評価) Strava パターン整合
- 悪い点: **Strava 業界事例の誤引用判明** (Strava は実は案 C 系、 タブ = 画面切替 + 画面内 Start ボタン)、 **Apple HIG iOS 26 anti-pattern** (タブはコンテンツ表示、 action 起動 NG)、 シニア (高橋 62 歳) + Marcus + ライト 全員 △ 評価、 expo-router lazy render 制約で `_layout.tsx` 集約必須、 Maestro flow 14+ 個全壊リスク
- → **却下** (Sess8 PR-1 議論で再評価、 業界慣用整合と 4 ペルソナ評価で案 B が優位)

### 案 B (採用、 2026-05-17 Sess8 PR-1 切替): 4 タブ + 各タブ FAB (action は FAB 起動)

- 概要: 盆栽 / 予定 / 記録 / ふりかえり、 各タブは通常画面遷移、 予定/記録タブで右下 FAB (+) tap → 盆栽選択モード → BulkScheduleDateSheet / BulkWorkPickerSheet 起動
- 良い点: 業界慣用 (Apple HIG / iOS 26 整合)、 シニア混乱なし、 4 ペルソナ全 ◎ or ○、 既存盆栽タブ FAB + SelectionToolbar 資産活用、 Maestro 既存パターン再利用可、 月カレンダー画面 (plan/index.tsx) 維持
- 悪い点: 動線案 A より + 1 tap (タブ → FAB)、 ただし mockup v1.0 + 業務ペルソナで許容
- → **採用** (Driver 1-6 全達成 + 4 ペルソナ R-10 クリア + 業界慣用整合)

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

- 案 B 採用後 (2026-05-17 Sess8 PR-1)、 リリース後 user feedback で「FAB 不要 / 別 UI」 要望が顕著なら ADR 改訂

### Follow-ups（後でやる宿題）

- [x] **Phase 1b (Sess7 PR-1 #543 merged)**: ADR-0025 起票 + TabBar 4 タブ構造変更 (settings 削除 + record 新設 stub) + ADR-0020 §3 Notes Amended
- [ ] **Phase 1c (Sess8 PR-1 本 PR、 hotfix)**: 案 A → 案 B 切替 (本 ADR 改訂) + SearchHeader path hotfix + look-back showSettings hotfix + Maestro flow 19 個経路修正
- [ ] **Phase 2 (Sess8 PR-2 別 PR)**: 予定/記録タブ FAB 実装 + 共通 hook useBulkActionFlow 抽出 + SearchHeader.onSelectPress 削除 + 盆栽 0/1/2+ 件 edge case
- [ ] **Phase 3 (Sess8 PR-3 別 PR)**: Maestro flow 新規 (plan-tab-fab.yml + record-tab.yml) + bonsai-tab.yml 更新 + skip-list 更新 + pairing-report 更新
- ~~Phase 4 (tutorial 追加)~~ **削除 (2026-05-17 Sess8 PR-1)**: 案 B 採用で業界慣用整合 = tutorial 不要

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

### 4 ペルソナ評価マトリクス (R-10 クリア、 2026-05-17 Sess8 PR-1 案 B 切替後の再評価)

| 要素                                     | 高橋 62 歳         | Marcus 35 歳 | 盆栽園プロ | ライト     | 総合 |
| ---------------------------------------- | ------------------ | ------------ | ---------- | ---------- | ---- |
| 4 タブ (盆栽/予定/記録/ふりかえり)       | ◎ シンプル         | ◎ モダン     | ◎ 業務効率 | ◎ ガイド   | ◎    |
| 設定 = Header 歯車 (既実装活用)          | ○ シニアは慣用通り | ◎ 業界標準   | ◎          | ◎          | ◎    |
| 予定/記録 タブ FAB 起動 (案 B、 Phase 2) | ◎ 業界慣用         | ◎ 業界標準   | ○ 業務効率 | ◎ 業界慣用 | ◎    |
| 「複数選択」 button (Header) 削除        | ◎ シンプル         | ◎ 不要       | ◎          | ◎          | ◎    |
| カード長押し → selectMode 維持           | ○ 既存挙動         | ◎ 業界標準   | ◎ 業務効率 | ○ 既存挙動 | ◎    |

→ **全要素で全ペルソナ ○ 以上、 ✕ ゼロ** (R-10 クリア)、 案 A 当時の △ 3 件 (高橋 / Marcus / ライト の予定/記録タブ評価) が案 B 切替後に ◎ に改善。

### R-26 ブランド統一感評価 (5 軸目)

- 4 タブ統一感: ◎ (盆栽/予定/記録/ふりかえり = 動詞 / 名詞混在 OK、 一貫した動線)
- 業界事例整合: ◎ (Strava / Apple HIG)

### Phase 分割計画詳細 (2026-05-17 Sess8 PR-1 改訂)

| Phase  | 内容                                                                                                                              | PR                 | 工数       | Status    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------- | --------- |
| **1a** | ADR-0025 起票 (本 doc)                                                                                                            | Sess7 PR-1         | 45 分      | ✅ #543   |
| **1b** | TabBar 4 タブ構造変更 (settings → app/settings/ 移動、 record タブ stub、 ADR-0020 §3 Notes Amended、 i18n tabRecord 追加)        | Sess7 PR-1 (同 PR) | 60-90 分   | ✅ #543   |
| **1c** | **案 A → 案 B 切替 (本 ADR 改訂)** + Phase 1b hotfix (SearchHeader path / look-back showSettings / Maestro flow 19 個経路修正)    | Sess8 PR-1         | 90-120 分  | 🔧 進行中 |
| **2**  | 予定/記録タブ **FAB** 実装 (案 B) + 共通 hook useBulkActionFlow 抽出 + SearchHeader.onSelectPress 削除 + 盆栽 0/1/2+ 件 edge case | Sess8 PR-2         | 150-180 分 | ⏳ 待機   |
| **3**  | Maestro flow 新規 (plan-tab-fab.yml + record-tab.yml) + bonsai-tab.yml 更新 + skip-list 更新 + pairing-report 更新                | Sess8 PR-3         | 60-90 分   | ⏳ 待機   |
| ~~4~~  | ~~tutorial 追加 (シニア向け action 起動説明)~~ **削除 (案 B 採用で業界慣用整合 = tutorial 不要)**                                 | -                  | -          | ❌ 削除   |

### 既存実装で活用済 (Phase 1b 工数削減)

- **SearchHeader.showSettings = true** (default、 全タブで Cog icon 表示済)
- **router.push('/settings') 経路実装済** (Cog tap で settings 画面遷移)
- → Phase 1b では「設定アクセス維持」 を新規実装せず、 既存活用

### lessons.md 追記候補

- 「未リリース段階で慣用学習コスト評価軸は無効、 リリース後 user feedback で必要に応じて改訂」 (Sess7 PR-1 で確立、 user フィードバック由来)
- 「ADR 起票時の 5 軸評価 (4 ペルソナ + ブランド統一感) でリリース前は『学習コスト』 を別軸として扱う」
- **「業界事例引用時は必ず 1 次情報で裏取り」 (Sess8 PR-1 で確立)**: ADR-0025 初版で「Strava Record タブ = action 起動」 と引用したが、 1 次情報確認で **実は案 C 系 (タブ = 画面切替 + 画面内 Start)** と判明、 ADR Decision Drivers の根拠が崩れた。 業界事例引用時の 1 次情報裏取り (Strava Support / Apple HIG / Frank Rausch iOS Navigation 等) を必須化。
- **「Apple HIG iOS 26 anti-pattern 認識」 (Sess8 PR-1 で確立)**: 「タブ = action 起動」 は業界 UX 観点で anti-pattern として認識されている (iOS 26 で再強調)、 ADR 起票時に Apple HIG 整合性チェックを必須化。

### Notes Amended 2026-05-17 Sess8 PR-1 (案 A → 案 B 切替議論)

#### 議論経緯

- **Sess7 PR-1 (#543)**: ADR-0025 起票 + Phase 1a/1b 完了、 Status: Proposed (案 A = タブ tap intercept)
- **Sess8 PR-1 議論** (本 ADR 改訂)\*\*: user prompt「Phase 2 を進めてください」 → /discuss 起動 → 重大発見 3 件:
  1. **Phase 1b 漏れ 3 件**: SearchHeader.tsx:138 path `/(tabs)/settings` (古い)、 look-back/index.tsx:81 `showSettings={false}` (歯車不表示)、 Maestro flow 19 個 `e2e_tab_settings` tap 経路 (testID 消失)
  2. **業界事例の誤引用判明**: Strava Record タブは **実は画面切替 + 画面内 Start ボタン** (案 C 系)、 ADR-0025 初版「Strava = タブ action 起動」 は事実誤認
  3. **Apple HIG iOS 26 anti-pattern 認識**: 「タブはコンテンツ表示、 action 起動 NG」 が業界 best practice、 案 A は anti-pattern
- **4 ペルソナ再評価**: 案 A 採用時 △ 3 件 (高橋 / Marcus / ライト)、 案 B 切替後 全 ◎ or ○
- **expo-router lazy render 制約**: タブ listener は `<Tabs.Screen listeners>` 経由で `_layout.tsx` に集約必須、 screen 内では遅延発火 (公式仕様)、 案 A 採用時の実装難度 + Maestro 14+ 個全壊リスク追加発覚

#### 切替決定事項

- 案 A → 案 B (FAB 起動) に切替、 ADR Decision §② 書き換え
- Status: Proposed → **Accepted**
- Phase 1c 新設 (本 PR): 案 B 切替 ADR 改訂 + Phase 1b hotfix
- Phase 4 削除 (案 B = 業界慣用整合で tutorial 不要)
- 共通 hook useBulkActionFlow 抽出を Phase 2 で明示 (user 真意「保守性優先」)
- 盆栽タブ長押し → selectMode 経路維持 (mockup v1.0 由来、 user 真意「複数選択 button のみ削除」)

#### Sources (1 次情報、 lessons 追記事項)

- [Modern iOS Navigation Patterns · Frank Rausch](https://frankrausch.com/ios-navigation/)
- [My Beef with the iOS 26 Tab Bar - Ryan Ashcraft](https://ryanashcraft.com/ios-26-tab-bar-beef/)
- [Strava Recording an Activity (Support)](https://support.strava.com/hc/en-us/articles/216917397-Recording-an-Activity)
- [Apple HIG Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Navigation events | React Navigation v7](https://reactnavigation.org/docs/navigation-events/) (lazy render 制約)

### Repolog との差分

- Repolog (前作) は記録特化アプリ、 タブ構成は **記録 / カレンダー / 設定** 等 (要確認)
- BonsaiLog 案 A は「タブ = action 起動」 で Repolog と差別化
