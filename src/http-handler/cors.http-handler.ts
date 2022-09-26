import { handlerMethod, HttpHandler, Method, next, HttpHandlerError, headers } from "../http-handler";

export function corsHttpHandler(origin?: string): handlerMethod;
export function corsHttpHandler(origin: string[]): handlerMethod;
export function corsHttpHandler(origin: RegExp): handlerMethod;
export function corsHttpHandler(origin: string | string[] | RegExp): handlerMethod;
export function corsHttpHandler(origin: string | string[] | RegExp, options: { allowedMethods: Method[], allowedHeaders: string[] }): handlerMethod;
/**
 * Cors handler
 * @param origin What origin to allow
 * @param options What methods and headers to allow (or handler method)
 */
export function corsHttpHandler(origin: string | string[] | RegExp = "*", options?: { allowedMethods?: Method[], allowedHeaders?: string[] }): handlerMethod {
  // Default values
  let allowedMethods: Method[] = [Method.GET, Method.PUT, Method.PATCH, Method.POST, Method.DELETE];
  let allowedHeaders: string[] = ["Content-Type", "Authorization"];

  if(options === undefined) {
    options = { };
  }

  // Set default values
  if(options.allowedMethods !== undefined) { allowedMethods = options.allowedMethods; }
  if(options.allowedHeaders !== undefined) { allowedHeaders = options.allowedHeaders; }

  return (handler: HttpHandler, next: next): void => {
    let AccessControlAllowOrigin: string;
    if(origin instanceof RegExp) { // If a regexp of origin is provided
      // Does request have an origin and does it match the provided regexp origin?
      if(handler.origin !== undefined && origin.test(handler.origin) === true) {
        // Set origin to request origin
        AccessControlAllowOrigin = handler.origin;
      } else {
        // No request origin was found or it didn't match. Set the origin (for header response) to string of regexp
        AccessControlAllowOrigin = origin.toString();
      }
    } else if(origin instanceof Array) {
      // Map origins to lower case
      origin = origin.map((origin: string) => origin.toLowerCase());
      // Does request have an origin and does it match with any origin in the provided array of origins?
      if(handler.origin !== undefined && origin.find((origin: string) => origin === handler.origin) !== undefined) {
        // Set origin to request origin
        AccessControlAllowOrigin = handler.origin;
      } else {
        // No request origin was found in array of origins. Set the origin (for header response) to string of origins
        AccessControlAllowOrigin = origin.join(",");
      }
    } else {
      // Origin is simple string
      AccessControlAllowOrigin = origin;
    }

    if (handler.method === Method.OPTIONS) {
      // Response for cors preflight requests
      handler.send(null, {
        "Access-Control-Allow-Methods": allowedMethods.map((method: Method) => method.toUpperCase()).join(","),
        "Access-Control-Allow-Headers": allowedHeaders.map((header: string) => header.toLowerCase()).join(","),
        "Content-Length": "0",
      }, 204);
    } else {
      const corsHeaders: headers = {
        "Access-Control-Allow-Origin": AccessControlAllowOrigin,
        "Vary": "origin",
      };

      // add cors header to response
      handler.beforeSend(response => ({ ...response, headers: {
        ...corsHeaders,
        ...response.headers,
      } }));
      handler.beforeError(error => {
        // Add cors headers to error if httpHandlerError
        if(error instanceof HttpHandlerError) {
          error.headers = {
            ...corsHeaders,
            ...error.headers,
          };
        }

        return error;
      });
      next();
    }
  };
}