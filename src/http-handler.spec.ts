import * as stream from "stream";
import { describe, it, expect } from "@jest/globals";
import { basicHandle, HttpHandler, Method, response, next } from "./http-handler";

describe("httpHandler", () => {
  it("should be able to send response object", async () => {
    const body: string = "1";
    const response = await basicHandle(Method.GET, "http://127.0.0.1", {}, "",
      () => { return { body, headers: {}, status: 200} ; }
    );
    expect(response.body).toEqual(body);
  });
  it("should be able to send body object", async () => {
    const body: string = "1";
    const response = await basicHandle(Method.GET, "http://127.0.0.1", {}, "",
      () => { return body; },
    );
    expect(response.body).toEqual(body);
  });
  it("should be able to send status", async () => {
    const status: number = 404;
    const response = await basicHandle(Method.GET, "http://127.0.0.1", {}, "",
      () => status
    );
    expect(response.status).toEqual(status);
  });
  it("should be able to send response object using send method", async () => {
    const body: string = "1";
    const response = await basicHandle(Method.GET, "http://127.0.0.1", {}, "",
      (handler: HttpHandler) => { handler.send(body); }
    );
    expect(response.body).toEqual(body);
  });
  it("should be able to send body as stream", async () => {
    const payload: string = "ABCDEFGHOJKLMNOPQRSTUVQ";
    const data: string[] = splitStringEvery(payload, 2);
    const body: stream.PassThrough = new stream.PassThrough();
    const response: response = await basicHandle(Method.GET, "http://127.0.0.1", {}, null, (handler: HttpHandler) => handler.send(body));
    
    if(response.body instanceof stream.Readable) {
      let responseBody = "";
      response.body.on("data", (chunk: unknown) => {
        responseBody += chunk;
      });
      response.body.on("end", () => {
        expect(responseBody).toEqual(payload);
      });
    }
    
    for(const value of data) {
      body.emit("data", value);
      await waitFor(100);
    }
    body.emit("end");
  });
  it("should be able to handle stream as request body", async () => {
    const payload: string = "ABCDEFGHOJKLMNOPQRSTUVQ";
    const data: string[] = splitStringEvery(payload, 2);
    const body: stream.PassThrough = new stream.PassThrough();

    (async () => {
      await waitFor(100);
      for(const value of data) {
        body.emit("data", value);
        await waitFor(100);
      }
      body.emit("end");
    })();

    const response = await basicHandle(Method.GET, "http://127.0.0.1", {}, body, (handler: HttpHandler) => {
      if(handler.body instanceof stream.Readable) {
        let responseBody = "";
        handler.body.on("data", (chunk: unknown) => {
          responseBody += chunk;
        });
        handler.body.on("end", () => {
          handler.send(responseBody);
        });
      }
    });
    expect(response.body).toEqual(payload);
  });
  describe("beforeSend", () => {
    it("should be able to modify response before send", async () => {
      const body: string = "hello world";
      const newStatus: number = 404;
      const response: response = await basicHandle(Method.GET, "http://127.0.0.1", {}, "",
        (handler: HttpHandler, next: next) => { handler.beforeSend((response: response) => ({ ...response, status: newStatus })); next(); },
        () => ({ body, headers: {}, status: 200 })
      );
      expect(response.body).toEqual(body);
      expect(response.status).toEqual(newStatus);
    });
  });
  describe("headers", () => {
    it("should be able to get header no matter casing", () => {
      const headerKey = "Authorization";
      const headerValue = "Bearer 123";
      const handler = new HttpHandler({
        headers: { [headerKey]: headerValue }
      });

      const header = handler.getRequestHeader(headerKey.toUpperCase());
      expect(header).toEqual(headerValue);
    });
  });
});

const splitStringEvery = (value: string, every: number = 5): string[] => {
  const result = value.match(new RegExp(`.{1,${every}}`, "g"));
  return result !== null ? result : [value];
};

const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), ms));