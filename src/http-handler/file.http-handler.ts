import * as stream from "stream";
import { handlerMethod, headers, HttpHandler, next } from "../http-handler";

export interface IFs {
  existsSync: (path: string) => boolean;
  lstatSync: (path: string) => { isFile: () => boolean, size: number };
  createReadStream: (path: string) => stream.Readable;
}
export interface IPath {
  resolve: (...pathSegments: string[]) => string;
}
export interface IMime {
  lookup: (filenameOrExt: string) => string | false;
}

enum FileError {
  NOT_FOUND = "not_found"
}

const getFileData = (filePath: string, fs: IFs, path: IPath, mime: IMime): { stream: stream.Readable, headers: headers } => {
  const usePath: string = path.resolve(filePath);
  if (fs.existsSync(usePath) && fs.lstatSync(usePath).isFile() === true) {
    const stats = fs.lstatSync(usePath);
    return {
      stream: fs.createReadStream(usePath),
      headers: {
        "Content-Type": mime.lookup(usePath).toString(),
        "Content-Length": stats.size.toString(),
      }
    };
  } else {
    throw FileError.NOT_FOUND;
  }
};

export const fileHttpHandler = (filePath: string, headers: headers = {}, fs: IFs, path: IPath, mime: IMime): handlerMethod => 
  (_, next: next): void => next(firstFileHttpHandler(filePath, headers, fs, path, mime));


export const firstFileHttpHandler = (filePath: string | string[], headers: headers= {}, fs: IFs, path: IPath, mime: IMime): handlerMethod =>
  (handler: HttpHandler, next: next): void => {
    if (typeof filePath === "string") {
      filePath = [filePath];
    }

    try {
      const data = getFileData(filePath[0], fs, path, mime);
      handler.send(data.stream, {
        ...data.headers,
        ...headers
      });
    } catch(error: unknown) {
      if(error === FileError.NOT_FOUND) {
        if(filePath.slice(1).length > 1) {
          next(firstFileHttpHandler(filePath.slice(1), headers, fs, path, mime));
        } else {
          handler.sendStatus(404);
        }
      } else {
        throw error;
      }
    }
  };

export const staticContentHttpHandler = (root: string, fs: IFs, path: IPath, mime: IMime): handlerMethod =>
  (handler: HttpHandler, next: next): void => {
    const filePath = `${root}/${handler.path}`;
    next(firstFileHttpHandler([filePath, `${filePath}/index.html`, `${filePath}/index.htm`, `${root}/index.html`, `${root}/index.htm`], {}, fs, path, mime));
  };