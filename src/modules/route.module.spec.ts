import { describe, expect, it } from "@jest/globals";
import { parseRoute, routeError } from "./route.module";

describe("RouteModule", () => {
  it("should compare static path and route", () => {
    const params = parseRoute("author", "author");
    expect(Object.keys(params)).toHaveLength(0);
  });
  it("should extract params from path", () => {
    const authorId = "1";
    const bookId = "2";
    const params = parseRoute(`author/${authorId}/book/${bookId}`, "author/:authorId/book/:bookId");
    expect(params.authorId).toBeDefined();
    expect(params.bookId).toBeDefined();
    expect(params.authorId).toEqual(authorId);
    expect(params.bookId).toEqual(bookId);
  });
  it("should throw error if path is mismatch from route", () => {
    let coughtError: unknown;
    try {    
      parseRoute("", "author");
    } catch(error: unknown) { coughtError = error; }
    expect(coughtError).toBeDefined();
    expect(coughtError).toEqual(routeError.NO_MATCH);
  });
  it("should parse params with regexp", () => {
    const authorId = "1";
    const params = parseRoute(`author/${authorId}`, "author/:id(\\d+)");
    expect(params.id).toBeDefined();
    expect(params.id).toEqual(authorId);
  });
  it("should throw error if regexp mishmatch", () => {
    let coughtError: unknown;
    try {    
      parseRoute("author/foo", "author/:id(\\d+)");
    } catch(error: unknown) { coughtError = error; }
    expect(coughtError).toBeDefined();
    expect(coughtError).toEqual(routeError.NO_MATCH);
  });
  it("should match on last param being optional", () => {
    const params = parseRoute("author", "author/:id(\\d*)");
    expect(params).toBeDefined();
    expect(params.id).toBeUndefined();
  });
  describe("Leading or trailing slash", () => {
    it("'should match leading path", () => {
      parseRoute("/foo/bar", "foo/bar");
      expect(true);
    });
    it("shoul match leading route", () => {
      parseRoute("foo/bar", "/foo/bar");
      expect(true);
    });
    it("'should match trailing path", () => {
      parseRoute("foo/bar/", "foo/bar");
      expect(true);
    });
    it("shoul match trailing route", () => {
      parseRoute("foo/bar", "foo/bar/");
      expect(true);
    });
  });
});