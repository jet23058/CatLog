#!/usr/bin/env bash
# 免費 Apple 帳號的 App 7 天就會過期：用最新的發行版本（ios-v* tag）重新建置、簽章並安裝到 iPhone。
# 在獨立的 git worktree 建置，不會動到平常開發用的工作區。
# 由 setup-launch-agent.sh schedule 建立的排程（每週一、四 09:00）自動執行；也可以手動跑。
# 需要：Mac 已登入且螢幕沒鎖（簽章要用登入鑰匙圈）、iPhone 接線或與 Mac 在同一個 Wi-Fi 且已配對。
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKTREE="${HOME}/Library/Application Support/CatLog/release-worktree"
STATUS="${HOME}/Library/Logs/catlog-resign-status.txt"

notify() {
  /usr/bin/osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

fail() {
  echo "✗ $1" >&2
  echo "$(date '+%Y-%m-%d %H:%M') 失敗：$1" > "${STATUS}"
  notify "CatLog 重新簽章失敗" "$1"
  exit 1
}
trap 'fail "第 ${LINENO} 行出錯，詳見 ~/Library/Logs/catlog-resign.log"' ERR

git -C "${REPO}" fetch --quiet --tags origin || echo "（抓不到遠端 tag，改用本機已有的 tag）"
TAG="$(git -C "${REPO}" tag -l 'ios-v*' --sort=-v:refname | head -1)"
[ -n "${TAG}" ] || fail "找不到 ios-v* 發行 tag"
echo "▶ 發行版本 ${TAG}"

if [ -d "${WORKTREE}/.git" ] || [ -f "${WORKTREE}/.git" ]; then
  git -C "${WORKTREE}" checkout --quiet --detach "${TAG}"
else
  mkdir -p "$(dirname "${WORKTREE}")"
  git -C "${REPO}" worktree add --quiet --detach "${WORKTREE}" "${TAG}"
fi

# 這幾個檔案不進版控（Firebase 設定、Google 登入的 URL scheme），從開發用的工作區複製過去。
for file in Config/Local.xcconfig CatLog/GoogleService-Info-Debug.plist CatLog/GoogleService-Info-Release.plist; do
  [ -f "${REPO}/apps/ios/${file}" ] || fail "缺少 apps/ios/${file}"
  cp "${REPO}/apps/ios/${file}" "${WORKTREE}/apps/ios/${file}"
done

# 正式站版本、保留手機上的設定（不強制唯讀）。
CATLOG_CONFIGURATION=Release-keep "${WORKTREE}/apps/ios/scripts/install-device.sh"

echo "$(date '+%Y-%m-%d %H:%M') 成功：${TAG}（7 天內有效）" > "${STATUS}"
notify "CatLog 已重新簽章" "${TAG} 已裝到 iPhone，7 天內有效"
echo "✓ ${TAG} 已重新簽章並安裝"
