import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sprite,
} from 'three';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { LandscapeContactShadows } from '../lib/landscape-contact-shadows.ts';

test('contact shading follows changed camera projection and excludes glows only during its own pass', (t) => {
  const scene = new Scene(),
    camera = new PerspectiveCamera(62, 1.5, 0.06, 1800);
  const wall = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  const glow = new Sprite(),
    hiddenGlow = new Sprite();
  const petal = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  hiddenGlow.visible = false;
  petal.userData.excludeFromContactShadows = true;
  scene.add(wall, glow, hiddenGlow, petal);
  const pass = new LandscapeContactShadows(scene, camera, 32, 32, 8);
  camera.fov = 38;
  camera.updateProjectionMatrix();
  // Probe the boundary to Three's GPU pass; the wrapper must prepare these before drawing.
  const render = t.mock.method(SSAOPass.prototype, 'render', function () {
    assert.ok(
      this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.equals(
        camera.projectionMatrix,
      ),
    );
    assert.ok(
      this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.equals(
        camera.projectionMatrixInverse,
      ),
    );
    assert.equal(wall.visible, true);
    assert.equal(glow.visible, false);
    assert.equal(hiddenGlow.visible, false);
    assert.equal(petal.visible, false);
  });
  try {
    pass.render();
    assert.equal(glow.visible, true);
    assert.equal(petal.visible, true);
    assert.equal(hiddenGlow.visible, false);
    render.mock.mockImplementation(() => {
      throw new Error('interrupted draw');
    });
    assert.throws(() => pass.render(), /interrupted draw/);
    assert.equal(glow.visible, true);
    assert.equal(petal.visible, true);
    assert.equal(hiddenGlow.visible, false);
  } finally {
    pass.dispose();
    pass.ssaoMaterial.dispose();
    pass.noiseTexture.dispose();
    wall.geometry.dispose();
    wall.material.dispose();
    petal.geometry.dispose();
    petal.material.dispose();
    glow.material.dispose();
    hiddenGlow.material.dispose();
  }
});
