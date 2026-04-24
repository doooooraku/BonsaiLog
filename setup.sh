#!/usr/bin/env bash
# setup.sh — テンプレートを新しいアプリ用に初期化するスクリプト
#
# 使い方: bash setup.sh
#
# このスクリプトは、コードベース内の {{PLACEHOLDER}} を
# あなたのアプリ固有の値に置き換え、テンプレートの雛形を整理します。

set -euo pipefail

echo "========================================"
echo "  App Factory テンプレート セットアップ"
echo "========================================"
echo ""

# --- 入力を収集 ---
read -rp "アプリ表示名（例: MyApp）: " APP_NAME
read -rp "アプリスラッグ（URL用、例: myapp）: " APP_SLUG
read -rp "Android パッケージ名（例: com.yourcompany.myapp）: " ANDROID_PACKAGE
read -rp "iOS バンドルID（例: com.yourcompany.myapp）: " IOS_BUNDLE_IDENTIFIER
read -rp "ディープリンクスキーム（例: myapp）: " APP_SCHEME
read -rp "アプリの一行説明: " DESCRIPTION
read -rp "EAS プロジェクトID（不明な場合は空欄でOK）: " EAS_PROJECT_ID
echo ""
echo "Expo 標準のチュートリアル画面（HelloWave / Step 1, 2, 3 / explore タブ等）を削除しますか？"
echo "  Y = 削除する（推奨：自分のアプリを作り始めるなら）"
echo "  N = 残す（テンプレートの動作確認をしたい場合）"
read -rp "削除する？(Y/n): " DELETE_SAMPLES
DELETE_SAMPLES=${DELETE_SAMPLES:-Y}

echo ""
echo "--- 入力内容の確認 ---"
echo "  APP_NAME:               $APP_NAME"
echo "  APP_SLUG:               $APP_SLUG"
echo "  ANDROID_PACKAGE:        $ANDROID_PACKAGE"
echo "  IOS_BUNDLE_IDENTIFIER:  $IOS_BUNDLE_IDENTIFIER"
echo "  APP_SCHEME:             $APP_SCHEME"
echo "  DESCRIPTION:            $DESCRIPTION"
echo "  EAS_PROJECT_ID:         ${EAS_PROJECT_ID:-"（スキップ）"}"
echo ""
read -rp "この内容で進めますか？ (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "中断しました。"
  exit 1
fi

echo ""
echo "=== プレースホルダーを置換中 ==="

# --- ソースファイル内のプレースホルダーを置換 ---
replace_placeholder() {
  local placeholder="$1"
  local value="$2"
  echo "  $placeholder → $value"

  # sed用に特殊文字をエスケープ
  local escaped_value
  escaped_value=$(printf '%s\n' "$value" | sed -e 's/[\/&]/\\&/g')

  find . -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" \
       -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
       -o -name "*.sh" -o -name "*.env*" -o -name ".env.example" \
       -o -name "app.config.ts" -o -name "app.json" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -name "setup.sh" \
    -exec sed -i "s/${placeholder}/${escaped_value}/g" {} +
}

replace_placeholder "{{APP_NAME}}" "$APP_NAME"
replace_placeholder "{{APP_SLUG}}" "$APP_SLUG"
replace_placeholder "{{ANDROID_PACKAGE}}" "$ANDROID_PACKAGE"
replace_placeholder "{{IOS_BUNDLE_IDENTIFIER}}" "$IOS_BUNDLE_IDENTIFIER"
replace_placeholder "{{APP_SCHEME}}" "$APP_SCHEME"
replace_placeholder "{{DESCRIPTION}}" "$DESCRIPTION"

if [[ -n "$EAS_PROJECT_ID" ]]; then
  replace_placeholder "{{EAS_PROJECT_ID}}" "$EAS_PROJECT_ID"
fi

# --- .env.example を更新 ---
echo ""
echo "=== .env.example を更新中 ==="
sed -i "s/^APP_NAME=.*/APP_NAME=$APP_NAME/" .env.example
sed -i "s/^APP_SLUG=.*/APP_SLUG=$APP_SLUG/" .env.example
sed -i "s/^ANDROID_PACKAGE=.*/ANDROID_PACKAGE=$ANDROID_PACKAGE/" .env.example
sed -i "s/^IOS_BUNDLE_IDENTIFIER=.*/IOS_BUNDLE_IDENTIFIER=$IOS_BUNDLE_IDENTIFIER/" .env.example

# --- .env.example から .env をコピー ---
cp .env.example .env
echo "  .env.example から .env を作成しました"

# --- app.json を更新 ---
echo ""
echo "=== app.json を更新中 ==="
node -e "
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const expo = json.expo || json;
  expo.name = '$APP_NAME';
  expo.slug = '$APP_SLUG';
  expo.scheme = '$APP_SCHEME';
  if (expo.description !== undefined || '$DESCRIPTION') {
    expo.description = '$DESCRIPTION';
  }
  fs.writeFileSync('app.json', JSON.stringify(json, null, 2) + '\n');
"
echo "  app.json を更新しました"

# --- package.json の name を更新 ---
echo ""
echo "=== package.json を更新中 ==="
node -e "
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  json.name = '$APP_SLUG';
  fs.writeFileSync('package.json', JSON.stringify(json, null, 2) + '\n');
"
echo "  package.json の name を更新しました"

# --- テンプレートファイルの整理 ---
echo ""
echo "=== テンプレートファイルを整理中 ==="
rm -f TEMPLATE_README.md
echo "  TEMPLATE_README.md を削除しました"

# --- サンプルコードの削除（オプション） ---
if [[ "$DELETE_SAMPLES" =~ ^[Yy]$ ]]; then
  echo ""
  echo "=== サンプルコードを削除中 ==="

  # チュートリアル画面（Expo標準サンプル）
  rm -f "app/(tabs)/explore.tsx"
  rm -f components/hello-wave.tsx
  rm -f components/parallax-scroll-view.tsx
  rm -f assets/images/partial-react-logo.png
  rm -f assets/images/react-logo.png
  rm -f assets/images/react-logo@2x.png
  rm -f assets/images/react-logo@3x.png

  # サンプル機能ディレクトリ
  rm -rf src/features/example

  # index.tsx を最小構成に置換
  cat > "app/(tabs)/index.tsx" <<'EOF'
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{{APP_NAME}}</ThemedText>
      <ThemedText>ここからアプリを作り始めましょう。</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});
EOF
  # 上記の {{APP_NAME}} を実際のアプリ名で置換
  sed -i "s/{{APP_NAME}}/$APP_NAME/g" "app/(tabs)/index.tsx"

  # _layout.tsx の (tabs) 構成を簡略化（タブが1つだけになるので）
  echo "  サンプルコードを削除しました"
  echo "  ⚠ Tabs 構成を残しているので、不要なら app/(tabs)/_layout.tsx を編集してください"
fi

# --- Claude Code subagents を user-level にインストール ---
# 配置先: ~/.claude/agents/ (user scope)
# 理由: 現バージョンの Claude Code は project-level .claude/agents/ を認識しない (2026-04-11 検証)
# cp -n で既存ファイルは保護 (ユーザーがカスタマイズしている可能性)
echo ""
echo "=== Claude Code subagents をインストール中 ==="
if [[ -d ".claude/agents" ]]; then
  USER_AGENTS_DIR="$HOME/.claude/agents"
  mkdir -p "$USER_AGENTS_DIR"
  installed=0
  skipped=0
  for agent_file in .claude/agents/*.md; do
    [[ -f "$agent_file" ]] || continue
    base=$(basename "$agent_file")
    if [[ -f "$USER_AGENTS_DIR/$base" ]]; then
      echo "  - $base (既に存在、スキップ)"
      skipped=$((skipped + 1))
    else
      cp "$agent_file" "$USER_AGENTS_DIR/$base"
      echo "  + $base → $USER_AGENTS_DIR/"
      installed=$((installed + 1))
    fi
  done
  echo "  合計: ${installed} installed, ${skipped} skipped"
  echo "  /agents コマンドで認識されているか確認してください"
else
  echo "  .claude/agents/ が無いのでスキップ"
fi

# --- 依存関係のインストール ---
echo ""
echo "=== 依存関係をインストール中 ==="
pnpm install

# --- 検証 ---
echo ""
echo "=== 検証を実行中 ==="
pnpm verify || echo "警告: 検証で問題がありました — 上の出力を確認してください"

echo ""
echo "========================================"
echo "  セットアップ完了！"
echo ""
echo "  次のステップ:"
echo "    1. .env を確認してAPIキーを設定する"
echo "    2. pnpm dev で開発を開始する"
echo "    3. docs/ 内のドキュメントを参照してカスタマイズする"
echo "    4. Claude Code を再起動して /agents で subagents を確認する"
echo "========================================"
