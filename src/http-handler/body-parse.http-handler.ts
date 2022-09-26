import * as stream from "stream";
import { handlerMethod, HttpHandler, next } from "../http-handler";

export const bodyParseHttpHandler = (): handlerMethod => async (handler: HttpHandler, next: next) => {
  let type: "json" | "form" | undefined;
  const contentTypeHeader: string | string[] | undefined = handler.headers["content-type"];
  if (contentTypeHeader !== undefined && typeof contentTypeHeader === "string") {
    if (/^application\/json/.test(contentTypeHeader) === true) {
      type = "json";
    } else if (/^application\/(x-www-form-urlencoded|form-data)/.test(contentTypeHeader) === true) {
      type = "form";
    }
  }
  if (type !== undefined) {
    if(handler.body instanceof stream.Readable || typeof handler.body === "string") {
      const body: string = handler.body instanceof stream.Readable ? await streamToString(handler.body) : handler.body;
      handler.parsedBody = type === "json" ? JSON.parse(body) : new URLSearchParams(body);
    }
  }
  next();
};

const streamToString = (stream: stream.Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data: string = "";
    stream.on("data", (chunk: unknown) => {
      // Concatenate data to body container
      data = data + `${chunk}`;
    });
    stream.on("end", () => {
      // Resolve concatenated data
      resolve(data);
    });
    stream.on("error", (error: Error) => reject(error));
  });
};