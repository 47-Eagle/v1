#!/usr/bin/env python3
"""
Merged EAGLE holder distribution, attributing Sablier-locked EAGLE to the
stream beneficiaries instead of the lockup contract.

Inputs:
  eagle-holders.csv              - direct EAGLE balances (from export-holders.py)
  sablier-eagle-beneficiaries.csv - per-recipient outstanding Sablier claims

Output:
  eagle-distribution-sablier-claimed.csv

The Sablier contract's own EAGLE line is dropped and replaced by per-stream
recipients. Addresses holding both direct EAGLE and Sablier streams are merged
into a single row so the percentages reflect real beneficial ownership.
"""

import csv

SABLIER = "0xcf8ce57fa442ba50acbc57147a62ad03873ffa73"
EAGLE_TOTAL = 35998852776399180420435214  # on-chain totalSupply


def fmt(wei):
    if wei == 0:
        return "0"
    whole, frac = divmod(wei, 10**18)
    if frac == 0:
        return str(whole)
    return f"{whole}.{frac:018d}".rstrip("0")


def main():
    holders = {}
    labels = {}

    with open("eagle-holders.csv") as fh:
        for r in csv.DictReader(fh):
            a = r["address"].lower()
            if a == SABLIER:
                continue  # replaced by per-recipient attribution below
            holders[a] = {"address": r["address"], "direct": int(r["eagle_wei"]), "sablier": 0}
            if r["label"]:
                labels[a] = r["label"]

    with open("sablier-eagle-beneficiaries.csv") as fh:
        for r in csv.DictReader(fh):
            a = r["recipient"].lower()
            h = holders.setdefault(a, {"address": r["recipient"], "direct": 0, "sablier": 0})
            h["sablier"] += int(r["claim_wei"])

    rows = []
    for a, h in holders.items():
        total = h["direct"] + h["sablier"]
        if total == 0:
            continue
        rows.append(
            {
                "address": h["address"],
                "label": labels.get(a, ""),
                "direct_eagle": h["direct"],
                "sablier_claim": h["sablier"],
                "total_eagle": total,
                "pct_of_supply": total / EAGLE_TOTAL * 100,
                "source": "both" if (h["direct"] and h["sablier"]) else ("sablier" if h["sablier"] else "direct"),
            }
        )

    rows.sort(key=lambda r: -r["total_eagle"])

    with open("eagle-distribution-sablier-claimed.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "rank",
                "address",
                "label",
                "direct_eagle",
                "sablier_claim",
                "total_eagle",
                "pct_of_supply",
                "source",
                "total_wei",
            ]
        )
        for i, r in enumerate(rows, 1):
            w.writerow(
                [
                    i,
                    r["address"],
                    r["label"],
                    fmt(r["direct_eagle"]),
                    fmt(r["sablier_claim"]) if r["sablier_claim"] else "0",
                    fmt(r["total_eagle"]),
                    f"{r['pct_of_supply']:.6f}",
                    r["source"],
                    r["total_eagle"],
                ]
            )

    check = sum(r["total_eagle"] for r in rows)
    print(f"rows: {len(rows)}")
    print(f"sum of totals: {fmt(check)}")
    print(f"on-chain supply: {fmt(EAGLE_TOTAL)}")
    print(f"reconciles: {check == EAGLE_TOTAL}")


if __name__ == "__main__":
    main()
