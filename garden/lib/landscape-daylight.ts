import * as T from 'three';

/** Extend the existing sky in its own pass: no extra sky mesh, light, or post-processing pass. */
export function createDaylight(
  scene: T.Scene,
  sky: T.ShaderMaterial,
  sun: T.DirectionalLight,
  hemisphere: T.HemisphereLight,
  fill: T.DirectionalLight,
) {
  sky.uniforms.nightMix = { value: 0 };
  const output = 'gl_FragColor = vec4( texColor, 1.0 );';
  if (!sky.fragmentShader.includes(output))
    throw new Error('The sky shader output changed');
  sky.fragmentShader =
    'uniform float nightMix;\n' +
    sky.fragmentShader.replace(
      output,
      `
    if (nightMix > 0.0) {
    float nightHeight = sqrt(clamp(direction.y, 0.0, 1.0));
    vec3 nightColor = mix(vec3(0.07, 0.09, 0.17), vec3(0.004, 0.008, 0.024), nightHeight);
    vec2 starGrid = uv * vec2(720.0, 360.0);
    float starSeed = fract(sin(dot(floor(starGrid), vec2(127.1, 311.7))) * 43758.5453);
    float star = 1.0 - smoothstep(0.04, 0.22, length(fract(starGrid) - 0.5));
    nightColor += vec3(1.0, 1.05, 1.2) * step(0.9965, starSeed) * star * smoothstep(0.05, 0.3, direction.y);
    float moonAngle = max(dot(direction, normalize(vec3(35.0, 28.0, 25.0))), 0.0);
    float moonDisc = smoothstep(0.99982, 0.99988, moonAngle);
    nightColor += vec3(2.0, 1.85, 1.5) * moonDisc + vec3(0.06, 0.085, 0.14) * pow(moonAngle, 600.0);
    texColor = mix(texColor, nightColor, nightMix);
    }
    gl_FragColor = vec4(texColor, 1.0);
  `,
    );
  const daySun = new T.Color('#fff4dd'),
    nightSun = new T.Color('#aebff2');
  const daySky = new T.Color('#d9efff'),
    nightSky = new T.Color('#9badde');
  const dayGround = new T.Color('#8e956a'),
    nightGround = new T.Color('#263551');
  const dayFog = new T.Color('#c7e8f1'),
    nightFog = new T.Color('#17243d');
  function setNight(amount: number) {
    sky.uniforms.nightMix.value = amount;
    sun.color.copy(daySun).lerp(nightSun, amount);
    sun.intensity = T.MathUtils.lerp(3.8, 0.55, amount);
    hemisphere.color.copy(daySky).lerp(nightSky, amount);
    hemisphere.groundColor.copy(dayGround).lerp(nightGround, amount);
    hemisphere.intensity = T.MathUtils.lerp(1.05, 0.3, amount);
    fill.intensity = T.MathUtils.lerp(0.55, 0.12, amount);
    scene.environmentIntensity = T.MathUtils.lerp(0.9, 0.18, amount);
    scene.fog?.color.copy(dayFog).lerp(nightFog, amount);
  }
  return { setNight };
}
