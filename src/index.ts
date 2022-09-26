import { bodyParseHttpHandler } from "./http-handler/body-parse.http-handler";
import { corsHttpHandler } from "./http-handler/cors.http-handler";
import { fileHttpHandler, firstFileHttpHandler, staticContentHttpHandler } from "./http-handler/file.http-handler";
import { methodHttpHandler } from "./http-handler/method.http-handler";
import { routeHttpHandler } from "./http-handler/route.http-handler";
import { vhostHttpHandler } from "./http-handler/vhost.http-handler";

export { handlerError, handlerMethod, handlerResponse, next, Handler, handle, basicHandle } from "./handler";
export { Method, handlerMethod as httpHandlerMethod, next as httNext, body, header, headers, query, response, request, HttpHandlerError, HttpHandler, handle as httpHandle } from "./http-handler";
export { IAPIGatewayProxyEvent, IAPIGatewayProxyResult, lambaHandler } from "./handlers/lambda.handler";
export { IIncomingMessage, IServerResponse, IServer, IHttp, netHandler } from "./handlers/net.handler";

export const handlers = {
  bodyParser: bodyParseHttpHandler,
  cors: corsHttpHandler,
  method: methodHttpHandler,
  file: fileHttpHandler,
  firstFile: firstFileHttpHandler,
  staticContent: staticContentHttpHandler,
  route: routeHttpHandler,
  vhost: vhostHttpHandler
};
