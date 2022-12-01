import { Level } from "./level";

export default class Entity {
  level: Level;
  constructor(level: Level) {
    this.level = level;
  }
  update(dt: number) {}
}
