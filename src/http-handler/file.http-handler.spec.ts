import { Readable } from "stream";
import { describe, expect, it } from "@jest/globals";
import { basicHandle, Method } from "../http-handler";
import { IFs, IMime, IPath, fileHttpHandler, firstFileHttpHandler } from "./file.http-handler";

const mockFiles: Record<string, {isFile: boolean, mime?: string, size?: number }> = {
  file: {
    isFile: true,
    mime: "Application/PDF",
    size: 100,
  },
  folder: {
    isFile: false,
  }
};

const mockFs: IFs = {
  existsSync: (path: string): boolean => { return Object.keys(mockFiles).indexOf(path) !== -1; },
  lstatSync: (path: string): { isFile: () => boolean, size: number } => ({
    isFile: (): boolean => {
      const file = mockFiles[path];
      return file !== undefined && file.isFile === true;
    },
    size: 1
  }),
  createReadStream: (): Readable => {
    return new Readable();
  }
};

const mockPath: IPath = {
  resolve: (...pathSegments: string[]): string => pathSegments[0]
};

const mockMime: IMime = {
  lookup: (filenameOrExt: string): string | false => {
    const file = mockFiles[filenameOrExt];
    return file !== undefined && file.mime !== undefined ? file.mime : false;
  }
};

describe("fileHttpHandler", () => {
  it("should be able to send file", async () => {
    const filePath = Object.keys(mockFiles)[0];
    const file = mockFiles[filePath]; 
    const result = await basicHandle(Method.GET, "http://127.0.0.1", {}, null,
      fileHttpHandler(filePath, {}, mockFs, mockPath, mockMime)
    );
    expect(result.body).toBeInstanceOf(Readable);
    expect(result.headers["content-type"]).toEqual(file.mime);
  });
  it("should be able to send first file found in array of paths", async () => {
    const result = await basicHandle(Method.GET, "http://127.0.0.1", {}, null,
      firstFileHttpHandler(["no_path", ...Object.keys(mockFiles)], {}, mockFs, mockPath, mockMime)
    );
    expect(result.body).toBeInstanceOf(Readable);
  });
  it("should return 404 if file is not found", async () => {
    const result = await basicHandle(Method.GET, "http://127.0.0.1", {}, null,
      fileHttpHandler("no_path", {}, mockFs, mockPath, mockMime)
    );
    expect(result.status).toEqual(404);
  });
  it("should not be able to send folder as file", async () => {
    const result = await basicHandle(Method.GET, "http://127.0.0.1", {}, null,
      fileHttpHandler(Object.keys(mockFiles)[1], {}, mockFs, mockPath, mockMime)
    );
    expect(result.status).toEqual(404);
  });
});