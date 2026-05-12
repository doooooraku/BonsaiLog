# G0 PoC 検証結果 (ADR-0024 / Issue #475 Phase G0)

> このファイルは **ユーザー実機検証 (Maestro 5 回反復) の結果記録 template**。
> 各案 X / Y / Z を実機で 5 回ずつ実行し、成功率を記録する。

## 検証環境

- 実機: Pixel 6 (Android 14)、もしくは iOS シミュレータ
- ADB 接続: `adb devices` で device-id を確認
- Metro 起動: `pnpm dev` (別ターミナル)
- 実機反映: `scripts/dev/reload-app.sh` (Claude 側で 1 行実行可能)
- Maestro バージョン: `maestro --version` で記録

## 検証手順 (各案 5 回)

```bash
# X 案 (完全画面 push)
maestro test maestro/flows/poc/g0-species-picker-X.yml --repeat 5

# Y 案 (presentation:'modal')
maestro test maestro/flows/poc/g0-species-picker-Y.yml --repeat 5

# Z 案 (presentation:'formSheet')
maestro test maestro/flows/poc/g0-species-picker-Z.yml --repeat 5
```

## 結果記録 (実機実行後にユーザーが記入)

| 案  | 実装                               | 成功率 (X/5) | 平均所要時間 | ghost tap 回数 | 採否 | 備考 |
| --- | ---------------------------------- | ------------ | ------------ | -------------- | ---- | ---- |
| X   | 完全画面 push                      | ?/5          | ?ms          | ?              | ?    |      |
| Y   | presentation:'modal'               | ?/5          | ?ms          | ?              | ?    |      |
| Z   | presentation:'formSheet' + detents | ?/5          | ?ms          | ?              | ?    |      |

## 合格基準 (ADR-0024)

- **5/5 = 100% 厳格**
- 4/5 以下は不採用
- 全 3 案不合格時の plan B: **Expo UI BottomSheet** (新公式 alternative、`@gorhom` API 互換、native 実装) を単独 PoC、それも不合格なら Detox or Maestro Cloud 移行 (ADR-0025 起票)

## 判定 (実機検証後にユーザー or Claude が記入)

- 採用案: ? (X / Y / Z / plan B)
- 理由: ?
- Phase G1 標準実装パターンとして確定: ?
- ADR-0024 を Proposed → Accepted へ更新: ? (PR # ?)

## 4 ペルソナ確認 (実機検証後の追加評価)

| 評価軸                    | みどり 65 | 茂 45 | 高橋プロ 62 | Linda 22 |
| ------------------------- | --------- | ----- | ----------- | -------- |
| 動作の確実性              | ?         | ?     | ?           | ?        |
| 操作速度 (1 タップで結果) | ?         | ?     | ?           | ?        |
| 視覚的な分かりやすさ      | ?         | ?     | ?           | ?        |
| シニア UX 維持            | ?         | ?     | ?           | ?        |

## 関連

- ADR-0024 (Proposed、本 PoC 結果で Accepted へ): `docs/adr/ADR-0024-bottom-sheet-removal-and-native-presentation.md`
- Issue #475 (Phase G、本 PoC で G1-G5 の標準実装パターン確定)
- Maestro 標準パターン: `docs/how-to/maestro-standard-pattern.md`
- 本 PoC PR: # (本ブランチ push 後に追加)
