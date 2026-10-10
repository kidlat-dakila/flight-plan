TAX_RATE = 0.2


def price_of(line):
    return line["price_cents"] * line["quantity"]
