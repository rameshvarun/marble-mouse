import * as log from "loglevel";
import { DETECTIONS } from "./detections";

export type GraphicsOptions = {
  pixelRatio: 0.5 | 1 | "device";
  antialias: boolean;
  shadows: boolean;
  particles: boolean;
  geometry: "low" | "high";
  physics: "low" | "high";
  ticksPerSecond: 15 | 30 | 60;
  audioQuality: "low" | "high";
  svgTransitions: boolean;
  videoPreviews: boolean;
  maxUpdateCount: number;
};

function getDefaultGraphicsOptions(): GraphicsOptions {
  if (window.navigator.userAgent.includes("OculusBrowser")) {
    log.debug("Oculus Quest 2 graphics options.");
    return {
      pixelRatio: "device",
      antialias: true,
      shadows: false,
      particles: true,
      geometry: "high",
      physics: "high",
      ticksPerSecond: 60,
      audioQuality: "high",
      svgTransitions: true,
      videoPreviews: false,
      maxUpdateCount: 3
    };
  }

  // @ts-ignore
  const deviceMemory = window.navigator.deviceMemory;
  if (deviceMemory) {
    log.debug(`Device memory: ${deviceMemory}`);

    if (deviceMemory <= 1) {
      // Really low memory Chrome devices.
      return {
        pixelRatio: 1,
        antialias: false,
        shadows: false,
        particles: false,
        geometry: "low",
        physics: "low",
        ticksPerSecond: 30,
        audioQuality: "low",
        svgTransitions: true,
        videoPreviews: false,
        maxUpdateCount: 3
      };
    } else if (deviceMemory <= 2) {
      // Low memory Chrome devices.
      return {
        pixelRatio: 1,
        antialias: false,
        shadows: false,
        particles: false,
        geometry: "low",
        physics: "low",
        ticksPerSecond: 30,
        audioQuality: "low",
        svgTransitions: true,
        videoPreviews: false,
        maxUpdateCount: 3
      };
    } else if (deviceMemory <= 4) {
      // Average memory Chrome devices.
      return {
        pixelRatio: "device",
        antialias: true,
        shadows: false,
        particles: true,
        geometry: "high",
        physics: "high",
        ticksPerSecond: 60,
        audioQuality: "high",
        svgTransitions: true,
        videoPreviews: true,
        maxUpdateCount: 3
      };
    } else {
      // Higher memory Chrome devices.
      return {
        pixelRatio: "device",
        antialias: true,
        shadows: true,
        particles: true,
        geometry: "high",
        physics: "high",
        ticksPerSecond: 60,
        audioQuality: "high",
        svgTransitions: true,
        videoPreviews: true,
        maxUpdateCount: 3
      };
    }
  }

  if (DETECTIONS.mobile) {
    // Default mobile configuration.
    return {
      pixelRatio: "device",
      antialias: true,
      shadows: false,
      particles: true,
      geometry: "high",
      physics: "high",
      ticksPerSecond: 60,
      audioQuality: "high",
      svgTransitions: !DETECTIONS.safariBased,
      videoPreviews: true,
      maxUpdateCount: 3
    };
  }
  {
    // Default desktop configuration.
    return {
      pixelRatio: "device",
      antialias: true,
      shadows: true,
      particles: true,
      geometry: "high",
      physics: "high",
      ticksPerSecond: 60,
      audioQuality: "high",
      svgTransitions: !DETECTIONS.safariBased,
      videoPreviews: true,
      maxUpdateCount: 3
    };
  }
}

let defaultGraphicsOptions = getDefaultGraphicsOptions();

export function getGraphicsOptions(): GraphicsOptions {
  return defaultGraphicsOptions;
}
