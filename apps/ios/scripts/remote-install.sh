#!/usr/bin/env bash
# 從遠端（SSH）把目前的程式碼裝到接在 Mac 上的 iPhone（加 --production 裝連正式站的唯讀版）：
# 觸發 setup-launch-agent.sh 建立的 LaunchAgent，在 Mac 登入環境執行 install-device.sh，等它跑完並印出紀錄。
# 需要：Mac 保持登入且螢幕沒有鎖定（鎖定 / 睡眠時登入鑰匙圈會鎖住，簽章失敗）、iPhone 接著線。
set -euo pipefail
LABEL="work.cloudjet.catlog.install-device"
TARGET="gui/$(id -u)/${LABEL}"
LOG="${HOME}/Library/Logs/catlog-install-device.log"

# --production：建置 Release 版（連正式站），以「這台裝置唯讀」啟動。
if [ "${1:-}" = "--production" ]; then
  mkdir -p "${HOME}/Library/Caches"
  echo Release > "${HOME}/Library/Caches/catlog-install-configuration"
fi
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
if grep -q "errSecInternalComponent" "${LOG}"; then
  echo "簽章失敗：Mac 螢幕鎖定或睡眠中，登入鑰匙圈被鎖住。請先解鎖 Mac 再執行一次。" >&2
fi
exit "${STATUS}"
