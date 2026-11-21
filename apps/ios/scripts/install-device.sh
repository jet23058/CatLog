#!/usr/bin/env bash
# 建置 Debug 版（連測試站）並安裝、打開到接在這台 Mac 上的 iPhone。
# 要在 Mac 本機（Warp / 終端機）執行：簽章需要你的登入鑰匙圈，遠端連線用不了。
# 用法：apps/ios/scripts/install-device.sh [裝置 UDID]（省略時用第一支連接中的實體 iPhone）
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE="${1:-$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && /connected/ { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{16}$/) { print $i; exit } }')}"
if [ -z "${DEVICE}" ]; then
  echo "找不到連接中的 iPhone：請用傳輸線接上、解鎖手機，並確認已開啟開發者模式。" >&2
  exit 1
fi

DERIVED="${HOME}/Library/Developer/Xcode/DerivedData/CatLog-device"
echo "▶ 建置（裝置 ${DEVICE}）…"
xcodebuild -project CatLog.xcodeproj -scheme CatLog -configuration Debug \
  -destination "id=${DEVICE}" -derivedDataPath "${DERIVED}" -allowProvisioningUpdates -quiet build

APP="${DERIVED}/Build/Products/Debug-iphoneos/CatLog.app"
echo "▶ 安裝…"
xcrun devicectl device install app --device "${DEVICE}" "${APP}" >/dev/null
echo "▶ 打開 App…"
xcrun devicectl device process launch --device "${DEVICE}" work.cloudjet.catlog >/dev/null
echo "✓ 完成"
