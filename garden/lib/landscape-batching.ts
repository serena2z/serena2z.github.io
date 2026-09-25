import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Keep vertex indices and nearby geometry together so rooms outside the view can be culled. */
export function batchStaticMeshes(
  root: T.Object3D,
  moving: ReadonlySet<T.Object3D> = new Set(),
) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const transform = new T.Matrix4();
  const origin = new T.Vector3();
  const batches = new Map<
    string,
    {
      material: T.Material;
      geometries: T.BufferGeometry[];
      objects: T.Mesh[];
      cast: boolean;
      receive: boolean;
    }
  >();
  root.traverse((object) => {
    if (
      !(object instanceof T.Mesh) ||
      object instanceof T.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    for (
      let ancestor: T.Object3D | null = object;
      ancestor && ancestor !== root;
      ancestor = ancestor.parent
    ) {
      if (moving.has(ancestor)) return;
    }
    transform.multiplyMatrices(inverse, object.matrixWorld);
    origin.setFromMatrixPosition(transform);
    const key = [
      object.material.uuid,
      Object.keys(object.geometry.attributes).sort().join(','),
      object.castShadow,
      object.receiveShadow,
      Math.round(origin.x / 12),
      Math.round(origin.z / 12),
    ].join('|');
    let batch = batches.get(key);
    if (!batch) {
      batch = {
        material: object.material,
        geometries: [],
        objects: [],
        cast: object.castShadow,
        receive: object.receiveShadow,
      };
      batches.set(key, batch);
    }
    const geometry = object.geometry.clone().applyMatrix4(transform);
    if (!geometry.index)
      geometry.setIndex(
        Array.from(
          { length: geometry.getAttribute('position').count },
          (_, i) => i,
        ),
      );
    batch.geometries.push(geometry);
    batch.objects.push(object);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries);
    if (!geometry) throw new Error('Invalid landscape geometry');
    const mesh = new T.Mesh(geometry, batch.material);
    mesh.castShadow = batch.cast;
    mesh.receiveShadow = batch.receive;
    root.add(mesh);
    for (const object of batch.objects) {
      object.removeFromParent();
      object.geometry.dispose();
    }
    for (const part of batch.geometries) part.dispose();
  }
  // Batching leaves empty construction groups behind; remove their per-frame traversal cost.
  function prune(parent: T.Object3D) {
    for (let i = parent.children.length - 1; i >= 0; i--) {
      const child = parent.children[i];
      if (moving.has(child)) continue;
      prune(child);
      if (child instanceof T.Group && child.children.length === 0)
        child.removeFromParent();
    }
  }
  prune(root);
}
