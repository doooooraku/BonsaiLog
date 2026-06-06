# ADR-0040: フォーム画面 scroll 構造統一 (FormScreenHeader + full-screen scroll)

- Status: Accepted
- Date: 2026-05-23
- **Phase**: Sess33 (Sess28-32 連続改善の最終構造統一)
- **関連**:
  - ADR-0037 (Hero + バッジ + KAV 統一、 R-46 v1 起票元)
  - R-46 v3 → v4 (KAV + auto-scroll 2 タイプ使い分け、 logcat 検証強制)
  - R-51 (FormScreenHeader + full-screen scroll 必須)
  - design_system.md §23 (Form Screen Layout Pattern SoT)

---

## Context (背景)

Sess28-32 (2026-05-22) で 4 つのフォーム画面のキーボード被り問題を **R-46 v1→v3** (KAV + auto-scroll 2 タイプ) で構造解決した。 しかし Sess33 で user 報告「全体画面でスクロールできるようにしてください、 これは全ての作業でも同様」 を受けて、 4 画面の **header 構造ばらつき** が判明:

| 画面                   | 旧 header 位置                                               | 構造的問題                                                            |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| BulkLogConfirm         | View (sticky) → chips ScrollView (sticky) → KAV → ScrollView | header + chips が常時固定で IME 起動時に縦領域圧迫                    |
| BonsaiCreate           | KAV → ScrollView (内に form)                                 | 構造的には OK だが Stack header + ScrollView 内 form でレイアウト二重 |
| WorkLogConfirm         | KAV → ScrollView (内に header + form)                        | 同上                                                                  |
| bonsai-detail 基本タブ | detailTabs (sticky) → KAV → ScrollView (Hero + tab content)  | 詳細画面なので別 pattern (本 ADR 対象外)                              |

design_system.md §21 (KeyboardAvoidingView 統一 pattern) には header 構造の規約が無く、 暗黙の実装判断で構造ばらつきが放置されていた。

加えて **Sess32 PR-1 から潜在していた Console Error** (`ref.measureLayout must be called with a ref to a native component.`) が Sess33 PR-1 検証時に発覚:

- 原因: `noteInputRef.current?.measureLayout(...)` は forwardRef 経由 ref で「native component ref」 として認識されず reject
- 動いていた理由: error callback の fallback (scrollToEnd) が走り、 結果的にメモ欄が見える位置までスクロールしていた
- 修正: `findNodeHandle` + `UIManager.measureLayout` (RN 公式 native API) に置換 (Sess33 PR-2 hotfix)

---

## Decision (決定)

### D1. 4 フォーム画面で **FormScreenHeader + full-screen scroll** 構造を統一

- `Stack.Screen options={{ headerShown: false }}` で Stack header 廃止
- `<FormScreenHeader />` (戻るボタンのみ sticky、 高さ 56 + insets.top) を sticky 配置
- タイトル / サブタイトル / chips / フォーム要素は **すべて ScrollView 内に統合**
- IME 起動時は ScrollView が画面全体スクロール可能 (= full-screen scroll)

**適用先**: BulkLogConfirm / BonsaiCreate / WorkLogConfirm の 3 画面

**対象外**:

- bonsai-detail (フォーム画面ではなく **詳細画面 + タブ切替**、 Stack header にタイトル必要)
- bonsai-multi-select / picker 系 modal (選択画面、 form ではない)

### D2. `measureLayout` は **UIManager 公式 API 必須**

- ❌ 禁止: `inputRef.current?.measureLayout(scrollNode, success, fail)` (forwardRef 経由で reject)
- ✅ 必須: `findNodeHandle(input) + UIManager.measureLayout(input, scroll, fail, success)` (RN 公式 native API)
- 引数順違いに注意 (instance: success-fail / UIManager: fail-success)

### D3. R-46 v3 (KAV + auto-scroll 2 タイプ) を v4 に拡張、 **logcat / Console Error 検証必須化**

- 旧 R-46 v3 の 2 タイプ使い分け (タイプ A 末尾 = scrollToEnd / タイプ B 中盤 = measureLayout) は維持
- 追加: form 画面検証時は **logcat + Dev menu Console** で Error 0 件確認を必須化
- Sess32 では SS のみ確認で Console Error 見逃した教訓

### D4. design_system.md §23 「Form Screen Layout Pattern」 を新設

4 要素の SoT (Single Source of Truth):

1. **Header**: `<FormScreenHeader />` sticky、 戻るボタンのみ (タイトル ScrollView 内)
2. **Scroll**: KAV 内の単一 ScrollView、 タイトル + form 要素を内包
3. **KAV**: `useKeyboardAvoidingProps()` 強制利用 (R-46 v1)
4. **SafeArea**: FormScreenHeader 内 `useSafeAreaInsets()` で top inset 吸収

---

## Consequences (帰結)

### Positive (良い帰結)

- ✅ 4 画面で構造ばらつき根絶、 将来 form 画面追加時に「どう作るか」 が一意
- ✅ IME 起動時の操作性向上 (タイトル + chips が画面外スクロール可能で入力欄に集中できる)
- ✅ Console Error 根絶 (UIManager 公式 API 強制)
- ✅ logcat / Console 検証必須化で「見えない bug」 を早期発見

### Negative (副作用)

- ❌ Stack header 廃止に伴い、 画面遷移時のヘッダーアニメーションが消える (UX 軽微低下)
- ❌ FormScreenHeader の戻るボタン高さ 56px 分が常時占有 (Stack header と同等なので実質差なし)

### Neutral (中立)

- 🟡 i18n の `back` key 既存利用、 追加不要
- 🟡 bonsai-detail は対象外、 詳細画面 pattern として別途維持

---

## Future Work

- (P2-2) scripts/check-form-screen-scroll.mjs で構造逸脱を CI で block
- (将来) ESLint custom rule で AST レベル検出 (eslint-plugin-bonsailog 新設要)
- (将来) dark mode token 対応 (現状 FormScreenHeader は `useColors()` で背景連動済 = 既に対応)
- ~~scroll 位置保持 (子画面 push から戻る時)~~ → **Sess72 PR-5 で D5 として正式採用** (下記 Notes Amended 参照)

---

## Notes Amended (Sess72 PR-5、 2026-06-07)

### D5. 子画面 push 遷移を許す form 画面は `useScrollPreservation` hook 必須

**背景**: テスター苦情「タグ追加画面から基本情報画面に戻ると必ず画面の先頭に戻ってしまう」 (Sess72)。 真因は React Native ScrollView の挙動 — 戻り時 `useFocusEffect` 内の 2 連 setState (`setSelectedTagIds` + `setRecentTags`) で TagSection の layout pattern が「empty 縦」 → 「wrap row 横」 に変化 → 親 ScrollView の contentSize 変動 → contentOffset 0 にリセット。 D1〜D4 (構造統一) では scroll preservation 未対応で残った穴で、 ADR 起票時に Future Work にすら明記されていなかった盲点。

**決定**: form 画面 (FormScreenHeader + ScrollView) で **子画面に `router.push` する flow がある画面**は、 `src/core/hooks/useScrollPreservation.ts` を使用すること。

```tsx
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';

const scrollRef = useRef<ScrollView>(null);
const { onScroll, scrollEventThrottle } = useScrollPreservation(scrollRef);

<ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
  ...
</ScrollView>;
```

**適用先 (Sess72 PR-2/3/4 で完遂)**:

- `src/features/bonsai/BonsaiCreateScreen.tsx` (新規登録 modal、 tag-edit へ push)
- `app/(tabs)/bonsai/[id]/index.tsx` (詳細画面、 タグ追加 / picker / work-picker へ push)
- `app/export/index.tsx` (Export Hub、 個別盆栽 PDF へ push)

**除外 (PR-0 調査で子画面 push なしと判明)**:

- `src/features/event/WorkLogConfirmScreen.tsx` (`router.replace` のみ、 push なし)
- `src/features/event/BulkLogConfirmScreen.tsx` (`router.replace` のみ、 push なし)
- `app/export/pdf.tsx` (内部 share sheet + FlatList ベース、 ScrollView ではない)

**仕組み化 (Sess72 PR-5 同時実施)**:

- `scripts/check-form-screen-scroll.mjs` (R-51 既存) に「FormScreenHeader + ScrollView を使う画面で `useScrollPreservation` 未適用なら **warn**」 を追加 (warn 起動 → 違反 0 確認後 error 昇格、 Sess68 と同じ階段)
- 除外画面は適用除外注釈 `// scroll-preservation: no-child-push (<理由>)` で明示

**関連**: R-63 (Sess72 PR-5 起票)、 `useScrollPreservation` hook (Sess72 PR-1 #969)、 design_system.md §23 (4 要素 → 5 要素に拡張予定)

---

## References

- Sess33 議論 (6 人専門家チーム + フラット視点): A 案 (full-screen scroll) を段階適用、 D 案 (chips sticky) は P0 検証で再判定 → 不採用確定
- PR #782 (Sess33 PR-1): FormScreenHeader + BulkLogConfirm full-screen scroll 化
- PR #783 (Sess33 PR-2 hotfix): measureLayout を UIManager 公式 API に置換
- PR #784 (Sess33 PR-3): BonsaiCreate FormScreenHeader 化
- PR #785 (Sess33 PR-4): WorkLogConfirm FormScreenHeader 化
