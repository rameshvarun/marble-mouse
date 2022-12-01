import { UserLevel } from "./levels";
import Game from "./game";
import ScoreKeeper from "./scorekeeper";

const fileInput: HTMLInputElement = document.getElementById(
  "file-input"
)! as HTMLInputElement;

let game: Game | undefined;

export function registerCustomLevelHandlers(gameInstance: Game) {
  game = gameInstance;

  fileInput.addEventListener("change", () => {
    var file = fileInput.files![0];

    if (file.name.match(/\.glb$/)) {
      const levelURL = URL.createObjectURL(file);
      const playUserLevel = () => {
        game!.transitionTo(
          new UserLevel(game!, new ScoreKeeper(0, 0), playUserLevel, levelURL)
        );
      };
      playUserLevel();
    } else {
      alert("File not supported, .glb only.");
    }
  });
}

export function selectCustomLevel() {
  fileInput.click();
}

document.addEventListener(
  "keydown",
  event => {
    if (event.key === "F1") {
      event.preventDefault();
      selectCustomLevel();
    }
  },
  false
);
