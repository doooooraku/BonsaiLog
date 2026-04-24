# デバッグガイド

## デバッグセッションの管理

デバッグツールキット（`scripts/debug/`）を使うと、デバッグの手順を整理しながら、ログやスクリーンショットなどを自動で集めることができます。

### セッションを開始する

```bash
pnpm debug:start           # 画面録画あり
pnpm debug:start --no-record  # 画面録画なし（より速い）
```

開始すると、以下の処理が自動で行われます:

1. デバイスの接続を確認
2. logcat のバッファをクリア
3. 「操作前」のスクリーンショットを撮影
4. バックグラウンドで logcat の収集を開始
5. 画面録画を開始（オプション）

### セッションを終了する

```bash
pnpm debug:stop
```

終了すると、すべてのデータが `.debug-sessions/session_YYYYMMDD_HHMMSS/` に保存されます:

| ファイル名      | 説明                                 |
| --------------- | ------------------------------------ |
| `before.png`    | 操作前のスクリーンショット           |
| `after.png`     | 操作後のスクリーンショット           |
| `logcat.log`    | セッション中の全ログ                 |
| `recording.mp4` | 画面録画                             |
| `meminfo.txt`   | メモリ使用量のスナップショット       |
| `summary.md`    | セッションのまとめ（エラー抽出つき） |

### セッションの状態を確認する

```bash
pnpm debug:status
```

## リアルタイム監視

```bash
pnpm monitor
```

監視スクリプトは以下を追跡します:

- アプリプロセスの PID
- クラッシュと ANR（Application Not Responding）
- エラーレベルのログメッセージ
- クラッシュログの自動保存

## よくあるデバッグの場面

### アプリがクラッシュしたとき

1. デバッグセッションを開始する: `pnpm debug:start`
2. クラッシュを再現する
3. セッションを終了する: `pnpm debug:stop`
4. `.debug-sessions/session_*/summary.md` でエラー内容を確認する
5. `logcat.log` でスタックトレース（Stack Trace）の詳細を確認する

### メモリの問題が疑われるとき

1. 問題が起きそうな時間だけアプリを動かす
2. セッションを終了して `meminfo.txt` を取得する
3. メモリ使用量の変化を比べる

### WSL2 を使っている場合

WSL2 で実機を使うときの注意点:

- スクリプトは `ADB_SERVER_SOCKET` の問題を自動的に処理します
- 接続の確認には `env -u ADB_SERVER_SOCKET adb devices` を使ってください
- ポート転送は `dev-start.sh` によって自動的に設定されます
