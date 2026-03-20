# yt-dlp-ui 仕様書

## 概要

YouTubeのリンクを貼り付けると動画をダウンロードできるデスクトップアプリケーション。
ダウンロードしたファイルはAdobe Premiereで編集する用途を想定。

---

## 機能仕様

### 1. URLダウンロード

- テキストボックスにURLを入力し「開始」ボタンでダウンロード開始
- 改行区切りで複数URLを一括入力可能
- 各ダウンロードは独立して並行実行される

### 2. ダウンロード制御

- 一時停止 / 再開 / 中断が可能
- 中断時は部分ファイルを削除する

### 3. ダウンロードリスト表示

- サムネイル + 動画タイトルを表示
- プログレスバーを背景に表示
- ダウンロード状態（待機中・DL中・一時停止・完了・エラー）を視覚的に表示

### 4. 出力フォーマット

- **mp4**（動画）: H.264 + AAC コーデック（Adobe Premiere互換）
- **mp3**（音声のみ）: 音声抽出モード
- ダウンロード開始前にフォーマットを選択可能

### 5. 画質・音質設定

- デフォルトは最大品質
- 解像度・音質をカスタマイズ可能
- 設定値はアプリ再起動後も保持される

### 6. 保存先設定

- 保存先ディレクトリを任意に選択可能
- 選択した保存先はアプリ再起動後も保持される

### 7. ダウンロード完了通知

- デスクトップ通知でダウンロード完了を通知

### 8. ダウンロード履歴

- タイトル・サムネイル・ダウンロード日時・ファイルパスを記録
- 履歴から再ダウンロード可能
- 履歴エントリの個別削除が可能

### 9. テーマ

- ダーク / ライト切替
- OS設定連動（システムテーマに自動追従）

### 10. バイナリ管理

- yt-dlp + ffmpeg をアプリに同梱
- 初回起動時に自動ダウンロード（`LibraryInstaller`使用推奨）
- セットアップ中はローディング画面を表示

---

## スコープ外（将来対応）

- プレイリストURL対応

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Tauri |
| フロントエンド | Bun + Solid.js (TypeScript) + Vite |
| バックエンド | Rust |
| DLエンジン | `yt-dlp` crate（バイナリラッパー） |
| メディア処理 | `ffmpeg` crate |
| 永続化 | JSONファイル（`settings.json`, `history.json`） |
| コーデック | H.264 + AAC |

---

## デザイン方針

**Mix: Glassmorphism + Neumorphism 2.0** のハイブリッドスタイルを採用。

### スタイルルール

| UI要素 | スタイル | 実装 |
|---|---|---|
| カード / リストアイテム | Glassmorphism | 半透明背景(`rgba(255,255,255,0.05)`) + `backdrop-filter: blur(16px)` + 1px半透明ボーダー |
| 入力エリア | Glassmorphism | 半透明背景 + ブラー + 半透明ボーダー |
| 操作ボタン（pause/cancel等） | Neumorphism | 凹凸シャドウ（ライト/ダーク2方向） |
| プライマリボタン（DL開始等） | Gradient + Glow | `linear-gradient` + `box-shadow`グロウ |
| プログレスバー | Gradient | `linear-gradient(#0EA5E9, #38BDF8)` |
| セレクト / ドロップダウン | Neumorphism | 凹凸シャドウ + ボーダー |
| サイドバー | Solid | ソリッド背景（`--bg-inset`） |

### フォント
- **JetBrains Mono**: データ値、技術情報、モノスペース表示
- **Inter**: UIラベル、タイトル、本文

---

## 画面構成

### メイン画面（ダウンロード）

- URL入力テキストエリア（複数行対応）
- フォーマット選択（mp4 / mp3）
- 「開始」ボタン
- ダウンロードリスト（サムネイル + タイトル + プログレスバー + 制御ボタン）

### 履歴画面

- 過去のダウンロード一覧
- タイトル・サムネイル・DL日時・ファイルパス表示
- 再ダウンロード・削除ボタン

### 設定画面

- 保存先ディレクトリ選択
- 画質・音質設定
- テーマ切替（ダーク / ライト / システム）

### 初回セットアップ画面

- バイナリ（yt-dlp, ffmpeg）ダウンロード中のローディング表示
- 進捗状況の表示

---

## プロジェクト構造

```
yt-dlp-ui/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/              # Tauri IPCコマンド
│   │   │   ├── download.rs
│   │   │   ├── settings.rs
│   │   │   └── history.rs
│   │   ├── downloader/            # DLエンジン
│   │   │   ├── manager.rs         # 並行DL管理（中核）
│   │   │   ├── task.rs            # 個別DLタスク
│   │   │   └── progress.rs
│   │   ├── storage/               # 永続化（JSON）
│   │   └── models/                # データ型定義
│   └── tauri.conf.json
├── src/                           # Solid.js フロントエンド
│   ├── components/
│   │   ├── DownloadInput.tsx
│   │   ├── DownloadList.tsx
│   │   ├── DownloadItem.tsx
│   │   ├── HistoryView.tsx
│   │   ├── SettingsView.tsx
│   │   └── Layout.tsx
│   ├── stores/
│   │   ├── downloadStore.ts
│   │   ├── settingsStore.ts
│   │   ├── historyStore.ts
│   │   └── themeStore.ts
│   └── lib/
│       ├── tauri.ts               # IPC ラッパー
│       └── types.ts
└── package.json
```

---

## デザイントークン（カラーセット）

CSS変数として実装し、テーマ切替時に一括変更する。

### ベースカラー

| 変数名 | ダークモード | ライトモード |
|---|---|---|
| `--bg-primary` | `#0A0F1C` | `#F1F5F9` |
| `--bg-surface` | `#1E293B` | `#E2E8F0` |
| `--bg-inset` | `#0F172A` | `#E8ECF1` |
| `--accent` | `#0EA5E9` | `#0EA5E9` |
| `--text-primary` | `#FFFFFF` | `#0F172A` |
| `--text-secondary` | `#94A3B8` | `#475569` |
| `--text-tertiary` | `#64748B` | `#94A3B8` |
| `--text-muted` | `#475569` | `#CBD5E1` |
| `--text-on-accent` | `#FFFFFF` | `#FFFFFF` |
| `--border` | `#334155` | `#CBD5E1` |
| `--error` | `#EF4444` | `#EF4444` |
| `--success` | `#22C55E` | `#22C55E` |

### Neumorphism シャドウ

| 変数名 | ダークモード | ライトモード |
|---|---|---|
| `--neu-surface` | `#1A1F2E` | `#E2E8F0` |
| `--neu-shadow-dark` | `#0A0F1C88` | `#B0B8C888` |
| `--neu-shadow-light` | `#2A304066` | `#FFFFFF` |

### Glassmorphism

| 変数名 | ダークモード | ライトモード |
|---|---|---|
| `--glass-fill` | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.4)` |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.6)` |
| `--glass-input` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.5)` |

### グラデーション

| 変数名 | 値 |
|---|---|
| `--gradient-start` | `#0EA5E9` |
| `--gradient-end` | `#38BDF8` |
| `--gradient-glow` (dark) | `rgba(14,165,233,0.27)` |
| `--gradient-glow` (light) | `rgba(14,165,233,0.2)` |

---

## IPC設計

### Commands（Frontend → Backend）

| コマンド | 説明 |
|---|---|
| `start_downloads` | URLリストからダウンロード開始 |
| `pause_download` | 指定DLを一時停止 |
| `resume_download` | 指定DLを再開 |
| `cancel_download` | 指定DLを中断（部分ファイル削除） |
| `get_settings` | 現在の設定を取得 |
| `update_settings` | 設定を更新・保存 |
| `select_directory` | ディレクトリ選択ダイアログを開く |
| `get_history` | ダウンロード履歴を取得 |
| `delete_history_entry` | 履歴エントリを削除 |
| `redownload_from_history` | 履歴から再ダウンロード |

### Events（Backend → Frontend）

| イベント | 説明 |
|---|---|
| `download-metadata` | メタデータ（タイトル・サムネイル）取得完了 |
| `download-progress` | ダウンロード進捗更新 |
| `download-status-changed` | ステータス変更（待機→DL中→完了等） |
| `download-complete` | ダウンロード完了 |
| `download-error` | エラー発生 |

---

## 実装順序

1. Tauriプロジェクト初期化 + Solid.js設定 + 基本レイアウト
2. Storage（settings.json, history.json）
3. DownloadManager + 単一URLダウンロード + 進捗イベント
4. フロントエンド: DL入力 + リスト + 進捗表示
5. 並行DL + Pause/Resume/Cancel
6. 設定画面 + 永続化
7. 履歴機能
8. テーマ切替 + デスクトップ通知
9. mp3対応 + 品質カスタマイズ
10. バイナリバンドル最終調整 + ビルド

---

## 設計上の注意事項

- **Pause/Resume**: yt-dlp crateの対応状況を確認し、未対応なら`CancellationToken` + 再開時continueで対応
- **履歴データ量**: JSON性能限界あり。将来的にSQLite移行可能な設計にする（Storage層を抽象化）
- **macOS対応**: Gatekeeper対応（バイナリ署名 / quarantine属性除去）
- **バイナリ管理**: `LibraryInstaller`による初回自動DLでアプリサイズを軽減
