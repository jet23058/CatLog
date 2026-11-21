#!/usr/bin/env bash
# 建立（或移除）在 Mac 登入環境執行 install-device.sh 的 LaunchAgent。
# 只有執行 remote-install.sh（launchctl kickstart）時才會跑；不會開機自動執行、不會排程。
# 用途：遠端 SSH 讀不到登入鑰匙圈而無法簽章，交給登入環境裡的 LaunchAgent 跑就可以。
# 用法：setup-launch-agent.sh        建立 / 更新
#       setup-launch-agent.sh remove 移除
set -euo pipefail
LABEL="work.cloudjet.catlog.install-device"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
if [ "${1:-}" = "remove" ]; then
  rm -f "${PLIST}"
  echo "✓ 已移除 ${LABEL}"
  exit 0
fi

SCRIPT="$(cd "$(dirname "$0")" && pwd)/install-device.sh"
LOG="${HOME}/Library/Logs/catlog-install-device.log"
mkdir -p "$(dirname "${PLIST}")" "$(dirname "${LOG}")"
cat > "${PLIST}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>"\$0"; echo "EXIT=\$?"</string>
    <string>${SCRIPT}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StandardOutPath</key><string>${LOG}</string>
  <key>StandardErrorPath</key><string>${LOG}</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
PLIST
plutil -lint "${PLIST}" >/dev/null
launchctl bootstrap "${DOMAIN}" "${PLIST}"
echo "✓ 已建立 ${LABEL}（${PLIST}）"
