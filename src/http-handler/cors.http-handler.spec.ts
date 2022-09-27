import { describe, expect, it } from "@jest/globals";
import { handle, HttpHandler, HttpHandlerError, Method } from "../http-handler";
import { corsHttpHandler } from "./cors.http-handler";

describe("corsHttpHandler", () => {
  it("should send * as default allowed origin", async () => {
    const response = await handle(Method.GET, "http://127.0.0.1", { }, null,
      corsHttpHandler(),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.headers["access-control-allow-origin"]).toEqual("*");
  });
  it("should send matching origin from regexp", async () => {
    const origin =  "http://www.test.test";
    const response = await handle(Method.GET, "http://127.0.0.1", { origin }, null,
      corsHttpHandler(/^http:\/\/.+\.test.test$/),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.headers["access-control-allow-origin"]).toEqual(origin);
  });
  it("should send regexp string if not matching", async () => {
    const origin =  "http://www.test.test";
    const regexp = /^http:\/\/.+\.wrong.com$/;
    const response = await handle(Method.GET, "http://127.0.0.1", { origin }, null,
      corsHttpHandler(regexp),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.headers["access-control-allow-origin"]).toEqual(regexp.toString());
  });
  it("should send matching origin from array", async () => {
    const origins: string[] = ["http://www.test.test", "http://api.test.test"];
    const response = await handle(Method.GET, "http://127.0.0.1", { origin: origins[0] }, null,
      corsHttpHandler(origins),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.headers["access-control-allow-origin"]).toEqual(origins[0]);
  });
  it("should send array as string if not matching", async () => {
    const origin = "http://www.test.test";
    const origins: string[] = ["http://www.wrong.com", "http://api.test.test"];
    const response = await handle(Method.GET, "http://127.0.0.1", { origin }, null,
      corsHttpHandler(origins),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.headers["access-control-allow-origin"]).toEqual(origins.join(","));
  });
  it("should send additional headers on option request", async () => {
    const allowedHeaders = ["FOO", "BAR"];
    const allowedMethods = [Method.GET];
    const response = await handle(Method.OPTIONS, "http://127.0.0.1", { }, null,
      corsHttpHandler("*", { allowedHeaders, allowedMethods }),
      (handler: HttpHandler) => { handler.send(null); }
    );
    expect(response.status).toEqual(204);
    expect(response.headers["access-control-allow-methods"]).toEqual(allowedMethods.map((method: Method) => method.toUpperCase()).join(","));
    expect(response.headers["access-control-allow-headers"]).toEqual(allowedHeaders.map((header: string) => header.toLowerCase()).join(","));
  });
  it("should send headers on error", async () => {
    try {
      await handle(Method.GET, "http://127.0.0.1", { }, null,
        corsHttpHandler(),
        () => { throw new HttpHandlerError({ status: 404 }); }
      );
    } catch(error: unknown) {
      expect(error).toBeInstanceOf(HttpHandlerError);
      expect((error as HttpHandlerError).headers["access-control-allow-origin"]).toBeDefined();
    }
  });
});