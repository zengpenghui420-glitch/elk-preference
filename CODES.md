# 验证码说明（麋鹿性偏好测试）

- 格式：`EL` + 4 位字符，字符表 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（无 I / L / O / 0 / 1）
- 正则：`/^EL[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/i`
- 示例形态：`EL****`（此处不公布可售卖码）
- Vault quiz key：`elk`（发码池 `pools/elk.txt`，由 vault 维护，不在本仓库）
- 接口：`POST https://snappy-tundra-7uesdvk.tmp.now/redeem`，JSON `{quiz:"elk", code}`；成功返回剩余次数。**不接 Mantle**
- 每码最多使用 **3** 次（跨设备共享计数，由 vault 扣次）
- **重新测试**：清除会话解锁后需再次输入码并 redeem，会再扣 1 次
- **查看上次结果**：只读本机 `localStorage` 键 `elk_last_result`，不扣次
- 解锁态键名：`elk_unlocked`、`elk_code`（`sessionStorage`）
- 年龄确认：`sessionStorage` 键 `elk_age_ok`。未确认满 18 岁不能打开验证码，也不能看到题目。关闭标签后需重新确认
- 本仓库**不**存放可卖验证码明文，也**不**接入 Mantle，不写入 ADMIN 或 PAT

造码（本机 companion，勿把码写进 git）：

```bash
/workspace/quiz-code-api/scripts/mint.sh elk <CODE> 3
```

或见 `tools/mint.sh`。该脚本只打印用法，不会生成或写入真码。
