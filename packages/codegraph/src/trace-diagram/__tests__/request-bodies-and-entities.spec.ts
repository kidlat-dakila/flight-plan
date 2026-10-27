import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import type { TraceDiagram } from "@flightplan/configurations"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const edgesOf = (diagram: TraceDiagram): string[] => diagram.traceNodeEdges.map(({ from, to }) => `${from} → ${to}`)

const NEST_FILES = {
  "src/users/user.dto.ts": codeOf("export class CreateUserDto {", "  name = \"\"", "}"),
  "src/users/user.entity.ts": codeOf("export class User {", "  name = \"\"", "}"),
  "src/users/users.service.ts": codeOf(
    "import { Injectable } from \"@nestjs/common\"",
    "import { InjectRepository } from \"@nestjs/typeorm\"",
    "import { Repository } from \"typeorm\"",
    "import { CreateUserDto } from \"./user.dto\"",
    "import { User } from \"./user.entity\"",
    "@Injectable()",
    "export class UsersService {",
    "  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}",
    "  create(draft: CreateUserDto) {",
    "    return this.users.save(draft)",
    "  }",
    "}",
  ),
  "src/users/users.controller.ts": codeOf(
    "import { Body, Controller, Post } from \"@nestjs/common\"",
    "import { CreateUserDto } from \"./user.dto\"",
    "import { UsersService } from \"./users.service\"",
    "@Controller(\"users\")",
    "export class UsersController {",
    "  constructor(private readonly users: UsersService) {}",
    "  @Post()",
    "  add(@Body() draft: CreateUserDto) {",
    "    return this.users.create(draft)",
    "  }",
    "}",
  ),
}

const FASTAPI_FILES = {
  "shop/schemas.py": codeOf("from pydantic import BaseModel", "class ItemCreate(BaseModel):", "    name: str", "class ItemRead(BaseModel):", "    id: int"),
  "shop/routes.py": codeOf(
    "from fastapi import APIRouter",
    "from shop.schemas import ItemCreate, ItemRead",
    "router = APIRouter()",
    "@router.post(\"/items\", response_model=ItemRead)",
    "def add_item(draft: ItemCreate):",
    "    return save_item(draft)",
  ),
}

describe("the classes a framework fills", () => {
  it("draws a line from a Nest handler to its request body, and from the constructor that injects a repository to its entity, each a card of its own", () => {
    const diagram = presentDiagramOf(NEST_FILES, { "src/users/user.dto.ts": [rangeAt(2, 3, 2, 12)], "src/users/user.entity.ts": [rangeAt(2, 3, 2, 12)] })

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "class UsersService",
      "  method UsersService.constructor",
      "class UsersController",
      "class User (changed)",
      "class CreateUserDto (changed)",
      "route UsersController.add",
      "  method UsersController.add",
    ])
    expect(edgesOf(diagram)).toStrictEqual([
      "src/users/users.service.ts#method@8:3 → src/users/user.entity.ts#class@1:1",
      "src/users/users.controller.ts#method@7:3 → src/users/user.dto.ts#class@1:1",
      "src/users/users.service.ts#class@6:1 → src/users/users.service.ts#method@8:3",
      "src/users/users.controller.ts#class@4:1 → src/users/users.controller.ts#route@/users",
    ])
  })

  it("draws a line from a FastAPI handler to the pydantic models of its body and of its response, each a card of its own", () => {
    const diagram = presentDiagramOf(FASTAPI_FILES, { "shop/schemas.py": [rangeAt(3, 5, 3, 14), rangeAt(5, 5, 5, 12)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["route add_item", "  function add_item", "class ItemCreate (changed)", "class ItemRead (changed)"])
    expect(edgesOf(diagram)).toStrictEqual(["shop/routes.py#function@4:1 → shop/schemas.py#class@2:1", "shop/routes.py#function@4:1 → shop/schemas.py#class@4:1"])
  })

  it("keeps a card for a class with no method that a handler hands to an empty Depends(), with a line from the handler", () => {
    const files = {
      "shop/main.py": codeOf(
        "from typing import Annotated",
        "from fastapi import FastAPI, Depends",
        "app = FastAPI()",
        "class Pagination:",
        "    size: int = 20",
        "@app.get(\"/items\")",
        "def read_items(page: Annotated[Pagination, Depends()]):",
        "    return list_items(page)",
      ),
    }
    const diagram = presentDiagramOf(files, { "shop/main.py": [rangeAt(5, 5, 5, 19)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["route read_items", "  function read_items", "class Pagination (changed)"])
    expect(edgesOf(diagram)).toStrictEqual(["shop/main.py#function@6:1 → shop/main.py#class@4:1"])
  })
})
