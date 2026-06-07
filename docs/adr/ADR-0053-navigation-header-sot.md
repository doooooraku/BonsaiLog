# ADR-0053: Navigation Header SoT — Expo Stack native header に統一

- **Status**: Accepted
- **Date**: 2026-06-06
- **Session**: Sess66 PR5
- **Related**: ADR-0020 (root Stack 構成) / ADR-0021 (theme system) / ADR-0024 (modal pattern) / ADR-0052 (Dark Theme Cascade) / Sess65 PR1 #938 (SearchHeader showBack 暫定追加) / R-58 (新)
- **Supersedes**: なし (Sess65 PR1 で暫定導入した SearchHeader.showBack 路線を deprecate)

## Context

BonsaiLog の戻る動線が **4 種類のパターンで並立** していた:

| 画面                                                                  | パターン                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `app/settings/index.tsx`                                              | SearchHeader showBack 自前 (Sess65 PR1 で追加)                                              |
| `app/settings/archived.tsx` / `language.tsx` / `app/backup/index.tsx` | Expo Stack native header (`<Stack.Screen options={{title}}/>`)                              |
| `app/tag-edit.tsx`                                                    | Stack native header + 自前 `Pressable router.back()` (キャンセル button、 ヘッダーではない) |
| `app/pro.tsx`                                                         | Modal sheet (`presentation: 'modal'`) + 自前 close ボタン                                   |
| `app/export/*`                                                        | `headerShown: false` (FormScreenHeader 自前)                                                |

これは UX 一貫性 (P4「控えめで美しく」) を破綻させ、 ユーザー学習コストを増加させていた。 特に Sess65 PR1 で **設定画面のみ** SearchHeader showBack を追加した結果、 設定画面と子画面 (archived / language) で戻るボタンの **位置・色・サイズ・タップ範囲** が不揃いになる事象が発生。

## Decision

**全 root Stack 子画面で Expo Stack native header を Source of Truth に統一** する。 OS (iOS / Android) が「画面遷移用の標準パーツ」 として提供する header を採用し、 a11y / RTL / swipe-back ジェスチャ / iOS Large Title / Android Material 3 Top App Bar 等の OS 機能と完全統合する。

### 採用パターン

```tsx
// app/<group>/<screen>.tsx
import { Stack } from 'expo-router';

export default function MyScreen() {
  return (
    <ThemedView>
      <Stack.Screen options={{ title: '画面タイトル' }} />
      <ScrollView>...</ScrollView>
    </ThemedView>
  );
}
```

```tsx
// app/<group>/_layout.tsx
import { Stack } from 'expo-router';
import { useColors } from '@/src/core/theme/useColors';

export default function GroupLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text, fontFamily: 'NotoSerifJP_500Medium' },
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
```

### 採用理由

1. **学習コスト最小**: iPhone / Android ユーザーは他アプリで毎日この戻るボタンを使う、 BonsaiLog 独自パターン廃止で「あ、 これ押せば前に戻れる」 が一発で伝わる
2. **OS 機能と完全統合**:
   - iOS 「画面左端から swipe で戻る」 ジェスチャ自動追従
   - Android 物理戻るボタン自動連動
   - VoiceOver / TalkBack screen reader 完全統合 (a11y)
   - RTL (Arabic / Hebrew / Urdu / Persian) 時の `<` → `>` 自動反転
   - iOS Large Title (iOS 11+) / Android Material 3 Top App Bar 追従
3. **メンテ不要**: OS バージョンアップでデザインが更新されても自動追従、 自前 component の追従コスト 0
4. **a11y `accessibilityLabel` 漏れリスク 0**: OS 標準ヘッダーは a11y 完備、 自前 SearchHeader は labels を都度書く必要があり漏れリスク
5. **パフォーマンス軽量**: React コンポーネントではなく native module 描画、 自前 SearchHeader より画面遷移時 30〜50ms 短縮事例あり (RN bridge オーバーヘッド回避)
6. **dark theme cascade 統合**: ADR-0052 の `useColors()` パターンと `screenOptions` で完全整合、 light/dark 切替が瞬時反映

### 不採用とした代替案

#### Alt-A: SearchHeader showBack 路線拡張 (全画面に SearchHeader 配置)

- 不採用理由: 全画面に SearchHeader 配線が必要で工数大、 OS 機能 (swipe-back / RTL / a11y) を独自再実装する必要があり開発・メンテコスト過大、 ブランド NotoSerifJP は `headerTitleStyle.fontFamily` で吸収可能

#### Alt-B: 自前 Pressable + BackIcon 全画面統一

- 不採用理由: OS 機能完全自前実装 = 同上 + より極端

#### Alt-C: 現状の 4 パターン並立維持

- 不採用理由: 学習コスト最大、 P4 違反継続、 Sess65 ユーザー報告「設定戻れない」 のような事故の再発リスク

## Consequences

### Positive

- 戻るボタンの位置・色・サイズが OS 標準で完全統一、 UX 一貫性が機械的に保証
- OS 機能 (swipe-back / RTL / VoiceOver / Material 3) を無料で享受
- SearchHeader.tsx のメンテ負荷削減 (header の責務削減)
- ADR-0052 dark cascade と統合 (`useColors()` で header 配色追従)
- 新規画面追加時の navigation 規約が明確 (PR テンプレ §7.6 で強制可能)

### Negative

- 既存 SearchHeader 利用箇所 (タブメイン画面 4 つ: 盆栽 / 予定 / 記録 / ふりかえり) は維持 (タブ画面は header に検索 + 設定 icon の独自配置が必要)
- Modal sheet (pro.tsx) は別パターン (`presentation: 'modal'` + 自前 close ボタン) で残置、 ADR-0024 と整合

### Neutral

- iOS Large Title は使わず中タイトル維持 (NotoSerifJP 22pt design system 整合)

## Implementation (Sess66 PR5)

1. `app/settings/_layout.tsx`: `headerShown: false` 撤去、 `screenOptions` で headerStyle / Tint / TitleStyle (NotoSerifJP) 設定
2. `app/settings/index.tsx`:
   - `SearchHeader showBack` 撤去
   - `<Stack.Screen options={{ title: t('tabSettings') }} />` に置換
   - SearchHeader import 削除
3. `src/features/bonsai/SearchHeader.tsx`: `showBack` prop は **deprecated**、 dev mode で `console.warn` 警告
4. `docs/reference/design_system.md` §28 (新): Navigation Header SoT 規約明文化
5. 既存 Stack native header 採用画面 (`archived` / `language` / `backup` / `tag-edit` 等) は変更なし、 暗黙の SoT が明示的 SoT に格上げ

## ペルソナ評価 (R-10)

| ペルソナ                          | 評価 | 理由                                                                          |
| --------------------------------- | ---- | ----------------------------------------------------------------------------- |
| シニア初心者 (60 代女性)          | ◎    | OS 標準戻るボタンは他アプリで毎日見ているので迷わない                         |
| 業務プロ (40 代男性、 100 鉢管理) | ○    | swipe-back ジェスチャが native 動作で素早く戻れる                             |
| 高齢者 (70 代男性、 老眼)         | ◎    | OS 標準のタップ範囲 (44dp+) で押しやすい、 ラベル「戻る」 が iOS で表示される |
| RTL ユーザー (Arabic 等)          | ◎    | navigation arrow が `<` → `>` に自動反転、 自前実装では別途必要               |
| 開発者ペルソナ                    | ◎    | 新規画面追加時の navigation 規約が 1 行で済む、 メンテ不要                    |

## R-58 (新) recurrence-prevention 追加項目

「画面追加 PR では `<Stack.Screen options>` で title 設定、 自前 header 禁止 (タブメインを除く)。 設定画面追加時は `_layout.tsx` で screenOptions 継承を確認」 を `.claude/recurrence-prevention/specialized.md` に追加 (PR5 同梱)。

## 関連リンク

- ADR-0020: root Stack 構成 (本 ADR の前提)
- ADR-0024 (Notes Amended): modal = regular screen pattern (pro.tsx 例外維持)
- ADR-0052: Dark Theme Cascade Pattern (本 ADR の `useColors()` 統合先)
- Sess65 PR1 #938: SearchHeader.showBack 暫定追加 (本 ADR で deprecate)
- Sess66 PR3 #940: ESLint rule + a11y CI + ADR-0052
- Sess66 PR4 #941: DARK_TOKENS 宵墨 warm pivot
- Sess66 PR6 (予定、 3 分割): ThemedView/ThemedText 全画面適用

---

## Amendment (2026-06-07 / Sess74 PR-3 / E2 動的 title 更新)

### 背景

Sess74 PR #978 実機検証で **E2 = Stack header transient re-render 漏れ bug** を確認。 言語切替直後、 親画面 (例: 設定 root) の Stack header text が前言語のまま残る (例: 中国語に切替えても「Settings」 en のまま、 画面遷移で再評価され「设置」 zh 表示)。 Sess73 でも同型観察あり (en+ru transit 混在)。

### 真因 (一次資料調査)

| 項目        | 実態                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| i18n store  | Zustand + selector `useI18nStore((s) => s.lang)` で正しく re-render trigger                                                          |
| root Stack  | `app/_layout.tsx:167` `<Stack.Screen name="settings" options={{ headerShown: false }} />` で settings group 子画面の lazy cycle 起点 |
| 子 Stack    | `app/settings/_layout.tsx` で `useColors()` のみ refresh、 child screen の Stack.Screen options 再評価 trigger なし                  |
| 個別 screen | `<Stack.Screen options={{ title: t('xxx') }} />` は **初回 mount 時のみ評価**、 lang 変更で再評価されない (Expo Router 仕様)         |

→ React Navigation の **declarative API は初回 mount のみ反映**、 lang 動的更新には **imperative API (`useNavigation().setOptions()`) が必要**。

### Amendment 採用 pattern

```tsx
// app/<group>/<screen>.tsx
import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { useTranslation } from '@/src/core/i18n/i18n';

export default function MyScreen() {
  const { t, lang } = useTranslation();
  const navigation = useNavigation();

  // E2 動的 title 更新 (lang 変更で即時反映、 transient bug 解消)
  React.useEffect(() => {
    navigation.setOptions({ title: t('xxx') });
  }, [navigation, t, lang]);

  return (
    <ThemedView>
      <Stack.Screen options={{ title: t('xxx') }} /> {/* 初回 mount 用 fallback */}
      <ScrollView>...</ScrollView>
    </ThemedView>
  );
}
```

### 採用理由

1. **公式 API**: React Navigation 公式の `useNavigation().setOptions()` で imperative update
2. **`Stack.Screen options` 併存**: 初回 mount 用 fallback として残す (= 既存コード変更最小、 退行リスク低)
3. **lang dependency 明示**: useEffect deps に `lang` を含めることで「lang 変更時のみ trigger」 を保証 (毎 render trigger 回避)

### 適用範囲 (Sess74 PR-3 = 個別 screen file 5 件)

| file                            | 既存                                                     | Amendment 適用            |
| ------------------------------- | -------------------------------------------------------- | ------------------------- |
| `app/settings/index.tsx:127`    | `<Stack.Screen options={{ title: t('tabSettings') }} />` | useEffect setOptions 追加 |
| `app/settings/archived.tsx:164` | `t('settingsArchiveTitle')`                              | 同上                      |
| `app/settings/language.tsx:38`  | `t('settingsLanguageRowLabel')`                          | 同上                      |
| `app/backup/index.tsx:115`      | `t('backupTitle')`                                       | 同上                      |
| `app/tag-edit.tsx`              | (空 title)                                               | 該当なし (skip)           |

### 別 PR スコープ (modal 系 layout で title 集約)

`app/(modals)/_layout.tsx:34-56` で 6 screen の title を集約定義 (`SpeciesPicker / StylePicker / WorkLog / BulkLog / BonsaiCreate / photo-viewer`)。 各 screen file での setOptions 追加は別 PR 候補 (PR-4)。

### R-65 (新) recurrence-prevention 起票候補

「Stack 子画面で title を持つ screen は **`<Stack.Screen options>` (fallback) + `useEffect navigation.setOptions` (動的更新) 両方使用必須**」 を `.claude/recurrence-prevention/specialized.md` に追加 (本 PR で起票)。

### 関連

- Sess74 PR #978 実機検証 REPORT (E2 発端)
- Sess73 BottomCtaBar verify 時 en+ru transit 観察 (同型既知)
- React Navigation 公式 docs: useNavigation().setOptions()
