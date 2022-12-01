import log from "loglevel";

export const DEBUG: boolean =
  MODE === "dev" && window.location.hash.includes("debug");

export const SCREENSHOT_INTRO = false && MODE === "dev";
export const RECORD_INTRO = false && MODE === "dev";

if (DEBUG) {
  const ERUDA_SRC = "//cdn.jsdelivr.net/npm/eruda";
  document.write(`<script src="${ERUDA_SRC}"></script>`);
  document.write(`<script>eruda.init();</script>`);

  log.enableAll();
}
