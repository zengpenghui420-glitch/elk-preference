#!/usr/bin/env bash
# 麋鹿性偏好测试（elk）造码说明 — 本脚本不连公网，也不写出可卖码。
# 使用 companion vault 脚本（quiz key = elk，对应 pools/elk.txt）：
#
#   /workspace/quiz-code-api/scripts/mint.sh elk <CODE> 3
#
# 规则：前缀 EL + 4 位（字符表 ABCDEFGHJKMNPQRSTUVWXYZ23456789），每码 3 次。
# 切勿把可卖码、ADMIN、PAT 写入本仓库。
set -euo pipefail
echo "Use: /workspace/quiz-code-api/scripts/mint.sh elk <CODE> 3" >&2
echo "Quiz key: elk. Prefix EL + 4 chars from ABCDEFGHJKMNPQRSTUVWXYZ23456789; max 3 uses." >&2
echo "Do not commit sellable codes, ADMIN, or PAT." >&2
exit 0
