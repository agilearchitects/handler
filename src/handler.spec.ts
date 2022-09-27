import { describe, it, expect } from "@jest/globals";
import { Handler, next, handle } from "./handler";

describe("Handler", () => {
  describe("register handler", () => {
    it("should be able to execute handler", async () => {
      let container: string = "";
      await handle(
        () => { container = `${container}a`; return 1; },
      );
      expect(container).toEqual("a");
    });
    it("should be able to execute multiple handlers", async () => {
      let container: string = "";
      await handle(
        (_, next: next) => {
          container = `${container}a`; next();
        },
        () => {
          container = `${container}b`; return 1;
        },
      );
      expect(container).toEqual("ab");
    });
    it("should be able to execute additional handlers with next", async () => {
      let container: string = "";
      await handle(
        (_, next: next) => { container = `${container}a`; next(() => { container = `${container}b`; return 1; }); }
      );
      expect(container).toEqual("ab");
    });
    it("should be able to throw error", async () => {
      const errorMessage: string = "some error";
      try {
        await handle(
          () => { throw(new Error(errorMessage)); }
        );
      } catch(error: unknown) { expect((error as Error).message).toEqual(errorMessage); }
    });
    it("should be able to throw error in nested handler", async () => {
      const errorMessage: string = "some error";
      let container: string = "";
      try {
        await handle(
          (_, next) => {
            container = `${container}a`;
            next(() => { throw(new Error(errorMessage)); });
          },
          () => { container = `${container}b`; }
        );
      } catch(error: unknown) {
        expect(container).toEqual("a");
        expect((error as Error).message).toEqual(errorMessage);
      }
    });
    describe("async", () => {
      it("should be able to execute handler", async () => {
        let container: string = "";
        await handle(
          async () => { await waitFor(100); container = `${container}a`; return 1; }
        );
        expect(container).toEqual("a");
      });
      it("should be able to execute multiple handlers", async () => {
        let container: string = "";
        await handle(
          async (_, next: next) => {
            await waitFor(100);
            container = `${container}a`;
            next();
          },
          async () => {
            await waitFor(100);
            container = `${container}b`;
            return 1;
          });
        expect(container).toEqual("ab");
      });
      it("should be able to execute multiple handlers within next", async () => {
        let container: string = "";
        await handle(
          (_, next: next) => {
            container = `${container}a`;
            next((_, next: next) => {
              container = `${container}b`;
              next();
            });
          },
          () => {
            container = `${container}c`;
            return 1;
          });
        expect(container).toEqual("abc");
      });
      it("should be able to throw error", async () => {
        const errorMessage: string = "some error";
        try {
          await handle(
            async () => { await waitFor(100); throw(new Error(errorMessage)); }
          );
        } catch(error: unknown) { expect((error as Error).message).toEqual(errorMessage); }
      });
      it("should be able to throw error in nested handler", async () => {
        const errorMessage: string = "some error";
        let container: string = "";
        try {
          await handle(
            async (_, next) => {
              await waitFor(100);
              container = `${container}a`;
              next(async () => { waitFor(100); throw(new Error(errorMessage)); });
            },
            () => { container = `${container}b`; }
          );
        } catch(error: unknown) {
          expect(container).toEqual("a");
          expect((error as Error).message).toEqual(errorMessage);
        }
      });
      it("should be able to throw error prematurely", async () => {
        const errorMessage: string = "some error";
        let container: string = "";
        try {
          await handle(
            async (_, next) => {
              container = `${container}a`;
              next(async () => {
                await waitFor(100);
                throw(new Error());
              });
              throw new Error(errorMessage);
            },
            () => { container = `${container}b`; }
          );
        } catch(error: unknown) {
          expect(container).toEqual("a");
          expect((error as Error).message).toEqual(errorMessage);
        }
      });
    });
  });
  describe("response", () => {
    it("should be able to send response as return value", async () => {
      const message = "hello world";
      const response: unknown = await handle(
        () => message
      );
      expect(response).toEqual(message);
    });
    it("should be able to send response with send method", async () => {
      const message = "hello world";
      const response: unknown = await handle(
        (handler: Handler) => handler.send(message),
      );
      expect(response).toEqual(message);
    });
  });
  describe("beforeSend", () => {
    it("should be able to modify response before sending", async () => {
      const originalResponse: string = "hello world";
      const newResponse: string = "foo bar";
      const result = await handle<string>(
        (handler: Handler<string>, next: next<string>) => {
          handler.beforeSend(() => newResponse);
          next();
        },
        (handler: Handler<string>) => handler.send(originalResponse)
      );
      expect(result).toEqual(newResponse);
    });
    it("should be able to modify response before sending with return", async () => {
      const originalResponse: string = "hello world";
      const newResponse: string = "foo bar";
      const result = await handle<string>(
        (handler: Handler<string>, next: next<string>) => {
          handler.beforeSend(() => newResponse);
          next();
        },
        () => originalResponse
      );
      expect(result).toEqual(newResponse);
    });
  });
});

const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), ms));