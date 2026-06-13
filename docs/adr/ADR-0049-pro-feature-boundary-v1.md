# ADR-0049: Pro 機能境界 v1.0 (Sess58 確定 6 項目 SoT)

- Status: Accepted
- Date: 2026-05-31
- Deciders: @doooooraku
- Related: ADR-0009 (RevenueCat billing 基盤) / ADR-0011 (推奨機能撤廃) / ADR-0020 (Claude Design 採用) / Issue #458 (写真制限撤廃、 本 ADR で Supersedes) / Sess58 議論セッション (`03317d4b-254d-451a-9f24-76d8e2b7b223`) / `docs/reference/constraints.md` §2-2 / `docs/reference/basic_spec.md` §8.2 / `docs/explanation/product_strategy.md`

---

## Context（背景：いま何に困っている？）

- 現状：BonsaiLog の Pro 機能境界が **3 層 (コード / Paywall UI / docs) で乖離** している。
  - コード: 写真制限が `FREE_PHOTO_LIMIT_PER_BONSAI = Infinity` (Issue #458 Phase 2 で撤廃済)、 タグ / カスタム樹種樹形は上限ロジック未実装
  - Paywall UI (`PaywallScreen.tsx` FeatureRow 6 行): BonsaiCount / History / Backup / CSV / Theme / NoAds = Sess58 確定 6 項目と完全乖離 (4/6 行不一致)
  - docs (`basic_spec.md` §8.2 / `constraints.md` §2-2): 「写真 3 枚/本」 と記載あるがコードは Infinity = **景品表示法第 5 条 (優良誤認表示) リスク**
- 困りごと：
  - 「Pro と書いてあるが実際は Free」 の幽霊機能が連鎖発生 (Sess58 で年次タイムライン PR #910 / F-05 PR #909 を緊急撤廃した経緯)
  - v1.0 リリース判断のクリティカルパス: 法務 (景品表示法 / GDPR Art.20 / Apple Review 2.3.1) + ストア審査
  - ADR-0009 (RevenueCat 基盤) は Pro 機能リスト 3 項目しか記載なし、 SoT 不足
- 制約/前提：
  - `docs/reference/constraints.md` §2-2 「写真 3 枚 等の数値を変更する場合は ADR 必須」
  - `docs/reference/constraints.md` §1-1 完全ローカル原則 (クラウド同期なし)
  - GDPR Art.20 (データポータビリティ) — 全期間履歴は Free 必須
  - Apple App Store Review Guideline 5.1.1(v) — データ削除要請対応必須
  - Apple App Store Review Guideline 2.3.1 — 機能と表示の整合性

---

## Decision（決めたこと：結論）

**Pro 機能 6 項目を Sess59 で実装** (Sess58 議論で確定):

| #   | Pro 機能                      | Free                                  | Pro            | 該当 PR                          |
| --- | ----------------------------- | ------------------------------------- | -------------- | -------------------------------- |
| ①   | 基本情報 写真                 | 各盆栽 3 枚まで                       | 無制限         | PR3                              |
| ②   | タグ作成 (rename は無制限)    | 3 個まで                              | 無制限         | PR4                              |
| ③   | 作業記録 写真                 | 各記録 3 枚まで (表示は全 Free)       | 無制限         | PR3                              |
| ④   | CSV/PDF エクスポート (5 種類) | 不可                                  | 可             | 既存 (`csvExport.ts` Pro guard)  |
| ⑤   | 広告非表示                    | AdMob バナー (Home 下部のみ)          | 完全非表示     | 既存 (`adService.ts` isPro 判定) |
| ⑥   | カスタム樹種・樹形 作成       | マスタ 5 種 + カスタム 3 件 = 計 8 種 | カスタム無制限 | PR5                              |

**Grandfathered 戦略** (既存ユーザー保護): 既存 4+ 写真 / タグ / カスタム樹種樹形は **表示 OK + 削除 OK + 追加のみ Paywall** (Slack 2022 churn 事件回避)。

**Paywall ガード方式**:

- 写真: `expo-image-picker` の `selectionLimit = max(0, 3 - photoCount)` + カウンター表示 "{used}/3" + 残枠 0 で押下時 Paywall modal
- タグ / カスタム樹種樹形: カウンター表示 "{used}/3" + 残枠 0 で押下時 Paywall modal

**適用範囲**: v1.x 全リリース (v1.0 初回リリースから適用)

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **法的コンプライアンス** — 景品表示法第 5 条 + Apple Review 2.3.1 + GDPR Art.20 + 消費者契約法第 4 条 を全て満たす
- Driver 2: **既存ユーザー churn 最小化** — Sess58 以前データを保護 (Slack 2022 churn 事件の轍を踏まない)
- Driver 3: **業務利用層 (盆栽園プロ) の獲得** — タグ無制限 + カスタム樹種樹形無制限で「業務に即必要」 を訴求 (Sess58 ペルソナ Fit 評価で MEDIUM-STRONG → STRONG 想定)
- Driver 4: **UX 親切設計** — カウンター事前表示 + Grandfathered 緩和で「急に Paywall」 「データ消失」 体験を回避 (ペルソナ高橋 62 歳・ライト の離脱防止)
- Driver 5: **実装シンプル性** — 既存 Pro entitlement 基盤 (`useProStore.isPro`) と `useProGuard` 共通 hook で実装統一、 schema 変更ゼロ (app-level count check で対応可)

### 4 ペルソナ評価 (Sess58 議論結果)

| 機能境界                     | 高橋 62 歳 (シニア)   | Marcus 35 歳 (米国 IT) | 盆栽園プロ (100 鉢)                      | ライト (1-2 本)    |
| ---------------------------- | --------------------- | ---------------------- | ---------------------------------------- | ------------------ |
| ① 写真 3 枚/本 Free          | 🟢 安心、 上限見える  | 🟢 業界標準            | 🟡 業務継続性懸念 (Grandfathered で緩和) | 🟢 試用に十分      |
| ② タグ 3 個 Free             | 🟢                    | 🟢                     | 🟢 即課金 (業務直結)                     | 🟢                 |
| ③ 作業記録写真 3 枚 Free     | 🟢 表示は全 Free      | 🟢                     | 🟢 表示全 Free で業務維持                | 🟢                 |
| ④ CSV/PDF Pro                | 🟡 出力したい場合のみ | 🟢                     | 🟢 業務必須                              | 🟢 不要            |
| ⑤ 広告非表示 Pro             | 🟢 シニア誤タップ防止 | 🟢                     | 🟢                                       | 🟡 Free 我慢       |
| ⑥ カスタム樹種樹形 3 件 Free | 🟢                    | 🟢                     | 🟢 即課金                                | 🟢 マスタ 5 で十分 |

**結論**: 4 ペルソナ全員に Fit、 盆栽園プロが Pro 即購買候補。

---

## Alternatives considered（他の案と却下理由）

### Option A (採用): Pro 機能 6 項目 + Grandfathered 緩 + カウンター表示

- 概要: 上記 Decision に同じ
- 良い点: 4 ペルソナ全員 Fit、 法的リスク全て解消、 既存実装 (CSV/PDF + 広告非表示) 流用可
- 悪い点: PR2 で PaywallScreen / PlanSection 大幅書き換え必要、 i18n 19 言語 17 key 追加
- 採用理由: 6 専門家評価 (テックリード / QA / UX / 法務 / PM / フラット) で多数推薦

### Option B (却下): 他画面バナー追加 (Home 以外にも広告)

- 概要: 詳細画面・一覧画面にも AdMob バナー追加
- 良い点: 広告収益増
- 悪い点: AdMob 公式統計で 88% 離脱、 Apple Review spammy 判定、 ASO 悪化、 ADR-0010 (Home 下部のみ) 整合維持必要
- 却下理由: ADR-0010 / `docs/reference/constraints.md` §2-2 (全画面広告不採用) と矛盾

### Option C (却下): 過去 30 日履歴を Pro 化

- 概要: 作業履歴の Free 閲覧範囲を「過去 30 日のみ」 に制限、 30 日超過分は Pro
- 良い点: Notion 7 日 vs 30 日 history と類似の業界事例
- 悪い点: **GDPR Art.20 (データポータビリティ) 違反** + Apple Review 5.1.1(v) リスク + `docs/explanation/product_strategy.md` 「5 年データ蓄積」 戦略破壊
- 却下理由: 法的リスク + 戦略破壊で即不採用

### Option D (却下): 作業履歴タブ表示制限 (Pro でのみ全件表示)

- 概要: 盆栽詳細画面の作業履歴タブを Free は最新 10 件のみ表示
- 良い点: 課金圧力強
- 悪い点: GDPR Art.20 違反 + Apple Review 5.1.1(v) リジェクトリスク + 全 4 ペルソナ ✕
- 却下理由: 法的リスク + UX 致命傷

### Option E (却下): 集計可視化機能を新規実装 + Pro 化

- 概要: グラフ / ダッシュボード機能を新規実装し Pro 限定で提供
- 良い点: Pro 訴求力強
- 悪い点: 新機能実装 = v1.0 リリース遅延 (推定 +2-4 週間)、 シニアペルソナ「複雑」 評価
- 却下理由: v1.0 リリース速度優先 (v1.x 候補で保留)

### Option F (却下): Free 上限を緩める (写真 5 枚等)

- 概要: Free 上限を 3 → 5 に緩和
- 良い点: ライトペルソナ離脱率減
- 悪い点: 業務利用層 (プロ) が Pro 不要と判断 = LTV 低下、 Day One 1 写真/entry Free と比較してすでに 3 倍緩い
- 却下理由: 業界標準 (Day One / Bonsai Care App) と比較で「3 枚」 は緩い側、 これ以上緩めると Pro 訴求弱化

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 法的リスク全解消 (景品表示法 / GDPR Art.20 / Apple Review 2.3.1 / 消費者契約法第 4 条)
- 既存ユーザー churn 回避 (Grandfathered 緩で「データ消失」 体験ゼロ)
- 業務利用層 (盆栽園プロ) を Pro 主要顧客に狙える明確な訴求
- 課金境界 SoT 確立 = 将来の機能追加時に判断基準が明確

### Negative（辛い/副作用）

- Issue #458 (写真制限撤廃) の方針逆行 = 当時の判断を Supersedes
- PR2 で PaywallScreen / PlanSection 大幅書き換え (i18n 19 言語 17 key 追加)
- TestFlight 検証期間 (1 週間) 分のリリース遅延
- 既存 4+ データの判定ロジック (Grandfathered) でテストケース増 (count edge 含む)

### Follow-ups（後でやる宿題）

- [ ] PR1: `docs/reference/basic_spec.md` §2-2 / §8.2 更新
- [ ] PR1: `docs/reference/constraints.md` §2-2 / §8 更新
- [ ] PR1: `docs/reference/functional_spec.md` 関連セクション ADR-0049 参照追加
- [ ] PR1: `docs/explanation/product_strategy.md` Pro 価格戦略整合
- [ ] PR1: `docs/mockups/v1.0/docs/principles.md` Pro 機能境界の最新版反映
- [ ] PR1: `docs/adr/ADR-0009-f13-revenuecat-billing.md` Sess59 Amendment (本 ADR 参照リンク追加)
- [ ] PR2: PaywallScreen FeatureRow 6 項目に書き換え + useProGuard hook 確立 + i18n 19 言語 17 key 追加 / 4 key 削除
- [ ] PR2: PlanSection bullet 3 → 6 個フラット表示
- [ ] PR3: 写真 ①③ Paywall ガード実装 (FREE_PHOTO_LIMIT = 3 復活、 event_photos 上限追加、 selectionLimit) + SEED_PACK_FREE/PRO 分離開始
- [ ] PR4: タグ ② Paywall ガード実装 (canCreateTag 追加) + SEED 整合
- [ ] PR5: カスタム樹種樹形 ⑥ Paywall ガード実装 (countAllCustomSpecies 新規) + SEED 整合
- [ ] TestFlight 1 週間検証 → App Store / Google Play 提出

---

## Acceptance / Tests（合否：テストに寄せる）

### 正（自動テスト）

- Jest:
  - `__tests__/db/photoRepository.test.ts` (canAddPhoto / Grandfathered)
  - `__tests__/db/tagRepository.test.ts` (canCreateTag)
  - `__tests__/db/bonsaiSpeciesCustomRepository.test.ts` (canCreateCustomSpecies)
  - `__tests__/features/pro/useProGuard.test.ts` (canAdd ロジック)
  - `__tests__/features/pro/PaywallScreen.test.tsx` (FeatureRow 6 行確認)
  - `__tests__/features/settings/PlanSection.test.ts` (bullet 6 個確認)
- Maestro:
  - `maestro/flows/paywall-display.yml` (Paywall 6 行表示)
  - `maestro/flows/paywall-photo-basic.yml` (3 枚追加 + 4 枚目で Paywall)
  - `maestro/flows/paywall-photo-worklog.yml` (作業記録写真同様)
  - `maestro/flows/paywall-tag.yml` (3 個 + 4 個目で Paywall)
  - `maestro/flows/paywall-custom-species.yml` (3 件 + 4 件目で Paywall)
- 既存テスト:
  - `__tests__/features/purchase/{buy_monthly,buy_annual,buy_lifetime,restore}.test.ts` (ADR-0009 既存)
  - `__tests__/features/ads/visibility.test.ts` (Pro 広告非表示)

### 手動チェック (TestFlight 検証時)

- 手順:
  1. SEED_PACK_FREE で起動 → devSetPro(false) で Free 確認
  2. 各機能 (①〜⑥) で 4 件目試行 → Paywall 起動確認
  3. Grandfathered: SEED_PACK_PRO で起動 → devSetPro(false) 切替 → 既存 4+ データ表示 + 削除 + 追加 Paywall 確認
  4. 19 言語で Paywall 表示崩れなし確認
  5. RevenueCat Receipt 復元動線確認
- 期待結果: 全機能で Paywall 起動 + Grandfathered データ保護

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**:
  - PR1-5 段階的 merge (PR3+PR4 並行実装可能、 worktree isolation 推奨)
  - PR2 で useProGuard hook 共通基盤確立、 PR3-5 conflict 回避
  - TestFlight 1 週間検証 → App Store / Google Play 本番提出 (Sess59 R4 S-3 決定)
  - App Store Connect / Google Play Console の IAP 説明文と PaywallScreen の Pro 機能リスト整合確認 (リリース前)
- **ロールバック方針**:
  - 各 PR は独立 `git revert` で安全に巻き戻し可
  - PR2 revert 時は i18n 19 言語の翻訳が失われる = 再翻訳必要
  - 写真制限 (PR3) 単独 revert で `FREE_PHOTO_LIMIT_PER_BONSAI = Infinity` (Issue #458 状態) に戻る、 既存 user に影響なし
  - ストア提出後リジェクトの場合: 該当 PR revert + 緊急修正 PR
  - メタデータ不整合の場合: `fastlane/metadata/` 修正で再提出 (コード変更不要)
- **検知方法**:
  - RevenueCat Dashboard でサブスク取得率を monitoring
  - Maestro E2E flow CI で各 Paywall 動線の regression 検出
  - Apple App Store Connect / Google Play Console の Review status 通知

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §2-2 (Free/Pro 不変差分) / §8 (機能 ID 一覧)
- basic_spec: `docs/reference/basic_spec.md` §8.2 (Free/Pro 機能差分表) / F-08 (写真管理) / F-13 (課金)
- functional_spec: `docs/reference/functional_spec.md` §13 (F-08 写真管理) / §15 (CSV/PDF)
- product_strategy: `docs/explanation/product_strategy.md` §2 (収益モデル) / §6-1 (v1.x コア機能)
- principles: `docs/mockups/v1.0/docs/principles.md` (UI 原則)
- ADR: ADR-0009 (RevenueCat 基盤) / ADR-0011 (推奨機能撤廃) / ADR-0020 (Claude Design 採用)
- Sess58 議論セッション: Claude Code セッション ID `03317d4b-254d-451a-9f24-76d8e2b7b223` (2026-05-30、 1046 行)
- 関連 Issue: #458 (写真制限撤廃 Phase 2、 本 ADR で **Supersedes**)
- 関連 PR (Sess58 派生): #909 (F-05 撤廃 docs 同期) / #910 (年次タイムライン撤廃)
- 業界事例:
  - [Day One 1 photo/entry Free 制限](https://dayoneapp.com/) (機能①〜③ 参考)
  - [Slack 10k message 制限 2022 年事件](https://slack.com/) (Grandfathered 緩採用根拠)
  - [Notion 7 vs 30 days history](https://www.notion.so/) (Option C 却下根拠)
- 法令:
  - [景品表示法第 5 条 (優良誤認表示)](https://www.caa.go.jp/policies/policy/representation/fair_labeling/)
  - [GDPR Art.20 (Right to data portability)](https://gdpr-info.eu/art-20-gdpr/)
  - [Apple App Store Review Guideline 2.3.1 / 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/)

---

## Notes（メモ：任意）

### Sess58 議論経緯 (2026-05-30、 セッション 03317d4b)

4 ラウンド構成で議論完遂:

- R1: 機能棚卸し v1/v2 (119 機能 + 80 fields) + 3 層乖離発覚
- 中間: F-05 撤廃 PR #909 + 年次タイムライン撤廃 PR #910 (法的リスク即解消)
- R2: 競合 6 アプリ比較 (Day One / Bonsai Care App / Notion / Todoist / AdMob 公式 88% 離脱統計)
- R3: バリュープロポジションキャンバス 4 ペルソナ完全作成 + Fit 検証
- R4: 課金 8 項目 6 専門家 + 4 ペルソナ評価 + 最終 6 項目確定

### Sess59 議論経緯 (2026-05-31)

R1-R4 で実装計画を詰めた:

- R1: ADR 構造 (新規 ADR-0049 + ADR-0009 Sess59 Amendment リンクのみ)
- R2: PR 分割粒度 (5 PR、 PR1→PR2→[PR3‖PR4]→PR5、 統合構成、 SEED 各 PR 内、 2 並列)
- R3: ガード方式 (写真=selectionLimit + 押下時 Pro / タグ/カスタム=カウンター+押下) + Grandfathered 緩 + Settings 6 個全表示フラット + SEED_PACK_FREE/PRO 2 種
- R4: ストア提出 = TestFlight 1 週間検証 → 本番

### User 真意反映 (Sess59 議論中の修正)

- 写真ピッカー段階で先に止める (selectionLimit) 採用 ← Forced downgrade 議論からの転換
- Settings bullet 「Free と Pro で差分があるもの全部表示」 = 6 個全部表示 (3 個絞り棄却)
- TestFlight 先行で進める確定

### 学び (Learned)

- ADR Amendment は履歴管理に有効だが、 主題が変わる場合は新規 ADR が適切
- 「実装ゼロの i18n key だけ UI 露出」 は構造的に防ぐべき (Sess58 年次タイムライン教訓、 R-57 候補)
- Grandfathered 戦略は churn 防止に必須 (Slack 2022 事件の轍を踏まない)

### §Notes Amended Sess74 PR-1 (2026-06-07) — タグ ② に master プリセット 2 件追加

**背景**: テスター FB 「基本的なタグが事前に入っていると入力の手間が省ける。 盆栽に使うタグが思い浮かばなかった」 への対応。 カスタム樹種 ⑥ パターン (master 5 種は Free 利用無制限 + custom 3 件 Free) と整合させ、 タグ ② にも master プリセットを導入する。

**変更内容**:

- **master tag = const 2 件**: `お気に入り` (favorite) + `花あり` (flowering)、 19 言語フル翻訳 (`src/db/seedTagPresets.ts`)
- **Free 上限カウントから除外**: 既存 `canCreateNewTag` (`countAllTags() < 3`) → `countCustomTags() < 3` に差し替え。 `countCustomTags` は `WHERE name_normalized NOT IN (preset 38 names)` で SQL レベル除外。 master tag を 2 件 attach しても Free 上限を消費しない。
- **schema 変更ゼロ**: `tags` table は既存のまま (DB migration 不要)。 master tag は user が chip tap した時点で初めて `tags` 行が生成される (= 既存 user に対して silent な insert は発生しない)。

**カスタム樹種 ⑥ との対応関係**:

| 項目                | カスタム樹種 (⑥)                           | タグ (② Sess74 PR-1)                                                |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| master 定義         | `SPECIES_SEED` 5 種固定配列                | `TAG_PRESETS` 2 件固定配列                                          |
| 多言語              | names.ja/en (他 17 言語は en fallback)     | names で 19 言語フル翻訳 (en fallback なし)                         |
| master の Free 利用 | 無制限 (常に利用可)                        | 無制限 (常に attach 可)                                             |
| custom Free 上限    | `FREE_CUSTOM_SPECIES_LIMIT = 3`            | `FREE_TAG_LIMIT = 3`                                                |
| 上限カウント関数    | `countAllCustomSpecies()`                  | `countCustomTags()`                                                 |
| Pro user            | 無制限                                     | 無制限                                                              |
| Grandfathered       | 既存 4+ 件 表示/削除 OK + 追加のみ Paywall | 既存 4+ 件 表示/rename OK + 追加のみ Paywall (master attach は除外) |

**多言語切替時の挙動 (受容)**: `tags.name` は user 入力の生 string 原則 (functional_spec §14.3.3 / ADR-0033) を維持。 user が JA「お気に入り」 を attach 後に EN へ切替えると、 EN 用 master chip 「Favorite」 は別 row として attach 可能 (= 2 row 化)。 これは「タグは言語非依存」 原則の自然な帰結であり、 user 意思尊重として受容。 将来、 言語非依存 tag id を導入する場合は別 ADR 起票。

**実装 PR**: Sess74 PR-1 (本 Amendment) + PR-2 (UI 配線)。
**関連**: `src/db/seedTagPresets.ts` (新規) / `src/db/tagRepository.ts` (`countCustomTags` 追加 + `canCreateNewTag` 修正) / `__tests__/db/seedTagPresets.test.ts` (新規) / `functional_spec.md` §14.3.3 (master/custom 2 種別明文化) / ADR-0026 §Notes Amended Sess74 PR-1 (master プリセット 2 件のメタデータ参照)。

---

### §Notes Amended Sess78 PR-1 (2026-06-08) — Pro 機能 7 項目目「⑦ 定期予定」 追加 (ADR-0056)

**背景**: テスター 12 人から「毎週月曜に水やりなど 定期的な予定が入力できたら 管理が楽になりそう」 という要望、 Sess78 議論モードで 6 名チーム + 4 ペルソナ全員推薦 B 案 (RRULE 保持 + 連動更新、 ADR-0056) で 実装着手。 versionCode 13 同梱予定。

**Pro 機能 6 → 7 項目に拡張**:

| #     | Pro 機能                        | Free                              | Pro            | 該当 PR                           |
| ----- | ------------------------------- | --------------------------------- | -------------- | --------------------------------- |
| ①     | 基本情報 写真                   | 各盆栽 3 枚まで                   | 無制限         | Sess59 PR3                        |
| ②     | タグ作成 (rename は無制限)      | 自作 3 個まで (master 2 件は除外) | 無制限         | Sess59 PR4 + Sess74/75 master     |
| ③     | 作業記録 写真                   | 各記録 3 枚まで (表示は全 Free)   | 無制限         | Sess59 PR3                        |
| ④     | CSV/PDF エクスポート (5 種類)   | 不可                              | 可             | 既存 (`csvExport.ts` Pro guard)   |
| ⑤     | 広告非表示                      | AdMob バナー (Home 下部のみ)      | 完全非表示     | 既存 (`adService.ts` isPro 判定)  |
| ⑥     | カスタム樹種・樹形 作成         | マスタ 5 種 + カスタム 3 件       | カスタム無制限 | Sess59 PR5                        |
| **⑦** | **定期予定 (recurring) ルール** | **3 件まで**                      | **無制限**     | **Sess78 PR-2〜5 (本 Amendment)** |

**実装パターン (タグ ②・カスタム樹種 ⑥ と完全同型)**:

- `FREE_RECURRENCE_RULE_LIMIT = 3` const (`src/db/recurrenceRuleRepository.ts`、 `FREE_TAG_LIMIT` / `FREE_CUSTOM_SPECIES_LIMIT` pattern 踏襲)
- `countActiveRecurrenceRules(): Promise<number>` (`countCustomTags` pattern)
- `canCreateRecurrenceRule(): Promise<boolean>` (`canCreateNewTag` pattern)
- ※ 上記 3 識別子は Sess101 で予定グループ単位へ改訂済 (= 当時の歴史記録として残置、 現行名は §Notes Amended Sess101 の対応表参照)
- `useProGuard({ feature: 'recurring_rule', currentCount })` で UI 配線

**Grandfathered 戦略**: 既存 4+ rule (仕様上ありえないが保証) 表示/編集/削除 OK + 追加のみ Paywall (Slack 2022 churn 事件回避、 本 ADR の Driver 2 整合)。

**UI 影響**:

- PaywallScreen FeatureRow 6 → 7 行化 (`src/features/pro/PaywallScreen.tsx`、 Sess78 PR-5)
- Settings PlanSection bullet 6 → 7 個化 (`app/settings/index.tsx`、 Sess78 PR-5)
- IAP 説明文に「定期予定: Free 3 件 / Pro 無制限」 反映 (App Store Connect + Google Play Console、 Sess58 教訓踏襲)

**Maestro E2E**: `maestro/flows/paywall-recurring.yml` 新規 (Sess78 PR-5、 3 件 + 4 件目で Paywall 起動)。

**関連**: ADR-0056 (本 Amendment の親 ADR、 Decision D7 が SoT) / `src/db/recurrenceRuleRepository.ts` (新規、 Sess78 PR-3) / Sess78 PR-1 (本 Notes Amended + ADR-0056 起票)。

---

### §Notes Amended Sess89 PR-4 (2026-06-09) — ⑥ Grandfathered 緩 削除/編集 OK の構造実装完了

**背景**: テスター苦情「樹種カスタム、 樹形カスタムの編集、 削除機能は Pro? または今後の予定? どちらにせよ表記があったほうが」 (2026-06-09 = Sess89 議論起点)。 原因 = 本 ADR §Decision 「Grandfathered 緩: 既存 4+ 件 表示 OK + 削除 OK + 追加のみ Paywall」 と明記されていたが、 Sess59 PR5 (= 2026-05-31 実装時) では「追加 + Paywall ガード」 のみ実装、 **削除/編集動線が UI に存在しない構造実装漏れ** が 4 ヶ月放置。

**Sess89 構造修復 (= 4 PR シリーズ)**:

| PR    | 範囲                                                                                                     | 状態         |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------ |
| #1028 | Phase 1 = i18n key 4 件 × 19 言語 (lookBackCardSpeciesTitle/Desc + lookBackCardStylesTitle/Desc)         | MERGED       |
| #1030 | Phase 2 = カスタム樹種 管理画面 + 編集画面 + repository CRUD (rename / delete / countBonsai / WithStats) | MERGED       |
| #1031 | Phase 3 = カスタム樹形 同型 + **案 c atomic NULL cascade** (= raw text 「幻の樹形」 問題解消)            | MERGED       |
| 本 PR | Phase 4 = ADR-0049/0026 §Notes Amended + R-72 起票 + 整合性確保                                          | 本 Amendment |

**実装 pattern (= タグ管理 Sess9 PR-6 + RecurrenceListScreen Sess82 PR-C 合成)**:

- `app/custom-species.tsx` / `app/custom-styles.tsx` = 一覧 (createdAt ASC + 使用件数 + 最終使用日) + kebab → RowActionMenu (= 編集 / 削除 2 択) + ConfirmDialog (= 削除確認、 影響範囲警告 Linear pattern)
- `app/custom-species/edit.tsx` / `app/custom-styles/edit.tsx` = TextInput + counter + save + delete + useUnsavedChangesGuard
- look-back hub 5 → 7 card (= 樹種 LeafIcon + 樹形 CompassIcon を 6/7 番目に追加)

**樹種 vs 樹形 cascade pattern の差分** (= 本 ADR Driver 2 「churn 最小化」 整合):

| 項目              | 樹種 ⑥ (= Phase 2)               | 樹形 ⑥ (= Phase 3、 案 c)                                |
| ----------------- | -------------------------------- | -------------------------------------------------------- |
| bonsai 参照型     | `custom_species_id` (= FK)       | `style` (= raw text)                                     |
| 削除時 cascade    | ON DELETE SET NULL (= 自動連動)  | **atomic UPDATE NULL** (= `deleteCustomStyle` 内 3 stmt) |
| rename 時 cascade | 不要 (= name 変更で FK 自動追従) | **UPDATE bonsai.style = 新名 WHERE style = 旧名**        |
| count 関数引数    | id                               | name                                                     |

**Free 上限カウント方針 (現状維持)**:

- ⑥ Free: master 5 種は対象外、 custom のみ 3 件まで (Sess89 で変更なし)
- 既存 4+ 件は **表示 OK + 編集 OK + 削除 OK + 追加のみ Paywall** (Grandfathered 緩、 本 ADR Driver 2)

**新規 R 番号**: R-72 (= master/custom CRUD pattern SoT、 本 Amendment と同時起票、 `.claude/recurrence-prevention/specialized.md`)

**Maestro E2E**: 既存 `paywall-custom-species.yml` (= 4 件目で Paywall 起動) は維持、 Phase 4 で `paywall-custom-species-delete.yml` + `paywall-custom-styles-delete.yml` 追加予定 (= 削除 → Grandfathered 緩 再追加可)。

**実機検証**: versionCode 13 release 前にまとめて (= Sess76 pattern 踏襲、 SH-M25 Dev Build + Metro 起動 dir 罠回避)。

**関連**: Sess59 PR5 (= 当時の実装漏れ起点) / Sess89 PR #1028/1030/1031/本 PR / R-65 拡張 (= CRUD カバレッジ events → master/custom 全領域) / R-72 (= master/custom CRUD pattern SoT)。

---

### §Notes Amended Sess101 (2026-06-11) — ⑦ 定期予定の数え方を rule 単位 → 予定グループ単位へ (#1159)

**背景**: Sess99 #1122 (案 G2) で「予定グループ」 概念を導入した結果、 課金境界だけが rule 単位 (= 盆栽 × 予定) のまま残り、 「盆栽 3 本に予定 1 つ作っただけで Free 上限」 という user 認知 (= 予定 1 件) との不一致が構造化していた。 Sess101 /discuss で user が「予定グループ単位 (= 予定 3 つまで、 盆栽数は問わない)」 を決定 (= 収益影響了承済、 Engram obs 586)。

**決定**:

| 項目       | 旧 (Sess78)                      | 新 (Sess101)                                               |
| ---------- | -------------------------------- | ---------------------------------------------------------- |
| 数える単位 | rule (= 盆栽 × 予定)             | 予定グループ (`COUNT(DISTINCT COALESCE(group_id, id))`)    |
| 上限定数   | `FREE_RECURRENCE_RULE_LIMIT = 3` | `FREE_RECURRENCE_GROUP_LIMIT = 3`                          |
| 件数関数   | `countActiveRecurrenceRules`     | `countActiveRecurrenceGroups`                              |
| 判定関数   | `canCreateRecurrenceRule`        | `canCreateRecurrenceGroup`                                 |
| 編集時判定 | 置換後 rule 総数で判定           | 判定なし (= グループ数不変、 盆栽増減・種別変更は Free 可) |

- group_id NULL の旧 rule は rule.id を 1 本グループとして数える (= `ruleGroupKey` と同一規約) — 単独作成 rule の件数解釈は従来と同一、 複数盆栽グループのみ緩和方向
- **Grandfathered**: 既存 4+ グループ = 表示/編集/削除 OK + 追加のみ Paywall (不変)。 上限緩和方向の変更のため既存 user に不利益なし (= Grandfathered badge が消える user はあり得るが緩和)
- **IAP 説明文**: 「定期予定: Free 3 件 / Pro 無制限」 はグループ単位でも文言上正のため変更なし (= Play Console / App Store Connect 更新不要)。 Paywall / PlanSection の i18n 値「3件まで」 も同様に変更なし

**関連**: ADR-0056 D7 (Sess101 改訂) / Issue #1159 / Sess101 /discuss (= カード予定中心化 #1158・次回 SoT #1157 と同議論)。

### §Notes Amended Sess101 (2026-06-12) — ③ 作業記録写真の Pro 表示を「無制限」→「10 枚まで」へ (表示と実装の一致)

**背景**: Sess101 docs 直接 Read 監査で、③ 作業記録写真の Paywall / PlanSection 表示が「無制限」である一方、実装は `MAX_PHOTOS_PER_EVENT = 10` (PhotoField.tsx、UI 安全上限) で頭打ちになる乖離を検出。Sess58 の基準 (表示残骸 = 景品表示法 / Apple Review 2.3.1 リスク) に照らし、user が **案 (a) = UI 文言を実装に一致させる** を決定。

**決定**:

- ③ Pro 値の表示 = **「10 枚まで」** (19 言語、各言語の Free 値「3 枚まで」系の表記スタイルをミラー)。i18n key `paywallFeatureWorkLogPhotoProValue` を 19 locale 一括更新 (`pnpm i18n:apply` + ja 手動)
- 実装 (`MAX_PHOTOS_PER_EVENT = 10` / `FREE_PHOTO_LIMIT_PER_EVENT = 3`) は変更なし。上限拡張する場合は本 Amendment と i18n 値を同時更新すること
- 本表の ③ Pro 列は「無制限」→「**10 枚まで** (安全上限)」 に読み替える。①②⑥⑦ の「無制限」は実装にも cap がないため従来通り
- **IAP 説明文** (Play Console / App Store Connect) に「作業記録写真 無制限」の記載がある場合は次回ストア更新時に「10 枚まで」へ修正 (user 手動、Sess58 教訓踏襲)

**関連**: PhotoField.tsx (`MAX_PHOTOS_PER_EVENT`) / photoRepository.ts (`FREE_PHOTO_LIMIT_PER_EVENT`) / Sess101 user 決定 (実機スクショ指摘起点)。

---

## Notes Amended (Sess106、2026-06-13): 全 CTA 画面 FeatureRow 統一 + タグ Free 上限ガード

Sess106 sprint の議題② (Pro 訴求 UI 強化 + タグ guard 補完) で発見された構造課題に対し、以下を Follow-up として追加:

### Follow-up 1: 全 CTA 画面の FeatureRow component 統一

- **対象画面**: PaywallScreen / PlanSection (現状) + 新規 ProBanner (ADR-0061、Sess106 PR-6 で追加)
- **方針**: `paywallFeature*` 21 keys (7 機能 × label/free/pro) を SoT とし、3 画面で **同一 component / 同一キー** を再利用
- **新規 i18n キー追加 = ゼロ** (Sess60 PR2 統一済の DRY を維持、Sess106 Q2 user 確定)
- **将来 Pro 機能 ⑧ 追加時**: ADR-0049 §Decision 表に行追加 → 自動的に PaywallScreen / PlanSection / ProBanner に反映 (lock-step)

### Follow-up 2: タグ作成 Free 上限ガード UI 実装 (Sess106 PR-5 = Issue #1250)

- **構造実装漏れ発見**: Sess89 で樹種 / 樹形のカスタム上限 → Paywall ガードは実装されたが、**タグだけが BonsaiTagsSection / tag-edit で useProGuard 未連動**
- **対応**: tag-edit.tsx の handleSave に `useProGuard({ feature: 'tag', currentCount })` 配線、`canCreateNewTag()` → Alert + `router.push('/pro?source=tag')`
- **Grandfathered**: 既存 4+ タグは表示 / rename OK、追加のみ Paywall (ADR-0049 §Decision Grandfathered 戦略整合)
- **master tag 除外**: `countCustomTags()` で WHERE NOT IN で preset 2 件 (favorite / flowering) を除外

### Follow-up 3: RecurrenceFormScreen の useProGuard 統一 (Sess106 PR-9 = Issue #1254)

- **現状**: RecurrenceFormScreen が `router.push('/pro?source=recurring_rule')` 直起動 = 他 5 feature と異なる pattern
- **対応**: `useProGuard('recurring_rule')` hook 経由に統一 (詳細は ADR-0056 Sess106 Amendment 参照)
- **目的**: 6 feature 全 API 統一で UX 一貫性、`canAdd/isPro/openPaywall` の 3 値 SoT 化

**関連 ADR**: ADR-0061 (ProBanner、本 Follow-up 1 の実装先) / ADR-0056 (定期予定、本 Follow-up 3 の実装先)
**関連 Issue**: #1250 (PR-5) / #1251 (PR-6) / #1254 (PR-9)
