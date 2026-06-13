# Notion Phase 8 改修 — バックアップ + 経緯記録

## 目的

2026-06-14 に Notion ページ「Phase 8: 課金設定 (RevenueCat)」 を大幅圧縮した際の元データバックアップ + 改修経緯。 万一「元に戻したい」 場合の参照資料。

## 改修内容

- **元 Notion ページ ID**: `34b0ee330ea0813ea82eea0ee2e667b0`
- **元 URL**: https://app.notion.com/p/Phase-8-RevenueCat-34b0ee330ea0813ea82eea0ee2e667b0
- **改修前**: Phase 0 〜 Phase 10 全部 1 ページに混在 (🤖 + 👤)
- **改修後**: Phase 8 (= 課金関係) の人間作業 4 ステップに純化、 Phase 0/2/9/10 は別ページに切り出し、 Claude 自動工程は `docs/how-to/release/billing-setup-automation.md` (新規) に分離

## 3 つの SoT 棲み分け (改修後)

| 場所                                                           | 役割                                     | 主たる読者                  |
| -------------------------------------------------------------- | ---------------------------------------- | --------------------------- |
| Notion 「Phase 8 課金設定」 純化版                             | アプリ別 4 ステップ (能動)               | 人間 (= プロダクトオーナー) |
| `docs/how-to/release/iap-setup-checklist.md` (既存、 触らない) | トラブル時 12 ステップ + Q&A 6 つ (受動) | 人間 (= 修復作業時)         |
| `docs/how-to/release/billing-setup-automation.md` (新規)       | Phase 1/3/5/7/8 自動実行 (機械)          | Claude Code                 |

## 関連

- ADR-0043 (Store Product API Automation) + 本改修の Amendment
- iap-setup-checklist.md (Sess81 起源、 Phase 8 改修では touch しない)
- Sess81 territory 罠 + Sess82 PR-D 構造解決 を 3 SoT に分散反映
