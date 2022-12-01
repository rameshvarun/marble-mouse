import * as THREE from "three";

/// #if MODE === "dev"
import { assert } from "chai";
/// #endif

import { DEBUG } from "./debug-mode";

const TOLERANCE = 0.001;
const CHECK_BOUNDING_SPHERE = false;

const tuv_ab = new THREE.Vector3();
const tuv_ac = new THREE.Vector3();
const tuv_p = new THREE.Vector3();
export function trianglePointToUVCoords(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
): [number, number] {
  // Vectors A->B and A->C
  tuv_ab.copy(b).sub(a);
  tuv_ac.copy(c).sub(a);

  // Vector A->P
  tuv_p.copy(point).sub(a);

  let abab = tuv_ab.dot(tuv_ab);
  let acac = tuv_ac.dot(tuv_ac);

  let abac = tuv_ab.dot(tuv_ac);

  let pab = tuv_ab.dot(tuv_p);
  let pac = tuv_ac.dot(tuv_p);

  let denom = abab * acac - abac * abac;
  let u = (acac * pab - pac * abac) / denom;
  let v = (abab * pac - pab * abac) / denom;

  /// #if MODE === "dev"
  if (DEBUG) {
    // Assert that point = a + u*ab + v*ac
    assert(
      a
        .clone()
        .add(tuv_ab.clone().multiplyScalar(u))
        .add(tuv_ac.clone().multiplyScalar(v))
        .distanceTo(point) < TOLERANCE
    );
  }
  /// #endif

  return [u, v];
}

// https://blackpawn.com/texts/pointinpoly/default.html
export function isPointInTriangle(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
) {
  let [u, v] = trianglePointToUVCoords(point, a, b, c);
  return u >= 0 && v >= 0 && u <= 1 && v <= 1 && u + v <= 1;
}

const ls_ab = new THREE.Vector3();
const ls_ap = new THREE.Vector3();
export function closestPointOnLineSegmentToPoint(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
): [THREE.Vector3, number] {
  ls_ab.copy(b).sub(a);
  ls_ap.copy(point).sub(a);

  let t = ls_ap.dot(ls_ab) / ls_ab.dot(ls_ab);

  if (t <= 0) {
    return [a, a.distanceTo(point)];
  } else if (t >= 1) {
    return [b, b.distanceTo(point)];
  } else {
    let closestPoint = ls_ab
      .clone()
      .multiplyScalar(t)
      .add(a);
    return [closestPoint, closestPoint.distanceTo(point)];
  }
}

const tr_ab = new THREE.Vector3();
const tr_ac = new THREE.Vector3();
const tr_normal = new THREE.Vector3();
const tr_ap = new THREE.Vector3();

const tr_projected = new THREE.Vector3();
export function closestPointOnTriangleToPoint(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
): [THREE.Vector3, number] {
  // Vectors A->B and A->C
  tr_ab.copy(b).sub(a);
  tr_ac.copy(c).sub(a);

  // Calculate normal of triangle plane.
  tr_normal.crossVectors(tr_ab, tr_ac).normalize();

  // Project point onto triangle plane.
  tr_ap.copy(point).sub(a);
  let planeDistance = tr_ap.dot(tr_normal);
  tr_projected
    .copy(tr_normal)
    .multiplyScalar(-planeDistance)
    .add(point);

  if (isPointInTriangle(tr_projected, a, b, c)) {
    // If the projected point is in the triangle, the projected point
    // is our closest point.
    return [tr_projected.clone(), tr_projected.distanceTo(point)];
  } else {
    // Otherwise, we return the closest point to the edges.
    let edgeClosestPoints = [
      closestPointOnLineSegmentToPoint(point, a, b),
      closestPointOnLineSegmentToPoint(point, a, c),
      closestPointOnLineSegmentToPoint(point, b, c)
    ];

    edgeClosestPoints.sort((a, b) => a[1] - b[1]);
    return edgeClosestPoints[0];
  }
}

const m_vA = new THREE.Vector3();
const m_vB = new THREE.Vector3();
const m_vC = new THREE.Vector3();
const m_boundingSphere = new THREE.Sphere();
const m_boundingBox = new THREE.Box3();

export function closestPointOnMeshToPoint(
  point,
  mesh: THREE.Mesh,
  maxDistance: number = Number.POSITIVE_INFINITY
): [THREE.Vector3 | null, number] {
  let closestPoint: THREE.Vector3 | null = null;
  let closestDistance = maxDistance;

  let geometry = mesh.geometry as THREE.BufferGeometry;

  if (!geometry.isBufferGeometry)
    throw new Error(`Only implemented for buffer geometry.`);
  if (geometry.index === null)
    throw new Error(`Non-indexed buffer geometry not implemented.`);

  for (let i = 0; i < geometry.index.count; i += 3) {
    // Get the indices for this triangle.
    const a = geometry.index.getX(i);
    const b = geometry.index.getX(i + 1);
    const c = geometry.index.getX(i + 2);

    // Get the vertex positions for the triangle.
    m_vA.fromBufferAttribute(geometry.attributes.position, a);
    m_vB.fromBufferAttribute(geometry.attributes.position, b);
    m_vC.fromBufferAttribute(geometry.attributes.position, c);

    // Project the triangle into world space.
    mesh.localToWorld(m_vA);
    mesh.localToWorld(m_vB);
    mesh.localToWorld(m_vC);

    if (CHECK_BOUNDING_SPHERE) {
      // Calculate the bounding sphere of the triangle.
      m_boundingSphere.setFromPoints([m_vA, m_vB, m_vC]);

      // If the closest point on the bounding sphere is further than our current
      // closestDistance, skip this triangle.
      if (m_boundingSphere.distanceToPoint(point) > closestDistance) {
        continue;
      }
    }

    // Calculate the bounding box of the triangle.
    m_boundingBox.setFromPoints([m_vA, m_vB, m_vC]);

    // If the closest point on the bounding box is further than our current
    // closestDistance, skip this mesh.
    if (m_boundingBox.distanceToPoint(point) > closestDistance) {
      continue;
    }

    // Find the closest point on that triangle.
    let [
      triangleClosestPoint,
      triangleClosestDistance
    ] = closestPointOnTriangleToPoint(point, m_vA, m_vB, m_vC);

    // Compare to our current closest point.
    if (triangleClosestDistance < closestDistance) {
      closestDistance = triangleClosestDistance;
      closestPoint = triangleClosestPoint;
    }
  }

  return [closestPoint, closestDistance];
}

const s_boundingSphere = new THREE.Sphere();
const s_boundingBox = new THREE.Box3();
export function closestPointInSceneToPoint(
  point: THREE.Vector3,
  scene: THREE.Object3D,
  maxDistance: number = Number.POSITIVE_INFINITY,
  layers: THREE.Layers = new THREE.Layers()
): [THREE.Vector3 | null, number] {
  let closestPoint: THREE.Vector3 | null = null;
  let closestDistance = maxDistance;

  scene.traverse(obj => {
    if (obj.type === "Mesh" && obj.layers.test(layers)) {
      let mesh = obj as THREE.Mesh;
      let geometry = mesh.geometry as THREE.BufferGeometry;

      if (CHECK_BOUNDING_SPHERE) {
        // Calculate the bounding sphere of the mesh.
        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
        s_boundingSphere
          .copy(geometry.boundingSphere!)
          .applyMatrix4(mesh.matrixWorld);

        // If the closest point on the bounding sphere is further than our current
        // closestDistance, skip this mesh.
        if (s_boundingSphere.distanceToPoint(point) > closestDistance) {
          return;
        }
      }

      // Calculate the bounding box of the mesh.
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      s_boundingBox.copy(geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);

      // If the closest point on the bounding box is further than our current
      // closestDistance, skip this mesh.
      if (s_boundingBox.distanceToPoint(point) > closestDistance) {
        return;
      }

      let [meshClosestPoint, meshClosestDistance] = closestPointOnMeshToPoint(
        point,
        obj as THREE.Mesh,
        closestDistance
      );

      if (meshClosestPoint && meshClosestDistance < closestDistance) {
        closestDistance = meshClosestDistance;
        closestPoint = meshClosestPoint;
      }
    }
  });

  return [closestPoint, closestDistance];
}
