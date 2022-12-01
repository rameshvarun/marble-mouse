import { getGraphicsOptions } from "./options";

import { Howl, Howler } from "howler";

const highRes = getGraphicsOptions().audioQuality === "high";

export const COIN_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/coin.mp3")
      : require("./assets/sound/coin-small.mp3")
  ],
  volume: 0.6
});

export const GOAL_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/goal.mp3")
      : require("./assets/sound/goal-small.mp3")
  ],
  volume: 0.6
});

export const HIT_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/hit.mp3")
      : require("./assets/sound/hit-small.mp3")
  ],
  volume: 1.0,
  preload: true
});

export const BOING_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/boing.mp3")
      : require("./assets/sound/boing-small.mp3")
  ],
  volume: 1.0,
  preload: true
});

export const HORN_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/horn.mp3")
      : require("./assets/sound/horn-small.mp3")
  ],
  volume: 0.3
});

export const SQUEAK_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/squeak.mp3")
      : require("./assets/sound/squeak-small.mp3")
  ],
  volume: 1.0
});

export const SWITCH_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/switch.mp3")
      : require("./assets/sound/switch-small.mp3")
  ],
  volume: 1.0
});

export const CLICK_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/click.mp3")
      : require("./assets/sound/click-small.mp3")
  ],
  volume: 1.0
});

export const BACK_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/back.mp3")
      : require("./assets/sound/back-small.mp3")
  ],
  volume: 1.0
});

export const PAUSE_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/pause.mp3")
      : require("./assets/sound/pause-small.mp3")
  ],
  volume: 1.0
});

export const UNPAUSE_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/unpause.mp3")
      : require("./assets/sound/unpause-small.mp3")
  ],
  volume: 1.0
});

export const STAR_SFX = new Howl({
  src: [
    highRes
      ? require("./assets/sound/star.mp3")
      : require("./assets/sound/star-small.mp3")
  ],
  volume: 1.0
});

export const MUSIC_LOOP = new Howl({
  src: [
    highRes
      ? require("./assets/sound/all-the-marbles.mp3")
      : require("./assets/sound/all-the-marbles-small.mp3")
  ],
  volume: 0.7,
  autoplay: true,
  loop: true,
  preload: true
});
MUSIC_LOOP.seek(23.988);

export function pauseMusic() {
  MUSIC_LOOP.pause();
}

export function resumeMusic() {
  MUSIC_LOOP.play();
}
