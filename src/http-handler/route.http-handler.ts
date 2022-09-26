import { handlerMethod, HttpHandler, next } from "../http-handler";
import { parseRoute, routeError } from "../modules/route.module";

export const routeHttpHandler = (route: string | RegExp, ...handlers: handlerMethod[]): handlerMethod => (handler: HttpHandler, next: next) => {
  try {
    // Parse route params and save to handler instance
    handler.params = parseRoute(handler.path, route);

    // Continue to provided handlers
    next(...handlers);
  } catch(error: unknown) {
    // If route doesn't match. Continue to next handler
    if(error === routeError.NO_MATCH) { next(); return; }
    throw error;
  }
};
