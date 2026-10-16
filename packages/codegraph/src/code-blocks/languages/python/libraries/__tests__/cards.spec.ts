import { codeOf } from "@/code-blocks/__tests__/group-fixture"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"

describe("the cards Flask writes", () => {
  it("makes a decorated function the handler of its route path, under its method, and under one heading of every method when it names several", () => {
    expect(cardsOf({
      "shop/views.py": codeOf(
        "from flask import Flask",
        "app = Flask(__name__)",
        "@app.get(\"/users/<id>\")",
        "def user(id):",
        "    return find(id)",
        "@app.route(\"/users\", methods=[\"GET\", \"POST\"])",
        "def users():",
        "    return list_users()",
      ),
    })).toStrictEqual(["user: Flask route handler under GET at /users/<id>", "users: Flask route handler under GET · POST at /users"])
  })
})

describe("the cards FastAPI writes", () => {
  it("makes a decorated function the handler of its route path, below the prefix of its router", () => {
    expect(cardsOf({
      "shop/items.py": codeOf(
        "from fastapi import APIRouter",
        "router = APIRouter(prefix=\"/items\")",
        "@router.post(\"/\")",
        "async def create_item(item):",
        "    return save(item)",
      ),
    })).toStrictEqual(["create_item: FastAPI route handler under POST at /items"])
  })
})

describe("the cards Django writes", () => {
  it("makes each path a holder of its path from the root, and an include a mount of the module it names, with its path", () => {
    expect(cardsOf({
      "shop/urls.py": codeOf(
        "from django.urls import include, path",
        "from shop.views import user_list",
        "urlpatterns = [",
        "    path(\"users/\", user_list),",
        "    path(\"api/\", include(\"shop.api_urls\")),",
        "]",
      ),
    })).toStrictEqual(["route: Django route holder under ANY at /users", "1: Django route handler under ANY at /users", "route: Django route mount at /api"])
  })
})
