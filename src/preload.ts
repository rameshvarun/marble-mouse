import log from "loglevel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { getGraphicsOptions } from "./options";
import { loadGLTF } from "./utils";

const EventEmitter = require("eventemitter3");

export const progressEvent = new EventEmitter();

const progress = [0, 0, 0, 0];

function reportProgress(i, p) {
  progress[i] = p;
  let totalProgress =
    progress.reduce((accum, current) => accum + current, 0) / progress.length;
  log.debug(`Loading Progress: ${totalProgress}.`);
  progressEvent.emit("progress", totalProgress);
}

export const COIN_GLTF: Promise<GLTF> = loadGLTF(
  require("./assets/models/coin.glb"),
  (loaded, total) => reportProgress(0, loaded / total)
);
export const GOAL_GLTF: Promise<GLTF> = loadGLTF(
  require("./assets/models/goal.glb"),
  (loaded, total) => reportProgress(1, loaded / total)
);

export const ROOM_BACKGROUND_URL =
  getGraphicsOptions().geometry === "high"
    ? require("./assets/backgrounds/room.glb")
    : require("./assets/backgrounds/room-simple.glb");

export const ROOM_GLTF: Promise<GLTF> = loadGLTF(
  ROOM_BACKGROUND_URL,
  (loaded, total) => reportProgress(2, loaded / total)
);

export const STAR_GLTF: Promise<GLTF> = loadGLTF(
  require("./assets/models/star.glb"),
  (loaded, total) => reportProgress(3, loaded / total)
);

let FONTS_LOADED = Promise.resolve();
// @ts-ignore
if (document.fonts && document.fonts.load) {
  FONTS_LOADED = Promise.all([
    // @ts-ignore
    document.fonts.load("1em 'Archivo', sans-serif"),
    // @ts-ignore
    document.fonts.load("1em 'Archivo Black', sans-serif")
  ])
    .catch(() => {})
    .then(() => {});
}

export function preload(): Promise<void> {
  return Promise.all([
    COIN_GLTF,
    GOAL_GLTF,
    ROOM_GLTF,
    FONTS_LOADED
  ]).then(() => {});
}
