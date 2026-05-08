# v1.0 UI モックアップ採用版 (凍結保管)

OpenDesign (`~/04_app-factory/open-design`) で生成した HTML モックアップのうち、v1.0 リリース時点で採用版として確定したものを画面ごとに保管する。

## 運用ルール

1. OpenDesign で生成 → ユーザー判定 → 採用なら本ディレクトリにコピー
2. パス: `docs/mockups/v1.0/<screen-id>/index.html` (画面 ID は ADR-0020 §Notes §画面マップに準拠)
3. 凍結保管 = 直接編集禁止、変更時は新規ディレクトリ (`v1.1/` / `v2.0/` 等) を別途作成
4. 履歴は git log で追跡 (本 README 内に履歴は書かない)

## 関連

- ADR-0020 (Claude Design 全面採用、UI 整合点)
- ADR-0021 (UI 差分検出パイプライン、本ディレクトリを比較対象として参照)
- R-16 (領域別 Source of Truth)
- R-28 (UI 表現 vs ビジネス仕様 境界判定フロー)
