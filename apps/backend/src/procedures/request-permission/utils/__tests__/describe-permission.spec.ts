import { describeToolInput, permissionQuestionOf } from "@/procedures/request-permission/utils/describe-permission"

describe("describeToolInput", () => {
  it("shows the command or path a tool call is about", () => {
    expect(describeToolInput({ command: "rm -rf build", description: "Clean" })).toBe("rm -rf build")
    expect(describeToolInput({ file_path: "/repo/src/x.ts", content: "..." })).toBe("/repo/src/x.ts")
  })

  it("falls back to the whole input, and to nothing when there is none", () => {
    expect(describeToolInput({ query: "retry" })).toBe("{\n  \"query\": \"retry\"\n}")
    expect(describeToolInput(undefined)).toBeNull()
    expect(describeToolInput({})).toBeNull()
  })
})

describe("permissionQuestionOf", () => {
  it("asks to allow or deny the tool, one pick", () => {
    expect(permissionQuestionOf("p1-1", "Bash", { command: "npm test" })).toMatchObject({
      id: "p1-1",
      prompt: "Allow the agent to use Bash?",
      detail: "npm test",
      options: [{ label: "Allow" }, { label: "Deny" }],
      allowsMultiple: false,
    })
  })
})
