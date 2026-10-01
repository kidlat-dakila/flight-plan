import { tokenKindOf } from "@/utils/code-highlighter/token-kind"

describe("tokenKindOf", () => {
  it("names the kind of a token from its innermost scope", () => {
    expect(tokenKindOf(["keyword.control.flow.ts", "source.ts"])).toBe("keyword")
    expect(tokenKindOf(["storage.type.ts"])).toBe("keyword")
    expect(tokenKindOf(["string.quoted.double.ts"])).toBe("string")
    expect(tokenKindOf(["punctuation.definition.string.begin.ts"])).toBe("string")
    expect(tokenKindOf(["comment.line.double-slash.ts"])).toBe("comment")
    expect(tokenKindOf(["constant.numeric.decimal.ts"])).toBe("number")
    expect(tokenKindOf(["variable.other.constant.ts"])).toBe("constant")
    expect(tokenKindOf(["entity.name.function.ts"])).toBe("function")
    expect(tokenKindOf(["support.type.primitive.ts"])).toBe("type")
    expect(tokenKindOf(["support.class.component.tsx"])).toBe("tag")
    expect(tokenKindOf(["variable.other.property.ts"])).toBe("property")
    expect(tokenKindOf(["keyword.operator.assignment.ts"])).toBe("punctuation")
  })

  it("leaves a token with an unknown scope, or none, plain", () => {
    expect(tokenKindOf(["variable.other.readwrite.ts"])).toBe("plain")
    expect(tokenKindOf([])).toBe("plain")
  })
})
