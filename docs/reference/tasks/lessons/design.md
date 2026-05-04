# Lessons: デザイン / Claude Design / UI 仕様整合

> 索引: [`README.md`](./README.md)

---

### Claude Design 作成時に既存 ADR を Claude に渡す

- **何が起きたか**: F-04 #29 実機検証中に Claude Design (`BonsaiLog_template/`) を取得すると、既存タブ構成 (Home / 盆栽 / 統計、F-04 PR #172 で統計タブ追加済) と異なる **4 タブ構成 (盆栽 / 予定 / 探す / 設定)** + ADR-0018 で確定済の **オンボ 8 画面と異なる 6 画面構成** で生成されており、R-16 ルール「Design は下書き、ADR が正」で部分採用判断 (ADR-0019 起票) を強いられた。
- **根本原因**: Claude Design は claude.ai 上で対話的に作成され、本プロジェクトの ADR (-0011/-0013/-0015/-0018 等) を Claude に直接渡すワークフローが確立されていなかった。結果として「Claude が知っている一般的な盆栽アプリ構成」で生成され、本プロジェクトの確定方針と乖離した。
- **ルール**:
  1. **Claude Design 作成時は必ず ADR + functional_spec + design_system.md を Claude に添付**する。少なくとも以下を渡す:
     - `docs/adr/` 配下の Accepted ADR 全件
     - `docs/reference/functional_spec.md`
     - `docs/reference/design_system.md` (UI 表現の Source of Truth)
     - `docs/reference/personas.md` (4 ペルソナ評価のため)
     - `docs/reference/constraints.md` (UI 文言禁止語、押し付け文言 NG 等)
  2. **生成後に R-16 整合確認を実施**。ADR と矛盾する箇所があれば、ADR を正として「Design 部分採用」or「ADR 改訂議論」を判断 (ADR-0019 §Notes が好例)。
  3. **採用判定の表をドキュメント化**する (採用 / 不採用 / 部分採用 + 理由)。次回以降の Design 作成での再発を防ぐ。
  4. Claude Design URL (`https://api.anthropic.com/v1/design/h/{id}`) は **API キー (Console)** が必要かつ **WebFetch の 10MB 上限** を超える可能性が高い。取得手段は (a) Console API キー + curl (b) ブラウザで開いてエクスポート (c) ファイルをローカル DL してアシスタントに渡す のいずれか。Claude Code Max プランは Console API とは別系統で別途課金。

---

### Expo create-expo-app テンプレート残骸を構造的に検出する

- **何が起きたか**: F-04 #29 実機検証中に Home 画面で Expo create-expo-app テンプレ残骸「ここからアプリを作り始めましょう」が見えた。pnpm verify では検知できず、Maestro でも文言検査をしておらず、ストア審査前まで気付かないリスク。
- **根本原因**: Expo テンプレートは「動くサンプル文言」を含むが、本格実装時に削除する責任が開発者にあり、CI で「**まだサンプル文言が残っていないか**」を検査する仕組みが無かった。各機能 ADR (F-01〜F-16) は「Home に表示する」と書いておらず、Home 画面の実装が後回しになっていたため発見が遅れた。
- **ルール**:
  1. **`scripts/template-residue-check.mjs`** で代表的なテンプレ残骸文言を grep。以下のパターンを検査:
     - 日本語: 「ここからアプリを作り始めましょう」
     - 英語: `Edit app/(tabs)/index.tsx to edit` / `This is the first screen` / `Welcome to React Native`
     - プレースホルダー: `Lorem ipsum`
  2. **Home 画面のような「機能横断画面」は ADR を起票する**。各機能 ADR に頼らず、画面の役割を独立して定義 (ADR-0019 が好例)。
  3. **`design_system.md` §12 アンチパターンも CI で検査**する (将来 `theme:check` に統合検討)。

---

### `design_system.md` を Source of Truth として ADR と矛盾しない範囲で Design を採用する

- **何が起きたか**: Claude Design の `tokens.css` は `design_system.md` と完全一致 (washi `#F7F3E8` / Noto Serif JP 等) しており、トークン部分は採用 OK。しかしタブ構成・オンボ画面数は ADR と矛盾していた。
- **ルール**:
  1. Design 採用判定は **粒度別** に行う:
     - **トークン (色 / フォント / 余白 / 角丸)**: design_system.md と一致なら採用
     - **アイコン (SVG ストローク等)**: design_system.md §5 アンチパターンと整合なら採用
     - **コピーライティング**: ADR-0011 哲学整合 + 命令文「○○しましょう」回避なら採用
     - **画面構成 (タブ / オンボ画面数 / 情報アーキテクチャ)**: 既存 ADR と矛盾するなら **ADR が正** (R-16)
  2. 採用判定の表を ADR の `## Notes` に明記し、将来の改修時に「なぜこう決めたか」を辿れるようにする (ADR-0019 §Notes 「Claude Design 部分採用の R-16 整合確認」が好例)。
