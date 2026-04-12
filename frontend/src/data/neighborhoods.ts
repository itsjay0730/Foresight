/*
 * neighborhoods.ts — Adapter
 *
 * Every component imports `neighborhoods` and `neighborhoodList` from here.
 * This module now serves data fetched from the backend API via api.ts,
 * exposed through a Proxy so reads always get current data after fetch.
 *
 * The exported shapes are IDENTICAL to the old hardcoded data.
 */

import { Neighborhood } from "./types";
import { getNeighborhoods, getNeighborhoodList } from "./api";

// Use a Proxy so property access always reads from the latest fetched cache.
// Before the API responds, properties resolve to undefined (components handle
// this gracefully since they're already guarded with fallbacks like "west-loop").
export const neighborhoods: Record<string, Neighborhood> = new Proxy(
  {} as Record<string, Neighborhood>,
  {
    get(_target, prop: string) {
      const data = getNeighborhoods();
      return data[prop];
    },
    has(_target, prop: string) {
      const data = getNeighborhoods();
      return prop in data;
    },
    ownKeys() {
      const data = getNeighborhoods();
      return Object.keys(data);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const data = getNeighborhoods();
      if (prop in data) {
        return { configurable: true, enumerable: true, value: data[prop] };
      }
      return undefined;
    },
  }
);

// neighborhoodList is used by CompareModal
export const neighborhoodList: Neighborhood[] = new Proxy(
  [] as Neighborhood[],
  {
    get(_target, prop) {
      const data = getNeighborhoodList();
      if (prop === "length") return data.length;
      if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);
      // Array methods (sort, filter, map, etc.)
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
