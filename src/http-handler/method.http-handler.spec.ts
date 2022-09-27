import { describe, expect, it } from "@jest/globals";
import { handle, HttpHandler, Method } from "../http-handler";
import { methodHttpHandler } from "./method.http-handler";

describe("Method", () => {
  it("should continue with provided handlers if method matches provided method", async () => {
    const result = await handle(Method.GET, "http://127.0.0.1", {}, null,
      methodHttpHandler(Method.GET, (handler: HttpHandler) => handler.sendStatus(200)), 
      (handler: HttpHandler) => handler.sendStatus(404));
    expect(result.status).toEqual(200);
  });
  it("should not continue with provided handlers if method does not matches", async () => {
    const result = await handle(Method.GET, "http://127.0.0.1", {}, null,
      methodHttpHandler(Method.POST, (handler: HttpHandler) => handler.sendStatus(200)),
      (handler: HttpHandler) => handler.sendStatus(404));
    expect(result.status).toEqual(404);
  });
});