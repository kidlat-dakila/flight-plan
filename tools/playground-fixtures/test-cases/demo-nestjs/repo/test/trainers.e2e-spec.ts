import request from "supertest"
import { API_KEY } from "@/settings"
import { startApp } from "./app"

describe("trainers", () => {
  it("returns the new trainer", async () => {
    const app = await startApp()
    const response = await request(app.getHttpServer())
      .post("/api/trainers")
      .set("x-api-key", API_KEY)
      .send({ name: "Ash", hometown: "Pallet Town" })
    expect(response.status).toBe(201)
    expect(response.body.name).toBe("Ash")
  })
})
