// The engine (paginate.ts, count-pages.ts) is loaded with import() where it
// is used, so this index stays light enough for the startup bundle.
import { lazy } from "react";

export { PAGE_COUNT_COMMANDS } from "./page-count-commands";
export { PageCountStatus } from "./page-count-status";
export { PageCountsDialog } from "./page-counts-dialog";
export { usePageCount } from "./use-page-count";

/** The paged view (DESIGN_SPEC §7.10) loads with the engine, only while it is on. */
export const PagedView = lazy(() =>
  import("./paged-view").then((module) => ({ default: module.PagedView })),
);
