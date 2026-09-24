import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import {
  clearSessionCache,
  readSessionCache,
  sessionCacheKey,
  writeSessionCache,
} from "../../lib/sessionDataCache.ts";

function memoryStore() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

describe("session data cache", () => {
  before(() => {
    const sessionStorage = memoryStore();
    const localStorage = memoryStore();
    globalThis.sessionStorage = sessionStorage;
    globalThis.localStorage = localStorage;
    globalThis.window = { sessionStorage, localStorage };
  });

  afterEach(() => {
    globalThis.sessionStorage.clear();
    globalThis.localStorage.clear();
  });

  it("round-trips values and ignores expired entries", () => {
    writeSessionCache("stats", { total: 3 });
    assert.deepEqual(readSessionCache("stats", 60_000), { total: 3 });
    assert.equal(readSessionCache("stats", 0), null);
  });

  it("scopes keys to the current Strapi server", () => {
    const connect = (url) =>
      globalThis.localStorage.setItem("fengbro-strapi-connection", JSON.stringify({ url }));
    connect("https://cms-a.example/");
    assert.match(sessionCacheKey("stats"), /:https:\/\/cms-a\.example:stats$/);
    writeSessionCache("stats", { total: 1 });
    connect("https://cms-b.example");
    assert.equal(readSessionCache("stats", 60_000), null);
    connect("https://cms-a.example");
    assert.deepEqual(readSessionCache("stats", 60_000), { total: 1 });
    clearSessionCache("stats");
  });
});
