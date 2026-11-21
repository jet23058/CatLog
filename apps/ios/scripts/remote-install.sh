#!/usr/bin/env bash
# 從遠端（SSH）把目前的程式碼裝到接在 Mac 上的 iPhone：
# 觸發 setup-launch-agent.sh 建立的 LaunchAgent，在 Mac 登入環境執行 install-device.sh，等它跑完並印出紀錄。
# 需要：Mac 保持登入（螢幕鎖定沒關係）、iPhone 接著線。
set -euo pipefail
LABEL="work.cloudjet.catlog.install-device"
TARGET="gui/$(id -u)/${LABEL}"
LOG="${HOME}/Library/Logs/catlog-install-device.log"

if ! launchctl print "${TARGET}" >/dev/null 2>&1; then
  echo "找不到 LaunchAgent：請先執行 apps/ios/scripts/setup-launch-agent.sh" >&2
  exit 1
fi
: > "${LOG}"
launchctl kickstart "${TARGET}"
for _ in $(seq 1 900); do
  if grep -q '^EXIT=' "${LOG}"; then break; fi
  sleep 1
done
cat "${LOG}"
STATUS="$(sed -n 's/^EXIT=//p' "${LOG}")"
[ -n "${STATUS}" ] || { echo "等候逾時（15 分鐘）" >&2; exit 1; }
exit "${STATUS}"
