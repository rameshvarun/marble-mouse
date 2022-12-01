import MainMenu from ".";
import {
  PAUSE_BUTTON,
  UI_CONTAINER,
  VERSION_CONTAINER
} from "../../dom-elements";
import { input, vj } from "../../input";
import { COURSES } from "../../levels";
import { getGraphicsOptions } from "../../options";
import { BACK_SFX, CLICK_SFX } from "../../sound";
import { container } from "../common";
import { DirectionalUINavigator } from "../directional-navigator";
import { MainMenuPhase } from "./mainmenuphase";
import { RootMenu } from "./rootmenu";

export class CourseSelect extends MainMenuPhase {
  navigator?: DirectionalUINavigator;

  onEnter() {
    UI_CONTAINER.innerHTML = container(
      COURSES.map((course, i) => {
        let thumbnail = "";
        if (getGraphicsOptions().videoPreviews && course.preview) {
          thumbnail = `<video disableRemotePlayback loop autoplay muted playsinline src="${course.preview}" poster="${course.thumbnail}" style="width: 100%"></video>`;
        } else if (course.thumbnail) {
          thumbnail = `<img src="${course.thumbnail}" style="width: 100%"></img>`;
        }

        return `<div style="color: white; padding: 5px; border: 1px solid white; border-radius: 4px; margin-bottom: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 3fr;">
                <div style="grid-column: 1;">
                    <div style="background-color: black; width: 100%; padding-top: 100%; border-radius: 4px; position: relative; overflow: hidden;">
                      <div style="top: 0; bottom: 0; left: 0; right: 0; position: absolute;">
                        ${thumbnail}
                      </div>
                    </div>
                </div>
                <div style="grid-column: 2; padding-left: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div><span class="course-title">COURSE ${course.name}</span></div>
                    <div><button id="play-course-${i}" class="play-course-button">PLAY</button></div>
                </div>
              </div>
            </div>`;
      }).join("")
    );

    document.getElementById("back-button")!.onclick = () => {
      BACK_SFX.play();
      this.startTransition(new RootMenu(this.mainMenu));
    };

    this.navigator = new DirectionalUINavigator(
      COURSES.map((course, i) => document.getElementById(`play-course-${i}`)!)
    );

    COURSES.forEach((course, i) => {
      document.getElementById(`play-course-${i}`)!.onclick = () => {
        CLICK_SFX.play();
        this.mainMenu.startTransition(() => {
          this.mainMenu.game.playCourse(course, () => {
            this.mainMenu.game.transitionTo(
              new MainMenu(this.mainMenu.game, CourseSelect)
            );
          });
        });
      };
    });

    VERSION_CONTAINER.style.display = "none";
    PAUSE_BUTTON.style.display = "none";
    vj.disable();
  }

  update(dt) {
    if (input.back()) {
      document.getElementById("back-button")!.click();
    }

    let movement = input.movement(this.mainMenu.renderer.xr.getSession());
    this.navigator?.update(movement);
  }

  onLeave() {}
}
