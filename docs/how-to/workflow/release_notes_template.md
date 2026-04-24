# リリースノートテンプレート

ストアリリース時のバージョンタグとリリースノートの運用手順。

## バージョニング規則

Semantic Versioning に従う:

```
v{MAJOR}.{MINOR}.{PATCH}
```

| 変更種別                     | 例     |
| ---------------------------- | ------ |
| 破壊的変更（データ移行等）   | v2.0.0 |
| 新機能追加                   | v1.1.0 |
| バグ修正・パフォーマンス改善 | v1.0.1 |

## Git タグの作成

```bash
# タグを作成（アノテーション付き）
git tag -a v1.0.0 -m "Release v1.0.0"

# リモートに push
git push origin v1.0.0

# v* タグの push で build-ios-testflight.yml が自動実行される
```

## リリースノートの書き方

### 日本語テンプレート

```
【新機能】
・○○機能を追加しました

【改善】
・○○の操作性を向上しました
・○○の表示を最適化しました

【修正】
・○○が正しく表示されない問題を修正しました
```

### 英語テンプレート

```
What's New:
• Added [feature name]

Improvements:
• Improved [description]
• Optimized [description]

Bug Fixes:
• Fixed an issue where [description]
```

## ストア別のリリースノート配置

### App Store (fastlane)

```
fastlane/metadata/ja/release_notes.txt
fastlane/metadata/en-US/release_notes.txt
```

文字数上限: 4000 文字（通常は 500 文字以内に収める）

### Google Play

Play Console のリリースノート欄に直接入力、または fastlane で管理。

## リリースノートの原則

1. **ユーザー視点で書く**: 技術的な詳細ではなく、ユーザーにとっての価値を伝える
2. **簡潔に**: 5〜10 項目以内。長いリストは読まれない
3. **全対応言語で用意**: 最低限 ja と en-US。他の言語は英語をベースに翻訳
4. **バグ修正のみのリリース**: 「安定性の向上と軽微なバグ修正を行いました」で OK

## GitHub Release の作成（任意）

```bash
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "$(cat <<'EOF'
## What's New
- Added [feature]

## Improvements
- Improved [description]

## Bug Fixes
- Fixed [description]
EOF
)"
```
