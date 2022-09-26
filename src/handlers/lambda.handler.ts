// Libs
import * as stream from "stream";
import { handlerError } from "../handler";
import { handlerMethod, Method, basicHandle, headers, header, response, HttpHandlerError } from "../http-handler";

export interface IAPIGatewayProxyEvent {
  headers: { Host: string; "X-Forwarded-Proto": string, "X-Forwarded-Port": string, } & Record<string, string | undefined>;
  path: string;
  multiValueQueryStringParameters: Record<string, string[] | undefined> | null;
  httpMethod: string;
  body: string | null;
  requestContext: { identity: { sourceIp: string }}
}

export interface IAPIGatewayProxyResult {
  statusCode: number;
  multiValueHeaders?: Record<string, (boolean | number | string)[]>;
  body: string;
}

interface ILambdaOptions {
  onError?: (error: unknown) => void;
}

export const lambaHandler = (options: ILambdaOptions, ...handlers: handlerMethod[]) => async (event: IAPIGatewayProxyEvent): Promise<IAPIGatewayProxyResult> => {
  // Get protocol, host, port and path from event
  const protocol: string = event.headers["X-Forwarded-Proto"].toLowerCase();
  const host: string = event.headers.Host;
  let port: number | null = parseInt(event.headers["X-Forwarded-Port"], 10);
  const path = event.path;
  
  // Unset port if protocol and port is matching
  if((protocol === "http" && port === 80) || (protocol === "https" && port === 443)) {
    port = null;
  }
  
  // Set URL
  let url: string = `${protocol}://${host}${port !== null ? `:${port}` : ""}${path}`;

  if(event.multiValueQueryStringParameters !== null) {
    // Attach query string to URL
    const queryString = `${Object.keys(event.multiValueQueryStringParameters).reduce((previousValue: string[], key: string) => {
      if(event.multiValueQueryStringParameters === null) { return [...previousValue]; }
      const values: string[] | undefined = event.multiValueQueryStringParameters[key];
      if(values === undefined) { return [...previousValue]; }
      return [
        ...previousValue,
        ...values.map((value: string) => `${key}=${value}`)
      ];
    }, []).join("&")}`;
    if(queryString !== "") {
      url = `${url}?${queryString}`;
    }
  }

  // Get request method as key of Method
  const requestMethod = event.httpMethod.toUpperCase();
  // set method
  const method: Method = requestMethod in Method ? Method[requestMethod as keyof typeof Method] : Method.GET;
  // Get headers from request
  const headers: headers = Object.keys(event.headers).reduce((previousValue: headers, key: string) => {
    const value: string | undefined = event.headers[key];
    if(value === undefined) { return { ...previousValue }; }
    return {
      ...previousValue,
      [key]: value,
    };
  }, {});

  let handleResponse: response;
  try {
    handleResponse = await basicHandle(method, url, headers, event.body, ...handlers);
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
  // Return handle response
  return {
    statusCode: handleResponse.status,
    // Map header to multipart
    multiValueHeaders: Object.keys(handleResponse.headers).reduce((previousValue: Record<string, string[]>, key: string) => ({ ...previousValue, [key]: ((header: header) => typeof header === "string" ? [header] : header)(handleResponse.headers[key]) }), {}),
    body: handleResponse.body instanceof stream.Readable ? await streamToString(handleResponse.body) : `${handleResponse.body}`
  };
};

const streamToString = (body: stream.Readable): Promise<string> => new Promise((resolve, reject) => {
  let response: string = "";
  body.on("data", (chunk: unknown) => response = `${response}${chunk}`);
  body.on("end", () => resolve(response));
  body.on("error", (error: unknown) => reject(error));
});