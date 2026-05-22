# Sess29 Retro — 記録タブ動線復活 + 「作業を記録」 button 統合設計 (7 PR)

- 日付: 2026-05-22
- 関連 ADR: ADR-0038 (新規) + ADR-0025/0035/0037 Notes Amended (3 件連動)
- 関連 R: R-47 (navigation anti-pattern check)、 R-48 (CTA design 整合) — 両方新規起票
- 関連 PR: #763 (ADR/token/R-47/R-48) / #764 (RecordTabScreen) / #765 (actionButton 色) / #766 (group button + kebab 併存) / #767 (Hero 280 復活) / #768 (ADR Notes Amended + Maestro) / 本 PR (retro)

---

## 学び ① — 議論時の「タブ名 ↔ タブ内 主要 CTA 動作 整合性」 見落とし

**事実**: Sess23 ADR-0035 D6 で「記録タブ tap → 予定タブの今日 view」 を 6 専門家評価 + 4 ペルソナ評価で全員 ◎/○ 承認した。 しかし Sess29 user 報告:

- 「記録 タブ tap で 予定 タブが緑になる、 これおかしいでしょ」
- 「記録 タブの FAB が 予定追加 を起動する意味が、 必要性が理解できない」
- 「**疑問に思えよ**」

= Sess23 議論で**タブ標準 (Material 3 / iOS HIG)** の基本原則「tap したタブが必ずハイライト」 + 「タブ名 = タブ内 CTA 動作」 整合性を**完全に見落とした**。

**Why 見落としたか**:

1. ADR-0035 議論時の焦点が「予定 → 記録動線統合」 (D7) に集中、 D6 (タブ tap 経路) は補助項目として深掘り浅め
2. 6 専門家のうち UX/UI デザイナー も「動線統合のメリット」 を支持、 タブ標準違反を**負の影響として明示しなかった**
3. 議論 template に「navigation anti-pattern 7 項目チェック」 が**未整備**
4. 4 ペルソナ評価で「タブ tap の認知整合性」 を評価軸に**含めなかった** (各ペルソナの動線評価のみ)

**対策 (本セッション)**:

- **R-47 新規起票**: navigation 改修時の Material 3 / iOS HIG anti-pattern 7 項目 (タブハイライト整合 / タブ名 ↔ CTA 動作 / 戻る動作 / deep link / state 復元 / lazy mount / 冪等性) を議論段階で必須チェック
- `/discuss` skill template に R-47 必須 question として組込候補

**Future Work 候補**:

- ESLint custom rule で `<Tabs.Screen listeners={{ tabPress: ... }}>` の `e.preventDefault() + router.push` pattern を warning 化
- 議論 template に「タブ navigation 改修時の必須 checklist」 を SoT 化
- 議論時に「user 想定発言シミュレーション」 (例: 「あなたはこのタブ tap してどう感じる?」) を導入

---

## 学び ② — CTA button の世界観整合性 (BADGE_SOFT との連動見落とし)

**事実**: Sess28 PR-5 で「×n バッジ」 を `BADGE_SOFT_BG` (#E8F0EA) + `BADGE_SOFT_TEXT` (BRAND_GREEN) に統一し、 user 「優しい色合い」 真意を達成。 しかし**同じ世界観違反パターン**を持つ「作業を記録」 button (`actionButton`) は射程外で取り残された。

Sess29 user 報告: 「この予定から記録するボタン、 色合いやボタンの配置、 サイズにおいても色合い的に強調しすぎじゃない?」

**Why 取り残されたか**:

- Sess28 議論時に「バッジは情報、 button は CTA」 と機能区別、 「優しい色」 適用範囲を**バッジに限定**した
- 業界標準 (Material 3 filled CTA) を**和風 BonsaiLog でもそのまま適用**する固定観念
- design_system に「CTA button 階層」 の SoT が未整備

**対策 (本セッション)**:

- **R-48 新規起票**: CTA button 実装時に design_system §22 (Primary/Secondary/Tertiary/Destructive 4 階層) 整合 grep 必須
- **design_system §22 新設**: 4 階層の CTA button pattern を SoT 化
- **新 token 追加**: `BUTTON_SECONDARY_BG` / `BUTTON_SECONDARY_TEXT` (Secondary CTA 用、 BADGE_SOFT と同色だが用途分離)
- 適用: EventRow `actionButton` (個別 row、 PR-3) + PlanScreen/RecordTabScreen `groupRecordButton` (group header、 PR-4)

**Future Work 候補**:

- ESLint custom rule で `backgroundColor: BRAND_GREEN` + `color: ON_BRAND` を **Primary CTA file allow list 以外で warning 化**
- dark mode の新 token 値定義 (現状 light のみ固定値)

---

## 学び ③ — 過去動線復活時の「user 提示 SS は既存実装の証拠」

**事実**: Sess29 user 報告で「前まであった動線を復活してほしい」 と要望、 SS 3 枚を提示。 SS を分析した結果:

- 15536_0.jpg = `bonsai-multi-select.tsx` (既存)
- 15537_0.jpg = `bulk-work-picker.tsx` (既存、 mode='schedule' のヘッダ「予定を追加」 状態)
- 15538.jpg = `bulk-log-confirm.tsx` (既存、 「記録する」 button あり)

= **3 画面とも既存実装、 user が「前まで」 と言っているのは Sess23 以前の動線 (= `useBulkActionFlow('log')` で起動可能)**。

**Why 重要か**:

- user 提示 SS を「既存実装の証拠」 として読み解くと、 **過去動線復活の実装範囲が劇的に明確化**
- 新規実装が必要なのは「起動経路 (記録タブ FAB)」 のみ、 既存 flow (bonsai-multi-select → bulk-work-picker → bulk-log-confirm) は健在
- これにより 1 セッション完遂可能な scope 設計が可能に

**Future Work 候補**:

- user 提示 SS を含む議論時、 **「SS の各画面が現状コードのどの実装に対応するか」 を Step 0 で必ず特定**する議論プロセス改善
- mockup スクショ ↔ 実装ファイル mapping を `docs/reference/ui-mapping.md` で SoT 化

---

## 学び ④ — 1 セッション 7 PR 連続実装の time efficiency 確立

**事実**: Sess28 (8 PR) + Sess29 (7 PR) で連続実装 pattern が確立。 各 PR は:

- 平均所要時間: 15-25 分 (実装 + verify + commit + push + PR + merge)
- 1 セッション総時間: 約 2-3 時間
- revert 件数: 0 (両セッションとも)

**成功要因**:

1. **事前議論で設計確定**: PR 着手前に 6 専門家 + 4 ペルソナで議論完了、 user 承認後に着手
2. **TaskCreate で進捗可視化**: 7 PR を初期作成、 順次 in_progress / completed で状態管理
3. **既存 token / hook 流用**: BADGE_SOFT (Sess28) / BUTTON_SECONDARY (Sess29) / useKeyboardAvoidingProps (Sess28) 等の SoT 整備
4. **ADR 起票 (PR-1) を最初に実施**: 残り PR の SoT として参照される文書を最優先で確立
5. **squash merge + auto 進行**: user 「auto 進行 OK」 方針で各 PR の確認待ちを最小化

**改善余地**:

- 17 言語 i18n 翻訳が**英語 fallback のまま**残った (recordFabLabel)。 ADR-0033 ポリシー違反、 別 PR で手動翻訳必須
- PlanScreen + RecordTabScreen の**重複コード**が大きい (約 700 行)。 共通 component 抽出 refactor が Future Work

---

## 関連

- ADR-0038 §Decision (D1-D5 統合根拠)
- ADR-0035/0025/0037 §Notes Amended 2026-05-22 Sess29 PR-6
- `.claude/recurrence-prevention/specialized.md` R-47/R-48
- `docs/reference/design_system.md` §22 (ボタン pattern SoT)
- `src/core/theme/colors.ts` (BUTTON_SECONDARY_BG/TEXT)
- `app/(tabs)/record/index.tsx` (RecordTabScreen 新規実装)
