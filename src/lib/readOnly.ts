import { clone, deleteAt, getAt, setAt } from "./configPath";
import type { ConfigObject } from "../types/config";

const readOnlyRoots = ["$.webapi"];

export function isReadOnlyPath(path: string): boolean {
  return readOnlyRoots.some((root) => path === root || path.startsWith(root + ".") || path.startsWith(root + "["));
}

export function preserveReadOnlyConfig(next: ConfigObject, source: ConfigObject | null): ConfigObject {
  const protectedNext = clone(next);
  const sourceWebapi = source ? getAt(source, "$.webapi") : undefined;
  if (sourceWebapi === undefined) deleteAt(protectedNext, "$.webapi");
  else setAt(protectedNext, "$.webapi", clone(sourceWebapi));
  return protectedNext;
}
