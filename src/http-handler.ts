import * as stream from "stream";
import { Handler, handlerMethod as baseHandlerMethod, handle as baseHandle, next as baseNext, beforeSend } from "./handler";

export enum Method {
  GET = "get",
  HEAD = "head",
  POST = "post",
  PUT = "put",
  DELETE = "delete",
  CONNECT = "connect",
  OPTIONS = "options",
  TRACE = "options",
  PATCH = "patch",
}

export type handlerMethod = baseHandlerMethod<response | body | number, HttpHandler>;
export type next = baseNext<response | body | number, HttpHandler>;

export type body = string | false | null | stream.Readable;
export type header = string | string[];
export type headers = Record<string, header>;
export type query = Record<string, string | string[] | undefined>
export type response = { body: body, headers: headers, status: number };
export type request = { method?: Method, url?: string, headers?: headers, body?: body }
export type payload = Record<string, unknown>;

export class HttpHandlerError extends Error {
  private _body: body;
  public get body(): body { return this._body; }
  private _headers: headers;
  public get headers(): headers { return this._headers; }
  public set headers(headers: headers) {
    this._headers = headerKeysToLowercase(headers);
  }
  private _status: number;
  public get status(): number { return this._status; }

  public constructor(
    payload: Partial<response> = {},
  ) {
    super();
    const { body = null, headers = {}, status = 500 } = payload;
    this._body = body;
    this._headers = headers;
    this._status = status;
  }
}

export class HttpHandler extends Handler<response | body | number> {
  [key: string]: unknown;

  private parsedUrl: URL;

  private readonly defaultUrl: string = "http://127.0.0.1";
  private readonly defaultPorts: Record<string, number> = { http: 80, https: 443 };

  private _method: Method;
  private _url: string;
  private _headers: headers = {};
  private _body: body = null;
  public constructor(
    request: request,
  ) {
    super();
    const { method = Method.GET, url = this.defaultUrl, headers = {}, body = null } = request;
    this._method = method;
    this._url = url;
    this._headers = headers;
    this._body = body;
    
    this.parsedUrl = new URL(this.url);
  }

  public get method(): Method | undefined { return this._method; }
  public get url(): string { return this._url; }
  public get body(): body { return this._body; }
  public get headers(): headers { return this._headers; }
  public get protocol(): string { return this.parsedUrl.protocol.replace(/:$/, ""); }

  public get port(): number | undefined {
    if(this.parsedUrl === undefined) { return undefined; }
    if(this.parsedUrl.port !== "") {
      return parseInt(this.parsedUrl.port, 10);
    } else if (this.protocol in this.defaultPorts) {
      return this.defaultPorts[this.protocol];
    }
    return NaN;
  }

  public get path(): string {
    return this.parsedUrl.pathname;
  }

  public get host(): string {
    return typeof this.headers.host === "string" ? this.headers.host.replace(/:\d+$/, "").toLowerCase() : this.parsedHost; 
  }

  public get parsedHost(): string {
    return this.parsedUrl.hostname;
  }

  public get origin(): string | undefined {
    if("origin" in this.headers && typeof this.headers["origin"] === "string") {
      return this.headers["origin"];
    }
    return undefined;
  }

  public get query(): query {
    if (this.parsedUrl.search === "") { return {}; }
    const query: query = {};
    this.parsedUrl.searchParams.forEach((value: string, key: string) => {
      const foundValue: string | string[] | undefined = query[key];

      query[key] = foundValue === undefined ? value : [...(typeof foundValue === "string" ? [foundValue] : foundValue), value];
    });

    return query;
  }

  public getRequestHeader(key: string): header {
    return headerKeysToLowercase(this._headers)[key.toLowerCase()];
  }

  public beforeSend(callback: beforeSend<response>): void {
    super.beforeSend((response: response | body | number) => {
      if(typeof response === "object" && response !== null && "body" in response) {return callback(response); }
      else { throw new Error(); }
    });
  }

  public send(body: body): void;
  public send(status: number): void;
  public send(body: body, headers?: headers, status?: number): void;
  public send(response: response): void;
  public send(response: response | body | number, headers: headers = {}, status: number = 200): void {
    // Sets response
    if(typeof response === "number") {
      response = { body: null, headers, status: response };
    } else if(typeof response !== "object" || response === null || !("body" in response)) {
      response = { body: response, headers, status };
    }
    
    // Register before send to lowercase all headers
    this.beforeSend(response => ({
      ...response,
      headers: headerKeysToLowercase(response.headers)
    }));

    // Send
    super.send(response);
  }

  public sendStatus(status: number): void {
    this.send(null, {}, status);
  }

  public sendJson(object: unknown): void;
  public sendJson(object: unknown, headers?: headers, status?: number): void {
    this.send(this.toJson(object), headers, status);
  }

  public toJson(object: unknown): string {
    return JSON.stringify(object);
  }

  public getPayload<T>(name: string): T | undefined;
  public getPayload<T>(name: string, defaultValue: T): T;
  public getPayload<T>(name: string, defaultValue?: T): T | undefined { return name in this ? this[name] as T : defaultValue !== undefined ? defaultValue : undefined; }

  public setPayload(name: string, value: unknown): void;
  public setPayload(payload: payload): void;
  public setPayload(payload: string | payload, value?: unknown): void {
    if (typeof payload === "string") {
      this[payload] = value;
    } else {
      for(const key of Object.keys(payload)) {
        this[key] = payload[key];
      }
    }
  }
}

const _handle = async (handler: HttpHandler, ...handlers: handlerMethod[]): Promise<response> => {
  const response: response | body | number = await baseHandle(handler, ...handlers);

  if(typeof response === "object" && response !== null && "body" in response) {
    return response;
  } else if(typeof response === "number") {
    return { body: null, headers: {}, status: response };
  } else {
    return { body: response, headers: {}, status: 200 };
  }
};

const headerKeysToLowercase = (headers: headers): headers => {
  return Object.keys(headers).reduce((previousValue: headers, key: string) => {
    const value = headers[key];
    const foundValue: string | string[] | undefined = previousValue[key.toLowerCase()];
    return {
      ...previousValue,
      // Save header key as lower case
      [key.toLowerCase()]: foundValue === undefined ? value : [
        ...(typeof foundValue === "string" ? [foundValue] : foundValue),
        ...(typeof value === "string" ? [value] : value)],
    };
  }, {});
};

export function handle(method: Method, url: string, headers: headers, body: body, ...handlers: handlerMethod[]): Promise<response>;
export function handle(handler: HttpHandler, ...handlers: handlerMethod[]): Promise<response>;
export function handle(method: Method | HttpHandler, url: string | handlerMethod, headers: headers | handlerMethod, body: body | handlerMethod, ...handlers: handlerMethod[]): Promise<response> {
  if(method instanceof HttpHandler && typeof url === "function" && typeof headers === "function" && typeof body === "function") {
    return _handle(method, ...[url, headers, body, ...handlers]);
  } else if(!(method instanceof HttpHandler) && typeof url !== "function" && typeof headers !== "function" && typeof body !== "function") {
    return _handle(new HttpHandler({ method, url, headers, body }), ...handlers);
  }
  throw new Error("Method is called with incorrect parameters");
}
