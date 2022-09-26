import { describe, it, expect } from "@jest/globals";
import { handlerMethod, HttpHandler } from "../http-handler";
import { lambaHandler } from "./lambda.handler";

describe("LambdaHandler", () => {
  const handler: handlerMethod = (handler: HttpHandler) => {
    handler.sendJson({
      request: {
        body: handler.body,
        headers: handler.headers,
        host: handler.host,
        method: handler.method,
        origin: handler.origin,
        path: handler.path,
        port: handler.port,
        protocol: handler.protocol,
        query: handler.query,
        parsedHost: handler.parsedHost,
        url: handler.url,
      }
    });
  };
  describe("Query string", () => {
    it("should parse request with query string", async () => {
      const lambda = lambaHandler({}, handler);
      const request = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "http", "X-Forwarded-Port": "80"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: { foo: ["bar"], hello: ["world", "world2"] },
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      expect(request.url).toEqual("http://127.0.0.1/path/to/resource?foo=bar&hello=world&hello=world2");
    });
    it("should parse request without query string", async () => {
      const lambda = lambaHandler({}, handler);
      const request = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "http", "X-Forwarded-Port": "80"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: null,
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      expect(request.url).toEqual("http://127.0.0.1/path/to/resource");
    });
  });
  describe("Port", () => {
    it("should remove port if matching default for protocol", async () => {
      const lambda = lambaHandler({}, handler);
      const httpRequest = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "http", "X-Forwarded-Port": "80"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: null,
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      const httpsRequest = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "https", "X-Forwarded-Port": "443"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: null,
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      expect(httpRequest.url).toEqual("http://127.0.0.1/path/to/resource");
      expect(httpsRequest.url).toEqual("https://127.0.0.1/path/to/resource");
    });
    it("should have port in URL if not matching protocol default", async () => {
      const lambda = lambaHandler({}, handler);
      const httpRequest = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "http", "X-Forwarded-Port": "443"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: null,
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      const httpsRequest = JSON.parse((await lambda({
        headers: { Host: "127.0.0.1", "X-Forwarded-Proto": "https", "X-Forwarded-Port": "80"},
        path: "/path/to/resource",
        multiValueQueryStringParameters: null,
        httpMethod: "",
        body: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } }
      })).body).request;
      expect(httpRequest.url).toEqual("http://127.0.0.1:443/path/to/resource");
      expect(httpsRequest.url).toEqual("https://127.0.0.1:80/path/to/resource");
    });
  });
});