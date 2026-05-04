# BonsaiLog - Design System Definition (DESIGN.md)

> このドキュメントは Claude Design / Claude Code 双方が参照する
> デザインシステムの「正（Source of Truth）」です。
> 色・書体・余白の具体的な値をここで固定します。

## 1. ブランド原則（戦略書§5より）

- P1. 鉢の前で、ひと手入れ: 屋外・片手・手袋、48dp+タップ領域
- P2. 診断しない、記録する: 「目安」「参考」「テンプレート」のみ
- P3. 永く、変わらない: 流行色・過度アニメ禁止、深緑・樹皮・和紙
- P4. 控えめで美しく: 可愛さ5%、余白の美、情報密度低め
- P5. 屋外で読める: WCAG AA 必須、AAA 目標、ダークモード+屋外モード

## 2. カラートークン

### 2-1. ライトモード（デフォルト）

| Token              | HEX       | 用途                          |
| ------------------ | --------- | ----------------------------- |
| `--bg-primary`     | `#F7F3E8` | 背景（washi 和紙色）          |
| `--bg-surface`     | `#FFFFFF` | カード背景                    |
| `--text-primary`   | `#1A1A1A` | 本文（sumi 墨色）             |
| `--text-secondary` | `#5A5248` | 補助テキスト                  |
| `--text-muted`     | `#8A8274` | 3次テキスト                   |
| `--primary`        | `#1F3A2E` | プライマリ（深緑 fukamidori） |
| `--primary-hover`  | `#2A4C3D` | 押下時                        |
| `--accent-bark`    | `#5A4637` | 樹皮色（タグ・区切り）        |
| `--accent-gold`    | `#C69E48` | 秋葉色（Pro バッジのみ）      |
| `--danger`         | `#8B2E2E` | 危険                          |
| `--success`        | `#3E5C39` | 成功                          |
| `--border`         | `#D9D1BF` | 境界線                        |
| `--border-strong`  | `#8A8274` | 強調境界線                    |

### 2-2. ダークモード（OLED焼き付き配慮）

| Token              | HEX       | 用途                   |
| ------------------ | --------- | ---------------------- |
| `--bg-primary`     | `#0A0E1A` | 背景                   |
| `--bg-surface`     | `#131826` | カード背景             |
| `--text-primary`   | `#E8E4D6` | 本文（淡washi）        |
| `--text-secondary` | `#B0A897` | 補助                   |
| `--text-muted`     | `#7A7265` | 3次                    |
| `--primary`        | `#6B9B7F` | プライマリ（夜目の緑） |
| `--primary-hover`  | `#7FB095` | 押下                   |
| `--accent-bark`    | `#8C7561` | 樹皮色                 |
| `--accent-gold`    | `#D4B062` | 秋葉                   |
| `--danger`         | `#C9575D` | 危険                   |
| `--success`        | `#7DAE7A` | 成功                   |
| `--border`         | `#2A2F3E` | 境界線                 |

### 2-3. 屋外モード（直射日光下、WCAG AAA 7:1目標）

| Token            | HEX       | 用途       |
| ---------------- | --------- | ---------- |
| `--bg-primary`   | `#FFFFFF` | 背景       |
| `--text-primary` | `#000000` | 本文       |
| `--primary`      | `#000080` | プライマリ |
| `--border`       | `#000000` | 境界線     |

## 3. タイポグラフィ

### 3-1. フォントスタック

- Display（見出し）Japanese: `'Noto Serif JP', 'Hiragino Mincho ProN', serif` (weight 500)
- Display Latin: `'Source Serif 4', Georgia, serif` (weight 500)
- Body Japanese: `'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif` (weight 400)
- Body Latin: `'Inter', -apple-system, sans-serif` (weight 400)
- Monospace: `'IBM Plex Mono', 'SF Mono', monospace`

### 3-2. 使わないフォント（絶対禁止）

❌ Fraunces / Playfair Display / Georgia / Roboto / Arial /
DM Sans / Space Grotesk / system-ui（iOS/Androidデフォルト）

### 3-3. サイズスケール

| Name      | Size | LineHeight | 用途                       |
| --------- | ---- | ---------- | -------------------------- |
| displayXL | 48pt | 58pt (1.2) | 盆栽名のトップ表示         |
| displayL  | 32pt | 38pt (1.2) | 画面タイトル               |
| displayM  | 24pt | 29pt (1.2) | セクション見出し           |
| headingL  | 20pt | 30pt (1.5) | サブ見出し                 |
| headingM  | 18pt | 27pt (1.5) | 小見出し                   |
| bodyL     | 16pt | 26pt (1.6) | 本文デフォルト             |
| bodyM     | 14pt | 22pt (1.6) | セカンダリ本文             |
| caption   | 13pt | 19pt (1.5) | キャプション               |
| micro     | 11pt | 16pt (1.5) | 広告ラベル等、これ以下禁止 |

## 4. 余白スケール（spacing）

基準: 8px baseline。4・8・12・16・24・32・48 のみ使用。他の値禁止。

## 5. 角丸（Border Radius）

- 0: 写真枠のみ（額縁感）
- 8: 小ボタン・タグ
- 12: 中ボタン・入力欄
- 16: カード

**❌ 9999 (pill) 禁止**（モダンすぎて戦略P3と衝突）

## 6. シャドウ・Elevation

**原則: 影は使わない**。分離は `--border` で表現。例外:

- モーダル / シート: 極薄の上向きシャドウ（0 -2 8 rgba(0,0,0,0.04)）のみ

## 7. アクセシビリティ必須条件

| 項目                     | 値                               |
| ------------------------ | -------------------------------- |
| タップ領域 最小          | 48×48 dp                         |
| プライマリCTA タップ領域 | 56 dp                            |
| 本文 最小フォント        | 16pt                             |
| シニア向けキー画面       | 18pt                             |
| コントラスト比（本文）   | WCAG AA 4.5:1 必須、AAA 7:1 目標 |
| コントラスト比（UI要素） | 3:1                              |
| 色のみで情報伝達         | 禁止（アイコン・テキスト併用）   |
| reduced motion 対応      | 必須（400ms → 0ms）              |

## 8. モーション・アニメーション

- 画面プッシュ: 250ms ease-out
- モーダル fade-in: 200ms
- スナックバー slide-up: 300ms
- タップフィードバック: opacity 0.7, 100ms

❌ spring/bounce 禁止
❌ 500ms超のアニメ禁止
❌ ページロード時のstagger reveal禁止

## 9. DNT（Do Not Translate）リスト

以下は全言語で日本語音訳のまま。翻訳厳禁:

**盆栽用語**:
bonsai, niwaki, karikomi, nebari, jin, shari, kokedama,
yamadori, mame, shohin, akadama, kusamono, sabamiki, bunjin, ishizuki

**樹形スタイル**:
Chokkan, Moyogi, Shakan, Kengai, Han-Kengai,
Bunjin-gi, Sokan, Kabudachi, Yose-ue

**学名**:
Pinus thunbergii, Juniperus chinensis, Ficus retusa 等、
すべてラテン語のまま全言語共通。

## 10. UI 用語の許可・禁止リスト

### 許可語（使ってよい）

記録 / 履歴 / 整理 / 参考 / 目安 / テンプレート / 台帳
log / journal / record

### 禁止語（UIに出さない、ストア禁止カテゴリ抵触）

診断 / 判定 / 推奨 / べき / 危険 / 病気 / 治療
reminder（medical context） / tracker（health context） / alert（medical）

## 11. 対象デバイス

- **iOS 基準**: iPhone 15 Pro (393×852 pt)
  - SafeArea top: 59pt (Dynamic Island)
  - SafeArea bottom: 34pt (Home Indicator)
- **Android 確認**: Pixel 7 (412×915)
  - Status bar: 24pt
  - Navigation bar: 48pt or gesture
- **最小幅**: iPhone SE 第1世代 320pt（レイアウト崩れなし必須）
- **最大幅**: iPhone Pro Max 430pt

## 12. アンチパターン（絶対にやらないこと）

1. ❌ 紫グラデーション背景
2. ❌ White background + terracotta accent + italic（Claude デフォルト）
3. ❌ Pill形状のボタン（radius 9999）
4. ❌ 12pt未満の本文テキスト
5. ❌ 48dp未満のタップ領域
6. ❌ 色のみで意味を伝達（赤=危険のみ、アイコン/文字なし）
7. ❌ spring animation（ふわふわ）
8. ❌ アプリ内 SNS シェア直接投稿ボタン
9. ❌ 「診断」「推奨」「病気」等の禁止語
10. ❌ 樹種名の意訳（黒松 → "black pine" は許可、学名は維持）

---

_このドキュメントは `src/core/theme/colors.ts` として TypeScript 定数にも反映される。_
_変更時は ADR `docs/adr/YYYY-MM-DD-design-tokens.md` を作成。_
