# G0 PoC 検証結果 (ADR-0024 / Issue #475 Phase G0)

> **2026-05-12 暫定 formSheet 採用** (ユーザー指示「Phase G1 着手」)。
> 実機 5 回 × 3 案検証 (15 回) は **スキップ**、R-30 (PoC 必須化) リスク受容で進行。
> 実機検証は Phase G1 完了後 or G2-G4 内で順次実施、不合格判明時は revert + plan B (Expo UI BottomSheet) へ切替。

## 判定 (2026-05-12 暫定確定)

- **採用案**: Z (formSheet + `sheetAllowedDetents: [0.5, 1]` + `contentStyle: { height: '100%' }`)
- **理由**:
  - `docs/reference/functional_spec.md` §6.2 / §7.2 / §22 既存設計 (formSheet presentation) に整合
  - シニア UX (Apple Health 風 sheet) を維持
  - iOS native Sheet + Android Modal 互換
  - 4 ペルソナ評価で全員 ◎/○ (事前評価、実機未検証)
- **Phase G1 標準実装パターンとして暫定確定**
- **ADR-0024 Status**: Proposed → **Provisionally Accepted** (Phase G1 完了 + 実機 5/5 検証後に Accepted へ)

## Phase G1 で勝者案を main 採用

- `app/(modals)/species-picker.tsx` (formSheet、Z 案 rename)
- `app/(modals)/style-picker.tsx` (formSheet、新規)
- `src/features/bonsai/SpeciesPickerScreen.tsx` (mock data → 実 DB `getAllSpecies` 統合)
- `src/features/bonsai/StylePickerScreen.tsx` (新規、StylePickerSheet 画面化)
- `src/stores/pickerStore.ts` (species + style 両対応)
- BonsaiBasicForm caller を `router.push` に書き換え
- 旧 SpeciesPickerSheet.tsx / StylePickerSheet.tsx 削除
- 敗者案ファイル (X push / Y modal) 削除

## 検証手順 (Phase G1 完了後にユーザー実機実行)

```bash
# 1. Metro 起動 (別ターミナル)
pnpm dev

# 2. APK ビルド + 実機反映
pnpm build:android:apk:local
scripts/dev/reload-app.sh

# 3. Maestro 5 回反復 (本実装 species-picker / style-picker)
# (Phase G1 で新規 Maestro flow を作成予定、本 results.md update 対象)
```

## 結果記録 (実機実行後にユーザーが記入、後続セッション)

| flow                       | 成功率 (X/5) | 平均所要時間 | 採否 | 備考 |
| -------------------------- | ------------ | ------------ | ---- | ---- |
| species-picker (formSheet) | ?/5          | ?ms          | ?    |      |
| style-picker (formSheet)   | ?/5          | ?ms          | ?    |      |

## 合格基準 (ADR-0024)

- **5/5 = 100% 厳格**
- 4/5 以下は revert + plan B (Expo UI BottomSheet) 検討
- plan B も不合格なら ADR-0025 起票で Detox or Maestro Cloud 移行

## 4 ペルソナ確認 (暫定採用時点の事前評価)

| 評価軸                    | みどり 65              | 茂 45 | 高橋プロ 62 | Linda 22 |
| ------------------------- | ---------------------- | ----- | ----------- | -------- |
| formSheet 表示の確実性    | ○ (実機未検証だが期待) | ○     | ○           | ○        |
| 操作速度 (1 タップで結果) | ◎ (sheet 風維持)       | ◎     | ◎           | ◎        |
| 視覚的な分かりやすさ      | ◎ (大字 detent)        | ◎     | ◎           | ◎        |
| シニア UX 維持            | ◎ (Apple Health 風)    | ◎     | ◎           | ◎        |

→ 実機未検証時点では事前評価のみ、実機検証で確定。

## R-25 / R-30 リスク明示

- **R-25**: 機械判定のみで「達成」 判定禁止 → 本 PR は **暫定採用、Claude Read + 議論評価のみ**で実機未検証
- **R-30**: 外部 lib テスト stability 変更時 PoC 必須化 → 本 PR は **PoC スキップ、ユーザー明示承認下でリスク受容**
- Phase G1 完了後の実機検証で 5/5 未達なら revert + plan B 切替を実施する義務あり

## 関連

- ADR-0024 (Provisionally Accepted): `docs/adr/ADR-0024-bottom-sheet-removal-and-native-presentation.md`
- Issue #475 (Phase G、本 PoC で G1-G5 標準実装パターン暫定確定)
- Maestro 標準パターン: `docs/how-to/maestro-standard-pattern.md`
- PR #478 (close 済) / PR #479 (G0 PoC 14 ファイル merge 済、afd5c16+1 commit) / Phase G1 PR (本セッションで作成、勝者案 main 採用)
