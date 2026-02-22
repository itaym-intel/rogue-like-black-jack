/**
 * Minimal framework-agnostic typed event emitter.
 *
 * By keeping this dependency-free the GameAdapter can be used against any
 * future rendering layer (React, Vue, raw DOM) without modification.
 */

type Listener<T> = (event: T) => void;

export class TypedEmitter<EventMap extends object> {
  private readonly _listeners: Partial<{
    [K in keyof EventMap]: Array<Listener<EventMap[K]>>;
  }> = {};

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): this {
    const bucket = this._listeners[event] ?? [];
    if (!this._listeners[event]) {
      this._listeners[event] = bucket;
    }
    bucket.push(listener);
    return this;
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): this {
    const bucket = this._listeners[event];
    if (!bucket) {
      return this;
    }
    const index = bucket.indexOf(listener);
    if (index !== -1) {
      bucket.splice(index, 1);
    }
    return this;
  }

  once<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): this {
    const wrapper: Listener<EventMap[K]> = (data) => {
      this.off(event, wrapper);
      listener(data);
    };
    return this.on(event, wrapper);
  }

  protected emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const bucket = this._listeners[event];
    if (!bucket) {
      return;
    }
    for (const listener of [...bucket]) {
      listener(data);
    }
  }

  removeAllListeners<K extends keyof EventMap>(event?: K): void {
    if (event) {
      delete this._listeners[event];
    } else {
      for (const key of Object.keys(this._listeners)) {
        delete this._listeners[key as K];
      }
    }
  }
}
