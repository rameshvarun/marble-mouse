// Polyfills
require("promise.any").shim();

import "./styles.css";
import Game from "./game";

import * as preload from "./preload";

let game = new Game();

preload.preload().then(() => {
  game.start();
});
