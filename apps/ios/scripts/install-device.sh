#!/usr/bin/env bash
# 建置並安裝、打開到接在這台 Mac 上的 iPhone。
# 預設 Debug 版（連測試站）；CATLOG_CONFIGURATION=Release 時建置 Release 版（連正式站），
# 並以「這台裝置唯讀」啟動，驗證正式站時不會寫入任何資料（之後可在 App 的帳號選單關閉）。
# 要在 Mac 本機（Warp / 終端機）執行：簽章需要你的登入鑰匙圈，遠端連線用不了。
# 用法：apps/ios/scripts/install-device.sh [裝置 UDID]（省略時用第一支連接中的實體 iPhone）
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE="${1:-$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && /connected/ { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{16}$/) { print $i; exit } }')}"
if [ -z "${DEVICE}" ]; then
  echo "找不到連接中的 iPhone：請用傳輸線接上、解鎖手機，並確認已開啟開發者模式。" >&2
  exit 1
fi

# remote-install.sh --production 會留下這個檔案指定 Release（LaunchAgent 沒辦法帶參數）。
REQUEST_FILE="${HOME}/Library/Caches/catlog-install-configuration"
if [ -z "${CATLOG_CONFIGURATION:-}" ] && [ -f "${REQUEST_FILE}" ]; then
  CATLOG_CONFIGURATION="$(cat "${REQUEST_FILE}")"
fi
rm -f "${REQUEST_FILE}"
CONFIGURATION="${CATLOG_CONFIGURATION:-Debug}"
case "${CONFIGURATION}" in
  Debug) LAUNCH_ARGS=() ;;
  Release) LAUNCH_ARGS=(-CatLogDeviceReadOnly) ;;
  # 已經在正式站使用、只是更新 App 時：不強制唯讀，保留使用者原本的設定。
  Release-keep) CONFIGURATION=Release; LAUNCH_ARGS=() ;;
  *) echo "CATLOG_CONFIGURATION 只能是 Debug、Release 或 Release-keep" >&2; exit 1 ;;
esac

DERIVED="${HOME}/Library/Developer/Xcode/DerivedData/CatLog-device"
echo "▶ 建置 ${CONFIGURATION}（$([ "${CONFIGURATION}" = Release ] && echo 正式站 || echo 測試站)$([ ${#LAUNCH_ARGS[@]} -gt 0 ] && echo "，唯讀啟動")；裝置 ${DEVICE}）…"
xcodebuild -project CatLog.xcodeproj -scheme CatLog -configuration "${CONFIGURATION}" \
  -destination "id=${DEVICE}" -derivedDataPath "${DERIVED}" -allowProvisioningUpdates -quiet build

APP="${DERIVED}/Build/Products/${CONFIGURATION}-iphoneos/CatLog.app"
echo "▶ 安裝…"
xcrun devicectl device install app --device "${DEVICE}" "${APP}" >/dev/null
echo "▶ 打開 App…"
# App 的啟動參數要放在 -- 之後，否則 devicectl 會當成自己的選項。
# 手機鎖著時打不開 App，但已經裝好了，不算失敗。
if ! xcrun devicectl device process launch --device "${DEVICE}" work.cloudjet.catlog ${LAUNCH_ARGS[@]+-- "${LAUNCH_ARGS[@]}"} >/dev/null 2>&1; then
  echo "（已安裝，但 App 沒有自動打開：手機可能鎖著，解鎖後直接點開即可）"
fi
echo "✓ 完成"
