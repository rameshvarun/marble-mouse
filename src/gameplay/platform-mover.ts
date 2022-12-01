import { LogLevel } from "loglevel";
import * as THREE from "three";

import { Level } from "./level";

import { toCannonVec, toTHREEVec, updateObjectFromBody } from "../utils";

type MovingPlatform = {
  body: CANNON.Body;
  object: THREE.Object3D;
  position?: (t: number) => CANNON.Vec3;
  rotation?: (t: number) => CANNON.Vec3;
};

export default class PlatformMover {
  // The list of moving platforms in the scene that need to be updated.
  movingPlatforms: Array<MovingPlatform> = [];

  addMovingPlatform(platform: MovingPlatform) {
    this.movingPlatforms.push(platform);
  }

  level: Level;
  constructor(level: Level) {
    this.level = level;
  }

  movePlatforms(dt: number) {
    for (let platform of this.movingPlatforms) {
      if (platform.position) {
        let targetPosition = platform.position(
          this.level.fixedIntervalTime + dt
        );
        let diff = targetPosition.vsub(platform.body.position);

        platform.body.velocity.copy(diff.mult(1 / dt));
      }

      if (platform.rotation) {
        let currentRotation = platform.rotation(this.level.fixedIntervalTime);
        let targetRotation = platform.rotation(
          this.level.fixedIntervalTime + dt
        );

        platform.body.quaternion.setFromEuler(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z
        );

        let diff = targetRotation.vsub(currentRotation);
        platform.body.angularVelocity.copy(diff.mult(1 / dt));
      }
    }

    // Implement a ghost force that keeps you on moving platforms.
    for (let contact of this.level.world.contacts) {
      // @ts-ignore
      if (contact.bi === this.sphereBody && contact.bj._mm_sticky === true) {
        let collisionPoint = this.level.sphereBody.position.vadd(contact.ri);

        let platformVel = new CANNON.Vec3();
        contact.bj.getVelocityAtWorldPoint(collisionPoint, platformVel);

        this.level.movingPlatformHelper.position.copy(
          toTHREEVec(collisionPoint)
        );
        this.level.movingPlatformHelper.setDirection(toTHREEVec(platformVel));
        this.level.movingPlatformHelper.setLength(platformVel.norm());

        this.level.sphereBody.velocity.lerp(
          platformVel,
          0.5 * dt,
          this.level.sphereBody.velocity
        );
      }
    }
  }

  updatePlatforms() {
    for (let platform of this.movingPlatforms) {
      if (platform.position) {
        const position = platform.position(this.level.time);
        platform.object.position.copy(toTHREEVec(position));
      }

      if (platform.rotation) {
        const rotation = platform.rotation(this.level.time);
        platform.object.rotation.set(rotation.x, rotation.y, rotation.z);
      }
    }
  }
}
