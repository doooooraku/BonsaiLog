# Maestro 標準パターン (Phase G 以降)

> ADR-0024 で確定、Phase G0 PoC PR で導入。
> Maestro 公式 Issue #1703 (animation 中 tap flaky) が "not planned" で close されたため、自前で「待ち + retry」 を全 step に標準化する。

---

## 1. 全 tap step に `retryTapIfNoChange: true`

`tapOn` 直後に画面が変わらない場合、Maestro が自動で再試行する。ghost tap (animation 中の tap が登録されない問題) を構造的に防ぐ。

```yaml
# ✅ 推奨
- tapOn:
    id: 'e2e_bonsai_fab'
    retryTapIfNoChange: true

# ❌ 非推奨 (flaky リスク)
- tapOn:
    id: 'e2e_bonsai_fab'
```

---

## 2. 全 tap 後に `waitForAnimationToEnd`

画面遷移 / Sheet 開閉のアニメーションが完了するまで待つ。タイムアウト 5s で十分。

```yaml
- tapOn:
    id: 'e2e_bonsai_fab'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000
```

---

## 3. testID 厳格付与: `e2e_<screen>_<element>` スネークケース

既存規約 (PR #392 ADR-0021 で確立) を Phase G 以降も踏襲。

### 命名規約

| パターン                    | 例                                           |
| --------------------------- | -------------------------------------------- |
| `e2e_<screen>_screen`       | `e2e_species_picker_screen` (画面ルート要素) |
| `e2e_<screen>_<element>`    | `e2e_species_option_kuromatsu` (個別要素)    |
| `e2e_<screen>_cta`          | `e2e_paywall_cta_subscribe` (CTA ボタン)     |
| `e2e_<screen>_<form_field>` | `e2e_bonsai_form_name` (フォームフィールド)  |

### 必須付与箇所

- 新規 screen のルート要素 (`<View testID="e2e_xxx_screen">`)
- 主要ボタン / CTA / TextInput / Toggle
- リストアイテム (動的 index で表現、例: `e2e_bonsai_list_item_<id>`)

---

## 4. `assertVisible` で animation 終了確認 (推奨パターン)

`waitForAnimationToEnd` 後に重要な要素の表示を assert することで、確実な動作検証。

```yaml
- tapOn:
    id: 'e2e_bonsai_fab'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000
- assertVisible:
    id: 'e2e_species_picker_screen'
```

---

## 5. テキストではなく testID で要素を特定

Maestro は accessibility tree を使うため、modal / formSheet 内のテキスト要素は **hidden** になる場合がある。

```yaml
# ❌ flaky (modal/sheet 内テキストが見えない)
- tapOn:
    text: '黒松'

# ✅ 推奨
- tapOn:
    id: 'e2e_species_option_kuromatsu'
    retryTapIfNoChange: true
```

---

## 6. 完全パターン例 (Phase G0 PoC formSheet 案)

```yaml
appId: app.bonsailog
---
- launchApp

- tapOn:
    id: 'e2e_bonsai_fab'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000

- assertVisible:
    id: 'e2e_bonsai_form_screen'

- tapOn:
    id: 'e2e_bonsai_form_species_row'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000

- assertVisible:
    id: 'e2e_species_picker_screen'

- tapOn:
    id: 'e2e_species_option_kuromatsu'
    retryTapIfNoChange: true
- waitForAnimationToEnd:
    timeout: 5000

- assertVisible:
    id: 'e2e_bonsai_form_species_value'
    text: '黒松'
```

---

## 7. 禁止パターン (flaky 原因)

| パターン                                                    | 理由                                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tapOn: { text: "..." }` (modal/sheet 内)                   | accessibility tree で hidden、Maestro 検出不能                                                                                                              |
| `wait: 1000` (固定 wait)                                    | アニメーション可変時間に対応不可、本質的解決にならず                                                                                                        |
| `retryTapIfNoChange: false` (デフォルト)                    | ghost tap で 1 回失敗、再試行なし                                                                                                                           |
| testID なし要素を text で tap                               | i18n 変更で flow が壊れる、accessibility tree 不確定                                                                                                        |
| `pressKey: 'Back'` (modal 内)                               | Android で keyboard 未起動時に **modal を閉じる**、`hideKeyboard` も同様。代わりに `scrollUntilVisible` で keyboard を間接 dismiss (Phase G4 part 2 で実証) |
| `extendedWaitUntil { visible: id }` のみ で画面下要素を待つ | 画面外要素は visible 判定にならない (Maestro 仕様)、`scrollUntilVisible (visibilityPercentage: 30-50)` で確実化 (Phase G2/G4 で実証)                        |

## 7.1. 画面外要素 / キーボード隠れ問題への対処 (Phase G2/G4 教訓、ADR-0024)

### 症状

- 設定タブの seed button のように **画面下 safe area で 100% visible にならない**
- modal/Screen で TextInput が auto focus、**キーボードが画面下 submit を隠す**

### 対処パターン (実証済、3/3 PASS 達成)

```yaml
# 画面下要素を確実に visible に持ってくる
- scrollUntilVisible:
    element:
      id: 'e2e_<screen>_<element>'
    direction: DOWN
    timeout: 15000
    visibilityPercentage: 30 # or 50、100% は厳格すぎる
```

### 試行錯誤履歴 (失敗パターン、これらは使わない)

- ❌ `pressKey: 'Back'` で keyboard dismiss → keyboard 未起動時に **modal close**
- ❌ `hideKeyboard` Action → Android で `pressKey Back` 相当、同じく **modal close**
- ❌ `extendedWaitUntil { visible: id }` 単独 → 画面下要素は永久 timeout
- ✅ `scrollUntilVisible (visibilityPercentage: 30)` → keyboard が同時に dismiss + element 内側へ

---

## 8. Phase G0 PoC で計測する KPI

| KPI            | 計測方法                                   | 合格基準           |
| -------------- | ------------------------------------------ | ------------------ |
| 成功率         | 5 回反復実行で何回成功するか               | 5/5 = 100%         |
| 平均所要時間   | flow start から end までの ms              | 参考値 (UX 評価用) |
| ghost tap 回数 | `retryTapIfNoChange` 発火回数 (log で確認) | 0 が理想           |

---

## 9. Phase G 完了後の lint ルール起票候補

Phase G 完了後に以下の自動化を起票:

1. **Maestro flow lint**: `maestro/flows/**.yml` で `waitForAnimationToEnd` 不在検出 → CI warn (Phase G+1 で error 化)
2. **testID ESLint rule**: 新規 screen component に `testID` prop 不在検出 → CI fail
3. **R-30 hook**: PR タイトルに `@gorhom`/`detox`/`maestro` + `remove`/`replace` を含む場合、ADR 先行原則 + PoC 5/5 結果リンクを必須化

---

## 10. 関連

- ADR-0024 (Phase G、本パターン確定)
- ADR-0021 (ui-diff pipeline、testID 規約 確立元)
- Maestro 公式 docs: <https://docs.maestro.dev/api-reference/commands/waitforanimationtoend>
- Maestro Issue #1703 (animation flaky、"not planned" で close): <https://github.com/mobile-dev-inc/Maestro/issues/1703>
- gorhom Issue #1753 (BottomSheet v4.6.0 Maestro バグ): <https://github.com/gorhom/react-native-bottom-sheet/issues/1753>
