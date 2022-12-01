import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";

import * as THREE from "three";
import * as CANNON from "cannon";
import * as log from "loglevel";
import { MathUtils, Vector3 } from "three";

const gltfLoader = new GLTFLoader();
export function loadGLTF(
  gltfURL: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<GLTF> {
  log.debug(`Loading ${gltfURL}.`);
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      gltfURL,
      gltf => {
        resolve(gltf);
      },
      xhr => {
        if (onProgress) onProgress(xhr.loaded, xhr.total);
      },
      error => {
        reject(error);
      }
    );
  });
}

const textureLoader = new THREE.TextureLoader();
export function loadTexture(textureURL: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      textureURL,
      texture => {
        resolve(texture);
      },
      undefined,
      error => {
        reject(error);
      }
    );
  });
}

export function toCannonVec(v: THREE.Vector3): CANNON.Vec3 {
  return new CANNON.Vec3(v.x, v.y, v.z);
}

export function toTHREEVec(v: CANNON.Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

export function toCannonQuaternion(q: THREE.Quaternion): CANNON.Quaternion {
  return new CANNON.Quaternion(q.x, q.y, q.z, q.w);
}

export function toTHREEQuaternion(q: CANNON.Quaternion): THREE.Quaternion {
  return new THREE.Quaternion(q.x, q.y, q.z, q.w);
}

export function updateObjectFromBody(
  object: THREE.Object3D,
  body: CANNON.Body
) {
  // @ts-ignore
  object.position.copy(body.position);
  // @ts-ignore
  object.quaternion.copy(body.quaternion);
}

// For testing frame timing operations.
export function cpuHeavyOperation() {
  function findPrimes(max: number): Array<number> {
    let sieve: Array<boolean> = [],
      i: number,
      j: number,
      primes: Array<number> = [];
    for (i = 2; i <= max; ++i) {
      if (!sieve[i]) {
        primes.push(i);
        for (j = i << 1; j <= max; j += i) {
          sieve[j] = true;
        }
      }
    }
    return primes;
  }
  let primes = findPrimes(Math.pow(2, 20));
}

export function wait(duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), duration);
  });
}

export function finiteDifference(
  f: (t: number) => CANNON.Vec3,
  t: number,
  h: number = 1 / 60
): CANNON.Vec3 {
  let a = f(t + h);
  let b = f(t - h);
  let x = (a.x - b.x) / (2 * h);
  let y = (a.y - b.y) / (2 * h);
  let z = (a.z - b.z) / (2 * h);
  return new CANNON.Vec3(x, y, z);
}

export function once(cont: () => void): () => void {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      cont();
    }
  };
}

export function setCastShadows(object: THREE.Object3D, value: boolean = true) {
  object.traverse(obj => (obj.castShadow = value));
}

export function setReceiveShadows(
  object: THREE.Object3D,
  value: boolean = true
) {
  object.traverse(obj => (obj.receiveShadow = value));
}

export function downgradePBRMaterials(scene: THREE.Object3D) {
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      let material = obj.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        let dowgraded = new THREE.MeshLambertMaterial();

        dowgraded.color = material.color;
        dowgraded.emissive = material.emissive;
        if (dowgraded.emissive) dowgraded.emissive.multiplyScalar(Math.PI);

        dowgraded.map = material.map;
        dowgraded.needsUpdate = true;

        obj.material = dowgraded;
      }
    } else if (obj instanceof THREE.Light) {
      obj.intensity /= Math.PI;
    }
  });
}

export function disposeMaterial(material: THREE.Material) {
  // @ts-ignore
  if (material.map) {
    // @ts-ignore
    material.map.dispose();
  }
  material.dispose();
}

export function disposeAll(scene: THREE.Object3D) {
  log.debug("Disposing all objects in a scene.");
  scene.traverse(obj => {
    // @ts-ignore
    if (obj.geometry) {
      // @ts-ignore
      obj.geometry.dispose();
    }

    // @ts-ignore
    if (obj.material) {
      // @ts-ignore
      if (Array.isArray(obj.material)) {
        // @ts-ignore
        for (let material of obj.material.length) {
          disposeMaterial(material);
        }
      } else {
        // @ts-ignore
        disposeMaterial(obj.material);
      }
    }
  });
}

export function collectMaterials(scene: THREE.Object3D): Array<THREE.Material> {
  log.debug("Finding all materials in a scene.");
  let materials: Array<THREE.Material> = [];
  scene.traverse(obj => {
    // @ts-ignore
    if (obj.material) {
      // @ts-ignore
      if (Array.isArray(obj.material)) {
        // @ts-ignore
        for (let material of obj.material.length) {
          materials.push(material);
        }
      } else {
        // @ts-ignore
        materials.push(obj.material);
      }
    }
  });
  return materials;
}

export function dampVector(
  a: Vector3,
  b: Vector3,
  lambda: number,
  dt: number
): Vector3 {
  return new Vector3(
    MathUtils.damp(a.x, b.x, lambda, dt),
    MathUtils.damp(a.y, b.y, lambda, dt),
    MathUtils.damp(a.z, b.z, lambda, dt)
  );
}
