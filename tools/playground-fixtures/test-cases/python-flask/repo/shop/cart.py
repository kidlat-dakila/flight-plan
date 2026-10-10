from shop.pricing import TAX_RATE, price_of


class Cart:
    def __init__(self, lines):
        self.lines = lines

    def subtotal(self):
        return sum(price_of(line) for line in self.lines)

    def total(self):
        return self.subtotal() + self.tax()

    def tax(self):
        return round(self.subtotal() * TAX_RATE)
