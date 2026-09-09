import assert from 'node:assert/strict';
import test from 'node:test';
import { Fog, FogExp2, LinearSRGBColorSpace } from 'three';
import { WebGLMaterials } from 'three/src/renderers/webgl/WebGLMaterials.js';
import { createLake } from '../lib/landscape-water.ts';

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
