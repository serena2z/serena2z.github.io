import assert from 'node:assert/strict';
import test from 'node:test';
import { Fog, FogExp2, LinearSRGBColorSpace, PerspectiveCamera } from 'three';
import { WebGLMaterials } from 'three/src/renderers/webgl/WebGLMaterials.js';
import { createLake, ReflectionSchedule } from '../lib/landscape-water.ts';

test('lake accepts the renderer’s fog uploads before drawing its first frame', () => {
  const lake = createLake();
  const fog = new FogExp2('#bfc6c9', 0.0025);
  // This is the same upload path WebGLRenderer calls for fog-enabled materials.
  const uploader = WebGLMaterials(
    { getRenderTarget: () => null, outputColorSpace: LinearSRGBColorSpace },
    {},
  );
  try {
    assert.equal(lake.material.fog, true);
    uploader.refreshFogUniforms(lake.material.uniforms, fog);
    assert.equal(lake.material.uniforms.fogDensity.value, fog.density);
    assert.ok(lake.material.uniforms.fogColor.value.equals(fog.color));

    uploader.refreshFogUniforms(
      lake.material.uniforms,
      new Fog('#bfc6c9', 3, 100),
    );
    assert.equal(lake.material.uniforms.fogNear.value, 3);
    assert.equal(lake.material.uniforms.fogFar.value, 100);
  } finally {
    lake.surface.dispose();
    lake.surface.geometry.dispose();
  }
});

test('reflections follow every camera frame and zoom while resting with a still scene', () => {
  const schedule = new ReflectionSchedule(),
    camera = new PerspectiveCamera();
  camera.updateMatrixWorld();
  assert.equal(schedule.needsUpdate(camera, 0, 0), true);
  assert.equal(schedule.needsUpdate(camera, 0.016, 16), false);
  camera.position.x += 0.1;
  camera.updateMatrixWorld();
  assert.equal(schedule.needsUpdate(camera, 0.016, 16), true);
  camera.fov = 45;
  camera.updateProjectionMatrix();
  assert.equal(schedule.needsUpdate(camera, 0.033, 33), true);
  assert.equal(schedule.needsUpdate(camera, 0.05, 50), false);
  assert.equal(schedule.needsUpdate(camera, 0.11, 110), true);
  assert.equal(schedule.needsUpdate(camera, 0.11, 1000), false);
  schedule.invalidate();
  assert.equal(schedule.needsUpdate(camera, 0.11, 1001), true);
});
