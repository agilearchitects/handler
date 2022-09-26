export type beforeSend<RESPONSE> = (response: RESPONSE) => RESPONSE | Promise<RESPONSE>;
export type onSend<RESPONSE> = (response: RESPONSE) => void;
export type beforeError = (error: unknown) => unknown | Promise<unknown>;
export type onError = (error: unknown) => void;

export enum handlerError {
  ALREADY_SENT = "already_sent",
  NO_RESPONSE = "no_response",
}

export type handlerMethod<T = unknown, R extends Handler<T> = Handler<T>> = (handler: R, next: next<T, R>) => handlerResponse<T>;
export type handlerResponse<T = unknown> = T | void | Promise<T | void>;
export type next<T = unknown, R extends Handler<T> = Handler<T>> = (...handlers: handlerMethod<T, R>[]) => void;

export class Handler<T = unknown> {
  private _hasSent: boolean = false;
  public get hasSent(): boolean { return this._hasSent; }

  private beforeSends: beforeSend<T>[] = [];
  private onSends: onSend<T>[] = [];
  private beforErrors: beforeError[] = [];
  private onErrors: onError[] = [];
  
  public send(response: T): void {
    // Call internal send to avoid returning a promise
    this._send(response);
  }

  private async _send(response: T): Promise<void> {
    // Reject if already sent
    if(this.hasSent === true) { this.reject(handlerError.ALREADY_SENT); }
    
    // End handler
    this.end();
    
    try {
      // Emit all before send events
      const _response = await this.emitBeforeSend(response);
      // Emit all send events
      this.emitSend(_response);
    } catch (error: unknown) {
      // Reject on error
      this.reject(error);
    }
  }
  
  public reject(error: unknown): void {
    // Call internal send to avoid returning a promise
    this._reject(error);
  }
  
  private async _reject(error: unknown): Promise<void> {
    // End handler
    this.end();
    // Emit all before error events
    const _error = await this.emitBeforeError(error);
    // Emit all error events
    this.emitError(_error);
  }

  public beforeSend(callback: beforeSend<T>): void {
    this.beforeSends = [...this.beforeSends, callback];
  }
  public onSend(callback: onSend<T>): void {
    this.onSends = [...this.onSends, callback];
  }
  public beforeError(callback: beforeError): void {
    this.beforErrors = [...this.beforErrors, callback];
  }
  public onError(callback: onError): void {
    this.onErrors = [...this.onErrors, callback];
  }

  private end() {
    this._hasSent = true;
  }
  
  private async emitBeforeSend(response: T): Promise<T> {
    // Execute all beforeSend callbacks one by one and update response with every itteration
    for(const beforeSend of this.beforeSends) {
      response = await beforeSend(response);
    }
    return response;
  }
  private emitSend(response: T): void {
    // Emit all onSend callbacks
    for(const onSend of this.onSends) {
      onSend(response);
    }
  }
  private async emitBeforeError(error: unknown): Promise<unknown> {
    // Execute all beforeSend callbacks one by one and update response with every itteration
    for(const beforError of this.beforErrors) {
      error = await beforError(error);
    }
    return error;
  }
  private emitError(error: unknown): void {
    // Emit all onError callbacks
    for(const onError of this.onErrors) {
      onError(error);
    }
  }
}

export const handle = <T = unknown, R extends Handler<T> = Handler<T>>(handler: R, ...handlers: handlerMethod<T, R>[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Resolve on send
    handler.onSend((response: T) => resolve(response));
    // Reject en error
    handler.onError((error: unknown) => reject(error));
    
    let nextWasCalled: boolean = false;
    // No handlers left to call, reject with no response
    if(handlers.length === 0) { handler.reject(handlerError.NO_RESPONSE); }

    (async () => {
      // Call first handler 
      return await handlers[0](handler, (...nextHandlers: handlerMethod<T, R>[]) => {
        (async () => {
          // Register that a next handler was called
          nextWasCalled = true;
          try {
            // Call itself with provided nextHandlers concatinated with root handlers minus the first handler
            const response = await handle(handler, ...nextHandlers, ...handlers.slice(1));
            handler.send(response);
          } catch (error: unknown) {
            handler.reject(error);
          }
        })();
      });
    })().then((response: T | void) => {
      // Will not send response since next statement was called
      if(nextWasCalled === true) { return; }
      // Will only 
      if(response !== undefined) {
        handler.send(response);
      }
      /* !!!WARNING!!! If response is undefined the handler will never complete
      Example of this is handler methods ending without returning anything and
      not calling handler.send() If listening to undefined responses the handler
      would finish before if any handler method calls handle.send async */
    }).catch((error: unknown) => {
      handler.reject(error);
    });
  });
};

export const basicHandle = <T = unknown>(...handlers: handlerMethod<T, Handler<T>>[]): Promise<T> => handle(new Handler<T>(), ...handlers);