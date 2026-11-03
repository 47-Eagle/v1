#!/usr/bin/env python3
"""
EOA-only EAGLE distribution.

Takes eagle-distribution-sablier-claimed.csv (Sablier claims attributed to their
beneficiaries) and drops every address that has deployed bytecode, leaving only
externally-owned accounts -- i.e. addresses actually controlled by a key.

Contract detection is authoritative: `eth_getCode` against the chain, not the
explorer's `is_contract` hint. A tiny allowance for RPC flakiness is handled by
retrying, and any address whose code check ultimately fails is reported rather
than silently defaulted.

Output: eagle-distribution-eoa-only.csv
"""

import csv
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

RPC = "https://ethereum-rpc.publicnode.com"
EAGLE_TOTAL = 35998852776399180420435214  # on-chain totalSupply (wei)


def rpc(method, params, retries=5):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                RPC,
                data=body,
                headers={"Content-Type": "application/json", "User-Agent": "eagle-eoa/1.0"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                d = json.load(resp)
            if "error" in d:
                raise RuntimeError(d["error"])
            return d.get("result")
        except Exception:  # noqa: BLE001
            if attempt == retries - 1:
                return None
            time.sleep(0.4 * (attempt + 1))
    return None


def classify(addr):
    """
    Classify an address by on-chain bytecode.

    Returns one of:
      'eoa'      - no code at all: a plain externally-owned account
      'delegated'- EIP-7702 delegation designator (`0xef0100 || address`): an EOA
                   that has delegated execution to a smart account. Still key
                   controlled, so it belongs in a holder list -- just annotated.
      'contract' - any other code (pool, safe proxy, clone, router, ...)
      None       - RPC failure, unknown
    """
    code = rpc("eth_getCode", [addr, "latest"])
    if code is None:
        return None, None
    if code in ("0x", "0x0", ""):
        return "eoa", None
    # EIP-7702: exactly 23 bytes, 0xef0100 prefix + 20-byte delegate address.
    if code.startswith("0xef0100") and len(code) == 2 + 46:
        return "delegated", "0x" + code[-40:]
    return "contract", None


def fmt(wei):
    if wei == 0:
        return "0"
    whole, frac = divmod(wei, 10**18)
    if frac == 0:
        return str(whole)
    return f"{whole}.{frac:018d}".rstrip("0")


def main():
    rows = list(csv.DictReader(open("eagle-distribution-sablier-claimed.csv")))
    addrs = [r["address"] for r in rows]
    print(f"checking {len(addrs)} addresses for bytecode...", file=sys.stderr)

    results = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        for addr, res in zip(addrs, ex.map(classify, addrs)):
            results[addr] = res

    unknown = [a for a, v in results.items() if v[0] is None]
    if unknown:
        print(f"WARNING: could not classify {len(unknown)} address(es): {unknown}", file=sys.stderr)

    accounts, contracts = [], []
    for r in rows:
        kind, delegate = results.get(r["address"], (None, None))
        if kind in ("eoa", "delegated"):
            r = dict(r)
            r["kind"] = kind
            r["delegate"] = delegate or ""
            accounts.append(r)
        elif kind == "contract":
            r = dict(r)
            r["kind"] = kind
            contracts.append(r)

    eoa_total = sum(int(r["total_wei"]) for r in accounts)

    with open("eagle-distribution-eoa-only.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "rank",
                "address",
                "account_type",
                "delegated_to",
                "direct_eagle",
                "sablier_claim",
                "total_eagle",
                "pct_of_total_supply",
                "pct_of_eoa_supply",
                "source",
                "total_wei",
            ]
        )
        for i, r in enumerate(accounts, 1):
            tot = int(r["total_wei"])
            w.writerow(
                [
                    i,
                    r["address"],
                    r["kind"],
                    r["delegate"],
                    r["direct_eagle"],
                    r["sablier_claim"],
                    r["total_eagle"],
                    f"{tot / EAGLE_TOTAL * 100:.6f}",
                    f"{(tot / eoa_total * 100) if eoa_total else 0:.6f}",
                    r["source"],
                    tot,
                ]
            )

    n_plain = sum(1 for r in accounts if r["kind"] == "eoa")
    n_deleg = sum(1 for r in accounts if r["kind"] == "delegated")
    print(f"\naccounts kept:   {len(accounts)}  ({fmt(eoa_total)} EAGLE)")
    print(f"  plain EOAs:    {n_plain}")
    print(f"  EIP-7702 EOAs: {n_deleg}  (delegated, still key-controlled)")
    print(f"contracts dropped: {len(contracts)}  ({fmt(sum(int(r['total_wei']) for r in contracts))} EAGLE)")
    print(f"sum check:      {fmt(eoa_total + sum(int(r['total_wei']) for r in contracts))} / {fmt(EAGLE_TOTAL)}")
    print("\ndropped contracts:")
    for r in sorted(contracts, key=lambda x: -int(x["total_wei"])):
        print(f"  {r['address']}  {fmt(int(r['total_wei'])):>18}  {r['label'] or '(unnamed)'}")


if __name__ == "__main__":
    main()
