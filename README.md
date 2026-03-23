<div align="center">
  <img src="src/assets/logo.png" alt="TubeSaver" height="80">
  <p>YouTube動画をかんたんにダウンロードできるデスクトップアプリ</p>

  <a href="https://github.com/manomekun/yt-dlp-ui/releases/latest">
    <img src="https://img.shields.io/github/v/release/manomekun/yt-dlp-ui?label=%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89&style=for-the-badge&color=EF4444" alt="ダウンロード">
  </a>
</div>

---

## TubeSaverとは？

TubeSaverは、YouTubeの動画や音声をダウンロードするためのデスクトップアプリです。
URLを貼り付けてボタンを押すだけで、動画（MP4）や音声（MP3）を保存できます。

ダウンロードしたファイルはAdobe Premiereなどの動画編集ソフトでそのまま使えます。

## 主な機能

- **かんたん操作** — URLを貼り付けて「ダウンロード開始」を押すだけ
- **動画 / 音声** — MP4（動画）とMP3（音声のみ）を選べる
- **複数同時ダウンロード** — 複数のURLを改行で入力すれば一括ダウンロード
- **一時停止 / 中断** — ダウンロードを一時停止したり、途中で中断できる
- **ダウンロード履歴** — 過去にダウンロードした動画を一覧で確認、再ダウンロードも可能
- **画質・音質の設定** — 最高品質（4K）から480pまで選択可能
- **ダーク / ライトテーマ** — 好みの見た目に切り替え可能
- **Adobe Premiere対応** — H.264 + AACコーデックで保存されるので、Premiereでそのまま編集できる

## ダウンロード

**[最新版をダウンロード](https://github.com/manomekun/yt-dlp-ui/releases/latest)**

| OS | ファイル |
|---|---|
| macOS（Apple Silicon） | `TubeSaver_x.x.x_aarch64.dmg` |
| macOS（Intel） | `TubeSaver_x.x.x_x64.dmg` |
| Windows | `TubeSaver_x.x.x_x64-setup.exe` |
| Linux | `tubesaver_x.x.x_amd64.deb` / `.AppImage` |

> **Apple Siliconって何？** — 2020年以降のMac（M1/M2/M3/M4チップ搭載）はApple Silicon版を選んでください。それ以前のMacはIntel版を選んでください。

## インストール方法

### macOS（かんたん）

ターミナルを開いて、以下をコピペして Enter を押してください：

```bash
curl -fsSL https://raw.githubusercontent.com/manomekun/yt-dlp-ui/main/install.sh | bash
```

> **ターミナルの開き方** — Spotlight（`⌘ + Space`）で「ターミナル」と検索して開けます。

ダウンロードからインストール、セキュリティ設定まですべて自動で行われます。Apple Silicon / Intel も自動判定します。

### macOS（Homebrew）

```bash
brew install manomekun/apps/tubesaver
```

### macOS（手動）

1. 上のリンクから `.dmg` ファイルをダウンロード
2. ダウンロードした `.dmg` を開く
3. `TubeSaver` を `Applications` フォルダにドラッグ
4. 初回起動時に「開発元が未確認」と表示されて開けない場合、ターミナルで以下を実行：
   ```
   xattr -cr /Applications/TubeSaver.app
   ```
   > macOS 15 以降、署名されていないアプリの起動制限が強化されました。上記コマンドでダウンロード時に付与される隔離属性を除去することで起動できます。

### Windows

1. 上のリンクから `.exe` ファイルをダウンロード
2. ダウンロードしたファイルを実行
3. SmartScreen の警告が出た場合：「詳細情報」→「実行」をクリック

### Linux

```bash
# .deb の場合
sudo dpkg -i tubesaver_*.deb

# .AppImage の場合
chmod +x TubeSaver_*.AppImage
./TubeSaver_*.AppImage
```

## 使い方

1. TubeSaver を起動
2. ダウンロードしたいYouTube動画のURLをコピー
3. テキストボックスに貼り付け（複数URLは改行で区切る）
4. 「動画（MP4）」か「音声のみ（MP3）」を選ぶ
5. 「ダウンロード開始」ボタンをクリック
6. 完了するとデスクトップ通知でお知らせ

> 初回起動時は yt-dlp と ffmpeg が自動でダウンロードされます。少し時間がかかりますが、2回目以降は即座に使えます。

## 開発者向け情報

### 技術スタック

- **Tauri v2** — デスクトップアプリフレームワーク
- **Solid.js** — フロントエンド（TypeScript）
- **Rust** — バックエンド
- **yt-dlp** — 動画ダウンロードエンジン
- **ffmpeg** — メディア処理

### 開発環境のセットアップ

```bash
# 依存関係のインストール
bun install

# 開発サーバー起動
cargo tauri dev

# プロダクションビルド
cargo tauri build
```

## ライセンス

MIT
