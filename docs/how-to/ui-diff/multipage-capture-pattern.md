# Multi-page 撮影パターン (scrollable mockup 用)

> **対象**: mockup 画像が `-01.png`, `-02.png` の複数ページに渡る画面 (例: `onboarding-language` の 19 言語リスト)。
> **環境**: Android 720x1520 (SX3LHMA362304722) 専用、 他端末は別 Issue。
> **親 doc**: `docs/how-to/ui-diff/screen-integration-loop.md` Step 5 (Maestro 再撮影)

---

## なぜ必要?

mockup multi-page を実機で表現する選択肢:

| 案       | 内容                                    | 評価                                      |
| -------- | --------------------------------------- | ----------------------------------------- |
| a        | 実機も multi-page (-01, -02) で並列表示 | △ mockup と実機のアスペクト比違いで比較難 |
| **b ⭐** | **実機を 1 枚連結で全コンテンツ可視化** | **◎ Sess5 PR-1 で確立、 user 推奨**       |
| c        | スクリーンレコーディング (動画)         | △ load 重 + 連続スクロール検証 不向き     |

→ **案 b 採用**。 mockup の multi-page mockup-01/-02 と並列で、 実機は 1 枚連結で表示し全コンテンツを可視化。

---

## 標準フロー (案 b)

### Step 1: Maestro flow で対象画面到達

```bash
# Dev Build + Metro 起動済の前提 (`pnpm dev` background)
bash scripts/dev/reload-app.sh
/home/doooo/.maestro/bin/maestro test maestro/flows/ui-diff/<flow-id>.yml
```

### Step 2: 複数 page 撮影 (4 回程度)

```bash
OUT_DIR=scripts/ui-diff/out/$(date +%Y%m%d-%H%M)/<flow-id>
mkdir -p $OUT_DIR/app
for i in 1 2 3 4; do
  adb shell screencap -p /sdcard/_p$i.png
  adb pull /sdcard/_p$i.png $OUT_DIR/app/<flow-id>-0$i.png
  [ $i -lt 4 ] && adb shell input swipe 360 1280 360 820 800 && sleep 1.5
done
```

### swipe 値テーブル (720x1520)

| 用途                      | swipe 距離         | duration | 行数 scroll | 適用例                                        |
| ------------------------- | ------------------ | -------- | ----------- | --------------------------------------------- |
| 4 行 scroll (推奨)        | `360 1280 360 820` | 800ms    | 約 4 行     | onboarding-language (multi-page、 重複行最小) |
| 5 行 scroll               | `360 1280 360 700` | 800ms    | 約 5 行     | 汎用、 適度な scroll                          |
| 6 行 scroll (1 page 相当) | `360 1280 360 380` | 1000ms   | 約 6 行     | 大きな scroll、 末尾近くで clamp 注意         |

### Step 3: ImageMagick で連結 (Header crop + 重複行 crop)

```bash
convert \
  \( $OUT_DIR/app/<flow-id>-01.png -crop 720x1280+0+0 \) \
  \( $OUT_DIR/app/<flow-id>-02.png -crop 720x830+0+515 \) \
  \( $OUT_DIR/app/<flow-id>-03.png -crop 720x830+0+515 \) \
  \( $OUT_DIR/app/<flow-id>-04.png -crop 720x680+0+860 \) \
  -append \
  $OUT_DIR/app/<flow-id>.png

# 中間ファイル削除
rm $OUT_DIR/app/<flow-id>-0[1-4].png
```

### crop 値の決め方 (720x1520 基準)

| crop 部分              | 値              | 説明                                                             |
| ---------------------- | --------------- | ---------------------------------------------------------------- |
| Header カット          | `720x???+0+350` | Header (status bar + Back + Title + Subtitle) 約 350 px をカット |
| CTA カット             | `720x1280+0+0`  | CTA 上端は約 1380-1400 px、 1280 で安全 cut                      |
| 4 行表示 (中段)        | `720x830+0+515` | 各 page で約 4 行を保持、 Header カット                          |
| 末尾 + CTA + indicator | `720x680+0+860` | 末尾 3-4 行 + CTA + home indicator                               |

### Step 4: 連結結果の Read 確認 (Claude self-verify)

```bash
identify $OUT_DIR/app/<flow-id>.png  # サイズ確認 (例: 720x3580)
```

Claude が Read で開いて以下チェック:

- ☐ Header 1 回のみ
- ☐ 全コンテンツ (全 row) 表示
- ☐ CTA 1 回のみ末尾に
- ☐ 重複行最小限 (許容: 0-1 行)
- ☐ 不自然なカット (見切れ等) なし

---

## 注意点

1. **ScrollView 末尾近くで swipe が clamp**: page N と page N+1 で重複大 → 1-2 page 余分に撮影して連結時に crop で除く
2. **1 行高さは画面の DPR + 行 padding で変動**: 165 px (=120 padding + 12 gap) を base 値として swipe 距離計算
3. **連結後画像 ≧ 3000 px**: pairing-report 画像読込で重くなる、 但し user 体験 (全コンテンツ可視化) 優先
4. **CSS max-height 注意**: pairing-report の `generate-pairing-report.mjs` line ~329 で `max-height: 600px` 撤廃済 (Sess5 PR-1)、 縦長画像が 120px に圧縮される bug は修正済

---

## 将来汎用化 (Sess6+ 候補)

- `scripts/ui-diff/capture-multipage.sh` で本パターンを 1 コマンド化
- `mockup-screenshots-config.ts` の `mode: 'scrollable'` 連携で swipe 値 + crop パラメータを config 化
- 別端末 (1080x2400 等) サポートを `resolution` config 追加

---

## 関連

- `docs/how-to/ui-diff/screen-integration-loop.md` (本 doc の親 / 8 step ループ全体)
- `scripts/ui-diff/capture-with-logs.sh` (single page 撮影、 logcat 自動キャプチャ)
- `scripts/ui-diff/generate-pairing-report.mjs` (pairing-report v2、 reevalArtifact 優先 + app/ subdir 探索、 Sess5 PR-1 修正済)
