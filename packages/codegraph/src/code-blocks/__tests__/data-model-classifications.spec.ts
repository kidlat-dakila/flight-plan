import { blockNamed, codeOf, groupOf } from "./group-fixture"

const DATA_MODEL = "data-model"

describe("the classification of a model an ORM defines", () => {
  it("classifies a TypeScript class that extends the model of an ORM as a data model", () => {
    const models = codeOf("import { Model } from \"sequelize\"", "export class Order extends Model {", "  declare total: number", "}")

    expect(blockNamed(groupOf({ "src/order.ts": models }), "class", "Order").classifications).toContain(DATA_MODEL)
  })

  it("classifies a Python class that extends the model of an ORM as a data model", () => {
    const models = codeOf("from django.db import models", "", "class Order(models.Model):", "    total = models.IntegerField()")

    expect(blockNamed(groupOf({ "shop/models.py": models }), "class", "Order").classifications).toContain(DATA_MODEL)
  })

  it("classifies a model that extends an abstract model of the same file as a data model", () => {
    const models = codeOf(
      "from django.db import models",
      "",
      "class Timestamped(models.Model):",
      "    created = models.DateTimeField(auto_now_add=True)",
      "",
      "    class Meta:",
      "        abstract = True",
      "",
      "class Order(Timestamped):",
      "    total = 0",
    )

    expect(blockNamed(groupOf({ "shop/models.py": models }), "class", "Order").classifications).toContain(DATA_MODEL)
  })

  it("classifies the root variable of a table a schema call declares as a data model", () => {
    const schema = codeOf("import { integer, pgTable } from \"drizzle-orm/pg-core\"", "export const orders = pgTable(\"orders\", { id: integer() })")

    expect(blockNamed(groupOf({ "src/schema.ts": schema }), "root-variable", "orders").classifications).toContain(DATA_MODEL)
  })
})
