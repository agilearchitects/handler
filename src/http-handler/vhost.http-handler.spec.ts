import { describe, expect, it } from "@jest/globals";
import { handle, HttpHandler, Method } from "../http-handler";
import { vhostHttpHandler } from "./vhost.http-handler";

describe("vhostHttpHandler", () => {
  it("should validate host using url", async () => {
    const message: string = "hello world";
    const response = await handle(Method.GET, "http://www.test.test", {}, null,
      vhostHttpHandler("www.test.test",
        (handler: HttpHandler) => handler.send(message)
      ),
    );
    expect(response.body).toEqual(message);
  });
  it("should validate host using header before url", async () => {
    const message: string = "hello world";
    const response = await handle(Method.GET, "http://www.test.test", { host: "api.test.test"}, null,
      vhostHttpHandler("api.test.test",
        (handler: HttpHandler) => handler.send(message)
      ),
    );
    expect(response.body).toEqual(message);
  });
  it("should skip if host is not matching", async () => {
    const message: string = "hello world";
    const response = await handle(Method.GET, "http://www.test.test", {}, null,
      vhostHttpHandler("api.test.test",
        (handler: HttpHandler) => handler.send(null)
      ),
      (handler: HttpHandler) => handler.send(message)
    );
    expect(response.body).toEqual(message);
  });
  it("should validate using array", async () => {
    const message: string = "hello world";
    const skipMessage: string = "foobar";
    const handlers = [
      vhostHttpHandler(["www.test.test", "api.test.test"],
        (handler: HttpHandler) => handler.send(message)
      ),
      (handler: HttpHandler) => handler.send(skipMessage)
    ];
    const response1 = await handle(Method.GET, "http://www.test.test", {}, null, ...handlers);
    const response2 = await handle(Method.GET, "http://api.test.test", {}, null, ...handlers);
    const response3 = await handle(Method.GET, "http://wrong.test.test", {}, null, ...handlers);
    expect(response1.body).toEqual(message);
    expect(response2.body).toEqual(message);
    expect(response3.body).toEqual(skipMessage);
  });
  it("should validate using regexp", async () => {
    const message: string = "hello world";
    const response = await handle(Method.GET, "http://www.test.test", {}, null,
      vhostHttpHandler(/(api\.test\.test|www\.test\.test)/,
        (handler: HttpHandler) => handler.send(message)
      ),
    );
    expect(response.body).toEqual(message);
  });
});