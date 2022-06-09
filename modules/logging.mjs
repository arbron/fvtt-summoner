/**
 * Send a log message only if debug logging is enabled.
 */
export function debugLog(...args) {
  try {
    const isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue("arbron-summoner");
    if ( isDebugging ) console.log("arbron-summoner", "|", ...args);
  } catch (e) {}
}
