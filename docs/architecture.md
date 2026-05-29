# BonsaiLog アーキテクチャ

> 新人が 15 分で全体像を掴むための地図。詳細な意思決定は各 ADR(`docs/adr/`)を正とする。
> 本書は「層(レイヤ)」と「依存の向き」「テストの分け方」を定義する。
> 起票: Phase 3 Step 3(大規模リファクタ安全網)。境界 ESLint plugin は Phase 6 で error 化済(ADR-0048)。

---

## 1. 全体像(レイヤと依存の向き)

Feature-Sliced Design (FSD) 風の層構造。**依存は上から下へ一方向**(下の層は上を知らない)。

```
┌─────────────────────────────────────────────────────────┐
│  app/                Expo Router の画面 + routing(薄く保つ) │  ← 入口
├─────────────────────────────────────────────────────────┤
│  src/features/*      機能モジュール(bonsai/event/export…)   │  ← 業務ロジック
├─────────────────────────────────────────────────────────┤
│  src/components/     共通 UI(atom/molecule、Form atom 等)   │
│  src/core/           横断(i18n/theme/datetime/hooks/util)   │  ← 基盤
│  src/db/             データアクセス(repository + schema)     │
│  src/services/       外部 SDK ラッパ(RevenueCat/AdMob/legal) │
│  src/stores/         画面横断 state(Zustand)               │
├─────────────────────────────────────────────────────────┤
│  src/types/          共有型(最下層、何にも依存しない)        │  ← 土台
└─────────────────────────────────────────────────────────┘
   src/dev/  … 開発専用(seed 等、__DEV__ 限定。本番に出さない)
```

### 各層の責務

| 層                | 置くもの                                        | 置かないもの                           |
| ----------------- | ----------------------------------------------- | -------------------------------------- |
| `app/`            | route 定義・画面 entry・navigation の配線       | 重い業務ロジック(features へ寄せる)    |
| `src/features/`   | 機能単位の画面部品・hook・純関数                | 他 feature の内部実装への直接依存      |
| `src/components/` | feature 非依存の再利用 UI(WET: 3+ 箇所で抽出)   | 特定機能専用の UI(その feature に置く) |
| `src/core/`       | i18n / theme / datetime / 汎用 util / 汎用 hook | feature 固有のロジック                 |
| `src/db/`         | SQLite repository・schema・migration            | UI / 外部 SDK 呼び出し                 |
| `src/services/`   | 外部 SDK(課金・広告・リンク)の薄いラッパ        | DB / UI ロジック                       |
| `src/stores/`     | Zustand store(設定・picker・pro 状態等)         | DB 直アクセスの業務ロジック            |
| `src/types/`      | 複数層で共有する型のみ                          | 実装(関数・定数)                       |

---

## 2. 依存ルール(許可される import の向き)

- ✅ `app` → `features` → `core` / `db` / `services` / `stores` → `types`
- ✅ 同層内の参照(`features/bonsai` → `components`)
- ❌ 下層から上層(`db` → `features`、`core` → `stores` 等)
- ❌ feature 間の内部実装直参照(`features/event` → `features/bonsai` の private)
  - 共有が必要なら `components` / `core` / `types` に上げる(WET 原則: 3+ 箇所で抽出)
- ❌ 循環依存(`import/no-cycle` が ESLint error で検出。型は store 側で定義する)

### 現状と移行(重要)

- Phase 1 調査で **既知の境界違反 7 件**(`core→stores` ×3 / `db→services` ×2 / `db→features` ×1 / `stores→services` ×1)を検出していた。
- ✅ **Phase 6 で是正完了**(ADR-0048):`stores→services` は services を SDK ラッパ層と定義し正規化(合法)、残り 6 件のうち F1b/c(PotUnit 型)/F3(payloadValidator)/F2(写真 I/O)を移設で解消、F1a(useColors)は全層横断 hook のため core 据え置き + 当該 import 1 本を `eslint-disable` で例外受容(ADR-0048 Amendment)。
- `eslint-plugin-boundaries`(`boundaries/dependencies`)を **error** 化し CI(verify:lint)で gate。allow-matrix の正は **ADR-0048**。新規の層違反混入は CI が弾く。

---

## 3. functional-core / imperative-shell(テストの分け方)

副作用(SQLite I/O・ファイル・共有シート・ネットワーク・SDK)と純粋ロジックを**混ぜない**。

- **functional-core**: I/O を持たない純関数。入力 → 出力が決まる。`export` して **jest で単体テスト必須**。
  - 例: `buildManifestFromDb`(DB 行 → manifest シリアライズ)、`groupContinuousEvents`、`bonsaiFormUtils`
- **imperative-shell**: zip 往復・picker・共有・写真コピー等の薄い I/O 層。mock 再現性が低いので **Maestro 実機 + fail-closed ガード**で検証。
  - 例: `exportBackup` / `importBackup` の I/O 部分

**なぜ**: 純粋ロジックが native I/O と monolithic に癒着すると「テスト不能」が既定化する(Phase 1 で backupService が典型症例だった)。core を分離・export すれば高再現度で jest 化できる。

**規約**: 新しい feature ロジックは I/O-free な functional-core として分離・export・単体テストする。native I/O は薄い shell に隔離する。

---

## 4. 命名・配置の規約

- ファイル: 1 ファイル ≤ 400 行を原則(超える場合は ADR で justify、または分割)。
- screen は `app/` に、再利用 UI は `src/components/`、機能部品は `src/features/<domain>/`。
- 型は「使う層のいちばん下」で定義する(共有なら `src/types/`、store 専用なら store 内)。
- i18n は直書き禁止(ADR-0033)。`t('key')` 経由、19 言語キー完備。
- 色・余白・typography は token 経由(ADR-0042 / `design_system.md`)。直 hex 禁止。
- 日時は `src/core/datetime` 経由(ADR-0008、`new Date()` 直呼び出し禁止)。
- Form は既存 atom(`LabeledTextInput` / `LabeledDateRow` / `LabeledNumberInput` / `LabeledPickerRow` / `PhotoField`、ADR-0027/0029)を流用。新規 atom は WET(3+ 箇所)を満たす時のみ。

---

## 5. 大規模リファクタの進め方(Strangler Fig)

god component(巨大ファイル)は**一度に壊さず**、旧 API を wrapper として残したまま中身を段階的に置換する。

1. **Phase 3(安全網)**: 分割前に挙動を凍結。characterization テスト + typed-lint(`no-floating-promises`/`no-misused-promises`/`no-unsafe-*`)+ knip + 本書。
2. **Phase 4(分割)**: god を hook / presentational に分割。`useBonsaiBasicForm` 等の **public API は wrapper で不変**に保つ。振る舞い不変(Maestro + 実機 SS で担保)。
3. **Phase 5(共通化)**: 3+ 箇所で再利用された部品のみ atom/molecule へ格上げ。
4. ✅ **Phase 6(境界整理・完了)**: §2 の違反を是正、boundary plugin を error 化(ADR-0048)。
5. **Phase 7(掃除)**: knip がフラグした死コードを user 承認後に削除。

詳細は `docs/refactor/master-plan.md` を正とする。

---

## 6. FAQ(よくある詰まり)

**Q. ESLint で「境界違反」や `import/no-cycle` が出た**

- 循環依存: 型を store 側に寄せる / 純関数を下層に切り出す。下層が上層を import しない。
- feature 間参照: 共有部分を `components`/`core`/`types` に上げる(3+ 箇所で抽出)。

**Q. 型を `any` にしたら lint error(`no-unsafe-*`)**

- 外部境界(JSON.parse / SDK 戻り値)は `unknown` で受けて `typeof` で絞る。
- 例: `getAppExtra()`(`src/core/appExtra.ts`)が `Constants.extra` の any を `Record<string, unknown>` に堰き止める手本。

**Q. async を `onPress` に渡したら lint error?**

- JSX 属性の async handler は許可(RN 慣例)。object property / 引数 / 条件式で Promise を誤用した場合のみ error。意図的な fire-and-forget は `void f()` で明示。

**Q. テストはどこに書く?**

- 純関数 / repository → `__tests__/**` で jest(Node 22 必須、`node:sqlite` harness)。
- 画面の正常系 / I/O → `maestro/flows/**`(実機)。

**Q. 死コードを消していい?**

- 検出は `pnpm verify:dead`(knip)。実削除は **Phase 7** で user 承認後(本書時点では検出のみ)。

---

## 関連

- `docs/refactor/master-plan.md` — リファクタ全体計画(Phase 3-7)
- `docs/reference/constraints.md` — 不変条件
- `docs/adr/` — 個別意思決定(0008 日時 / 0027・0029 Form atom / 0033 i18n / 0042 theme / 0046 FSD 予定)
- `.claude/recurrence-prevention.md` — 行動ルール(R-1〜)
