import * as log from "loglevel";

let agent = window.navigator.userAgent.toLowerCase();
log.debug(`User Agent: ${agent}`);

export const DETECTIONS = {
  mobile: agent.includes("mobile"),
  safariBased:
    (agent.includes("safari") && !agent.includes("chrome")) ||
    agent.includes("iphone") ||
    agent.includes("ipad") ||
    agent.includes("ipod")
};

log.debug("Browser detections: %o", DETECTIONS);
