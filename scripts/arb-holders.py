#!/usr/bin/env python3
"""
Reconstruct EAGLE holders on Arbitrum from raw Transfer logs.

No explorer API required. Walks eth_getLogs in windows the public RPC accepts,
applies every Transfer as a balance delta, and prints the resulting holder set.

Usage: python3 scripts/arb-holders.py
"""

import json
import sys
import time
import urllib.request

RPC = "https://arb1.arbitrum.io/rpc"
TOKEN = "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E"
DEPLOY_BLOCK = 481_367_809
TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
ZERO = "0x0000000000000000000000000000000000000000"

# Public Arbitrum RPC accepts up to 10_000_000 blocks per getLogs, but we use a
# smaller window so a single flaky response doesn't lose much work.
WINDOW = 2_000_000


def rpc(method, params, retries=6):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                RPC,
                data=body,
                headers={"Content-Type": "application/json", "User-Agent": "eagle-arb/1.0"},
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                d = json.load(resp)
            if "error" in d:
                msg = d["error"].get("message", "")
                # transient rate limit -> back off and retry
                if "rate" in msg.lower() or "limit" in msg.lower():
                    time.sleep(2 * (attempt + 1))
                    continue
                raise RuntimeError(msg)
            return d.get("result")
        except Exception as exc:  # noqa: BLE001
            if attempt == retries - 1:
                print(f"  FAILED {method} {params[0].get('fromBlock')}..{params[0].get('toBlock')}: {exc}", file=sys.stderr)
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    head = int(rpc("eth_blockNumber", []), 16)
    print(f"head={head} deploy={DEPLOY_BLOCK} span={head - DEPLOY_BLOCK:,}", file=sys.stderr)

    balances = {}
    total_logs = 0
    windows = 0

    start = DEPLOY_BLOCK
    while start <= head:
        end = min(start + WINDOW - 1, head)
        windows += 1
        logs = rpc(
            "eth_getLogs",
            [
                {
                    "address": TOKEN,
                    "topics": [TRANSFER_TOPIC],
                    "fromBlock": hex(start),
                    "toBlock": hex(end),
                }
            ],
        )
        if logs is None:
            # Narrow and retry the failed region rather than silently skipping it.
            print(f"  retrying {start}..{end} in smaller windows", file=sys.stderr)
            mid = (start + end) // 2
            for sub in ((start, mid), (mid + 1, end)):
                if sub[0] > sub[1]:
                    continue
                logs2 = rpc(
                    "eth_getLogs",
                    [
                        {
                            "address": TOKEN,
                            "topics": [TRANSFER_TOPIC],
                            "fromBlock": hex(sub[0]),
                            "toBlock": hex(sub[1]),
                        }
                    ],
                )
                logs = (logs or []) + (logs2 or [])

        for lg in logs or []:
            topics = lg["topics"]
            if len(topics) < 3:
                continue
            frm = "0x" + topics[1][-40:]
            to = "0x" + topics[2][-40:]
            val = int(lg["data"], 16) if lg.get("data") not in (None, "0x") else 0
            if val == 0:
                continue
            if frm != ZERO:
                balances[frm] = balances.get(frm, 0) - val
            if to != ZERO:
                balances[to] = balances.get(to, 0) + val
            total_logs += 1

        print(f"  [{windows}] {start:,}..{end:,} -> {len(logs or [])} logs (running total {total_logs})", file=sys.stderr)
        start = end + 1
        time.sleep(0.15)

    live = {a: v for a, v in balances.items() if v > 0}

    print(f"\ntotal Transfer logs: {total_logs}", file=sys.stderr)
    print(f"addresses ever seen: {len(balances)}", file=sys.stderr)
    print(f"current holders:     {len(live)}", file=sys.stderr)

    s = sum(live.values())
    print(f"sum of balances: {s / 1e18:,.6f} EAGLE", file=sys.stderr)

    supply = int(rpc("eth_call", [{"to": TOKEN, "data": "0x18160ddd"}, "latest"]), 16)
    print(f"totalSupply:     {supply / 1e18:,.6f}", file=sys.stderr)
    print(f"reconciles:      {s == supply}", file=sys.stderr)

    print(f"\n{'address':44} {'balance':>20} {'%':>8}")
    print("-" * 76)
    for a, v in sorted(live.items(), key=lambda kv: -kv[1]):
        print(f"{a:44} {v / 1e18:20,.6f} {v / supply * 100:7.4f}%")


if __name__ == "__main__":
    main()
