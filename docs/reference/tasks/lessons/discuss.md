# Lessons: 議論プロセス (R-13 / R-34 / R-35 周辺)

> 索引: [`README.md`](./README.md)
> 関連 ルール: `.claude/recurrence-prevention.md` R-7〜R-13、 R-34、 R-35

---

### R-34: 議論承認の整合性確認 (同類カテゴリ複数項目) — Sess9 PR-2 revert ロス由来

- **ルール**: `AskUserQuestion` で同類カテゴリ (例: 「Home 要素」 D2「すべて」 chip + D3 「+ 追加」 button) を 1 質問に詰め込まない。 個別質問に分離 OR 推薦案明示後に各項目について逐次確認。
- **根本原因 (実例)**:
  - Sess9 議論で Q1 「Sess9 で着手する範囲」 → 「段階 1-5 完全パッケージ」 と user 回答 = D2 + D3 含む暗黙承認
  - Q4 「Home の「+ 追加」 inline button 配置」 → 「Home に置かない」 と user 回答 = D3 のみと Claude が機械的解釈
  - 実は user は D2 (「すべて」 chip も Home 要素) も「Home に置かない」 と意図していた
  - 結果: PR-2 で「すべて」 chip 実装 → 後で user 指摘「すべて タグは要らないで話ついていたとおもう」 → revert PR #555 で取り消し、 30 分ロス
- **対処方法**:
  1. 同類カテゴリ (Home 要素 / Settings 要素 / Modal 要素 等) の複数項目は **必ず個別質問** で承認取得
  2. 段階リスト形式の承認質問 (Q1 段階 1-N 完全パッケージ) は「個別段階の独立承認」 を明示 (例: 段階 2 だけ skip 可、 等)
  3. Q1 と Q4 のような **整合性確認質問** を別途追加 (例: 「上記 Q1 で承認した段階 N は、 Q4 の方針と矛盾しませんか?」)
- **検出方法**:
  - 議論 Round 4 (推薦案 + 質問提示) 直前に「Q 同士の整合性 walkthrough」 step 追加
  - 過去 Q の回答を逐次再掲して矛盾チェック

---

### R-35: 議論時 alternative 必須提示 + 業界事例「現状最適解」 明示 — Sess9 PR-9 → PR-10 ロス由来

- **ルール**: 議論 Round で初期案 1 つだけでなく **alternative 2-3 案を必ず併記**。 業界事例リサーチで「最新トレンド = 現状最適解」 を明示し、 古いパターン (Apple Notes long-press 等) を「業界 outdated」 と判定。
- **根本原因 (実例)**:
  - Sess9 議論 Q3 「タグ row 拡張機能」 で「Apple Notes パターン (長押し)」 のみ提示
  - user は他 alternative なしで承認 (selection bias)
  - PR-9 実装後 user 指摘「長押しじゃなくて、 トグルマークで表現しない?」 → visible toggle (Notion / VS Code 標準) が user 真意
  - PR-10 で完全 supersede、 60 分ロス + tag-bonsai-list 全画面削除
- **対処方法**:
  1. 議論 Round 2 (専門家議論) で必ず **alternative 2-3 案** を併記 (例: long-press / chevron / toggle / action menu の 4 案)
  2. 業界事例リサーチで「現状最適解」 + 「古いパターン (outdated)」 を明示
  3. 「最初に思いついた pattern」 で議論を閉じない、 「2-3 案からの選択肢提供」 を strict に
- **検出方法**:
  - 議論 Round 4 質問提示時に「alternative 案 N 件提示済?」 self-check
  - 業界事例 column に「業界トレンド (2025-2026)」 と「outdated 判定」 を必ず明記

---

### 議論プロセス全般の Keep / Try

#### Keep (引き続き徹底)

- R-13 議論冒頭の「N 件質問 + M ラウンド」 予告 → user 認知負荷低減で◎
- R-7 議論深さ 3 ラウンド以上
- R-8 フラット視点専門家 1 名以上
- R-10 4 ペルソナ評価 ◎○△× マトリクス
- R-11 質問は判断材料 + 推薦セット
- 業界事例リサーチで複数 app pattern 調査 (Apple Notes / Things / Notion / Linear / Bear etc)

#### Try (次セッション以降で試す)

- **R-34 個別質問パターンの徹底**: 同類項目は 1 質問に詰めず分離
- **R-35 alternative 必須**: 議論 Round 2 で 2-3 案併記、 「現状最適解」 明示
- 議論 Round 4 質問提示前の **整合性 walkthrough** step 追加
