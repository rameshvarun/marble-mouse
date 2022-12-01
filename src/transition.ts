import * as utils from "./utils";
import { getGraphicsOptions } from "./options";

const irisContainer = document.getElementById("iris-wipe-container")!;
const irisMask = (document.getElementById(
  "iris-mask"
) as any) as SVGCircleElement;

const velocity = require("velocity-animate");

const SVG_TRANSITIONS = getGraphicsOptions().svgTransitions;

const fadeContainer = document.getElementById("fade-black-container")!;

if (!SVG_TRANSITIONS) {
  fadeContainer.style.visibility = "visible";
} else {
  irisContainer.style.visibility = "visible";
  irisMask.setAttribute("r", "0");
}

export const FADE_DURATION = 700;

function timeout(
  promise: Promise<void>,
  duration: number = FADE_DURATION
): Promise<void> {
  // @ts-ignore
  return Promise.any([promise, utils.wait(duration)]);
}

let ANIMATION_ID = 0;

export async function fadeOut(): Promise<void> {
  let id = ANIMATION_ID++;
  await velocity(fadeContainer, "stop");
  fadeContainer.style.visibility = "visible";
  fadeContainer.style.opacity = `0`;
  await timeout(
    velocity(fadeContainer, { opacity: "1" }, { duration: FADE_DURATION })
  );
}

export async function fadeIn(): Promise<void> {
  let id = ANIMATION_ID++;
  await velocity(fadeContainer, "stop");
  fadeContainer.style.visibility = "visible";
  fadeContainer.style.opacity = `1`;
  await timeout(
    velocity(fadeContainer, { opacity: "0" }, { duration: FADE_DURATION })
  );
  if (id == ANIMATION_ID) fadeContainer.style.visibility = "hidden";
}

export async function irisWipeIn(): Promise<void> {
  if (!SVG_TRANSITIONS) return fadeIn();
  else {
    let id = ANIMATION_ID++;
    await velocity(irisMask, "stop");
    irisContainer.style.visibility = "visible";
    irisMask.setAttribute("r", "0");
    await timeout(
      velocity(irisMask, { r: "100" }, { duration: FADE_DURATION })
    );
    if (id == ANIMATION_ID) irisContainer.style.visibility = "hidden";
  }
}

export async function irisWipeOut(): Promise<void> {
  if (!SVG_TRANSITIONS) return fadeOut();
  else {
    let id = ANIMATION_ID++;
    await velocity(irisMask, "stop");
    irisContainer.style.visibility = "visible";
    irisMask.setAttribute("r", "100");
    await timeout(velocity(irisMask, { r: "0" }, { duration: FADE_DURATION }));
  }
}
