export enum routeError {
  NO_MATCH = "no_match",
  REGEXP_ERROR = "regexp_error"
} 

export type params = Record<string, string>;
export const parseRoute = (path: string, route: string | RegExp): params => {
  // If route is regexp
  if(route instanceof RegExp) {
    // Test if path matches route (return empty param dict)
    if(route.test(path) === true) { return {}; }
    // Test failed, throw error
    throw routeError.NO_MATCH;
  }
  let params: params = {};

  // Split path beween slashes, removing any empty value
  const splitPath: string[] = splitPathIntodirectories(path);
  // Split route over slashes any empty value
  const routeParams = splitPathIntodirectories(route);

  if(splitPath.length > routeParams.length) {
    throw routeError.NO_MATCH;
  }

  // Walk over route params
  for(const index in routeParams) {
    const routeParam = routeParams[index];
    const pathValue: string | undefined = splitPath[index];
    if(isParamAlias(routeParam) === true) {
      // Matching route param namn and (if any) regexp (eg: /:id(\d+))
      const match: RegExpMatchArray | null = routeParam.match(/:([^(]+)(?:\((.+)\)$|$)/);
      // Verify theres a param name to use
      if(match === null || match[1] === undefined) {
        throw routeError.REGEXP_ERROR;
      }
      const name: string = match[1];
      // Gets regexp (if any)
      const regexp: RegExp | undefined = match[2] !== undefined ? new RegExp(match[2]): undefined;
      // Test regexp 
      if(regexp !== undefined) {
        if(regexp.test(pathValue !== undefined ? pathValue : "")) {
          params = { ...params, [name]: pathValue };
        } else {
          throw routeError.NO_MATCH;
        }
      } else if (pathValue !== undefined) {
        params = { ...params, [name]: pathValue };
      } else {
        throw routeError.NO_MATCH;
      }
      /* Last pathValue is valid to be empty which makes the last route param regexp
      to include empty string. However it can only be the last path value and therefor
      the loop will end on first undefined pathValue is found */
      if(pathValue === undefined) {
        break;
      }
    } else if(routeParam !== pathValue) {
      // RouteParam and pathValue does not match
      throw routeError.NO_MATCH;
    }
  }
  return params;
};

const splitPathIntodirectories = (path: string): string[] => path.split("/").filter((pathValue: string) => pathValue !== "");
const isParamAlias = (param: string): boolean => param[0] === ":";