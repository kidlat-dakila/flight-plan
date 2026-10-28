import { blockNamed, codeOf, groupOf, symbolsOf } from "@/code-blocks/__tests__/group-fixture"

const CLIENT = codeOf("export const request = async <Body>(path: string): Promise<Body> => {", "  return path as Body", "}")

describe("how a block uses a name", () => {
  it("calls a function it awaits with type arguments, as it calls one it awaits without them", () => {
    const group = groupOf({
      "src/client.ts": CLIENT,
      "src/load.ts": codeOf(
        "import { request } from \"./client\"",
        "export const load = async (id) => {",
        "  const typed = await request<Trainer>(id)",
        "  const plain = await request(id)",
        "  return [typed, plain]",
        "}",
      ),
    })

    expect(symbolsOf(blockNamed(group, "external-value", "typed"))).toContain("call external-block src/client.ts#function@1:1")
    expect(symbolsOf(blockNamed(group, "external-value", "plain"))).toContain("call external-block src/client.ts#function@1:1")
  })
})
