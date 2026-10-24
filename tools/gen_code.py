#!/usr/bin/env python3
"""Generate Velvette Rewards order codes.

Usage:
    python3 gen_code.py 10            # print 10 codes
    python3 gen_code.py 10 > codes.txt

Scheme (must match assets/js/loyalty.js):
    code = "VLVT-" + 5 random base36 chars + 1 check digit
    check: h = 0
           for ch in SECRET + first5: h = (h*31 + ord(ch)) & 0xFFFFFFFF
           check = BASE36[h % 36]

IMPORTANT: LOYALTY_SECRET below MUST be identical to LOYALTY_SECRET
in assets/js/loyalty.js. Change both together (pick something private).
"""
import secrets
import sys

LOYALTY_SECRET="vv-563ec189f67bc7aa10dd28faf4d62075"
B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def check_digit(payload5: str) -> str:
    h = 0
    for ch in LOYALTY_SECRET + payload5:
        h = ((h * 31) + ord(ch)) & 0xFFFFFFFF
    return B36[h % 36]


def gen_code() -> str:
    p5 = "".join(secrets.choice(B36) for _ in range(5))
    return "VLVT-" + p5 + check_digit(p5)


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    seen = set()
    while len(seen) < n:
        seen.add(gen_code())
    for c in sorted(seen):
        print(c)


if __name__ == "__main__":
    main()
