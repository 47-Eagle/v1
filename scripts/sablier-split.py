#!/usr/bin/env python3
"""
Enumerate Sablier V2 Core streams paying out EAGLE, and resolve the per-recipient
split of the Sablier vault's EAGLE holdings.

The Sablier lockup contract holds a single pooled EAGLE balance covering every
active stream. Per-stream entitlements are NOT simply `deposited - withdrawn`,
because canceling a stream refunds the unstreamed portion to the sender. The
remaining claim on a stream is:

    claim = deposited - withdrawn - refunded

which is exactly what the contract's `refundableAmountOf` accounts for on the
sender side and what `withdrawableAmountOf + unstreamed-remaining` equals on the
recipient side.

Usage: python3 scripts/sablier-split.py
"""

import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

RPC = "https://ethereum-rpc.publicnode.com"
SAB = "0xcF8ce57fa442ba50aCbC57147a62aD03873FfA73"
EAGLE = "0x474ed38c256a7fa0f3b8c48496ce1102ab0ea91e"


def rpc(method, params):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    for attempt in range(5):
        try:
            req = urllib.request.Request(
                RPC,
                data=body,
                headers={"Content-Type": "application/json", "User-Agent": "eagle-sablier/1.0"},
            )
            with urllib.request.urlopen(req, timeout=40) as resp:
                d = json.load(resp)
            if "error" in d:
                return None
            return d.get("result")
        except Exception:  # noqa: BLE001
            if attempt == 4:
                return None
            time.sleep(0.4 * (attempt + 1))
    return None


# function selectors (derived with `cast sig`, verified against the deployed ABI)
SEL = {
    "getUnderlyingToken": "0xa4775772",
    "getRecipient": "0x6d0cee75",
    "getDepositedAmount": "0xa80fc071",
    "getWithdrawnAmount": "0xd511609f",
    "getRefundedAmount": "0xd4dbd20b",
    "nextStreamId": "0x1e99d569",
}


def enc_uint(i):
    return hex(i)[2:].rjust(64, "0")


def eth_call(data):
    res = rpc("eth_call", [{"to": SAB, "data": data}, "latest"])
    return res


def decode_addr(h):
    return "0x" + h[-40:] if h and len(h) >= 42 else None


def decode_uint(h):
    return int(h, 16) if h and h != "0x" else 0


def get(kind, sid):
    r = eth_call(SEL[kind] + enc_uint(sid))
    if kind in ("getUnderlyingToken", "getRecipient"):
        return decode_addr(r)
    return decode_uint(r)


def main():
    nxt = decode_uint(eth_call(SEL["nextStreamId"]))
    if not nxt:
        print("could not read nextStreamId", file=sys.stderr)
        return
    print(f"scanning stream ids 1..{nxt - 1}", file=sys.stderr)

    rows = []

    def work(sid):
        tok = get("getUnderlyingToken", sid)
        if not tok or tok.lower() != EAGLE:
            return None
        rec = get("getRecipient", sid)
        dep = get("getDepositedAmount", sid)
        wd = get("getWithdrawnAmount", sid)
        ref = get("getRefundedAmount", sid)
        return {
            "id": sid,
            "recipient": rec,
            "deposited": dep,
            "withdrawn": wd,
            "refunded": ref,
            "claim": max(dep - wd - ref, 0),
        }

    done = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        for out in ex.map(work, range(1, nxt)):
            done += 1
            if done % 500 == 0:
                print(f"  {done}/{nxt - 1} scanned, {len(rows)} EAGLE streams", file=sys.stderr)
            if out:
                rows.append(out)

    total = sum(r["claim"] for r in rows)
    print(f"\nEAGLE streams: {len(rows)}", file=sys.stderr)
    print(f"total outstanding claim (wei): {total}", file=sys.stderr)
    print(f"  = {total / 1e18:,.6f} EAGLE", file=sys.stderr)

    live = [r for r in rows if r["claim"] > 0]
    print(f"streams with a live claim: {len(live)}", file=sys.stderr)

    by_rec = {}
    for r in rows:
        if r["claim"] <= 0:
            continue
        by_rec.setdefault(r["recipient"].lower(), 0)
        by_rec[r["recipient"].lower()] += r["claim"]

    print(f"unique beneficiaries: {len(by_rec)}", file=sys.stderr)

    with open("sablier-eagle-streams.csv", "w") as fh:
        fh.write("stream_id,recipient,deposited_eagle,withdrawn_eagle,refunded_eagle,claim_eagle,claim_wei\n")
        for r in sorted(rows, key=lambda x: -x["claim"]):
            def f(v):
                return f"{v / 1e18:.18f}".rstrip("0").rstrip(".") or "0"

            if r["claim"] == 0:
                continue
            fh.write(
                f"{r['id']},{r['recipient']},{f(r['deposited'])},{f(r['withdrawn'])},"
                f"{f(r['refunded'])},{f(r['claim'])},{r['claim']}\n"
            )

    with open("sablier-eagle-beneficiaries.csv", "w") as fh:
        fh.write("recipient,claim_eagle,claim_wei,pct_of_sablier_pool\n")
        for a, v in sorted(by_rec.items(), key=lambda kv: -kv[1]):
            pct = (v / total * 100) if total else 0
            fh.write(f"{a},{v / 1e18:.18f},{v},{pct:.6f}\n")

    print("\nwrote sablier-eagle-streams.csv and sablier-eagle-beneficiaries.csv", file=sys.stderr)


if __name__ == "__main__":
    main()
