# 1 画面 UI 整合タスク用 — 次セッション prompt 雛形

> user が次セッションの Claude に渡す指示文の雛形。 短く、 手順書 path を明示すれば自動的に 8 step ループで進められる。

---

## 雛形 (コピペ用、 詳細版)

```
[画面 id 例: bonsai-tab] の mockup 整合性確認をお願いします。

手順: `docs/how-to/ui-diff/screen-integration-loop.md` の 8 step ループで進めてください。

進め方:
- Step 1 R-13 予告 (質問数 + ラウンド数) を冒頭で
- Step 2 mockup PNG + 実機 SS + 実機実装ファイル + 関連 ADR を Read で比較レポート
- Step 3 修正候補 + 4 ペルソナ評価 + 推薦付き質問 (R-11)
- Step 4 私の承認 → 修正実行 (関連画面/機能の波及も自動判定)
- Step 5 撮影 (single page = capture-with-logs.sh、 multi-page = multipage-capture-pattern.md 参照)
- Step 6 R-25 構造系 4 項目 で再評価 + skip-list 更新
- Step 7 pairing-report 再生成 + Claude self-verification (base64 chunk grep)
- Step 8 私の確認 → commit + PR (R-29 §7.5 + R-25 §7.6 + W-10.5 全 fill) + CI 緑 + squash merge

私の確認は 3 回以内に収めて (Step 3 質問 + Step 8 目視 + 必要なら 1 件)。
```

---

## 短縮版 (慣れた user 用)

```
[画面 id] を進めてください、 `docs/how-to/ui-diff/screen-integration-loop.md` の手順で。
```

---

## 補助プロンプト (特定状況用)

### 関連画面修正も含めたい

```
... 関連画面 (例: settings の言語切替) に同じ修正が波及するか自動判定して、 必要なら一緒に修正してください。
```

### multi-page 撮影を予想する画面

```
... mockup が multi-page (`<id>-01.png`, `-02.png` ...) なので、 `docs/how-to/ui-diff/multipage-capture-pattern.md` の swipe 値テーブルで撮影 + ImageMagick 連結してください。
```

### 既 achieved の再評価のみ

```
[画面 id] は既 achieved lv2 ですが、 mockup 整合性を再確認したいです。 修正必要性判定後に進めるかどうか私に確認してください。
```

---

## 留意

- Claude session 起動時、 hook (`.claude/hooks/session-start-design-reminder.mjs`) が手順書 path を自動リマインドする
- 短縮版で OK だが、 慣れない user は詳細版で「進め方」 を明示すると安心
- 修正候補が 5 件超えそうなら Claude 側で「scope 縮小」 提案するので、 user 側で削減指示も OK

---

## 関連

- `docs/how-to/ui-diff/screen-integration-loop.md` (8 step ループ本体)
- `docs/how-to/ui-diff/multipage-capture-pattern.md` (multi-page 撮影専用)
- `docs/reference/tasks/lessons/auto-improve-loop.md` (過去学び集約)
