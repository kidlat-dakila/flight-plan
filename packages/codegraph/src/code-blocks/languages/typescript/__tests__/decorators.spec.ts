import { blockNamed, codeOf, groupOf, outlineOf, symbolsOf } from "@/code-blocks/__tests__/group-fixture"

const CONTROLLER = codeOf(
  "import { Controller, Get, UseGuards } from \"@nestjs/common\"",
  "import { AuthGuard } from \"./auth\"",
  "@UseGuards(AuthGuard)",
  "@Controller(\"cats\")",
  "export class CatsController {",
  "  @UseGuards(AuthGuard)",
  "  @Get()",
  "  list() {",
  "    return find()",
  "  }",
  "}",
)

const FILES = { "src/cats.ts": CONTROLLER, "src/auth.ts": codeOf("export class AuthGuard {}") }

describe("the blocks a decorator writes", () => {
  it("puts them inside the class or the method the decorator is written on", () => {
    expect(outlineOf(groupOf(FILES), "src/cats.ts")).toStrictEqual([
      "import 1:1-1:60",
      "import 2:1-2:35",
      "class CatsController 3:1-11:2",
      "  effect 3:2-3:22",
      "    effect-callback 0 3:12-3:21",
      "  method CatsController.list 6:3-10:4",
      "    effect 6:4-6:24",
      "      effect-callback 0 6:14-6:23",
    ])
  })

  it("gives a method the route of its route decorator, though a decorator that only hands middleware is written above it", () => {
    const list = blockNamed(groupOf(FILES), "method", "CatsController.list")

    expect([list.catalogue?.name, list.catalogue?.runs, list.catalogue?.path, list.catalogue?.method]).toStrictEqual(["Get", "route", "/cats", "GET"])
  })
})

const ENTITY = codeOf(
  "import { Entity, ManyToOne, OneToMany } from \"typeorm\"",
  "import { Trainer } from \"./trainer\"",
  "import { Photo } from \"./photo\"",
  "@Entity()",
  "export class Pokemon {",
  "  @ManyToOne(() => Trainer, { nullable: true })",
  "  trainer!: Trainer | null",
  "  @OneToMany(() => Photo, (photo) => photo.pokemon)",
  "  photos!: Photo[]",
  "  @Track(() => audit())",
  "  level!: number",
  "}",
)

const REFERENCED = {
  "src/pokemon.ts": ENTITY,
  "src/trainer.ts": codeOf("export class Trainer {}"),
  "src/photo.ts": codeOf("export class Photo {}"),
}

describe("an arrow a decorator is handed", () => {
  it("reads an arrow that only names a class or a member as a reference, so the decorator hands over no callback", () => {
    const outline = outlineOf(groupOf(REFERENCED), "src/pokemon.ts")

    expect(outline.filter((line) => line.includes(" 6:") || line.includes(" 8:"))).toStrictEqual([
      "  property Pokemon.trainer 6:3-7:27",
      "    property nullable 6:31-6:45",
      "  property Pokemon.photos 8:3-9:19",
    ])
  })

  it("keeps an arrow that calls something a callback of the decorator", () => {
    const outline = outlineOf(groupOf(REFERENCED), "src/pokemon.ts")

    expect(outline.filter((line) => line.includes(" 10:"))).toStrictEqual([
      "  property Pokemon.level 10:3-11:17",
      "    effect 10:4-10:24",
      "      effect-callback 0 10:10-10:23",
      "        function 10:10-10:23",
    ])
  })

  it("reads the class an arrow names as a value the property uses", () => {
    const trainer = blockNamed(groupOf(REFERENCED), "property", "Pokemon.trainer")

    expect(symbolsOf(trainer)).toStrictEqual([
      "call unopened-import typeorm:ManyToOne",
      "value external-block src/trainer.ts#class@1:1",
      "type external-block src/trainer.ts#class@1:1",
    ])
  })
})

describe("the members of a class", () => {
  it("counts a parameter of the constructor marked private, public, protected or readonly as a member reached through this", () => {
    const group = groupOf({
      "src/users.ts": codeOf("export class UsersService {", "  findAll() {", "    return []", "  }", "}"),
      "src/report.ts": codeOf(
        "import { UsersService } from \"./users\"",
        "export class Report {",
        "  constructor(private readonly users: UsersService, plain: UsersService) {}",
        "  run() {",
        "    return this.users.findAll()",
        "  }",
        "}",
      ),
    })

    expect(symbolsOf(blockNamed(group, "method", "Report.run"))).toStrictEqual(["call internal-code-block src/report.ts#root-argument-value@3:15 findAll"])
    expect(blockNamed(group, "method", "Report.run").outerSymbols[0].member?.blockId).toBe("src/users.ts#method@2:3")
  })
})
