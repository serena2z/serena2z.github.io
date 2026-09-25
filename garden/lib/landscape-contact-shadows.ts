import { Mesh, Object3D, Sprite } from 'three';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

/** Keep contact shading aligned with zoom, and keep soft glows out of the depth pass. */
export class LandscapeContactShadows extends SSAOPass {
  private decorations: Object3D[] | null = null;

  override render(...args: Parameters<SSAOPass['render']>) {
    // The scene is complete by its first draw, including the collection halos.
    if (!this.decorations) {
      const decorations: Object3D[] = [];
      this.scene.traverse((object) => {
        if (
          object instanceof Sprite ||
          object.userData.excludeFromContactShadows ||
          (object instanceof Mesh &&
            (Array.isArray(object.material)
              ? object.material
              : [object.material]
            ).every((material) => material.transparent))
        ) {
          decorations.push(object);
        }
      });
      this.decorations = decorations;
    }
    const visible = this.decorations.filter((object) => object.visible);
    for (const object of visible) object.visible = false;
    this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(
      this.camera.projectionMatrix,
    );
    this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
      this.camera.projectionMatrixInverse,
    );
    try {
      super.render(...args);
    } finally {
      for (const object of visible) object.visible = true;
    }
  }
}
