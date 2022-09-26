import { describe, expect, it } from "@jest/globals";
import { basicHandle, HttpHandler, Method } from "../http-handler";
import { routeHttpHandler } from "./route.http-handler";

describe("Method", () => {
  it("should continue with provided handlers if route matches provided method", async () => {
    const path = "foo/bar";
    const result = await basicHandle(Method.GET, `http://127.0.0.1/${path}`, {}, null,
      routeHttpHandler(path, (handler: HttpHandler) => handler.sendStatus(200)), 
      (handler: HttpHandler) => handler.sendStatus(404));
    expect(result.status).toEqual(200);
  });
  it("should not continue with provided handlers if route does not matches", async () => {
    const result = await basicHandle(Method.GET, "http://127.0.0.1", {}, null,
      routeHttpHandler("foo/bar", (handler: HttpHandler) => handler.sendStatus(200)),
      (handler: HttpHandler) => handler.sendStatus(404));
    expect(result.status).toEqual(404);
  });
  it("should set params to handler instance", async () => {
    const authorId = "1";
    const bookId = "2";
    const result = await basicHandle(Method.GET, `http://127.0.0.1/author/${authorId}/book/${bookId}`, {}, null,
      routeHttpHandler("author/:authorId/book/:bookId"), (handler: HttpHandler) => handler.sendJson(handler.params)
    );
    const body = JSON.parse(result.body as string);
    expect(body.authorId).toEqual(authorId);
    expect(body.bookId).toEqual(bookId);
  });
});