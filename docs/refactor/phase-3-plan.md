# Phase 3: Safety Net — 実装計画書

> 作成日: 2026-05-28
> 種別: 実装計画書(APPROVE 済)
> 上位: `./master-plan.md`(本計画は master-plan Phase 3 の **拡張版**。user 指示で TS strict / strict-type-checked / knip 0 / CI guard を追加)
> 計測根拠: 全て read-only コマンド実出力

---

## 目的

god component 分割(Phase 4)の前に、**現状の挙動を凍結する安全網**を構築する。
characterization テスト + **TS strict 4フラグ** + **ESLint `strict-type-checked`** + **knip 0** + **CI guard** を整備する。

**確定した 4 判断(user 承認済)**:

- Maestro = **ハイブリッド**(jest characterization 主、Maestro は god 正常系 critical flow ~10本)
- 配置 = **既存構造**(`maestro/flows/characterization/` + `__tests__/` 拡充、`e2e/` は新設しない)
- boundary plugin = **Phase 6 まで OFF**(Phase 3 は TS/lint strict の 0/0 に集中、FSD 是正は Phase 6)
- knip = **ignore 登録で 0**(偽陽性を `knip.json` に登録。真の死コード削除は Phase 7)

**計測した現実(scope)**:
| 項目 | 実測 |
| --- | --- |
| `noUncheckedIndexedAccess` | 126 errors |
| `exactOptionalPropertyTypes` | 34 errors |
| `noUnusedLocals/Parameters` | 29 errors |
| TS strict 4フラグ合計 | 約 170 errors(重複差引) |
| `any` 出現(strict-type-checked 影響代理) | src+app で **4 箇所のみ** |
| typed-linting | 未設定(eslint.config に「高コストで見送り」明記)→ 本 Phase で導入 |
| 既存 jest | 878 ケース / 67 suites |
| 既存 Maestro flow | 60本(`maestro/flows/`) |

---

## 対象ファイル一覧

**Step 1(characterization)**:

- 拡充: `__tests__/db/eventRepository.test.ts` / `__tests__/db.test.ts` / `__tests__/db/tagRepository.test.ts`
- 新規: `__tests__/db/bonsaiRepository.test.ts` / `photoRepository.test.ts` / `speciesRepository.test.ts` / `bonsaiSpeciesCustomRepository.test.ts` / `bonsaiStylesCustomRepository.test.ts`
- 新規: `__tests__/features/backup/backupService.test.ts` / `__tests__/features/export/exportFlow.test.ts`
- 新規(god 描画 smoke): `__tests__/screens/*.test.tsx`(10 god の render + 主要要素存在)
- 新規(Maestro critical): `maestro/flows/characterization/*.yml`(god 正常系、既存flow で覆えるものは再利用)

**Step 2(TS strict)**:

- `tsconfig.json`(4フラグ追加)
- 型エラー修正 ~170件: `src/features/event/groupContinuousEvents.ts` / `src/features/export/{exportFlow,pdfReliability}.ts` / `src/features/notification/dailySummary.ts` / god 各画面 / `src/services/proService.ts` ほか

**Step 3(Lint + knip)**:

- `eslint.config.js`(typed-linting 有効化 + `strict-type-checked` + `no-floating-promises`/`no-misused-promises`/`no-unsafe-*` を error)
- `knip.json`(新規、偽陽性 ignore)/ `package.json`(devDep `knip` + script `verify:dead`/`knip`)

**Step 4(CI)**:

- `.github/workflows/refactor-guard.yml`(新規)

**変更しない**: `src/**` のロジック(挙動不変)/ AsyncStorage key / schema / i18n key /(boundary plugin は今回入れない)

---

## 変更前後のディレクトリツリー

```
Before                                  After (Phase 3 完了)
├── __tests__/ (67 suites)             ├── __tests__/
│   ├── db/ (7)                        │   ├── db/ (12) ★ +5 repo tests, 拡充3
│   └── features/                      │   ├── features/backup/backupService.test.ts ★
│                                       │   ├── features/export/exportFlow.test.ts ★
│                                       │   └── screens/*.test.tsx ★ god render smoke ×10
├── maestro/flows/ (60)               ├── maestro/flows/
│                                       │   └── characterization/*.yml ★ ~10 critical
├── tsconfig.json (strict)            ├── tsconfig.json (strict + 4 flags) ◆
├── eslint.config.js                  ├── eslint.config.js (typed + strict-type-checked) ◆
│                                       ├── knip.json ★
├── package.json                      ├── package.json (+knip, +scripts) ◆
└── .github/workflows/                └── .github/workflows/refactor-guard.yml ★
```

(★=新規 / ◆=設定変更 / `src/**` ロジックは挙動不変)

---

## ステップ(各 5分以内、4 Step = 別 PR 群、Conventional Commits)

### Step 1: characterization tests(PR 1-1 〜 1-5)

| PR  | 内容                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1-1 | db repo characterization(eventRepository 拡充、14種別 CRUD)                                                                     |
| 1-2 | db.ts migration + bonsai/photo/tag/species repos                                                                                |
| 1-3 | backupService + exportFlow characterization(round-trip + period/scope/tag)                                                      |
| 1-4 | god 描画 smoke ×10(`@testing-library/react-native`)                                                                             |
| 1-5 | Maestro critical flows(`maestro/flows/characterization/`、既存60本で覆えない god の正常系のみ。日本語 flow は en seed/既存流用) |

合計 **characterization ≥ 30 本(jest)**+ Maestro critical ~10本。

### Step 2: TypeScript strict(PR 2-1 〜 2-3、フラグ別)

| PR  | フラグ                                      | 想定                                                     |
| --- | ------------------------------------------- | -------------------------------------------------------- |
| 2-1 | `noUnusedLocals` + `noUnusedParameters`(29) | 死ローカル削除                                           |
| 2-2 | `exactOptionalPropertyTypes`(34)            | optional に `\| undefined` 明示                          |
| 2-3 | `noUncheckedIndexedAccess`(126)             | guard 追加 or 非null確証(db/features/app の commit 分割) |

- どうしても無理な箇所のみ `// TODO(refactor-phase-4): tighten` + `any`(現状4箇所、増やさない)
- **Rule 10 厳守**: テスト側で誤魔化さず型で解消

### Step 3: Lint strict + knip(PR 3-1, 3-2)

| PR  | 内容                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 3-1 | typed-linting + `strict-type-checked` + `no-floating-promises`/`no-misused-promises`/`no-unsafe-*` を error |
| 3-2 | knip 導入 + `knip.json` ignore で 0                                                                         |

- **boundary plugin は入れない**(Phase 6 まで OFF)→ 0 warnings 達成可能

### Step 4: CI guard(PR 4-1)

- `.github/workflows/refactor-guard.yml`: `tsc` / `lint` / `test` / `knip` / `maestro(characterization)` を PR トリガで実行

---

## ロールバック手順

- 全 PR が独立 `git revert` 可能
- Step 2 tsconfig フラグ: 該当行削除で即無効化
- Step 3 typed-linting / knip: `pnpm remove` + config 行削除
- Step 4 CI: workflow ファイル削除のみ
- `src/**` ロジック不変のため、安全網撤去してもアプリ挙動は元のまま

---

## 成功判定基準(= completion criteria)

- [ ] `pnpm tsc --noEmit`(strict 4フラグ込み): **0 errors**
- [ ] `pnpm lint`(strict-type-checked、boundary OFF): **0 errors / 0 warnings**
- [ ] `pnpm test`: 全 green、**新規 characterization ≥ 30 本**
- [ ] `pnpm knip`: **0**(偽陽性 ignore 込み)
- [ ] `maestro test maestro/flows/characterization/`: critical flow 全 green(実機)
- [ ] `.github/workflows/refactor-guard.yml` 設定済
- [ ] **挙動不変**: `src/**` の**ロジック**変更ゼロ。例外として「テスト容易化のための seam 露出」(挙動不変な `export` 追加 / 純粋関数抽出)は許容。これは根本原因対策(functional-core / imperative-shell 分離)であり対処療法ではない。実例: `backupService.buildManifestFromDb` を export 化(1語追加)。
- [ ] `master-plan.md` の Phase 3 節を本拡張版に更新

---

## 根本原因対策 — backup/export の層分けテスト方針(2026-05-28 改訂)

**なぜなぜ分析の結論**: 純粋ロジックが native I/O(zip/unzip/共有/picker/写真コピー)と monolithic 関数内で融合し、テスト容易性を要求する強制力が無かった(static+Maestro-only 戦略 + 実 DB harness 不在)ため「テスト不能な形」が既定化していた。backupService はその最も極端な症例。

**恒久策(対処療法ではない)**:

| 対象                                                                                       | テスト層                                                           | 理由                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `exportFlow` の DB orchestration(resolvePeriodRange / loadCsvForPreview / loadListPdfHtml) | **jest characterization(56.66%)**                                  | FS/Sharing 非依存、実 DB で高再現度                                |
| `backupService.buildManifestFromDb`(DB→manifest シリアライズ核)                            | **jest characterization**                                          | export 化した functional core、実 DB で検証                        |
| `backupService` の I/O shell(exportBackup/importBackup の zip/共有/picker/写真コピー)      | **Maestro 実機(PR 1-5)+ 既存 `backupCoverage` fail-closed ガード** | zip 往復・ファイル操作は mock では低再現度、実機が faithful        |
| `importBackup` の DB-apply 核(現在は写真コピーと同一 transaction に融合)                   | **Phase 4 で functional-core 抽出 → その時 jest 化**               | 最高リスク(ユーザーデータ経路)を網無しに改修しない(Strangler 原則) |

**規約化(再発防止、P3-11 で `docs/architecture.md` に明記)**: feature ロジックは I/O-free な functional-core として分離・export・単体テスト必須。native I/O は薄い imperative-shell に隔離し Maestro で検証。CI ガード起案も P3-11 で検討。

> ゆえに「backupService ≥50% jest」は **層分け DoD** に置換: 核は jest、shell は Maestro + fail-closed ガード。mock で数字を作る(対処療法)も放置もしない。

---

## リスク

| リスク                                                  | 影響 | 確率 | mitigation                                                                 |
| ------------------------------------------------------- | ---- | ---- | -------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess` 126件の guard が挙動を変える | 高   | 中   | guard は非null確証中心。Step1 characterization が緑である前提で Step2 着手 |
| Step2 死コード削除が Phase4 と重複                      | 低   | 高   | 削除は cheap、許容                                                         |
| typed-linting で lint 5-10x 遅化                        | 中   | 高   | `projectService` 最小化、CI 別ジョブ                                       |
| Maestro 日本語入力不可                                  | 中   | 中   | en seed / 既存flow流用 / jest 代替(ハイブリッド)                           |
| `exactOptionalPropertyTypes` 3rd-party 衝突             | 中   | 低   | 局所 TODO 許容                                                             |
| Rule 8: 型エラー激増                                    | 高   | 低   | 計測済(170)、激増したら即停止報告                                          |

---

## 実行ゲート

各 Step 完了後に「変更ファイル / テスト結果 / 次 Step」を報告し、次 Step の APPROVE を待つ(Rule 1 + user 指示)。
