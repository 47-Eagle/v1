#!/usr/bin/env python3
"""
Export current holders of the Eagle tokens to CSV.

Pulls every holder page from the Blockscout v2 API for both:
  - EAGLE  (0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E) - the cross-chain OFT
  - vEAGLE (0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953) - EagleOVault shares

Both tokens are claims on the (now drained) EagleOVault, so the CSV records
both and sums them per address where an address holds both.

Usage: python3 scripts/export-holders.py [outfile.csv]
"""

import csv
import json
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://eth.blockscout.com/api/v2"

TOKENS = {
    "EAGLE": "0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E",
    "vEAGLE": "0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953",
}

# Known protocol / counterparty addresses, for readability in the sheet.
LABELS = {
    "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953": "EagleOVault (vault shares, self)",
    "0x474ed38c256a7fa0f3b8c48496ce1102ab0ea91e": "EagleShareOFT (token contract)",
    "0x47dac5063c526dbc6f157093dd1d62d9de8891c5": "EagleVaultWrapper (locks vEAGLE)",
    "0x7310dd6ef89b7f829839f140c6840bc929ba2031": "Eagle deployer / treasury",
    "0xe5a1d534eb7f00397361f645f0f39e5d16cc1de3": "Eagle multisig (Safe)",
    "0xcf8ce57fa442ba50acbc57147a62ad03873ffa73": "Sablier Lockup (vesting)",
    "0x22828dbf15f5fba2394ba7cf8fa9a96bdb444b71": "Charm vault USD1/WLFI",
    "0x3314e248f3f752cd16939773d83beb3a362f0aef": "Charm vault WETH/WLFI",
    "0x3e872d07c5a73e684b13a3b097c3599bf608c6e3": "CharmStrategyUSD1V2",
    "0xbf66f01c18f31a843172a24a4ff8984de691d415": "CharmStrategyWETHV2",
    "0x2437f6555350c131647daa0c655c4b49a7af3621": "WLFI OFT Adapter",
    "0x3a91b3e863c0bd6948088e8a0a9b1d22d6d05da9": "EagleOVaultComposer",
    "0x0c74174b5f04ec15d3fb94d15dc13c91fac6c21f": "ComposerV2",
    "0x47c81c9a70ca7518d3b911bc8c8b11000e92f59e": "EagleRegistry",
}

# Composer / bridge infrastructure that legitimately custodies shares in flight.
BRIDGE_ADDRS = {
    "0x3a91b3e863c0bd6948088e8a0a9b1d22d6d05da9",
    "0x0c74174b5f04ec15d3fb94d15dc13c91fac6c21f",
    "0x47dac5063c526dbc6f157093dd1d62d9de8891c5",
}


def fetch(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "eagle-holders-export/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception as exc:  # noqa: BLE001 - surface after retries
            if attempt == retries - 1:
                raise
            print(f"  retry {attempt + 1}/{retries} after {exc}", file=sys.stderr)
            time.sleep(1.5 * (attempt + 1))
    return None


def fetch_all_holders(token_addr):
    """Page through /tokens/{addr}/holders until exhausted."""
    out = []
    params = None
    page = 1
    while True:
        url = f"{BASE}/tokens/{token_addr}/holders"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = fetch(url)
        items = data.get("items") or []
        for it in items:
            addr = it["address"]["hash"]
            out.append(
                {
                    "address": addr,
                    "raw": int(it["value"]),
                    "is_contract": it["address"].get("is_contract", False),
                    "name": it["address"].get("name") or "",
                }
            )
        print(f"  page {page}: {len(items)} holders (total {len(out)})", file=sys.stderr)
        params = data.get("next_page_params")
        if not params:
            break
        page += 1
        time.sleep(0.35)
    return out


def fmt_units(wei: int) -> str:
    """Exact 18-decimal rendering from wei, with no float round-trip."""
    if wei == 0:
        return "0"
    whole, frac = divmod(wei, 10**18)
    if frac == 0:
        return str(whole)
    return f"{whole}.{frac:018d}".rstrip("0")


def main():
    outfile = sys.argv[1] if len(sys.argv) > 1 else "eagle-holders.csv"

    holders = {}
    totals = {}

    for symbol, addr in TOKENS.items():
        print(f"Fetching {symbol} holders ({addr})...", file=sys.stderr)
        rows = fetch_all_holders(addr)
        totals[symbol] = sum(r["raw"] for r in rows)
        print(f"  {symbol}: {len(rows)} holders, sum = {fmt_units(totals[symbol])}", file=sys.stderr)
        for r in rows:
            key = r["address"].lower()
            h = holders.setdefault(
                key,
                {
                    "address": r["address"],
                    "is_contract": r["is_contract"],
                    "name": r["name"],
                    "EAGLE": 0,
                    "vEAGLE": 0,
                },
            )
            h[symbol] += r["raw"]
            # Prefer a discovered contract name if we don't have one yet.
            if not h["name"] and r["name"]:
                h["name"] = r["name"]

    eagle_total = totals["EAGLE"] or 1
    veagle_total = totals["vEAGLE"] or 1

    rows = []
    for key, h in holders.items():
        label = LABELS.get(key, "")
        if not label and h["name"]:
            label = h["name"]
        rows.append(
            {
                "address": h["address"],
                "label": label,
                "is_contract": "yes" if h["is_contract"] else "no",
                "eagle_wei": h["EAGLE"],
                "eagle_balance": fmt_units(h["EAGLE"]),
                "eagle_pct_of_supply": f"{(h['EAGLE'] / eagle_total) * 100:.6f}",
                "veagle_wei": h["vEAGLE"],
                "veagle_balance": fmt_units(h["vEAGLE"]),
                "veagle_pct_of_supply": f"{(h['vEAGLE'] / veagle_total) * 100:.6f}" if h["vEAGLE"] else "",
                "bridge_or_custody": "yes" if key in BRIDGE_ADDRS else "",
            }
        )

    # Biggest claims first: rank by OFT balance then vault shares.
    rows.sort(key=lambda r: (-r["eagle_wei"], -r["veagle_wei"]))

    fields = [
        "address",
        "label",
        "is_contract",
        "eagle_balance",
        "eagle_pct_of_supply",
        "eagle_wei",
        "veagle_balance",
        "veagle_pct_of_supply",
        "veagle_wei",
        "bridge_or_custody",
    ]
    with open(outfile, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    print(f"\nWrote {len(rows)} unique addresses to {outfile}", file=sys.stderr)
    print(f"EAGLE  total: {fmt_units(totals['EAGLE'])}", file=sys.stderr)
    print(f"vEAGLE total: {fmt_units(totals['vEAGLE'])}", file=sys.stderr)


if __name__ == "__main__":
    main()
