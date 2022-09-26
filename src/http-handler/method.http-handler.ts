import { handlerMethod, HttpHandler, next, Method } from "../http-handler";

export const methodHttpHandler = (method: Method, ...handlers: handlerMethod[]): handlerMethod => (handler: HttpHandler, next: next) => {
  next(...method === handler.method ? handlers : []);
};