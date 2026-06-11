# v1.0 UI モックアップ採用版 (凍結保管)

OpenDesign (`~/04_app-factory/open-design`) で生成した UI モックアップのうち、v1.0 リリース時点で採用版として確定したものを保管する。

## ディレクトリ構造

```
docs/mockups/v1.0/
├── README.md                        ← 本ファイル
├── BonsaiLog-Flow.html              ← 画面遷移フロー図
├── wireframes-analysis.html         ← Wireframes 分析資料
├── wireframes/                      ← 画面 wireframe + jsx + tokens
│   ├── 0X-*.html                    (画面 HTML、複数 UI 画面入り)
│   ├── *.jsx                        (画面別ソースコード 9 ファイル)
│   └── tokens.css                   (色・フォント等トークン)
└── docs/                            ← 設計ドキュメント
    ├── display-schema.md
    └── principles.md
```

## 運用ルール

1. OpenDesign で生成 → ユーザー判定 → 採用なら本ディレクトリにコピー
2. **元の構造をそのまま保持** (`wireframes/` `docs/` 等を維持)。画面ごと 1 ファイル運用 (`<screen>/index.html` パターン、ADR-0021 規定) は事実上使わない (1 HTML に複数 UI 画面が入るため)
3. 凍結保管 = 直接編集禁止、変更時は新規ディレクトリ (`v1.1/` / `v2.0/` 等) を別途作成
4. 履歴は git log で追跡 (本 README 内に履歴は書かない)
5. `app.sqlite` (OpenDesign チャット履歴 DB、git 管理外のローカル限定) は 2026-06-12 に user 判断で削除済み

## 関連

- ADR-0020 (Claude Design 全面採用、UI 整合点)
- ADR-0059 (mockup→UI 反映の標準 = 写経駆動 + 実機 SS 目視。旧 ADR-0021 ui-diff pipeline は Superseded)
- R-16 (領域別 Source of Truth)
- R-28 (UI 表現 vs ビジネス仕様 境界判定フロー)
