import * as net from "net";
import * as stream from "stream";
import { handlerError } from "../handler";
import { handle, headers, Method, handlerMethod, response, HttpHandlerError, HttpHandler } from "../http-handler";

export interface IIncomingMessage<SOCKET extends net.Socket = net.Socket> extends stream.Readable {
  socket: SOCKET;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  method?: string;
}

export interface IServerResponse extends stream.Writable {
  headersSent: boolean;
  statusCode: number;
  setHeader: (key: string, value: string | string[]) => void;
  end: (chunk: unknown) => this;
}

export interface IServer {
  listen: (port: number, callback?: () => void) => this;
  close: (callback?: (err?: Error) => void) => this;
}

export interface IHttp {
  createServer: (requestListener?: (req: IIncomingMessage, res: IServerResponse) => void) => IServer;
}

interface netHandlerOptions {
  handler?: HttpHandler,
  http: IHttp;
  onError?: (error: unknown) => void;
}

export function netHandler(http: IHttp, ...handlers: handlerMethod[]): IServer;
export function netHandler(options: netHandlerOptions, ...handlers: handlerMethod[]): IServer;
export function netHandler(options: IHttp | netHandlerOptions, ...handlers: handlerMethod[]): IServer {
  if(!("http" in options)) {
    options = { http: options };
  }
  return options.http.createServer(async (request: IIncomingMessage, response: IServerResponse) => {
    const url: string = `${"encrypted" in request.socket ? "http" : "https"}://${request.headers.host}${request.url}`;
    const requestMethod = request.method !== undefined ? request.method.toUpperCase() : "GET";
    const method: Method = requestMethod in Method ? Method[requestMethod as keyof typeof Method] : Method.GET;
    // Map headers
    const headers = Object.keys(request.headers).reduce((previousValue: headers, key: string) => {
      return {
        ...previousValue,
        ...((value?: string | string[]) => (value !== undefined ? { [key]: value } : undefined))(request.headers[key]),
      };
    }, {});

    let handleResponse: response;
    try {
      handleResponse = "handler" in options && options.handler !== undefined ? await handle(options.handler, ...handlers) : await handle(method, url, headers, request, ...handlers);
    } catch(error: unknown) {
      if("onError" in options && options.onError !== undefined) {
        options.onError(error);
      }
      
      if(error instanceof HttpHandlerError) {
        const { body, headers, status } = error;
        handleResponse = { body, headers, status };
      } else {
        const status: number = error === handlerError.NO_RESPONSE ? 404 : 500;
        handleResponse = { body: null, status, headers: {} };
      }
    }
  
    // Set http status code
    response.statusCode = handleResponse.status;
    // Set headers
    for (const key of Object.keys(handleResponse.headers)) {
      response.setHeader(key, handleResponse.headers[key]);
    }

    const { body } = handleResponse;
    // If body is a readable stream. add http stream as pipe
    if (body instanceof stream.Readable) {
      body.pipe(response);
    } else {
      // Body is an string, false or null
      response.end(body);
    }
  });
}