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

export const properties: Property[] = new Proxy(
  [] as Property[],
  {
    get(_target, prop) {
      const data = getProperties();
      if (prop === "length") return data.length;
      if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);
      // Array methods
      if (typeof prop === "string" && typeof (data as any)[prop] === "function") {
        return (data as any)[prop].bind(data);
      }
      // Index access
      if (typeof prop === "string" && !isNaN(Number(prop))) {
        return data[Number(prop)];
      }
      return (data as any)[prop as any];
    },
  }
);
