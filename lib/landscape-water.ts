import * as T from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export function createLake() {
  const water = new Reflector(new T.PlaneGeometry(3000, 3000), {
    textureWidth: 768,
    textureHeight: 768,
    multisample: 0,
    clipBias: 0.003,
    shader: {
      name: 'LakeReflection',
      uniforms: {
        ...T.UniformsLib.fog,
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        time: { value: 0 },
        nightMix: { value: 0 },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vReflection;
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          vReflection = textureMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float nightMix;
        uniform float time;
        varying vec4 vReflection;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        void main() {
          vec3 eye = normalize(cameraPosition - vWorld);
          float waveX = sin(vWorld.x * 2.1 + time * 0.48 + sin(vWorld.z * 0.7)) * 0.0013;
          float waveY = cos(vWorld.z * 1.7 + time * 0.38 + sin(vWorld.x * 0.8)) * 0.0011;
          vec2 uv = vReflection.xy / vReflection.w + vec2(waveX, waveY);
          vec3 reflected = texture2D(tDiffuse, uv).rgb;
          float fresnel = 0.22 + 0.70 * pow(1.0 - max(eye.y, 0.0), 3.0);
          vec3 normal = normalize(vec3(
            cos(vWorld.x * 2.1 + time * 0.48) * 0.024,
            1.0,
            sin(vWorld.z * 1.7 + time * 0.38) * 0.022
          ));
          vec3 sunlight = normalize(vec3(35.0, 28.0, 25.0));
          float sparkle = pow(max(dot(normal, normalize(sunlight + eye)), 0.0), 160.0);
          float ripple = 0.012 * sin(vWorld.x * 0.41 + vWorld.z * 0.32 + time * 0.3);
          vec3 baseWater = mix(vec3(0.075, 0.285, 0.235), vec3(0.008, 0.02, 0.035), nightMix);
          vec3 lake = mix(baseWater + ripple * mix(1.0, 0.2, nightMix), reflected, fresnel);
          lake += vec3(1.0, 0.92, 0.68) * sparkle * mix(0.55, 0.12, nightMix);
          gl_FragColor = vec4(lake, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.37;
  water.userData.excludeFromContactShadows = true;
  // Reflector creates a ShaderMaterial; its upstream Mesh type is less specific.
  const material = water.material as T.ShaderMaterial;
  material.fog = true;
  const reflect = water.onBeforeRender.bind(water);
  const reflections = new ReflectionSchedule();
  water.onBeforeRender = function (...args) {
    const scene = args[1],
      camera = args[2];
    if (scene.overrideMaterial) return;
    if (
      reflections.needsUpdate(
        camera,
        material.uniforms.time.value,
        performance.now(),
      )
    )
      reflect(...args);
  };
  return {
    surface: water,
    material,
    invalidate: () => {
      reflections.invalidate();
    },
  };
}

/** Camera changes must reach the reflection in the same frame, including zoom. */
export class ReflectionSchedule {
  private previousView = new T.Matrix4();
  private previousProjection = new T.Matrix4();
  private lastReflection = -Infinity;
  private lastWaterTime = -Infinity;
  private dirty = true;

  needsUpdate(camera: T.Camera, waterTime: number, now: number) {
    const cameraMoved =
      !camera.matrixWorld.equals(this.previousView) ||
      !camera.projectionMatrix.equals(this.previousProjection);
    const sceneryMoved =
      waterTime !== this.lastWaterTime &&
      now - this.lastReflection >= 1000 / 15;
    if (!this.dirty && !cameraMoved && !sceneryMoved) return false;
    this.previousView.copy(camera.matrixWorld);
    this.previousProjection.copy(camera.projectionMatrix);
    this.lastWaterTime = waterTime;
    this.lastReflection = now;
    this.dirty = false;
    return true;
  }

  invalidate() {
    this.dirty = true;
  }
}
