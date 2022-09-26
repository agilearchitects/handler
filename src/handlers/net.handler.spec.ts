import * as net from "net";
import * as stream from "stream";
import { describe, it, expect } from "@jest/globals";
import { HttpHandler } from "../http-handler";
import { IIncomingMessage, IServerResponse, netHandler, IServer } from "./net.handler";

class MockRequest extends stream.PassThrough {
  public socket = new net.Socket();
  public headers = {};
  public url?: string;
  public method?: string;
}
class MockResponse extends stream.PassThrough {
  public headersSent: boolean = false;
  public statusCode: number = 200;
  public setHeader() {
    return;
  }
  public end(chunk: unknown) {
    this.emit("end", chunk);
    return this;
  }
}

class MockServer implements IServer {
  public listner?: (req: IIncomingMessage, res: IServerResponse) => void;

  public listen() {
    return this;
  }
  public close() {
    return this;
  }

  public mockRequest(url: string, method: string, headers: Record<string, string>, body: string) {
    if(this.listner === undefined) { return; }
    const request = new MockRequest();
    const response = new MockResponse();
    request.headers = headers;
    request.url = url;
    request.method = method;
    request.emit("data", body);
    setTimeout(() => this.listner !== undefined ? this.listner(request, response) : undefined, 100);
    return response;
  }
}

const mockHttp = (server: MockServer) => ({
  createServer: (requestListener?: (req: IIncomingMessage, res: IServerResponse) => void) => {
    server.listner = requestListener;
    return server;
  }
});

describe("netHandler", () => {
  it("should tunnel request/response http stream", (done) => {
    const server = new MockServer();
    const host = "localhost";
    const headers = { "my-header": "my-value" };
    const body = "Hello World";

    netHandler(mockHttp(server), (handler: HttpHandler) => {
      expect(handler.host).toEqual(host);
      expect(handler.headers).toEqual(expect.objectContaining(headers));
      handler.sendStatus(201);
    }).listen(1234);

    const response = server.mockRequest("/", "GET", { host, ...headers }, body);

    if(response !== undefined) {
      response.on("end", () => {
        expect(response.statusCode).toEqual(201);
        done();
      });
    }
  });
});