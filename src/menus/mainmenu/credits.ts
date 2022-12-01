import { UI_CONTAINER } from "../../dom-elements";
import { input } from "../../input";
import { BACK_SFX } from "../../sound";
import { container } from "../common";
import { MainMenuPhase } from "./mainmenuphase";
import { RootMenu } from "./rootmenu";

export class CreditsPhase extends MainMenuPhase {
  onEnter() {
    UI_CONTAINER.innerHTML = container(`
      <div style="text-align: center; color: white;">
            <img style="box-sizing: border-box; padding: 10px; width: 50%;" src='${require("../../assets/ui/title-screen.svg")}'></img>
            <div>${VERSION}-${MODE}</div>

            <p style="font-size: large;">Art, Music, and Code by Varun R.</p>

            <div style="text-align: left">
            <p>Textures from textures.com</p>
            <p>Archivo, Archivo Black from Google Webfonts</p>

            <p>Icons from Font Awesome</p>

            <p>The Noun Project:
              "one-finger" by Jeff Portaro</p>

            <p>
            Freesound:
            "stone_on_stone.aif" by thanvannispen,
            "Boing 2" by magnuswaker,
            "Bike Horn 1.wav" by Stickinthemud,
            "Cartoon - Bat / Mouse Squeak" by Breviceps,
            "Menu Selection Click" by NenadSimic,
            "ui interface positive" by JavierZumer,
            "pause.mp3" by crisstanza,
            "unpause.mp3" by crisstanza
            </p>
            </div>
            </div>`);

    document.getElementById("back-button")!.onclick = () => {
      BACK_SFX.play();
      this.startTransition(new RootMenu(this.mainMenu));
    };
  }

  update(dt) {
    if (input.back()) {
      document.getElementById("back-button")!.click();
    }
  }
}
