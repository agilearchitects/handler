import * as stream from "stream";
import { describe, expect, it } from "@jest/globals";
import { handle, HttpHandler, Method } from "../http-handler";
import { bodyParseHttpHandler } from "./body-parse.http-handler";

describe("bodyParseHttpHandler", () => {
  it("should be able to parse json paylaod", () => {
    const payload = { foo: "bar" };
    handle(Method.GET, "http://127.0.0.1", { "content-type": "application/json" }, JSON.stringify(payload),
      bodyParseHttpHandler(),
      (handler: HttpHandler) => { expect(handler.parsedBody).toEqual(payload); handler.send(null); }
    );
  });
  it("should be able to parse querystring payload", () => {
    const foo: string = "bar";
    const hello: string = "world";
    const payload: string = `foo=${foo}&hello=${hello}`;
    handle(Method.GET, "http://127.0.0.1", { "content-type": "application/form-data" }, payload,
      bodyParseHttpHandler(),
      (handler: HttpHandler) => {
        const parsedBody: URLSearchParams = handler.getPayload("parsedBody", new URLSearchParams());
        expect(parsedBody.get("foo")).toEqual(foo);
        expect(parsedBody.get("hello")).toEqual(hello);
        handler.send(null);
      }
    );
  });
  it("should be able to parse body as stream", async () => {
    const payload = { foo: "bar", hello: "world" };
    const data: string[] = splitStringEvery(JSON.stringify(payload), 5);
    const body = new stream.PassThrough();

    handle(Method.GET, "http://127.0.0.1", { "content-type": "application/json" }, body,
      bodyParseHttpHandler(),
      (handler: HttpHandler) => {
        expect(handler.parsedBody).toEqual(payload); handler.send(null);
      }
    );

    for(const value of data) {
      body.emit("data", value);
      waitFor(100);
    }
    body.emit("end");
  });
});

const splitStringEvery = (value: string, every: number = 5): string[] => {
  const result = value.match(new RegExp(`.{1,${every}}`, "g"));
  return result !== null ? result : [value];
};

const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), ms));