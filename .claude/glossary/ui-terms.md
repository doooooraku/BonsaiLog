# UI 用語辞書 (案 2 説明品質ゲート SoT)

> 由来: Sess108 案 2 — Notion 215 prompts 分析。
> 用途: user に説明する時の「専門用語 → 平易訳」 対応表 (= SoT)。
>       check-explain-quality-hint.mjs / stop-explain-self-judge.mjs から参照される。
> 運用: 新出用語は PR で追記。 80 語以上を維持。

| 用語 | 平易訳 | 補足 |
| --- | --- | --- |
| c.tint | アクセント色 | テーマの強調カラー (= colors.tint) |
| BORDER_DEFAULT | 標準の枠線色 | デザインシステムの border 規定値 |
| KAV | キーボード被り防止のラッパー | KeyboardAvoidingView の略 |
| safeArea | 画面端の安全領域 | ノッチ / ホームバーを避けた表示エリア |
| paddingBottom | 下端の余白 | View の下方向の内側余白 |
| paddingTop | 上端の余白 | View の上方向の内側余白 |
| paddingHorizontal | 左右の余白 | 左右両側の内側余白を一括指定 |
| marginVertical | 上下の外側余白 | 上下方向の外側スペース |
| FlashList | 高速リスト | Shopify 製の大量項目高速描画リスト |
| FlatList | 標準リスト | React Native の標準リストコンポーネント |
| Hermes | RN の高速 JS エンジン | React Native 用の軽量 JS 実行エンジン |
| Reanimated | 滑らかなアニメーション lib | UI スレッドで動くアニメーション lib |
| Z-order | 描画の重ね順 | 画面上の前後関係 (= zIndex) |
| zIndex | 重ね順番号 | 大きいほど前面に表示 |
| debounce | 連続入力の間引き | 最後の入力から N ms 待って 1 回実行 |
| throttle | 一定間隔の頻度制限 | N ms に最大 1 回まで実行 |
| focusEffect | 画面フォーカス時の効果 | 画面が表示された時に走る処理 |
| useFocusEffect | 画面 focus 時のフック | React Navigation の focus 検知 hook |
| mockup | デザイン下書き | 画面の見た目イメージ図 |
| wireframe | 画面骨格図 | 配置のみの簡易図 (色なし) |
| Stack | 重ねる遷移 | 画面が積まれていく遷移方式 |
| Tab | 並列タブ | 下部の並列切替タブ |
| Drawer | サイドメニュー | 横から出てくるメニュー |
| NavigationContainer | 画面遷移管理 | React Navigation のルート設定 |
| persist | 端末保存 | 端末ストレージに状態を永続化 |
| store | 状態の中央倉庫 | アプリ全体で共有する状態保管庫 |
| Zustand | 軽量状態管理 lib | 小型 store を作る state management |
| Redux | 状態管理 lib | アクション → reducer 型の state management |
| migration | DB スキーマ更新 | DB の構造変更を順次適用する処理 |
| schema | DB の構造定義 | テーブル定義 / カラム定義 |
| FTS5 | 全文検索エンジン | SQLite 内蔵の全文検索モジュール |
| SQLite | 組み込み DB | アプリ内の軽量 DB |
| Drizzle | 型安全 ORM | TypeScript 用 SQL ビルダー |
| RRULE | 繰り返しルール式 | iCalendar 由来の繰り返し定義 (例: 毎週月曜) |
| WCAG | アクセシビリティ国際基準 | Web Content Accessibility Guidelines |
| AA | WCAG 中位レベル | コントラスト比 4.5:1 等 |
| AAA | WCAG 上位レベル | コントラスト比 7:1 等 |
| TTI | 操作可能になるまでの時間 | Time To Interactive |
| FCP | 最初の描画までの時間 | First Contentful Paint |
| FPS | 1 秒あたりのコマ数 | Frames Per Second (60 が滑らか) |
| JS thread | JS スレッド | RN の JavaScript 実行スレッド |
| UI thread | UI スレッド | ネイティブ描画用スレッド |
| bridge | JS / Native 橋渡し | RN 旧アーキの通信レイヤー |
| Fabric | RN 新アーキ描画 | New Architecture のレンダラー |
| TurboModules | RN 新アーキ通信 | New Architecture のモジュール仕組み |
| bridge overhead | 橋渡しコスト | bridge 経由通信の遅延 |
| memo | 再描画スキップ | React.memo で props 不変なら再 render しない |
| useMemo | 値のキャッシュ | 計算結果を依存配列が変わるまで再利用 |
| useCallback | 関数のキャッシュ | 関数を再生成せず参照を保つ |
| useEffect | 副作用フック | 描画後に走る処理 (API 呼び出し等) |
| useState | 状態フック | 画面内の状態を保持する hook |
| hook | フック | React の機能を関数で使う仕組み |
| atom | 最小部品 | デザインシステムの基本コンポーネント |
| molecule | 部品の組み合わせ | atom を組合せた中粒度部品 |
| organism | 画面の構成単位 | molecule を組合せた大粒度部品 |
| AppBar | 画面上部のバー | タイトル + 戻るボタン等を載せるバー |
| TabBar | 下部のタブバー | 画面切替用の下部バー |
| FAB | 浮き出しボタン | Floating Action Button (右下の丸ボタン) |
| Modal | 重ね表示 | 上に被さる別画面 |
| Sheet | 下から出るシート | Bottom Sheet (下から立ち上がる UI) |
| Toast | 短時間通知 | 数秒で消える通知 UI |
| Snackbar | アンドゥ通知 | 取り消し可能な短時間通知 |
| Skeleton | 読み込み骨格 | データ読込中の灰色プレースホルダ |
| Shimmer | 光る読み込み演出 | Skeleton + 光るアニメ |
| placeholder | 入力欄ヒント | 未入力時のグレー表示文字 |
| tap | タップ | 画面を指で 1 回触る |
| long press | 長押し | 画面を一定時間押し続ける |
| swipe | スワイプ | 指で払う動作 |
| gesture | ジェスチャ | 指の動作全般 |
| haptics | 触覚フィードバック | スマホの軽い振動応答 |
| accessibility | アクセシビリティ | 視覚障害等への配慮 |
| screen reader | 読み上げ機能 | iOS VoiceOver / Android TalkBack |
| i18n | 多言語化 | internationalization の略 (i + 18 + n) |
| locale | 言語ロケール | 言語 + 地域 (例: ja_JP) |
| RTL | 右→左言語 | Right-To-Left (アラビア語等) |
| LTR | 左→右言語 | Left-To-Right (日本語英語等) |
| TestFlight | iOS 配信ベータ | Apple のテスター配信サービス |
| Alpha track | Play Store ベータ | Google のテスター配信枠 |
| EAS | Expo の build / submit サービス | Expo Application Services |
| Metro | RN の bundler | JS をまとめる開発サーバ |
| prebuild | ネイティブ生成 | Expo の ios/android プロジェクト生成 |
| AAB | Android App Bundle | Play Store 配信用形式 |
| APK | Android Application Package | 端末直接インストール形式 |
| IPA | iOS アプリ pkg | App Store / TestFlight 配信形式 |
| AdMob | Google 広告 SDK | モバイル広告配信プラットフォーム |
| RevenueCat | 課金管理 SDK | サブスク / 一括購入の管理サービス |
| paywall | 課金訴求画面 | 有料機能の購入導線画面 |
| entitlement | 課金権利 | RevenueCat の有料権限定義 |
| consumable | 消費型課金 | 何度でも購入可能な課金 (コイン等) |
| subscription | サブスク | 月次 / 年次の定期課金 |
| restore purchase | 購入復元 | 既購入を別端末で再有効化する操作 |
| smoke test | 軽い動作確認 | リリース前の最低限の手動確認 |
| Maestro | E2E テスト lib | モバイル UI 自動操作テスト lib |
| ADR | アーキ決定記録 | Architecture Decision Record |
| AC | 受入基準 | Acceptance Criteria |
| SoT | 唯一の正 | Source of Truth |
| CI | 自動検査 | Continuous Integration |
| CD | 自動配信 | Continuous Delivery |
| PR | 変更提案 | Pull Request |
| MR | 変更提案 | Merge Request (GitLab 用語) |
| LGTM | レビュー OK | Looks Good To Me |
| WIP | 作業中 | Work In Progress |
| TODO | やること | 後で対応する作業マーカー |
| FIXME | 要修正 | 既知の不具合マーカー |
| OOM | メモリ不足落ち | Out Of Memory |
| jank | カクつき | フレーム落ちで動きが引っかかる現象 |
| layout shift | 表示位置ズレ | 描画後に要素位置が変わる現象 |
