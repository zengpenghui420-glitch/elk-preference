# 验证码说明（麋鹿性偏好测试）

- 格式：`EL` + 4 位字符，字符表 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（无 I / L / O / 0 / 1）
- 正则：`/^EL[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/i`
- 示例形态：`EL****`（此处不公布可售卖码）
- Vault quiz key：`elk`（发码池 `pools/elk.txt`，由 vault 维护，不在本仓库）
- 接口：`POST https://snappy-tundra-7uesdvk-zengpenghui420-glitch.vercel.app/redeem`，JSON `{quiz:"elk", code}`；成功返回剩余次数。**不接 Mantle**，也不调用 `GET /get`
- 每码最多使用 **3** 次（跨设备共享计数，由 vault 扣次）
- 订单号不是验证码，不走 `/redeem`。只接受 `P` + 18 位；重复块、逐位 ±1 和 19 位会拒绝。格式通过后页面直接开始，不请求订单接口，也不在服务端绑定、限流或计数
- 第一次开始提示「验证成功，还可以测 2 次」。重新测试后是「还可以测 1 次」，再一次是「这是最后一次」。刷新、继续这一次、查看上次结果不改变这句提示。提示记在 `localStorage` 键 `elk_order_uses`，按订单号分开。提示到「这是最后一次」之后仍可进入，提示为「验证成功」
- **重新测试**（验证码）：清除会话解锁后需再次输入码并 redeem，会再扣 1 次
- **查看上次结果**：只读本机 `localStorage` 键 `elk_last_result`，不扣次，也不改变订单号提示
- 解锁态键名：`elk_unlocked`、`elk_code`（`sessionStorage`）
- 年龄确认：`sessionStorage` 键 `elk_age_ok`。未确认满 18 岁不能打开订单号，也不能看到题目。关闭标签后需重新确认
- 本仓库**不**存放可卖验证码明文，也**不**接入 Mantle，不写入 ADMIN 或 PAT

造码（本机 companion，勿把码写进 git）：

```bash
/workspace/quiz-code-api/scripts/mint.sh elk <CODE> 3
```

或见 `tools/mint.sh`。该脚本只打印用法，不会生成或写入真码。
