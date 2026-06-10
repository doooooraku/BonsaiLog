# 本番昇格チェックリスト — AdMob 段階ゲート切替 (Sess95 PR-6 #1093 由来)

> **目的**: Play Console の closed-testing → production 昇格当日に、 AdMob 広告 ID とリリース段階変数を漏れなく切り替えるための手順書。 戻し忘れ・設定忘れは CI ゲートが両方向で自動検知するが、 「当日何をやるか」 を 1 箇所にまとめておく。
>
> **対象**: BonsaiLog (Android)。 Repolog / app-factory 派生アプリにも同パターン適用可。
>
> **更新履歴**: 2026-06-11 Sess97 で初版作成 (= Sess95 残課題「本番リリース時: ADMOB secret 戻し + RELEASE_STAGE=production」 の手順書化)。

---

## 背景 (なぜこの切替が必要か)

- **closed-testing 中**: テスターが本番広告をクリックすると AdMob ポリシー違反 (= アカウント停止リスク)。 Google 公式の唯一の許可手段はデモ (テスト) 広告 ID の使用。 そのため 2026-06-10 に GitHub secret `ADMOB_ANDROID_BANNER_ID` を Google デモ ID に切替済み。
- **production 昇格後**: デモ ID のままだと広告収益ゼロ事故。 本番 ID に戻す必要がある。
- **自動検知**: `.github/workflows/build-android-play.yml` の「AdMob banner ID stage gate」 が、 repo variable `RELEASE_STAGE` と banner ID の整合を両方向で検証する (デモ ID 判定 = 接頭辞 `3940256099942544`)。

| RELEASE_STAGE           | banner ID | ゲート判定                             |
| ----------------------- | --------- | -------------------------------------- |
| 未設定 / closed-testing | デモ ID   | ✅ PASS                                |
| 未設定 / closed-testing | 本番 ID   | ❌ FAIL (テスターのポリシー違反リスク) |
| production              | 本番 ID   | ✅ PASS                                |
| production              | デモ ID   | ❌ FAIL (収益ゼロ事故)                 |

---

## チェックリスト (本番昇格当日に実行)

### Step 1: 本番 banner ID を secret に戻す

本番 ID はローカル `.env` の `ADMOB_ANDROID_BANNER_ID` に保管されている (デモ ID ではない方)。

- [ ] `.env` の値がデモ ID (接頭辞 `3940256099942544`) で**ない**ことを確認:

```bash
grep ADMOB_ANDROID_BANNER_ID .env | grep -q 3940256099942544 && echo "NG: .env がデモ ID" || echo "OK: .env は本番 ID"
```

- [ ] secret を `.env` の値で更新:

```bash
gh secret set ADMOB_ANDROID_BANNER_ID --body "$(grep '^ADMOB_ANDROID_BANNER_ID=' .env | cut -d= -f2-)"
```

> **Note**: `ADMOB_ANDROID_APP_ID` (app ID) は closed-testing 中も本番値のままなので変更不要。 切替対象は banner unit ID のみ。

### Step 2: RELEASE_STAGE を production に設定

- [ ] repo variable を設定:

```bash
gh variable set RELEASE_STAGE --body "production"
```

- [ ] 設定確認:

```bash
gh variable list | grep RELEASE_STAGE
```

### Step 3: ビルドでゲート PASS を確認

- [ ] `/release-android` (= cloud build) を実行し、 「AdMob banner ID stage gate」 step のログに以下が出ることを確認:

```text
OK: stage=production / demo_id=0 (整合)
```

- [ ] Play Console で production track へ昇格 (Step 1-2 完了後のビルドを使うこと。 **closed-testing 時代の AAB を昇格させるとデモ広告のまま本番に出る**)

### Step 4: 周辺整合

- [ ] テスター向け配布 (alpha track) を継続する場合の注意: production 設定後は alpha 向けビルドも本番広告になるため、 テスターに「広告をクリックしないで」 を再周知する (もしくは alpha 配布を停止)
- [ ] 進行管理 (Engram session summary + 監査台帳 `docs/audit/` + `docs/reference/tasks/lessons.md`) に昇格完了を記録

---

## 逆方向 (production → テスト段階に戻す場合)

大規模改修などで closed-testing に戻る場合は逆の手順:

```bash
gh secret set ADMOB_ANDROID_BANNER_ID --body "ca-app-pub-3940256099942544/6300978111"  # Google 公式デモ banner ID
gh variable delete RELEASE_STAGE
```

---

## トラブルシューティング

**Q. ゲートが「RELEASE_STAGE=production なのに AdMob banner ID がデモ ID です」 で fail する**
→ Step 1 の secret 更新漏れ。 `.env` の本番 ID で `gh secret set` し直す。

**Q. ゲートが「closed-testing 中は AdMob デモ banner ID 必須です」 で fail する**
→ `RELEASE_STAGE` 未設定のまま本番 ID に切り替えた。 本番昇格なら Step 2 を実行、 テスト継続ならデモ ID に戻す。

**Q. 本番 ID がわからなくなった**
→ ローカル `.env` (gitignore 済) を確認。 紛失時は AdMob 管理画面 (https://apps.admob.com/) → 該当アプリ → 広告ユニットから取得。
