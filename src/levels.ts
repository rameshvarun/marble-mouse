import { Level } from "./gameplay/level";
import Game from "./game";
import { input } from "./input";
import ScoreKeeper from "./scorekeeper";
import { getGraphicsOptions } from "./options";
import { ROOM_GLTF } from "./preload";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { DETECTIONS } from "./detections";

const UI_CONTAINER = document.getElementById("ui-container")!;

export class Tutorial extends Level {
  getBackgroundGLTF() {
    return ROOM_GLTF;
  }

  getAdditionalUI() {
    return `
    <img id="game-logo" style="box-sizing: border-box; padding: 10px; width: 100%; height: 100%;" src='${require("./assets/ui/title-screen.svg")}'></img>
    <div style="width: 100%; height: 50%; position: absolute; bottom: 0px; display: flex; flex-direction: column; justify-content: center; align-items: center;"><img id="input-prompt" style="height: 1in;" src='${require("./assets/ui/keyboard-prompt.svg")}'></img></div>
    `;
  }

  getLevelGLTF() {
    return require("./assets/levels/tutorial.glb");
  }

  inputPrompt?: HTMLImageElement;
  logo?: HTMLElement;

  constructor(
    game: Game,
    score: ScoreKeeper,
    onComplete: () => void = () => {}
  ) {
    super(game, score, onComplete);
  }

  onEnter() {
    super.onEnter();

    this.inputPrompt = document.getElementById(
      "input-prompt"
    ) as HTMLImageElement;

    if (DETECTIONS.mobile) {
      this.inputPrompt.src = require("./assets/ui/touch-prompt.svg");
    } else {
      this.inputPrompt.src = require("./assets/ui/keyboard-prompt.svg");
    }

    this.logo = document.getElementById("game-logo")!;
  }

  hasMoved: boolean = false;
  update(dt: number) {
    super.update(dt);

    if (this.state === "playing" && !this.paused) {
      this.logo!.style.display = "none";
      if (input.movement(this.renderer.xr.getSession()).length() > 0)
        this.hasMoved = true;
    }

    if (this.state === "playing" && !this.hasMoved) {
      this.inputPrompt!.style.display = "inline-block";
    } else {
      this.inputPrompt!.style.display = "none";
    }
  }
}

export class UserLevel extends Level {
  levelGLTF: string;
  constructor(
    game: Game,
    score: ScoreKeeper,
    onComplete: () => void = () => {},
    levelGLTF: string
  ) {
    super(game, score, onComplete);
    this.levelGLTF = levelGLTF;
  }
  getBackgroundGLTF() {
    return ROOM_GLTF;
  }

  getLevelGLTF() {
    return this.levelGLTF;
  }
}

function SimpleLevel(background: string | Promise<GLTF>, level: string): any {
  return class extends Level {
    getBackgroundGLTF() {
      return background;
    }

    getLevelGLTF() {
      return level;
    }
  };
}

export type Course = {
  name: string;
  id: string;
  levels: Array<{
    new (game: Game, score: ScoreKeeper, onComplete: () => void): Level;
  }>;
  parTime: number;
  thumbnail?: string;
  preview?: string;
  parDeaths: number;
};

export const COURSEA: Course = {
  name: "A",
  id: "course-a",
  thumbnail: require("./assets/previews/a.png"),
  levels: [
    Tutorial,
    SimpleLevel(ROOM_GLTF, require("./assets/levels/simple.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/halfpipe.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/twist.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/rings.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/hammers.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/corkscrew.glb"))
  ],
  parTime: 3 * 60,
  parDeaths: 5
};

export const COURSEB: Course = {
  name: "B",
  id: "course-b",
  thumbnail: require("./assets/previews/b.png"),
  levels: [
    SimpleLevel(ROOM_GLTF, require("./assets/levels/up-down.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/jump.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/tightrope.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/wallrun.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/rotating-beam.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/edge-hop.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/wind-tunnel.glb"))
  ],
  parTime: 3 * 60,
  parDeaths: 5
};

export const COURSEC: Course = {
  name: "C",
  id: "course-c",
  thumbnail: require("./assets/previews/c.png"),
  levels: [
    SimpleLevel(ROOM_GLTF, require("./assets/levels/drop.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/fans.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/disk-hole.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/vertebrae.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/rotating-ramp-up.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/balance-beam.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/hammer-jump.glb"))
  ],
  parTime: 3 * 60,
  parDeaths: 5
};

/// #if MODE === "dev"
export const COURSED: Course = {
  name: "D",
  id: "course-d",
  levels: [
    SimpleLevel(ROOM_GLTF, require("./assets/levels/bounce-over.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/engine.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/water-wheel.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/skijump.glb")),
    SimpleLevel(ROOM_GLTF, require("./assets/levels/air-control.glb"))
  ],
  parTime: 3 * 60,
  parDeaths: 5
};

export const PHYSICS_TEST: Course = {
  name: "PHYSICS TEST",
  id: "phsyics-test",
  levels: [SimpleLevel(ROOM_GLTF, require("./assets/levels/physics-test.glb"))],
  parTime: 0,
  parDeaths: 0
};

let DEV_COURSES = [COURSED, PHYSICS_TEST];
/// #else
let DEV_COURSES = [];
/// #endif

export const COURSES = [COURSEA, COURSEB, COURSEC].concat(
  MODE === "dev" ? DEV_COURSES : []
);
