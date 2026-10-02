import { runCommand } from "@/utils/run-command"

describe("runCommand", () => {
  it("reports a command that succeeds", async () => {
    await expect(runCommand(process.execPath, ["-e", ""], {})).resolves.toStrictEqual({
      exitCode: 0,
      output: "",
      errorOutput: "",
    })
  })

  it("reports the exit code and the error output of a command that fails", async () => {
    const script = "console.error(process.env.REASON); process.exit(3)"

    await expect(runCommand(process.execPath, ["-e", script], { REASON: "no network" })).resolves.toStrictEqual({
      exitCode: 3,
      output: "",
      errorOutput: "no network\n",
    })
  })

  it("reports what a command printed", async () => {
    await expect(runCommand(process.execPath, ["-e", "console.log('signed in')"], {})).resolves.toMatchObject({
      exitCode: 0,
      output: "signed in\n",
    })
  })

  it("reports a command that cannot be started", async () => {
    await expect(runCommand("/no/such/program", [], {})).resolves.toMatchObject({ exitCode: 1 })
  })
})
