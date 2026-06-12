# ADR-0033: i18n 翻訳ポリシー — 18 言語手動翻訳 + 直書きハードコード禁止 (Sess20)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0027 (form overhaul) / ADR-0029 (form UX permanent Phase γ) / ADR-0030 (navigation patterns) / ADR-0031 (calendar unified) / ADR-0032 (planned/logged distinction) / `docs/explanation/product_strategy.md` §1-2 独自価値 / §9 多言語方針 / §11-3 R2 / ~~`docs/reference/glossary.md`~~ (Sess101 #1169 で廃止 — 翻訳禁止リストの現行 SoT は本 ADR D3 + 末尾 Amendment 参照) / Sess18 PR-5/10 (メモ placeholder 19 言語手動翻訳実証) / Sess19-4 PR-T1a #690 (作業記録 form 最重要 UI 17 keys × 17 言語実証) / Sess20 議論 (6 専門家チーム + 4 ペルソナ全員 ◎/○)

---

## Context（背景：いま何に困っている？）

### product_strategy §9-2 旧方針との矛盾

product_strategy §1-2 で「19 言語対応」 が独自価値 4 点セットの 1 つ、 §11-3 R2 で「翻訳品質不足 → 低評価」 がリスク化されている。 ただし §9-2 では予算ゼロ前提で「**Claude Code に一言語ずつプロンプトテンプレートで翻訳依頼**」 (= AI 単独翻訳) が公式運用として記述されている。

Sess18 (PR-5/10) で **メモ placeholder 19 言語手動翻訳** (266 文字列、 各言語プロペルソナ立て) を実施、 Sess19-4 PR-T1a (#690) で **作業記録 form 最重要 UI 17 keys × 17 言語 = 306 文字列** を **各言語 native UX writer ペルソナ手動翻訳** (Sarah Chen Apple HIG / Pierre Lefebvre Académie française / Sofía Martínez Latam 配慮 / 等) で実施。 user 真意「ユーザーの目に映る部分すべて 18 言語手動翻訳」 が確立、 §9-2 旧方針より厳しい品質基準。

### user 真意 (Sess18/19/20)

- 「ユーザーの目に映る部分」 = user 視覚範囲のみ (debug/dev/console は除外)
- 「手動翻訳」 = 各言語 native UX writer ペルソナを立てて、 1 つずつ脳内翻訳 (機械翻訳臭ゼロ、 文化的配慮反映)
- **「直書きハードコードは無くしていきましょう」** (Sess20 追加指示、 2026-05-21) = Stack header 漏れ 12 件以外も全網羅 i18n key 化必須

### Sess20 議論で確認 (6 専門家 + 4 ペルソナ)

- テックリード: §9-2 と user 真意の矛盾を ADR で明文化、 次セッション再議論ロス防止
- QA: 5,865 文字列一括変更は SS 検証不能、 段階展開 + Pseudo-loc 必須
- UX: 19 言語独自価値の戦略レベル保護、 UX 優先順 (Stack header > bonsai-detail > Plan > settings > paywall > form 残 > common/error)
- PM: 直書き (日本語混入) >>> 英語 fallback の重大度順、 v1.0 blocker
- エンドユーザー代表 (fr native): 日本語混入 = 信頼喪失、 英語 fallback はマシ
- セキュリティ / フラット視点: §9-2 矛盾を放置すると毎セッション再議論、 ADR 明文化必須

→ 4 ペルソナ全員 ◎/○ で本 ADR 採用。

### 制約 / 前提

- §9-1 19 言語 (ja 含む、 ar 非対応 RTL 回避) は不変
- `docs/reference/glossary.md` (用語集 19 言語統一表記、 翻訳禁止リスト bonsai/niwaki/karikomi 等) は SoT 維持
- `pnpm i18n:check` (0 missing) 必須
- Phase 1a (#690) で実証された言語別プロペルソナ集合は本 ADR の翻訳基準

---

## Decision（決めたこと：結論）

### D1: v1.0 翻訳ポリシー = 18 言語手動翻訳 (各言語 native UX writer ペルソナ)

- **決定**: ja (SoT) + **18 言語** (en/fr/es/de/it/pt/nl/sv/pl/ru/zhHans/zhHant/ko/hi/id/th/vi/tr) = **全 19 言語** (product_strategy §9-1 と整合、 ar 非対応 RTL 回避)。 各言語の native UX writer ペルソナを立てて Claude Code が手動翻訳。 ja は SoT のため翻訳対象外、 実翻訳対象は **18 言語**。
- **18 言語プロペルソナ集合** (Sess19-4 PR-T1a #690 で確立、 本 ADR で正式採用):
  | Lang | ペルソナ | 文化的配慮 |
  |---|---|---|
  | en | Sarah Chen (Apple HIG) | minimal / friendly |
  | fr | Pierre Lefebvre (Académie française) | formal but warm |
  | es | Sofía Martínez (Latam 配慮) | clear / accessible |
  | de | Klaus Müller (SAP technical) | precise / formal |
  | it | Giulia Romano (Apple Italy) | elegant |
  | pt | João Silva (EU Portuguese) | european standard |
  | nl | Sanne van der Berg (Booking.com) | direct |
  | sv | Erik Lindqvist (IKEA) | simple |
  | pl | Anna Kowalski (Allegro) | natural |
  | ru | Dmitry Volkov (Yandex) | clear |
  | zhHans | Wei Zhang (ByteDance) | concise |
  | zhHant | Lily Chen (LINE Taiwan) | 繁體中文 standard |
  | ko | Min-jun Park (Naver/Kakao) | -요 polite |
  | hi | Priya Sharma (Delhi) | formal आप 形 |
  | id | Rina Wijaya (Tokopedia) | casual |
  | th | Niran Suksawat (LINE Thailand) | ค่ะ/ครับ polite |
  | vi | Linh Nguyen (VinGroup) | modern |
  | tr | Mehmet Yıldız (Trendyol) | modern |
- **禁止**: 機械翻訳 (DeepL / GPT-4 / Google Translate) 単独使用は禁止
- **理由**: product_strategy §1-2 独自価値 4 点セットの 1 つ「19 言語対応」 を戦略レベルで保護、 §11-3 R2 リスク (翻訳品質不足 → 低評価) を事前防止

### D2: user 視覚部分の直書きハードコード禁止

- **決定**: 以下 pattern の user 視覚 string を i18n key 化必須:
  - JSX text 内日本語: `>[ぁ-んァ-ヶ一-龯][^<]*<`
  - props string literal 日本語: `title|headerTitle|label|placeholder|message|accessibilityLabel|aria-label` 等
  - `Alert.alert\(` / `Snackbar.show\(` / `Toast.show\(` の user 表示 string
- **除外**: `console.log/warn/error`, `__DEV__` 内, Sentry tag, `test/__tests__/`, `src/core/i18n/locales/`, `scripts/`, `docs/`
- **強制**: PreCommit hook (`scripts/check-hardcode-strings.mjs`) で commit block (R-41、 override 不可)
- **理由**: user 真意「直書きハードコード無くしていきましょう」 (Sess20) を構造的に実現、 Stack header 漏れ等の再発防止

### D3: glossary.md 厳守 + Read 義務化 (R-40)

- **決定**: Phase H2 翻訳適用 PR 着手前に `docs/reference/glossary.md` を必ず Read (R-40 で行動 lesson 化)
- **glossary 用途**:
  - 概念定義参照 (例: 「水やり」 の定義範囲、 「剪定」 vs 「整枝」 の使い分け)
  - 翻訳禁止リスト (bonsai / niwaki / karikomi / nebari / jin / shari / kokedama / yamadori / mame / shohin / akadama / kusamono / sabamiki / bunjin / ishizuki) を全言語維持
  - 用語不一致防止 (Crowdin best practice 2026: 「同概念 3 種類の用語」 worst pattern 回避)
- **強制**: `scripts/i18n/apply-translation.mjs` に `--glossary` option で警告機能組込
- **理由**: 業界 standard (Crowdin / Lokalise 2026) の「Glossary 早期構築 + 厳守」 best practice 準拠

### D4: Pseudo-localization 実施義務 (Phase H2 着手前)

- **決定**: Phase H2 各 PR 翻訳適用前に Pseudo-loc で UI 崩れ事前検出
- **方式**:
  - `src/core/i18n/locales/xxXX.ts` に Pseudo-loc 言語追加 (dev mode only、 `__DEV__` 内のみ有効)
  - 全 string を `[xx-{原文}-xx]` で 2 倍長化 (例: "保存" → "[xx-保存-xx]")
  - `maestro/i18n-pseudo-check.yml` で主要画面 (Tab × 4 + bonsai-detail + WorkLogConfirm + settings + paywall) SS
  - 文字切れ / overflow / button truncation を style 修正 (flex / width / numberOfLines)
- **理由**: product_strategy §9-2 ワークフロー 4 番で Pseudo-loc 必須化、 §11-3 R2 恒久策で「Pseudo-loc + VRT 必須組込」 と既定済。 Sess1-19 で未実施だったが Sess20 から復活

### D5: product_strategy §9-2 AI 単独翻訳方針 supersede

- **決定**: product_strategy §9-2 「Claude Code に一言語ずつプロンプトテンプレートで翻訳依頼」 (= AI 単独翻訳) を本 ADR D1 (各言語プロペルソナ手動翻訳) で **supersede**
- **対象**: §9-2 ワークフロー 2 番 (Claude Code 翻訳依頼) + §9-2 プロンプトテンプレート + §11-3 R2 恒久策の AI 単独翻訳前提
- **保持** (supersede 対象外、 引き続き有効):
  - §9-2 自動検証スクリプト (キー数 / placeholder / 音訳必須用語チェック)
  - §9-3 全 19 言語フル展開
  - §9-4 翻訳禁止リスト (bonsai 等)
  - §9-5 アプリ内フィードバック (v1.0 リリース後の継続改善)
  - §11-3 R2 Pseudo-loc + VRT
- **理由**: user 真意 (Sess18/19) で確立された厳しい品質基準は §9-2 AI 単独翻訳より上位、 ADR-0033 が新 SoT

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「ユーザーの目に映る部分すべて 18 言語手動翻訳」 (Sess18/19 で確立、 Sess20 で直書き禁止も追加)
- **Driver 2**: product_strategy §1-2 独自価値 4 点セットの 1 つ「19 言語対応」 の戦略レベル保護
- **Driver 3**: §11-3 R2 リスク (翻訳品質不足 → 低評価 / UI 崩れ) の事前防止
- **Driver 4**: Sess20 議論で 6 専門家 + 4 ペルソナ全員 ◎/○
- **Driver 5**: 業界 standard (Crowdin / Lokalise 2026) の Glossary 厳守 + 段階展開 + Pseudo-loc 整合

---

## Alternatives considered（他の案と却下理由）

### Option A: AI 下訳 + ja native sampling のみ (= 旧 §9-2 維持)

- 概要: Claude Code が全 18 言語を一気生成、 ja native user (= 開発者) が読める en/zh で sampling、 残 16 言語は §9-5 アプリ内フィードバック後手
- 良い点: 1-2 PR で完遂、 速度 10 倍
- 悪い点: 機械翻訳臭リスク、 §11-3 R2 リスク現実化、 user 真意違反
- 却下理由: 4 ペルソナ全員 ✕ (Sess20 議論)

### Option B: Hybrid (Claude 1 次案 + glossary 厳守 + 5 言語 native sampling)

- 概要: Claude が glossary を input context にして 18 言語生成、 用語不一致 lint で機械検証、 5 言語 (en/fr/es/de/zhHans) で SS sampling
- 良い点: 速度 + 用語一貫性
- 悪い点: glossary に無い文脈依存表現は Claude 判断頼り、 user 真意「手動」 と微妙な距離
- 却下理由: v1.0 直前で品質リスク取るのは戦略矛盾

### Option C: 各言語 native UX writer ペルソナ手動翻訳 ★採用

- 概要: D1 の通り、 18 言語ペルソナ立てて Claude Code が 1 つずつ脳内翻訳
- 良い点: 最高品質、 機械翻訳臭ゼロ、 競合差別化、 user 真意完全整合
- 悪い点: Claude 1 PR あたり 1-2 時間以上、 全 5,865 文字列で 5-7 PR 必要
- 採用理由: 4 ペルソナ全員 ◎、 v1.0 独自価値の戦略レベル保護

### Option D: 機械翻訳禁止 + 言語別 native 雇用

- 概要: 18 言語 native 翻訳者を雇用 (1 言語あたり $200 × 17 = $3,400)
- 良い点: 最高品質
- 悪い点: §9-2 予算ゼロ前提違反、 個人開発の経済性破綻
- 却下理由: §9-2 予算制約と矛盾

---

## Consequences（結果：何が変わる？）

### Pro

- **user 真意整合**: 「ユーザーの目に映る部分すべて 18 言語手動翻訳」 構造的実現
- **戦略書整合**: §1-2 独自価値 4 点セット保護、 §11-3 R2 リスク事前防止
- **直書き再発防止**: PreCommit hook + R-41 で構造的 block (注意ではなく構造で防ぐ、 CLAUDE.md §9 記憶の昇華ルール準拠)
- **glossary 活用**: 業界 standard best practice 準拠 (Crowdin / Lokalise 2026)
- **Pseudo-loc 復活**: §9-2 公式運用準拠、 UI 崩れ事前検出

### Con

- **Claude 工数増**: 1 PR あたり 1-2 時間以上、 全 Phase H2 で 5-7 PR 必要
- **§9-2 旧方針 supersede**: product_strategy §9-2 + §11-3 R2 の AI 単独翻訳前提を Notes Amended
- **PreCommit hook 整備**: PR-0-3 で `scripts/check-hardcode-strings.mjs` + `.claude/hooks/` 新規

### Forward-only 互換性

- ja.ts SoT 不変
- 既存 17 言語 fallback (英語残存 ~365 keys) は Phase H2 で順次翻訳
- glossary.md 不変 (用語集 19 言語統一表記)
- `pnpm i18n:check` 不変

---

## Implementation（実装メモ）

### Phase 構成 (Sess20、 12 PR)

| Phase     | PR              | 内容                                                                  |
| --------- | --------------- | --------------------------------------------------------------------- |
| Phase 0   | PR-0-1 (本 ADR) | ADR-0033 起票 + product_strategy §9-2/§9-5/§11-3 R2 Notes Amended     |
| Phase 0   | PR-0-2          | 翻訳 script 昇格 (`/tmp/` → `scripts/i18n/`) + glossary 連携          |
| Phase 0   | PR-0-3          | hardcode 検知 hook + R-40 (glossary Read 義務) + R-41 (hardcode 禁止) |
| Phase H1  | PR-H1           | 直書き全件 i18n key 化 (ja 集約 + 17 言語英 fallback、 ~50 keys × 18) |
| Phase 0.5 | PR-0.5          | Pseudo-loc 実装 + UI 崩れ事前検出 (D4 実装)                           |
| Phase H2  | PR-H2-1 〜 H2-7 | 画面別 17 言語翻訳適用 (~5,865 文字列、 UX 推奨順)                    |

### testing 戦略

- `pnpm i18n:check` (0 missing) + `pnpm lint:hardcode` (0 件、 PR-0-3 以降)
- Phase H2 各 PR: 5 言語 (en/fr/es/de/zhHans) で SS 品質 sampling
- Phase 0.5: Pseudo-loc で全画面 SS overflow 0 件
- §9-5 公式運用: アプリ内フィードバック 3 件で再翻訳サイクル (v1.0 リリース後)

### v1.0 翻訳 Definition of Done

- ✅ 直書きハードコード 0 件 (PreCommit hook 構造保証)
- ✅ 17 言語英語 fallback 0 件 (`pnpm i18n:check` + grep 機械検証)
- ✅ Phase H2 全 PR の 5 言語 SS sampling 完了
- ✅ Pseudo-loc で UI 崩れ 0 件

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess20 議論結果 + user Q1-Q8 全推薦案 A 承認反映)

### 2026-05-21 Sess21 PR-1 言語カウント typo 訂正

初版で 3 箇所の言語カウント typo を訂正:

- **D1 決定**: 旧 「ja (SoT) + 17 言語 (...) = **18 言語**」 → 正 「ja (SoT) + **18 言語** (...) = **全 19 言語**、 翻訳対象は 18 言語」
- **Option A**: 旧 「Claude Code が全 **17 言語**を一気生成、 残 15 言語は …後手」 → 正 「全 **18 言語**を一気生成、 残 16 言語は …後手」
- **Option B**: 旧 「Claude が glossary を input context にして **17 言語**生成」 → 正 「**18 言語**生成」

LANGS 配列 (`src/core/i18n/locales/` の ja 以外) を数え直すと **18 言語**、 ja 含めて全 **19 言語** (product_strategy §9-1 と整合)。 旧 typo は Sess19-4 PR-T1a `/tmp/apply-i18n-phase1a.mjs` の console.log 文言「17 keys × 17 langs = 289」 (LANGS 配列は 18 個だが log は 17 と書かれていた既存 bug) を ADR に書き写してしまったもの。 D1 タイトル「18 言語手動翻訳」 と 18 言語プロペルソナ集合表 (18 行) は変更不要 (= 翻訳対象 18 言語の意味で正しい)。

### 2026-06-11 Sess101 glossary.md 廃止 — 翻訳禁止リストの SoT を本 ADR D3 + script 内蔵 table へ移管

user 決定「共通言語の取りまとめは user + Claude Code の 2 者開発では不要」により `docs/reference/glossary.md` を削除した (用語の正は `basic_spec.md` §2 + `constraints.md` + コード)。本 ADR への影響:

- D3 の「glossary.md Read 義務」は「**本 D3 翻訳禁止リストの確認義務**」に読み替える (R-40 同時改訂)
- 翻訳禁止リストの SoT = **本 D3 + `scripts/i18n/apply-translation.mjs` の `PROTECTED_TERMS`** (検査は常時実行化、`--glossary <path>` option は廃止)
- 旧 glossary §5 の樹形音訳 (**Chokkan / Moyogi / Shakan / Kengai / Han-Kengai / Sokan**) を翻訳禁止リストへ追加移管
- 「Forward-only 互換性」の「glossary.md 不変」は本 Amendment が supersede

### 2026-06-12 Sess104 #1207 発動 — 全 18 言語ペルソナ翻訳・監査 + ペルソナ詳細化

user 指示「各言語別のプロ翻訳家ペルソナを詳細に立て、確定 ja を基準にニュアンス込みで全て翻訳」により、Sess102 確定手順 ② (= #1207 トリガ) を発動。前提 ① (ja SoT の表現見直し) は ADR-0060 + Issue #1208 で完了済み。

**翻訳原文の優先順位**: ja (ニュアンス SoT、`docs/reference/copy-style-ja.md` 準拠) > en (用語参照)。en 自体も本発動で ja 基準監査の対象。

**D1 ペルソナ詳細化** (翻訳実務で参照する規範。D1 表の「文化的配慮」列を以下で具体化):

| Lang   | ペルソナ                         | 敬称・文体                                                   | 句読点・記号                                                   | 言語固有の注意                                                                             |
| ------ | -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| en     | Sarah Chen (Apple HIG)           | 2 人称 you、命令形 CTA (Save / Add)、Title Case はボタンのみ | 半角記号、Oxford comma 不要の短文                              | 簡潔最優先。冠詞省略可の UI 慣行                                                           |
| fr     | Pierre Lefebvre (Académie)       | vouvoiement (vous)、不定詞 CTA (Enregistrer)                 | UI では « » 不使用、`?` `!` の前の espace は入れない (UI 慣行) | アクセント必須 (é è ê ç)、名詞の性数一致                                                   |
| es     | Sofía Martínez (Latam 配慮)      | usted 系の中立 (直接 tú を避けた不定詞 CTA)                  | ¿? ¡! は確認ダイアログの疑問文のみ                             | Latam/西で通じる語彙 (computadora 等の地域語回避)                                          |
| de     | Klaus Müller (SAP)               | Sie 体、不定詞 CTA (Speichern)                               | 半角記号                                                       | **長文化抑制が最重要** (ja 幅 1.5 倍以内)、名詞大文字                                      |
| it     | Giulia Romano (Apple Italy)      | 不定詞 CTA、formale だが堅すぎない                           | 半角記号                                                       | アポストロフォ (l'albero) 正書法                                                           |
| pt     | João Silva (EU Portuguese)       | você 回避の不定詞 CTA (欧州標準)                             | 半角記号                                                       | 欧州綴り (ação ではなく acção にしない — 1990 正書法協定準拠で ação)                       |
| nl     | Sanne van der Berg (Booking.com) | je 体 (direct)、不定詞 CTA                                   | 半角記号                                                       | 複合語の節度、簡潔                                                                         |
| sv     | Erik Lindqvist (IKEA)            | du 体、simple                                                | 半角記号                                                       | 定冠詞後置 (listan) の自然さ                                                               |
| pl     | Anna Kowalski (Allegro)          | 不定詞 CTA、中立丁寧                                         | 半角記号                                                       | 格変化と数の一致 ({count} 件 = liczebnik 変化に注意、複数形 2-4/5+ の差は単一形で安全側に) |
| ru     | Dmitry Volkov (Yandex)           | 不定詞 CTA (Сохранить)、вы 体                                | 半角記号                                                       | **最長クラス — 簡潔最優先**、数詞の格 (дней/дня) は単一形で安全側に                        |
| zhHans | Wei Zhang (ByteDance)            | 简体、concise                                                | **全角句読点 (。？！、)**、英数字と漢字間スペースなし          | 设置/确认/删除 等の大陆標準語                                                              |
| zhHant | Lily Chen (LINE Taiwan)          | 繁體、台湾標準                                               | **全角句読点**、英数字と漢字間スペースなし                     | 設定/確認/刪除 — 简体の直繁換装禁止 (用語自体が違う: 視頻→影片 等)                         |
| ko     | Min-jun Park (Naver/Kakao)       | 합니다体 (説明文) + 体言止め (ラベル)                        | 半角記号、ハングルと英数字間スペース                           | 助詞の自然さ (을/를、이/가)、外来語表記法                                                  |
| hi     | Priya Sharma (Delhi)             | आप 形 formal                                                 | デーヴァナーガリー句点 (।) は UI では「.」可、半角記号         | 英語借用語は UI 慣行に従い許容 (फ़ोटो 等)                                                  |
| id     | Rina Wijaya (Tokopedia)          | casual だが Anda 使用、不定詞 CTA                            | 半角記号                                                       | 重複複数 (foto-foto) は UI では避け単数形                                                  |
| th     | Niran Suksawat (LINE Thailand)   | polite (ค่ะ/ครับ は UI 文言では省略可)、丁寧中立             | 分かち書きなし、半角記号                                       | 語間スペースは句区切りのみ。文字上下の積み (สระ/วรรณยุกต์) で行高に注意                    |
| vi     | Linh Nguyen (VinGroup)           | bạn 体 modern                                                | 半角記号                                                       | 声調記号必須、漢越語と固有語のバランス                                                     |
| tr     | Mehmet Yıldız (Trendyol)         | siz 体、不定詞 CTA (Kaydet)                                  | 半角記号                                                       | 母音調和、İ/i・I/ı の大文字小文字規則                                                      |

**全言語共通 DoD** (各 PR の翻訳 agent に課す):

1. ja の意味・トーン (寄り添い、ADR-0011「診断しない、記録する」) を保持しつつターゲット言語として自然 (直訳禁止)
2. placeholder `{...}` 無加工 / D3 翻訳禁止 21 語は音訳維持 / reminder・tracker・alert 不使用 (R-3)
3. ADR-0054 D3 英訳許容差の既存キー (bulkLog/bulkSchedule「次へ」系 / planFabLabel / addScheduleCta) は現訳維持
4. 課金系 (purchase/paywall/pro) は意味不変 (ADR-0049)
5. 簡潔: ja のレンダリング幅を大きく超えない (特に Title/Cta/paywall 表セル)
6. 既訳が適切なら維持 (無用な書き換え禁止)。変更が必要なキーのみ提出

**適用経路**: 各言語ペルソナ agent → `dist/translations/<lang>.json` (変更キーのみ) → `pnpm i18n:apply --dry-run` → 目視 → apply → `i18n:check` / `i18n:forbidden` / `i18n:placeholder-audit` → 言語別 PR (計 18)。完遂後に全 18 言語の実機 SS (home/設定/paywall) でレイアウト検証。
