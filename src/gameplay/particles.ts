import * as THREE from "three";
import Entity from "./entity";
import { Level } from "./level";

const textureLoader = new THREE.TextureLoader();
const star = textureLoader.load(require("../assets/images/star.png"));
export class CoinParticles extends Entity {
  particles: Array<{ position: THREE.Vector3; velocity: THREE.Vector3 }> = [];
  geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
  points: THREE.Points;

  life: number = 0;

  material: THREE.PointsMaterial;

  constructor(level: Level, origin: THREE.Vector3) {
    super(level);

    const START_RADIUS = 0.8;

    for (var i = 0; i < 10; i++) {
      let direction = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS)
      );
      this.particles.push({
        position: direction.clone(),
        velocity: direction.clone().multiplyScalar(5)
      });
    }

    const vertices: Float32Array = new Float32Array(this.particles.length * 3);
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    this.updateGeometry();

    this.material = new THREE.PointsMaterial({
      map: star,
      color: new THREE.Color("#fbe84b"),
      size: 0.08,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.position.copy(origin);

    this.level.scene.add(this.points);
  }

  updateGeometry() {
    let positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particles.length; ++i) {
      positions[3 * i] = this.particles[i].position.x;
      positions[3 * i + 1] = this.particles[i].position.y;
      positions[3 * i + 2] = this.particles[i].position.z;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  update(dt: number) {
    this.life += dt;
    for (let particle of this.particles) {
      particle.velocity.add(
        new THREE.Vector3(0, -1, 0).multiplyScalar(9.8 * dt)
      );
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
    this.updateGeometry();

    const LIFETIME = 0.8;
    if (this.life > LIFETIME) {
      this.level.scene.remove(this.points);
      this.level.remove(this);
    }
    this.material.opacity = LIFETIME - this.life;
  }
}

export class BonkParticles extends Entity {
  particles: Array<{ position: THREE.Vector3; velocity: THREE.Vector3 }> = [];
  geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
  points: THREE.Points;

  life: number = 0;

  material: THREE.PointsMaterial;

  constructor(
    level: Level,
    origin: THREE.Vector3,
    baseVel: THREE.Vector3,
    intensity: number
  ) {
    super(level);

    const START_RADIUS = 0.3;

    for (var i = 0; i < 5; i++) {
      let direction = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS)
      );
      this.particles.push({
        position: direction.clone(),
        velocity: baseVel.clone().add(
          direction
            .clone()
            .normalize()
            .multiplyScalar(5 * intensity)
        )
      });
    }

    const vertices: Float32Array = new Float32Array(this.particles.length * 3);
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    this.updateGeometry();

    this.material = new THREE.PointsMaterial({
      map: star,
      color: new THREE.Color("#ffffff"),
      size: 0.04,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.position.copy(origin);

    this.level.scene.add(this.points);
  }

  updateGeometry() {
    let positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particles.length; ++i) {
      positions[3 * i] = this.particles[i].position.x;
      positions[3 * i + 1] = this.particles[i].position.y;
      positions[3 * i + 2] = this.particles[i].position.z;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  update(dt: number) {
    this.life += dt;
    for (let particle of this.particles) {
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
    this.updateGeometry();

    const LIFETIME = 0.4;
    if (this.life > LIFETIME) {
      this.level.scene.remove(this.points);
      this.level.remove(this);
    }
    this.material.opacity = LIFETIME - this.life;
  }
}

const MAX_PARTICLES = 100;
export class BallParticles extends Entity {
  particles: Array<{ position: THREE.Vector3; velocity: THREE.Vector3 }> = [];
  geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
  points: THREE.Points;
  life: number = 0;
  material: THREE.PointsMaterial;

  constructor(level: Level) {
    super(level);

    const vertices: Float32Array = new Float32Array(MAX_PARTICLES * 3);
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    this.updateGeometry();

    this.material = new THREE.PointsMaterial({
      map: star,
      color: "#ffffff",
      size: 0.15,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      opacity: 0.5
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.level.scene.add(this.points);
  }

  updateGeometry() {
    let positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particles.length; ++i) {
      positions[3 * i] = this.particles[i].position.x;
      positions[3 * i + 1] = this.particles[i].position.y;
      positions[3 * i + 2] = this.particles[i].position.z;
    }
    this.geometry.setDrawRange(0, this.particles.length);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  update(dt: number) {
    this.life += dt;
    for (let particle of this.particles) {
      particle.velocity.add(
        new THREE.Vector3(0, -1, 0).multiplyScalar(9.8 * dt)
      );
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }

    if (
      this.particles.length < MAX_PARTICLES &&
      this.life * 10 > this.particles.length
    ) {
      const START_RADIUS = 0.8;
      let offset = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS),
        THREE.MathUtils.randFloatSpread(START_RADIUS)
      );
      this.particles.push({
        position: this.level.sphere.position.clone().add(offset),
        velocity: offset.clone().multiplyScalar(2)
      });
    }

    this.updateGeometry();
  }
}
