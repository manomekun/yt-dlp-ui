#!/bin/bash
set -euo pipefail

# TubeSaver インストールスクリプト
# 使い方: curl -fsSL https://raw.githubusercontent.com/manomekun/yt-dlp-ui/main/install.sh | bash

APP_NAME="TubeSaver"
REPO="manomekun/yt-dlp-ui"
INSTALL_DIR="/Applications"

echo "🎬 ${APP_NAME} インストーラー"
echo "================================"

# 最新バージョンを取得
echo "📡 最新バージョンを確認中..."
VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "❌ バージョン情報を取得できませんでした"
  exit 1
fi

echo "📦 バージョン: ${VERSION}"

# アーキテクチャ判定
ARCH=$(uname -m)
case "$ARCH" in
  arm64)
    DMG_NAME="${APP_NAME}_${VERSION}_aarch64.dmg"
    echo "💻 Apple Silicon (M1/M2/M3/M4) を検出"
    ;;
  x86_64)
    DMG_NAME="${APP_NAME}_${VERSION}_x64.dmg"
    echo "💻 Intel Mac を検出"
    ;;
  *)
    echo "❌ 非対応のアーキテクチャです: ${ARCH}"
    exit 1
    ;;
esac

DMG_URL="https://github.com/${REPO}/releases/download/${VERSION}/${DMG_NAME}"
TMP_DMG="/tmp/${DMG_NAME}"

# ダウンロード
echo "⬇️  ダウンロード中..."
curl -fSL --progress-bar -o "$TMP_DMG" "$DMG_URL"

# 既存のアプリがあれば削除
if [ -d "${INSTALL_DIR}/${APP_NAME}.app" ]; then
  echo "🔄 既存の ${APP_NAME} を更新します..."
  rm -rf "${INSTALL_DIR}/${APP_NAME}.app"
fi

# マウント & コピー
echo "📂 インストール中..."
MOUNT_POINT=$(hdiutil attach -nobrowse "$TMP_DMG" 2>/dev/null | grep -o '/Volumes/.*' | head -1)

if [ -z "$MOUNT_POINT" ]; then
  echo "❌ dmg のマウントに失敗しました"
  rm -f "$TMP_DMG"
  exit 1
fi

cp -R "${MOUNT_POINT}/${APP_NAME}.app" "${INSTALL_DIR}/"

# アンマウント
hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true

# quarantine 属性を除去
xattr -r -d com.apple.quarantine "${INSTALL_DIR}/${APP_NAME}.app" 2>/dev/null || true

# 一時ファイル削除
rm -f "$TMP_DMG"

echo "================================"
echo "✅ ${APP_NAME} ${VERSION} のインストールが完了しました！"
echo "📍 場所: ${INSTALL_DIR}/${APP_NAME}.app"
echo ""
echo "Launchpad または Applications フォルダから起動できます。"
