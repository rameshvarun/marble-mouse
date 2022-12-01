const vrButton = document.getElementById(
  "enter-vr-button"
) as HTMLButtonElement;

const arButton = document.getElementById(
  "enter-ar-button"
) as HTMLButtonElement;

import Game from "./game";

function showButton(button: HTMLButtonElement) {
  button.style.display = "inline";
}

function hideButton(button: HTMLButtonElement) {
  button.style.display = "none";
}

// @ts-ignore
export const XR_ENABLED = !!navigator.xr;

export async function registerXRHandlers(game: Game) {
  // @ts-ignore
  if (navigator.xr) {
    // @ts-ignore
    let vrSupported = await navigator.xr.isSessionSupported("immersive-vr");
    // @ts-ignore
    let arSupported = await navigator.xr.isSessionSupported("immersive-ar");

    if (vrSupported) {
      showButton(vrButton);

      let session = null;
      vrButton.onclick = async e => {
        if (session === null) {
          console.log("Starting VR session...");
          // @ts-ignore
          session = await navigator.xr.requestSession("immersive-vr", {
            requiredFeatures: ["local"],
            optionalFeatures: [
              "high-refresh-rate",
              "high-fixed-foveation-level"
            ]
          });
          vrButton.innerText = "EXIT VR";
          hideButton(arButton);

          // @ts-ignore
          session.addEventListener("end", () => {
            session = null;
            game.endXRSession();
            vrButton.innerText = "ENTER VR";
            if (arSupported) showButton(arButton);
          });

          game.renderer.xr.setReferenceSpaceType("local");
          game.setXRSession(session, "vr");
        } else {
          console.log("Ending VR session...");
          // @ts-ignore
          session.end();
        }
      };
    }

    if (arSupported) {
      showButton(arButton);

      let session = null;
      arButton.onclick = async e => {
        if (session === null) {
          console.log("Starting AR session...");
          // @ts-ignore
          session = await navigator.xr.requestSession("immersive-ar", {
            requiredFeatures: ["local-floor"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body }
          });
          arButton.innerText = "EXIT AR";
          hideButton(vrButton);

          // @ts-ignore
          session.addEventListener("end", () => {
            session = null;
            game.endXRSession();
            arButton.innerText = "ENTER AR";
            if (vrSupported) showButton(vrButton);

            // Mozilla XR Viewer Hack
            setTimeout(() => {
              game.canvas.style.display = "block";
              if (game.canvas.parentElement !== document.body) {
                if (game.canvas.parentElement)
                  game.canvas.parentElement.removeChild(game.canvas);
                document.body.appendChild(game.canvas);
              }
            }, 1000);
          });

          game.setXRSession(session, "ar");
        } else {
          console.log("Ending AR session...");
          // @ts-ignore
          session.end();
        }
      };
    }
  }
}
