import { COURSEA, UserLevel, Course } from "./levels";

import Scene from "./scene";
import * as THREE from "three";

import MainMenu from "./menus/mainmenu";

const Stats = require("stats.js");

import { Howl, Howler } from "howler";

import * as save from "./save";

type XRSessionType = "none" | "vr" | "ar";

import { registerXRHandlers, XR_ENABLED } from "./xr";
import { registerCustomLevelHandlers } from "./custom-levels";
import { DEBUG, RECORD_INTRO, SCREENSHOT_INTRO } from "./debug-mode";
import { getGraphicsOptions, GraphicsOptions } from "./options";

import StatsMenu from "./menus/statsmenu";
import ScoreKeeper from "./scorekeeper";
import { input } from "./input";
import log from "loglevel";
import { CourseSelect } from "./menus/mainmenu/courseselect";

const PAUSE_BUTTON = document.getElementById(
  "pause-button"
)! as HTMLImageElement;

export default class Game {
  canvas: HTMLCanvasElement;

  renderer: THREE.WebGLRenderer;

  scene?: Scene;

  stats = new Stats();

  graphicsOptions: GraphicsOptions;

  constructor() {
    log.debug("Creating new Game instance.");

    if (DEBUG) document.body.appendChild(this.stats.dom);
    this.graphicsOptions = getGraphicsOptions();

    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: XR_ENABLED,
      antialias: this.graphicsOptions.antialias,
      preserveDrawingBuffer: RECORD_INTRO || SCREENSHOT_INTRO
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.graphicsOptions.pixelRatio === "device") {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    } else {
      this.renderer.setPixelRatio(this.graphicsOptions.pixelRatio);
    }
    this.renderer.physicallyCorrectLights = true;
    if (this.graphicsOptions.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.VSMShadowMap;
    }
    this.renderer.xr.enabled = XR_ENABLED;

    if (DEBUG) {
      document.addEventListener(
        "keydown",
        event => {
          if (event.key === "F2") {
            event.preventDefault();
            log.debug("Killing context...");
            this.renderer.forceContextLoss();
          }
        },
        false
      );
    }

    setInterval(() => {
      if (this.renderer.getContext().isContextLost()) {
        log.debug("WebGL context lost... Attempting to recreate...");
        // @ts-ignore
        this.renderer.forceContextRestore();
      }
    }, 2000);

    if (XR_ENABLED) {
      registerXRHandlers(this);
    }
    registerCustomLevelHandlers(this);

    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.scene) {
          this.scene.onResize(window.innerWidth, window.innerHeight);
        }
      },
      false
    );

    PAUSE_BUTTON.addEventListener("click", () => {
      if (this.scene) this.scene.onPause();
    });
  }

  start() {
    log.debug("Starting game.");
    this.startMainLoop();

    if (save.previouslyOpen()) {
      // If we've previously opened the game, we can go to the main menu.
      this.transitionTo(new MainMenu(this));
    } else {
      // If this is the first time opening the game, go directly to Course 1,
      // then to the the Course Menu.
      save.setPreviouslyOpen();
      this.playCourse(COURSEA, () => {
        this.transitionTo(new MainMenu(this, CourseSelect));
      });
    }
  }

  playCourse(course: Course, onComplete: () => void) {
    let score = new ScoreKeeper(course.parTime, course.parDeaths);

    let next = 0;
    const loadNextLevel = () => {
      if (next < course.levels.length) {
        let levelClass = course.levels[next];
        next++;

        let level = new levelClass(this, score, loadNextLevel);
        this.transitionTo(level);
      } else {
        this.transitionTo(new StatsMenu(course.name, this, score, onComplete));
      }
    };
    loadNextLevel();
  }

  playWorldCourse(
    course: any,
    score: ScoreKeeper,
    levelURLs: string,
    onComplete: () => void
  ) {
    let next = 0;
    const loadNextLevel = () => {
      if (next < levelURLs.length) {
        let levelURL = levelURLs[next];
        next++;

        let level = new UserLevel(this, score, loadNextLevel, levelURL);
        this.transitionTo(level);
      } else {
        this.transitionTo(new StatsMenu(course.name, this, score, onComplete));
      }
    };
    loadNextLevel();
  }

  startMainLoop() {
    // Maximum number of fixed updates we can do before giving up
    // and slowing down game.
    const MAX_FIXED_UPDATE_COUNT = getGraphicsOptions().maxUpdateCount;

    const TICKS_PER_SECOND = getGraphicsOptions().ticksPerSecond;
    const FIXED_TIMESTEP = 1.0 / TICKS_PER_SECOND;

    const MAX_FLOATING_DELTA = FIXED_TIMESTEP * MAX_FIXED_UPDATE_COUNT;
    console.log(
      `FIXED_TIMESTEP=${FIXED_TIMESTEP}, MAX_FLOATING_DELTA=${MAX_FLOATING_DELTA}`
    );

    let lastUpdateTimestamp: number | null = null;
    this.renderer.setAnimationLoop(timestamp => {
      // Skip update loop if the WebGL context was lost.
      if (this.renderer.getContext().isContextLost()) return;

      // If this is the first frame, initialize our time accumulators.
      if (lastUpdateTimestamp === null) lastUpdateTimestamp = timestamp;

      // Start debug stats capture.
      if (DEBUG) this.stats.begin();

      // Calculate the elapsed time since last frame.
      const delta = (timestamp - lastUpdateTimestamp) / 1000;
      lastUpdateTimestamp = timestamp;

      // Cap the delta and update the scene.
      const cappedDelta = Math.min(delta, MAX_FLOATING_DELTA);
      if (this.scene) this.scene.update(cappedDelta);

      // Update input devices.
      input.update();

      // Draw the actual scene.
      if (this.scene) this.scene.draw();

      // End debug stats capture.
      if (DEBUG) this.stats.end();
    });
  }

  xrSessionType: XRSessionType = "none";

  setXRSession(session, type: XRSessionType) {
    this.xrSessionType = type;
    if (type === "ar") this.canvas.style.display = "none";
    this.renderer.xr.setSession(session);
  }

  endXRSession() {
    this.xrSessionType = "none";
    this.canvas.style.display = "block";
  }

  isXR() {
    return this.xrSessionType !== "none";
  }

  isAR() {
    return this.xrSessionType === "ar";
  }

  isVR() {
    return this.xrSessionType === "vr";
  }

  transitionTo(nextLevel: Scene) {
    if (this.scene) this.scene.onLeave();
    this.scene = nextLevel;
    this.scene.onEnter();
  }
}
