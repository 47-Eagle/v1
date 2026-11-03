#!/usr/bin/env python3
"""
Final consolidated EAGLE holder list.

Combines:
  eagle-holders-final.csv   - 38 Ethereum accounts (EOAs + EIP-7702), multisig and
                              contracts excluded, Sablier claims attributed
  Arbitrum                  - reconstructed from Transfer logs (1 EOA holder)

And excludes the 515,616 EAGLE minted directly to treasury outside the
EagleVaultWrapper, which has no vEAGLE backing (wrapper invariant:
totalLocked == totalMinted). Including it would dilute every real holder by
~1.43% in any pro-rata distribution.

Output: eagle-holders-consolidated.csv
"""

import csv
from decimal import Decimal

EAGLE_TOTAL = 35998852776399180420435214  # Ethereum totalSupply (wei)
UNBACKED = 515615999999000000000000  # minted to treasury outside wrapper
ARB_TOKEN_TOTAL = 16666000000000000000000

LABELS = {
    "0xb05cf01231cf2ff99499682e64d3780d57c80fdd": "Arbitrum holder (single bridge receipt)",
}


def to_wei(s):
    """Parse a decimal EAGLE string into exact wei, no float round-trip."""
    if not s:
        return 0
    return int((Decimal(s) * Decimal(10) ** 18).to_integral_value())


def fmt(wei):
    if wei == 0:
        return "0"
    whole, frac = divmod(wei, 10**18)
    return str(whole) if frac == 0 else f"{whole}.{frac:018d}".rstrip("0")


def main():
    rows = []
    with open("eagle-holders-final.csv") as fh:
        for r in csv.DictReader(fh):
            direct = to_wei(r["direct_eagle"])
            sab = to_wei(r["sablier_claim"])
            rows.append(
                {
                    "address": r["address"],
                    "label": "",
                    "chain": "ethereum",
                    "account_type": r["account_type"],
                    "direct_eagle": direct,
                    "sablier_claim": sab,
                    "total": direct + sab,
                    "source": r["source"],
                }
            )

    # Arbitrum: single EOA, reconstructed from logs
    arb_total = ARB_TOKEN_TOTAL
    arb_addr = "0xb05cf01231cf2ff99499682e64d3780d57c80fdd"
    rows.append(
        {
            "address": arb_addr,
            "label": LABELS.get(arb_addr, ""),
            "chain": "arbitrum",
            "account_type": "eoa",
            "direct_eagle": arb_total,
            "sablier_claim": 0,
            "total": arb_total,
            "source": "direct",
        }
    )

    rows.sort(key=lambda r: -r["total"])
    grand = sum(r["total"] for r in rows)

    # Percentages must be computed per chain -- Arbitrum's 16,666 is a separate
    # mint, not part of Ethereum's supply, so it cannot share a denominator.
    # Ethereum distributable base excludes the unbacked treasury mint; that base
    # reconciles exactly to the wrapper's totalLocked (vEAGLE-backed supply).
    eth_base = EAGLE_TOTAL - UNBACKED
    arb_base = ARB_TOKEN_TOTAL

    with open("eagle-holders-consolidated.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "rank",
                "address",
                "label",
                "chain",
                "account_type",
                "direct_eagle",
                "sablier_claim",
                "total_eagle",
                "chain_pct_of_distributable",
                "source",
                "total_wei",
            ]
        )
        for i, r in enumerate(rows, 1):
            base = arb_base if r["chain"] == "arbitrum" else eth_base
            w.writerow(
                [
                    i,
                    r["address"],
                    r["label"],
                    r["chain"],
                    r["account_type"],
                    fmt(r["direct_eagle"]),
                    fmt(r["sablier_claim"]),
                    fmt(r["total"]),
                    f"{r['total'] / base * 100:.6f}",
                    r["source"],
                    r["total"],
                ]
            )

    eth_grand = sum(r["total"] for r in rows if r["chain"] == "ethereum")
    arb_grand = sum(r["total"] for r in rows if r["chain"] == "arbitrum")

    print(f"rows: {len(rows)}  (ethereum {len(rows) - 1} + arbitrum 1)")
    print()
    print("ETHEREUM")
    print(f"  totalSupply            : {fmt(EAGLE_TOTAL)}")
    print(f"  unbacked (excluded)    : {fmt(UNBACKED)}")
    print(f"  distributable base     : {fmt(eth_base)}")
    print(f"  wrapper totalLocked    : {fmt(35483236776400180420435214)}")
    print(f"  base == wrapped supply : {eth_base == 35483236776400180420435214}")
    print(f"  listed (39-1 holders)  : {fmt(eth_grand)}")
    print(f"  multisig excluded      : 30000000")
    print(f"  contracts excluded     : {fmt(443709762201659595835403)}")
    print(f"  reconciliation         : {fmt(eth_grand + 30000000 * 10**18 + 443709762201659595835403 + UNBACKED) == fmt(EAGLE_TOTAL)}")
    print()
    print("ARBITRUM")
    print(f"  totalSupply            : {fmt(arb_base)}")
    print(f"  listed                 : {fmt(arb_grand)}")
    print(f"  reconciles             : {arb_grand == arb_base}")


if __name__ == "__main__":
    main()
