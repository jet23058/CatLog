#!/usr/bin/env bash
# 建立（或移除）在 Mac 登入環境執行 install-device.sh 的 LaunchAgent。
# 只有執行 remote-install.sh（launchctl kickstart）時才會跑；不會開機自動執行、不會排程。
# 用途：遠端 SSH 讀不到登入鑰匙圈而無法簽章，交給登入環境裡的 LaunchAgent 跑就可以。
# 用法：setup-launch-agent.sh            建立 / 更新
#       setup-launch-agent.sh remove     移除
#       setup-launch-agent.sh schedule   另外建立「定期重新簽章」排程：每週一、四 09:00 跑 resign-release.sh
#                                        （免費 Apple 帳號 7 天過期；Mac 睡眠錯過時，醒來後會補跑）
#       setup-launch-agent.sh unschedule 移除定期重新簽章排程
set -euo pipefail
DOMAIN="gui/$(id -u)"

if [ "${1:-}" = "schedule" ] || [ "${1:-}" = "unschedule" ]; then
  RLABEL="work.cloudjet.catlog.resign"
  RPLIST="${HOME}/Library/LaunchAgents/${RLABEL}.plist"
  launchctl bootout "${DOMAIN}/${RLABEL}" 2>/dev/null || true
  if [ "$1" = "unschedule" ]; then
    rm -f "${RPLIST}"
    echo "✓ 已移除定期重新簽章排程"
    exit 0
  fi
  RSCRIPT="$(cd "$(dirname "$0")" && pwd)/resign-release.sh"
  RLOG="${HOME}/Library/Logs/catlog-resign.log"
  mkdir -p "$(dirname "${RPLIST}")" "$(dirname "${RLOG}")"
  cat > "${RPLIST}" <<RPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${RLABEL}</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>${RSCRIPT}</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>StandardOutPath</key><string>${RLOG}</string>
  <key>StandardErrorPath</key><string>${RLOG}</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
RPLIST
  plutil -lint "${RPLIST}" >/dev/null
  launchctl bootstrap "${DOMAIN}" "${RPLIST}"
  echo "✓ 已建立定期重新簽章排程：每週一、四 09:00（紀錄 ${RLOG}，最近一次結果 ~/Library/Logs/catlog-resign-status.txt）"
  exit 0
fi

LABEL="work.cloudjet.catlog.install-device"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

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
