# Lessons: 課金 / RevenueCat / Pro 状態管理

> 索引: [`README.md`](./README.md)

---

### Repolog 踏襲時はペルソナ違いを再評価する

- **何が起きたか**: F-13 課金で Repolog の `proService.ts` / `proStore.ts` / `PaywallScreen.tsx` を 95% コピペで踏襲した際、Repolog 側にはなかった **「Lifetime 買切購入後にサブスク非表示」** UI 制御 (Pocket Casts Champion 方式) を BonsaiLog で新規実装する必要があった。
- **根本原因**: Repolog は若年層 (Marcus 35 歳の年額志向) を主軸にしていたが、BonsaiLog はシニア (高橋さん 62 歳の買切志向) を主軸にしている。「もう買ったのに購入を促される」UX は前者では許容、後者では NG。コードベースをコピペしても **ペルソナ前提が異なる** ため UI 制御は再評価が必要。
- **ルール**: 別アプリから機能を踏襲する際は、(1) ペルソナ列挙 (2) ペルソナごとに UI 体験を 4 段評価 (◎ / ○ / △ / ✕) (3) ✕ がある UI は新規実装で補強、を必ず実施する。コピペで終わらせない。
- **一次情報**: ADR-0009 §61-67 (Champion 方式)、ADR-0011 (記録のみ哲学)、Pocket Casts ライフタイム会員制度

### Champion 方式の判定は純関数で外出しする

- **何が起きたか**: F-13 PaywallScreen に `const hideSubscriptions = planType === 'lifetime';` をベタ書きしていたが、テスト容易性のため `src/features/pro/championMode.ts` の純関数 `shouldHideSubscriptions` に分離した。
- **根本原因**: コンポーネント内のロジックは React 環境に依存するため Jest テストで境界値網羅 (lifetime / yearly / monthly / null) が困難。
- **ルール**: 課金状態の判定 (Champion 方式 / Notion 方式 / Free 制限) は **必ず純関数として `src/features/pro/*.ts` に分離** し、`__tests__/features/pro/<name>.test.ts` で境界値テストを書く。

### i18n 19 言語の一括追加は Node script で

- **何が起きたか**: F-13 Champion バナーの `paywallChampionBannerTitle` / `paywallChampionBannerDesc` を 19 言語に追加する際、Edit を 19 回繰り返すのは非効率かつ漏れリスクがあった。
- **根本原因**: 手動 Edit は順序ミスや locale 漏れを生む。
- **ルール**: 新規 i18n キーが 2 件以上 × 17 言語以上の英語フォールバック追加では Node script を一時生成 → 既存アンカー (`proLifetimeFinePrint:` 等) の直後に挿入 → `grep -L <key> src/core/i18n/locales/*.ts` で残存ゼロ確認、の手順 (R-1 一括処理後の目視確認) で行う。

### Free → Paywall 遷移は Alert 2 ボタン + `Href` cast

- **何が起きたか**: F-10 エクスポート 3 画面 (`csv.tsx` / `pdf.tsx` / `list-pdf.tsx`) で「Pro 限定」案内 Alert は当初 OK 1 ボタンだけだったため、Issue #33 AC「Free でタップ → Paywall 遷移」を充足できていなかった。
- **根本原因**: Alert 1 ボタンでは導線が途切れ、ユーザーは自分で Settings → Pro 画面へ移動する必要があった。Apple Review 観点でも「Pro 機能を提示しただけで購入導線がない」と見なされるリスク。
- **ルール**:
  1. Pro 限定機能の Free タップ時は **必ず 2 ボタン Alert** (`{ text: t('cancel'), style: 'cancel' }` + `{ text: t('proCtaUpgrade'), onPress: () => router.push('/pro' as Href) }`) で構成する
  2. `'/pro'` は `expo-router` の型で受け付けないため **`as Href` キャスト必須** (`import { useRouter, type Href } from 'expo-router'`)
  3. Pro 画面 (`/pro`) は Paywall を内包し、購入後は proStore reactive で自動的に元の画面に戻れる
- **一次情報**: ADR-0009 (F-13 Paywall) / ADR-0016 (F-10 Pro 限定) / Apple Review Guideline 3.1.1

### `Alert.alert('準備中')` を残したまま PR をマージしない (Sess57)

- **何が起きたか**: GitHub Pages で利用規約 / プライバシーポリシー URL を公開した PR #838-839 のあと、 アプリ内 `app/settings/index.tsx` の wiring は `Alert.alert(t('settingsLegalTerms'), 'docs/legal/terms.md (準備中)')` のまま 5 ヶ月以上放置されていた。 ストア審査では URL 公開で OK だが、 アプリ内ユーザーは規約に到達できない状態だった。
- **根本原因**: 「URL 公開」 と 「アプリ内 wiring」 が別 PR にスコープ分割されたまま、 後者の Issue / Backlog 登録が漏れていた。 `legalService.ts` は実装済 (`getLegalLinks` / `openExternalLink`) で caller ゼロ、 静的解析 (`verify:dead`) も export だけ存在する状態を死コード判定しないため気づけなかった。
- **ルール**:
  1. **`Alert.alert(.*準備中)`** を発見したら、 単発で削除する PR を切る前に、 まず「結線すべきインフラはどこまでできているか」を grep で確認 (`legalService.ts` のように使われていない service が居る場合あり)。
  2. ストア向け URL を公開する PR の DoD に **「アプリ内設定からも tap 可能」 を含める** (ADR-0017 Sess57 Amendment で明文化済)。
  3. Settings/Paywall のような ストアコンプライアンス系画面は、 wiring の有無を per-section AC として ADR に書く。
