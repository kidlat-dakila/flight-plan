from flask import Flask, jsonify, request

from shop.cart import Cart

app = Flask(__name__)


@app.post("/cart/total")
def read_total():
    cart = Cart(request.get_json()["lines"])
    return jsonify({"total_cents": cart.total()})
