import request from "supertest";
import app from "../src/app";

describe("GET /health", () => {
  it("should return 200 OK", () => request(app).get("/health").expect(200));
});
