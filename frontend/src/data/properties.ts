/*
 * properties.ts — Adapter
 *
 * Every component imports `properties` from here.
 * This module now serves data fetched from the backend API via api.ts,
 * exposed through a Proxy so reads always get current data after fetch.
 *
 * The exported shape is IDENTICAL to the old hardcoded Property[].
 */

import { Property } from "./types";
import { getProperties } from "./api";

function getLiveProperties(): Property[] {
  const data = getProperties();
  return Array.isArray(data) ? data : [];
}

export const properties: Property[] = new Proxy([] as Property[], {
  get(_target, prop) {
    const data = getLiveProperties();

    if (prop === "length") return data.length;
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);

    if (typeof prop === "string" && typeof (data as any)[prop] === "function") {
      return (data as any)[prop].bind(data);
    }

    if (typeof prop === "string" && !Number.isNaN(Number(prop))) {
      return data[Number(prop)];
    }

    return (data as any)[prop as any];
  },

  has(_target, prop) {
    const data = getLiveProperties();
    return prop in data;
  },

  ownKeys() {
    const data = getLiveProperties();
    return Reflect.ownKeys(data);
  },

  getOwnPropertyDescriptor(_target, prop) {
    const data = getLiveProperties();
    const descriptor = Object.getOwnPropertyDescriptor(data, prop);

    if (descriptor) {
      return descriptor;
    }

    return {
      configurable: true,
      enumerable: true,
      writable: true,
      value: (data as any)[prop as any],
    };
  },
});
