import { renameSkill } from "@/procedures/save-setup-step/utils/skill-file"

describe("renameSkill", () => {
  it("changes the name in the front matter and nothing else", () => {
    const skill = "---\nname: review\ndescription: Use when reviewing\n---\n\nname: review stays in the body\n"

    expect(renameSkill(skill, "flightplan-review")).toBe(
      "---\nname: flightplan-review\ndescription: Use when reviewing\n---\n\nname: review stays in the body\n",
    )
  })
})
