import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import type { TraceDiagram } from "@flightplan/configurations"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const edgesOf = (diagram: TraceDiagram): string[] => diagram.traceNodeEdges.map(({ from, to }) => `${from} → ${to}`)

const NEST_MODULES = {
  "src/users/users.controller.ts": codeOf(
    "import { Controller, Get } from \"@nestjs/common\"",
    "@Controller(\"users\")",
    "export class UsersController {",
    "  @Get()",
    "  findAll() {",
    "    return []",
    "  }",
    "}",
  ),
  "src/users/users.module.ts": codeOf(
    "import { Module } from \"@nestjs/common\"",
    "import { UsersController } from \"./users.controller\"",
    "@Module({ controllers: [UsersController] })",
    "export class UsersModule {}",
  ),
  "src/app.module.ts": codeOf("import { Module } from \"@nestjs/common\"", "import { UsersModule } from \"./users/users.module\"", "@Module({ imports: [UsersModule] })", "export class AppModule {}"),
}

describe("the module wiring of a Nest app", () => {
  it("draws the module a module imports as a card of its own, with a line to the controller it lists", () => {
    const diagram = presentDiagramOf(NEST_MODULES, { "src/users/users.controller.ts": [rangeAt(6, 12, 6, 14)] })

    expect(outlineOfNodes(diagram).slice(0, 3)).toStrictEqual(["class AppModule", "class UsersModule", "class UsersController (changed)"])
    expect(edgesOf(diagram)).toStrictEqual([
      "src/app.module.ts#class@3:1 → src/users/users.module.ts#class@3:1",
      "src/users/users.module.ts#class@3:1 → src/users/users.controller.ts#class@2:1",
      "src/users/users.controller.ts#class@2:1 → src/users/users.controller.ts#route@/users",
    ])
  })
})

const DTO_FILES = {
  "src/users/user.dto.ts": codeOf(
    "import { IsIn, IsString } from \"class-validator\"",
    "export const ROLES = [\"admin\", \"member\"]",
    "export class CreateUserDto {",
    "  @IsString()",
    "  name!: string",
    "  @IsIn(ROLES)",
    "  role!: string",
    "}",
  ),
  "src/users/users.service.ts": codeOf(
    "import { CreateUserDto } from \"./user.dto\"",
    "export class UsersService {",
    "  create(draft: CreateUserDto) {",
    "    return save(draft)",
    "  }",
    "}",
  ),
}

describe("a class with no method that no node steps into", () => {
  it("keeps a node of its own when nothing but a type names it, and holds the plain value it reads", () => {
    const diagram = presentDiagramOf(DTO_FILES, { "src/users/user.dto.ts": [rangeAt(2, 1, 2, 42), rangeAt(6, 3, 7, 16)], "src/users/users.service.ts": [rangeAt(4, 12, 4, 23)] })
    const dto = diagram.traceNodes.find((node) => node.codeBlocks[0].name === "CreateUserDto")

    expect(outlineOfNodes(diagram)).toContain("class CreateUserDto (changed)")
    expect(dto?.codeBlocks.map((block) => block.name ?? block.type)).toContain("ROLES")
  })
})
