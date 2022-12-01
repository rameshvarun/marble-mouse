export function previouslyOpen(): boolean {
  try {
    return window.localStorage.getItem("PREVIOUSLY_OPEN") === "TRUE";
  } catch (e) {
    // Couldn't read local storage, possibly due to incognito mode or other setting.
    return false;
  }
}

export function setPreviouslyOpen() {
  try {
    window.localStorage.setItem("PREVIOUSLY_OPEN", "TRUE");
  } catch (e) {}
}
