import { handlerMethod, HttpHandler, next } from "../http-handler";

export const vhostHttpHandler = (domain: string | string[] | RegExp, ...handlers: handlerMethod[]): handlerMethod =>
  (handler: HttpHandler, next: next): void => {
    if ((typeof domain === "string" && handler.host === domain.toLowerCase()) || ((domain instanceof Array) && domain.find((domain: string) => domain.toLowerCase() === handler.host)) || ((domain instanceof RegExp) && domain.test(handler.host))) {
      // Add handlers to request
      next(...handlers);
    } else {
      // Continue to next handlers (skipping provided handlers)
      next();
    }
  };
