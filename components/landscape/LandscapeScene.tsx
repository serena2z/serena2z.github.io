'use client';
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  getWaypoint,
  waypoints,
  rooms,
  roomAt,
  type WaypointId,
  type RoomId,
} from '@/lib/landscape-config';
import type { BufferGeometry, Material, Texture } from 'three';
import type { GroundPoint } from '@/lib/landscape-navigation';
import { renderPixelRatio, RenderBudget } from '@/lib/landscape-render-budget';
export type ViewState = {
  mode: 'walk' | 'overview';
  waypoint: WaypointId;
  traveling: boolean;
  destination: WaypointId | null;
  freeWalking: boolean;
};
export type LandscapeHandle = {
  travelTo: (id: WaypointId) => void;
  overview: () => void;
  walk: () => void;
  turn: (angle: number) => void;
  forward: () => void;
  zoom: (delta: number) => void;
};
type Props = {
  paused: boolean;
  blocked: boolean;
  onState: (state: ViewState) => void;
  onReady: (available: boolean) => void;
  onOpen: (room: RoomId) => void;
};
const LandscapeScene = forwardRef<LandscapeHandle, Props>(
  function LandscapeScene(props, ref) {
    const mount = useRef<HTMLDivElement>(null),
      state = useRef(props),
      runtime = useRef<LandscapeHandle | null>(null);
    useEffect(() => {
      state.current = props;
    });
    const [failed, setFailed] = useState(false);
    useImperativeHandle(
      ref,
      () => ({
        travelTo: (id) => runtime.current?.travelTo(id),
        overview: () => runtime.current?.overview(),
        walk: () => runtime.current?.walk(),
        turn: (a) => runtime.current?.turn(a),
        forward: () => runtime.current?.forward(),
        zoom: (d) => runtime.current?.zoom(d),
      }),
      [],
    );
    useEffect(() => {
      let cancelled = false,
        cleanup: (() => void) | undefined;
      async function build() {
        const [
          T,
          { OrbitControls },
          { createLandscapeWorld },
          { createWalkingSurface, walkingOffset, landmarkAt, scrollLook },
          { loadLandscapeSurfaces },
          { HDRLoader },
          { Sky },
          { EffectComposer },
          { RenderPass },
          { SSAOPass },
          { OutputPass },
        ] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('@/lib/landscape-world'),
          import('@/lib/landscape-navigation'),
          import('@/lib/landscape-materials'),
          import('three/examples/jsm/loaders/HDRLoader.js'),
          import('three/examples/jsm/objects/Sky.js'),
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/SSAOPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ]);
        if (cancelled || !mount.current) return;
        const host = mount.current,
          scene = new T.Scene();
        const budget = new RenderBudget();
        const startedAt = performance.now();
        let viewDirty = true;
        const invalidate = () => {
          viewDirty = true;
        };
        const camera = new T.PerspectiveCamera(
          62,
          host.clientWidth / host.clientHeight,
          0.06,
          1800,
        );
        const renderer = new T.WebGLRenderer({
          antialias: false,
          powerPreference: 'default',
        });
        renderer.setPixelRatio(
          renderPixelRatio(
            host.clientWidth,
            host.clientHeight,
            window.devicePixelRatio,
          ),
        );
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.shadowMap.enabled = true;
        // The sun and buildings stay still; reuse their shadows across frames.
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        renderer.shadowMap.type = T.PCFShadowMap;
        renderer.toneMapping = T.AgXToneMapping;
        renderer.toneMappingExposure = 1.05;
        host.appendChild(renderer.domElement);
        renderer.domElement.setAttribute(
          'aria-label',
          'Walk freely through the estate. Hold up or down to move and left or right to turn. Drag to look around or scroll to look up and down. Enter opens a collection, and M shows the overview.',
        );
        renderer.domElement.tabIndex = 0;
        scene.background = new T.Color('#86c6ee');
        scene.fog = new T.FogExp2('#c7e8f1', 0.0028);
        scene.add(new T.HemisphereLight('#d9efff', '#8e956a', 1.05));
        const sun = new T.DirectionalLight('#fff4dd', 3.8);
        sun.position.set(35, 28, 25);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.radius = 3;
        Object.assign(sun.shadow.camera, {
          left: -36,
          right: 36,
          top: 36,
          bottom: -36,
          near: 1,
          far: 100,
        });
        sun.shadow.bias = -0.0005;
        sun.shadow.normalBias = 0.018;
        scene.add(sun);
        const fill = new T.DirectionalLight('#e3f2ff', 0.55);
        fill.position.set(20, 12, -20);
        scene.add(fill);
        const resources: Texture[] = [];
        function sign(
          title: string,
          kicker: string,
          lines: string[],
          aspect = 1.4,
        ) {
          const canvas = document.createElement('canvas');
          canvas.width = 1024;
          canvas.height = Math.round(1024 / aspect);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas text is unavailable');
          const w = canvas.width,
            h = canvas.height;
          ctx.fillStyle = '#e5d6b8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#a18b60';
          ctx.lineWidth = 2;
          ctx.strokeRect(25, 25, w - 50, h - 50);
          ctx.strokeStyle = '#c1ab83';
          ctx.lineWidth = 1;
          ctx.strokeRect(33, 33, w - 66, h - 66);
          ctx.textAlign = 'center';
          if (aspect > 3) {
            ctx.fillStyle = '#4f5e50';
            ctx.font = '60px Georgia';
            ctx.fillText(title, w / 2, h * 0.6);
          } else {
            ctx.fillStyle = '#8b7857';
            ctx.font = '24px Arial';
            ctx.letterSpacing = '5px';
            ctx.fillText(kicker, w / 2, h * 0.17);
            ctx.letterSpacing = '0px';
            let size = 82;
            ctx.font = `${size}px Georgia`;
            while (ctx.measureText(title).width > w * 0.81) {
              size -= 2;
              ctx.font = `${size}px Georgia`;
            }
            ctx.fillStyle = '#344f48';
            ctx.fillText(title, w / 2, h * 0.41);
            ctx.fillStyle = '#6f705b';
            ctx.font = '28px Georgia';
            lines.forEach((line, i) =>
              ctx.fillText(line, w / 2, h * 0.59 + i * 48),
            );
            if (lines.length) {
              ctx.font = '20px Arial';
              ctx.fillStyle = '#8c7958';
              ctx.fillText('OPEN TO READ', w / 2, h * 0.86);
            }
          }
          const texture = new T.CanvasTexture(canvas);
          texture.colorSpace = T.SRGBColorSpace;
          texture.anisotropy = 4;
          resources.push(texture);
          return texture;
        }
        const [surfaces, lighting, frieze] = await Promise.all([
          loadLandscapeSurfaces(
            Math.min(renderer.capabilities.getMaxAnisotropy(), 16),
          ),
          new HDRLoader().loadAsync('/environment/sunny-lake-light.hdr'),
          new T.TextureLoader().loadAsync(
            '/materials/palace/painted-frieze.png',
          ),
        ]);
        for (const maps of Object.values(surfaces))
          resources.push(maps.color, maps.normal, maps.roughness);
        resources.push(lighting, frieze);
        frieze.colorSpace = T.SRGBColorSpace;
        frieze.wrapS = T.RepeatWrapping;
        frieze.anisotropy = Math.min(
          renderer.capabilities.getMaxAnisotropy(),
          16,
        );
        if (cancelled) {
          resources.forEach((texture) => texture.dispose());
          renderer.dispose();
          renderer.domElement.remove();
          return;
        }
        const landscape = createLandscapeWorld(sign, surfaces, frieze);
        scene.add(landscape.world);
        // Analytic daylight stays sharp at any zoom; it has no photographic foreground.
        const sky = new Sky();
        sky.scale.setScalar(1400);
        sky.material.uniforms.turbidity.value = 1.5;
        sky.material.uniforms.rayleigh.value = 1.4;
        sky.material.uniforms.mieCoefficient.value = 0.003;
        sky.material.uniforms.mieDirectionalG.value = 0.78;
        sky.material.uniforms.sunPosition.value
          .copy(sun.position)
          .normalize()
          .multiplyScalar(450000);
        sky.material.uniforms.cloudCoverage.value = 0.12;
        sky.material.uniforms.cloudDensity.value = 0.2;
        sky.material.uniforms.cloudSpeed.value = 0;
        sky.renderOrder = -1;
        sky.frustumCulled = false;
        scene.add(sky);
        lighting.mapping = T.EquirectangularReflectionMapping;
        scene.environment = lighting;
        scene.environmentIntensity = 0.9;
        const target = new T.WebGLRenderTarget(
          host.clientWidth,
          host.clientHeight,
          {
            samples: Math.min(4, renderer.capabilities.maxSamples),
            type: T.HalfFloatType,
          },
        );
        const composer = new EffectComposer(renderer, target);
        const renderPass = new RenderPass(scene, camera);
        const ambientOcclusion = new SSAOPass(
          scene,
          camera,
          host.clientWidth,
          host.clientHeight,
          16,
        );
        ambientOcclusion.kernelRadius = 0.7;
        ambientOcclusion.minDistance = 0.0005;
        ambientOcclusion.maxDistance = 0.012;
        const output = new OutputPass();
        composer.addPass(renderPass);
        composer.addPass(ambientOcclusion);
        composer.addPass(output);
        function resizeRendering() {
          const ratio = renderPixelRatio(
            host.clientWidth,
            host.clientHeight,
            window.devicePixelRatio,
            budget.scale,
          );
          renderer.setPixelRatio(ratio);
          renderer.setSize(host.clientWidth, host.clientHeight);
          composer.setPixelRatio(ratio);
          composer.setSize(host.clientWidth, host.clientHeight);
          viewDirty = true;
          ambientOcclusion.setSize(
            Math.round(host.clientWidth * renderer.getPixelRatio() * 0.5),
            Math.round(host.clientHeight * renderer.getPixelRatio() * 0.5),
          );
        }
        resizeRendering();
        const orbit = new OrbitControls(camera, renderer.domElement);
        orbit.addEventListener('change', invalidate);
        orbit.enabled = false;
        orbit.enableDamping = true;
        orbit.dampingFactor = 0.07;
        orbit.enablePan = false;
        orbit.enableZoom = false;
        orbit.minPolarAngle = 0.18;
        orbit.maxPolarAngle = Math.PI * 0.35;
        orbit.rotateSpeed = 0.6;
        orbit.target.set(0, 1, -2);
        const walkingSurface = createWalkingSurface(landscape.world);
        let freeWalking = false;
        let savedWalk: {
          position: InstanceType<typeof T.Vector3>;
          quaternion: InstanceType<typeof T.Quaternion>;
          fov: number;
          waypoint: WaypointId;
        } | null = null;
        let mode: 'walk' | 'overview' = 'walk',
          current: WaypointId = 'arrival',
          walkingRoute: GroundPoint[] = [],
          destination: WaypointId | null = null;
        let yaw = 0,
          yawTarget = 0,
          pitch = 0,
          pitchTarget = 0,
          fov = 62,
          frame = 0,
          lastTime = 0,
          lastRender = 0,
          dragged = false,
          pointerStart = { x: 0, y: 0 },
          lastPointer = { x: 0, y: 0 },
          pinchDistance = 0;
        const pointers = new Map<number, { x: number; y: number }>();
        // Walking and turning are continuous and independent of destination markers.
        const held = new Set<string>();
        type Journey = {
          from: InstanceType<typeof T.Vector3>;
          to: InstanceType<typeof T.Vector3>;
          fromQ: InstanceType<typeof T.Quaternion>;
          toQ: InstanceType<typeof T.Quaternion>;
          elapsed: number;
          duration: number;
          arrival: WaypointId | null;
          map: boolean;
          ease: 'in' | 'out' | 'both' | 'linear';
        };
        let journey: Journey | null = null;
        const direction = new T.Vector3();
        function cameraPose(id: WaypointId) {
          const p = getWaypoint(id),
            position = new T.Vector3(...p.position);
          position.y = walkingSurface.height(position);
          const temp = new T.PerspectiveCamera();
          temp.position.copy(position);
          temp.lookAt(...p.lookAt);
          return { position, quaternion: temp.quaternion.clone() };
        }
        function syncAngles() {
          camera.getWorldDirection(direction);
          pitch = pitchTarget = Math.asin(
            T.MathUtils.clamp(direction.y, -1, 1),
          );
          yaw = yawTarget = Math.atan2(direction.x, -direction.z);
        }
        function applyLook() {
          viewDirty = true;
          direction.set(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            -Math.cos(yaw) * Math.cos(pitch),
          );
          camera.lookAt(camera.position.clone().add(direction));
        }
        function notify() {
          viewDirty = true;
          state.current.onState({
            mode,
            waypoint: current,
            traveling: !!journey || walkingRoute.length > 0,
            destination,
            freeWalking,
          });
        }
        function updateLocation() {
          const next = landmarkAt(camera.position);
          if (next !== current) {
            current = next;
            notify();
          }
        }
        function startWalkingRoute(id: WaypointId) {
          const target = getWaypoint(id).position;
          walkingRoute = walkingSurface.route(camera.position, {
            x: target[0],
            z: target[2],
          });
          if (!walkingRoute.length) destination = null;
          notify();
        }
        function travelTo(id: WaypointId) {
          if (!getWaypoint(id) || state.current.blocked) return;
          held.clear();
          freeWalking = false;
          destination = id;
          walkingRoute = [];
          if (mode === 'overview') {
            mode = 'walk';
            orbit.enabled = false;
            const target = getWaypoint(id);
            const landing = target.room ? target.neighbors[0] : id;
            fov = 62;
            camera.fov = fov;
            camera.updateProjectionMatrix();
            const p = cameraPose(landing);
            journey = {
              from: camera.position.clone(),
              to: p.position,
              fromQ: camera.quaternion.clone(),
              toQ: p.quaternion,
              elapsed: 0,
              duration: state.current.paused ? 0 : 1.1,
              arrival: landing,
              map: false,
              ease: 'both',
            };
            notify();
            return;
          }
          // A room selection during the descent is picked up when we reach the ground.
          if (journey) return;
          startWalkingRoute(id);
        }
        function overview() {
          if (state.current.blocked || mode === 'overview' || journey) return;
          held.clear();
          current = landmarkAt(camera.position);
          savedWalk = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
            fov,
            waypoint: current,
          };
          mode = 'overview';
          walkingRoute = [];
          destination = null;
          freeWalking = true;
          orbit.enabled = false;
          orbit.target.set(0, 1, -2);
          const target = new T.Vector3(29, 43, 39).multiplyScalar(
              Math.max(1, 1.1 / (host.clientWidth / host.clientHeight)),
            ),
            temp = new T.PerspectiveCamera();
          temp.position.copy(target);
          temp.lookAt(orbit.target);
          journey = {
            from: camera.position.clone(),
            to: target,
            fromQ: camera.quaternion.clone(),
            toQ: temp.quaternion.clone(),
            elapsed: 0,
            duration: state.current.paused ? 0 : 1.1,
            arrival: null,
            map: true,
            ease: 'both',
          };
          camera.fov = 48;
          camera.updateProjectionMatrix();
          notify();
        }
        function walk() {
          if (
            mode !== 'overview' ||
            journey ||
            state.current.blocked ||
            !savedWalk
          )
            return;
          held.clear();
          mode = 'walk';
          orbit.enabled = false;
          fov = savedWalk.fov;
          camera.fov = fov;
          camera.updateProjectionMatrix();
          journey = {
            from: camera.position.clone(),
            to: savedWalk.position.clone(),
            fromQ: camera.quaternion.clone(),
            toQ: savedWalk.quaternion.clone(),
            elapsed: 0,
            duration: state.current.paused ? 0 : 1.1,
            arrival: savedWalk.waypoint,
            map: false,
            ease: 'both',
          };
          notify();
        }
        function takeControl() {
          if (mode !== 'walk' || journey || state.current.blocked) return false;
          if (walkingRoute.length || !freeWalking) {
            walkingRoute = [];
            destination = null;
            freeWalking = true;
            current = landmarkAt(camera.position);
            notify();
          }
          return true;
        }
        function turn(angle: number) {
          if (takeControl()) yawTarget += angle;
        }
        function moveBy(offset: GroundPoint, dt: number) {
          const p = walkingSurface.move(camera.position, offset);
          camera.position.x = p.x;
          camera.position.z = p.z;
          camera.position.y +=
            (walkingSurface.height(p) - camera.position.y) *
            Math.min(1, dt * 12);
          // Translation never changes yaw, pitch, or the camera quaternion.
          updateLocation();
        }
        function forward() {
          if (takeControl()) moveBy(walkingOffset(yaw, 1, 0, 0.65), 1);
        }
        function open() {
          if (mode === 'overview' || journey || state.current.blocked) return;
          const room = roomAt(current);
          if (room) {
            held.clear();
            state.current.onOpen(room.id);
          }
        }
        function zoom(delta: number) {
          if (journey || state.current.blocked) return;
          viewDirty = true;
          if (mode === 'walk') {
            fov = T.MathUtils.clamp(fov + delta * 0.045, 38, 80);
            camera.fov = fov;
            camera.updateProjectionMatrix();
          } else {
            const offset = camera.position.clone().sub(orbit.target);
            const length = T.MathUtils.clamp(
              offset.length() * Math.exp(delta * 0.0012),
              27,
              Math.max(95, 75 / (host.clientWidth / host.clientHeight)),
            );
            camera.position.copy(orbit.target).add(offset.setLength(length));
          }
        }
        runtime.current = {
          travelTo,
          overview,
          walk,
          turn,
          forward: () => forward(),
          zoom,
        };
        const initial = cameraPose(current);
        camera.position.copy(initial.position);
        camera.quaternion.copy(initial.quaternion);
        syncAngles();
        notify();
        // A soft halo marks each collection object as the thing to open.
        const haloCanvas = document.createElement('canvas');
        haloCanvas.width = haloCanvas.height = 256;
        const haloContext = haloCanvas.getContext('2d');
        if (haloContext) {
          const gradient = haloContext.createRadialGradient(
            128,
            128,
            6,
            128,
            128,
            128,
          );
          gradient.addColorStop(0, 'rgba(255, 240, 205, 0.95)');
          gradient.addColorStop(0.35, 'rgba(255, 226, 170, 0.42)');
          gradient.addColorStop(1, 'rgba(255, 210, 140, 0)');
          haloContext.fillStyle = gradient;
          haloContext.fillRect(0, 0, 256, 256);
        }
        const haloTexture = new T.CanvasTexture(haloCanvas);
        haloTexture.colorSpace = T.SRGBColorSpace;
        resources.push(haloTexture);
        const halos = new Map<
          RoomId,
          {
            sprite: InstanceType<typeof T.Sprite>;
            light: InstanceType<typeof T.PointLight>;
          }
        >();
        for (const r of rooms) {
          const sprite = new T.Sprite(
            new T.SpriteMaterial({
              map: haloTexture,
              transparent: true,
              depthWrite: false,
              blending: T.AdditiveBlending,
              opacity: 0.22,
            }),
          );
          sprite.position.set(r.object[0], r.object[1] + 0.05, r.object[2]);
          sprite.scale.setScalar(2.6);
          sprite.renderOrder = 2;
          const light = new T.PointLight('#ffd9a0', 1.6, 3.2, 2);
          light.position.set(r.object[0], r.object[1] + 0.7, r.object[2]);
          scene.add(sprite, light);
          halos.set(r.id, { sprite, light });
        }
        let hovered: RoomId | null = null;
        const raycaster = new T.Raycaster(),
          mouse = new T.Vector2();
        function objectAt(clientX: number, clientY: number) {
          const room = roomAt(current);
          if (!room) return null;
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.set(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            (-(clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(mouse, camera);
          const object = landscape.contentObjects.get(room.id)!;
          return raycaster.intersectObject(object, true).length
            ? room.id
            : null;
        }
        function down(e: PointerEvent) {
          if (mode === 'overview' || state.current.blocked || journey) return;
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          renderer.domElement.setPointerCapture(e.pointerId);
          if (pointers.size === 1) {
            pointerStart = lastPointer = { x: e.clientX, y: e.clientY };
            dragged = false;
          } else {
            dragged = true;
            const [a, b] = [...pointers.values()];
            pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
          }
        }
        function move(e: PointerEvent) {
          if (mode === 'overview' || state.current.blocked || journey) return;
          if (!pointers.has(e.pointerId)) {
            const nextHover = objectAt(e.clientX, e.clientY);
            if (nextHover !== hovered) viewDirty = true;
            hovered = nextHover;
            renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
            return;
          }
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.size > 1) {
            const [a, b] = [...pointers.values()],
              distance = Math.hypot(a.x - b.x, a.y - b.y);
            zoom((pinchDistance - distance) * 3);
            pinchDistance = distance;
            dragged = true;
            return;
          }
          const dx = e.clientX - lastPointer.x,
            dy = e.clientY - lastPointer.y;
          if (
            Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) >
            5
          )
            dragged = true;
          if (dragged) {
            yaw -= dx * 0.004;
            yawTarget = yaw;
            pitch = pitchTarget = T.MathUtils.clamp(
              pitch + dy * 0.003,
              -1.35,
              1.48,
            );
            applyLook();
            renderer.domElement.style.cursor = 'grabbing';
          }
          lastPointer = { x: e.clientX, y: e.clientY };
        }
        function up(e: PointerEvent) {
          if (!pointers.has(e.pointerId)) return;
          pointers.delete(e.pointerId);
          if (!dragged && !journey && !state.current.blocked) {
            const room = objectAt(e.clientX, e.clientY);
            if (room) state.current.onOpen(room);
          }
          if (pointers.size === 0) {
            pinchDistance = 0;
            renderer.domElement.style.cursor = 'grab';
          } else {
            lastPointer = [...pointers.values()][0];
            dragged = true;
          }
        }
        function cancel(e: PointerEvent) {
          pointers.delete(e.pointerId);
          dragged = true;
        }
        function wheel(e: WheelEvent) {
          e.preventDefault();
          if (journey || state.current.blocked) return;
          const units =
            e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? host.clientHeight : 1;
          if (mode === 'overview' || e.ctrlKey) {
            zoom(e.deltaY * units);
            return;
          }
          const look = scrollLook(
            pitchTarget,
            yawTarget,
            e.deltaX * units,
            e.deltaY * units,
          );
          pitchTarget = look.pitch;
          yawTarget = look.yaw;
        }
        const movementKeys = [
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          'w',
          's',
        ];
        function key(e: KeyboardEvent) {
          if (state.current.blocked || e.altKey || e.metaKey || e.ctrlKey)
            return;
          if (
            e.target instanceof HTMLElement &&
            e.target.closest(
              'input,textarea,select,[contenteditable=true],[role=dialog]',
            )
          )
            return;
          const k = e.key.toLowerCase();
          if (
            (k === 'enter' || k === ' ') &&
            e.target instanceof HTMLElement &&
            e.target.closest('button,a')
          )
            return;
          if (
            [...movementKeys, 'm', '=', '+', '-', ' '].includes(k) ||
            (k === 'enter' && roomAt(current))
          )
            e.preventDefault();
          if (movementKeys.includes(k)) {
            if (takeControl()) held.add(k);
            return;
          }
          if (e.repeat) return;
          if (k === 'enter' || k === ' ' || k === 'e') open();
          if (k === 'm') {
            if (mode === 'walk') overview();
            else walk();
          }
          if (k === '=' || k === '+') zoom(-220);
          if (k === '-') zoom(260);
        }
        function keyUp(e: KeyboardEvent) {
          held.delete(e.key.toLowerCase());
        }
        function releaseKeys() {
          held.clear();
          viewDirty = true;
        }
        function lost(e: Event) {
          e.preventDefault();
          setFailed(true);
          state.current.onReady(false);
        }
        const el = renderer.domElement;
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', cancel);
        el.addEventListener('wheel', wheel, { passive: false });
        el.addEventListener('webglcontextlost', lost);
        window.addEventListener('keydown', key);
        window.addEventListener('keyup', keyUp);
        window.addEventListener('blur', releaseKeys);
        document.addEventListener('visibilitychange', releaseKeys);
        const resize = new ResizeObserver(() => {
          camera.aspect = host.clientWidth / host.clientHeight;
          camera.updateProjectionMatrix();
          resizeRendering();
        });
        resize.observe(host);
        const projected = new T.Vector3(),
          stops = waypoints.map((p) =>
            host.parentElement?.querySelector<HTMLElement>(
              `[data-stop="${p.id}"]`,
            ),
          ),
          roomPins = rooms.map((r) =>
            host.parentElement?.querySelector<HTMLElement>(
              `[data-room="${r.id}"]`,
            ),
          ),
          objects = rooms.map((r) =>
            host.parentElement?.querySelector<HTMLElement>(
              `[data-object="${r.id}"]`,
            ),
          );
        const compass = host.parentElement?.querySelector<HTMLElement>(
          '[data-compass-needle]',
        );
        function place(
          label: HTMLElement | undefined | null,
          position: readonly number[],
          show: boolean,
        ) {
          if (!label) return;
          if (show) {
            projected
              .set(position[0], position[1], position[2])
              .project(camera);
            show =
              projected.z < 1 &&
              projected.z > 0 &&
              Math.abs(projected.x) < 0.91 &&
              Math.abs(projected.y) < 0.84;
            if (show)
              label.style.transform = `translate(-50%,-50%) translate(${(projected.x * 0.5 + 0.5) * host.clientWidth}px,${(-projected.y * 0.5 + 0.5) * host.clientHeight}px)`;
          }
          label.style.visibility = show ? 'visible' : 'hidden';
          label.tabIndex = show ? 0 : -1;
        }
        const roofAnchors = rooms.map((room, i) => {
          const height = room.id === 'research' ? 8.1 : 6.4;
          const corners = [];
          for (const x of [-1, 1])
            for (const z of [-1, 1]) {
              const dx = (x * (room.width + 2.25)) / 2;
              const dz = (z * (room.depth + 2.25)) / 2;
              corners.push(
                new T.Vector3(
                  room.position[0] +
                    dx * Math.cos(room.rotation) +
                    dz * Math.sin(room.rotation),
                  height,
                  room.position[2] -
                    dx * Math.sin(room.rotation) +
                    dz * Math.cos(room.rotation),
                ),
              );
            }
          return {
            label: roomPins[i],
            corners,
            center: new T.Vector3(room.position[0], height, room.position[2]),
          };
        });
        function placeRoomPins(show: boolean) {
          const pins: {
            label: HTMLElement;
            x: number;
            y: number;
            w: number;
            h: number;
          }[] = [];
          for (const { label, corners, center } of roofAnchors) {
            if (!label) continue;
            label.style.visibility = 'hidden';
            label.tabIndex = -1;
            if (!show) continue;
            projected.copy(center).project(camera);
            if (
              projected.z <= 0 ||
              projected.z >= 1 ||
              Math.abs(projected.x) > 0.95 ||
              Math.abs(projected.y) > 0.85
            )
              continue;
            const w = label.offsetWidth,
              h = label.offsetHeight;
            const x = T.MathUtils.clamp(
              (projected.x * 0.5 + 0.5) * host.clientWidth,
              w / 2 + 12,
              host.clientWidth - w / 2 - 12,
            );
            const roofTop = Math.min(
              ...corners.map((corner) => {
                projected.copy(corner).project(camera);
                return (-projected.y * 0.5 + 0.5) * host.clientHeight;
              }),
            );
            pins.push({ label, x, y: roofTop - h / 2 - 5, w, h });
          }
          // Work upward from the nearest roofs, leaving breathing room between pills.
          pins.sort((a, b) => b.y - a.y);
          for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            while (true) {
              const other = pins
                .slice(0, i)
                .find(
                  (placed) =>
                    Math.abs(pin.x - placed.x) < (pin.w + placed.w) / 2 + 8 &&
                    Math.abs(pin.y - placed.y) < (pin.h + placed.h) / 2 + 4,
                );
              if (!other) break;
              pin.y = other.y - (pin.h + other.h) / 2 - 6;
            }
            if (pin.y - pin.h / 2 < 72) continue;
            pin.label.style.transform = `translate(-50%,-50%) translate(${pin.x}px,${pin.y}px)`;
            pin.label.style.visibility = 'visible';
            pin.label.tabIndex = 0;
          }
        }
        function animate(now: number) {
          frame = requestAnimationFrame(animate);
          if (document.hidden || state.current.blocked) {
            held.clear();
            lastTime = now;
            return;
          }
          if (mode === 'overview' && !journey) {
            orbit.enabled = true;
            orbit.enableDamping = !state.current.paused;
            orbit.update();
          } else orbit.enabled = false;
          const active =
            !!journey ||
            walkingRoute.length > 0 ||
            held.size > 0 ||
            pointers.size > 0 ||
            Math.abs(yawTarget - yaw) > 0.00005 ||
            Math.abs(pitchTarget - pitch) > 0.00005 ||
            viewDirty;
          // Freeze the paused scene; animate idle scenery gently at 12 fps.
          if (!active && state.current.paused) {
            lastTime = now;
            return;
          }
          if (now - lastRender < (active ? 1000 / 30 - 0.5 : 1000 / 12)) return;
          const elapsed = now - lastTime;
          const dt = Math.min(elapsed / 1000, active ? 0.05 : 0.1);
          lastTime = now;
          lastRender = now;
          if (active && now - startedAt > 4000 && budget.observe(elapsed))
            resizeRendering();
          if (journey && !state.current.blocked) {
            journey.elapsed += dt;
            const t =
              journey.duration === 0
                ? 1
                : Math.min(journey.elapsed / journey.duration, 1);
            const eased =
              journey.ease === 'both'
                ? t * t * (3 - 2 * t)
                : journey.ease === 'in'
                  ? t * t
                  : journey.ease === 'out'
                    ? 1 - (1 - t) * (1 - t)
                    : t;
            camera.position.lerpVectors(journey.from, journey.to, eased);
            camera.quaternion.slerpQuaternions(
              journey.fromQ,
              journey.toQ,
              eased,
            );
            if (t >= 1) {
              if (journey.arrival) current = journey.arrival;
              const wasMap = journey.map;
              journey = null;
              syncAngles();
              if (!wasMap && destination) startWalkingRoute(destination);
              else {
                destination = null;
                orbit.enabled = wasMap && !state.current.blocked;
                notify();
              }
            }
          }
          if (mode === 'walk' && !journey && !state.current.blocked) {
            if (pointers.size === 0) {
              const rate = 1.9 * dt;
              if (held.has('arrowleft')) yawTarget -= rate;
              if (held.has('arrowright')) yawTarget += rate;
              const delta = yawTarget - yaw,
                tilt = pitchTarget - pitch;
              if (Math.abs(delta) > 0.00005 || Math.abs(tilt) > 0.00005) {
                const smoothing = state.current.paused
                  ? 1
                  : Math.min(1, dt * 9);
                yaw += delta * smoothing;
                pitch += tilt * smoothing;
                applyLook();
              }
            }
            if (walkingRoute.length) {
              let remaining = state.current.paused ? Infinity : 5.4 * dt;
              while (walkingRoute.length && remaining > 0) {
                const target = walkingRoute[0];
                const dx = target.x - camera.position.x,
                  dz = target.z - camera.position.z;
                const distance = Math.hypot(dx, dz),
                  step = Math.min(distance, remaining);
                if (distance > 0.0001) {
                  camera.position.x += (dx * step) / distance;
                  camera.position.z += (dz * step) / distance;
                }
                remaining -= step;
                if (distance <= step + 0.0001) walkingRoute.shift();
              }
              camera.position.y +=
                (walkingSurface.height(camera.position) - camera.position.y) *
                Math.min(1, dt * 12);
              if (!walkingRoute.length) {
                current = destination ?? landmarkAt(camera.position);
                destination = null;
                notify();
              }
            } else {
              const forward =
                Number(held.has('arrowup') || held.has('w')) -
                Number(held.has('arrowdown') || held.has('s'));
              if (forward) moveBy(walkingOffset(yaw, forward, 0, 3.2 * dt), dt);
            }
          }
          landscape.update(dt, state.current.paused);
          const point = getWaypoint(current);
          const nearRoom = roomAt(current);
          const pulse = 0.5 + 0.5 * Math.sin(now / 900);
          for (const [id, halo] of halos) {
            const active = !!nearRoom && nearRoom.id === id;
            const focus = hovered === id && !state.current.blocked;
            const target = state.current.paused
              ? 0.24
              : active
                ? focus
                  ? 0.5
                  : 0.2 + pulse * 0.14
                : 0.1 + pulse * 0.05;
            const material = halo.sprite.material;
            material.opacity +=
              (target - material.opacity) *
              (state.current.paused ? 1 : Math.min(1, dt * 6));
            halo.sprite.scale.setScalar(
              focus ? 3.1 : 2.4 + (state.current.paused ? 0.1 : pulse * 0.25),
            );
            halo.light.intensity +=
              ((focus ? 4 : active ? 2.2 : 1.1) - halo.light.intensity) *
              (state.current.paused ? 1 : Math.min(1, dt * 6));
          }
          waypoints.forEach((p, i) =>
            place(
              stops[i],
              [p.position[0], p.position[1] - 1.52, p.position[2]],
              mode === 'walk' &&
                !journey &&
                !walkingRoute.length &&
                !state.current.blocked &&
                point.neighbors.includes(p.id),
            ),
          );
          placeRoomPins(
            mode === 'overview' && !journey && !state.current.blocked,
          );
          rooms.forEach((r, i) => {
            place(
              objects[i],
              [
                r.object[0],
                r.object[1] + (point.room ? 0.62 : 0.95),
                r.object[2],
              ],
              mode === 'walk' &&
                !journey &&
                !walkingRoute.length &&
                !state.current.blocked &&
                nearRoom?.id === r.id,
            );
          });
          if (compass) {
            camera.getWorldDirection(direction);
            compass.style.transform = `rotate(${(-Math.atan2(direction.x, -direction.z) * 180) / Math.PI}deg)`;
          }
          composer.render(dt);
          viewDirty = false;
        }
        cleanup = () => {
          cancelAnimationFrame(frame);
          runtime.current = null;
          resize.disconnect();
          orbit.removeEventListener('change', invalidate);
          orbit.dispose();
          el.removeEventListener('pointerdown', down);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', cancel);
          el.removeEventListener('wheel', wheel);
          el.removeEventListener('webglcontextlost', lost);
          window.removeEventListener('keydown', key);
          window.removeEventListener('keyup', keyUp);
          window.removeEventListener('blur', releaseKeys);
          document.removeEventListener('visibilitychange', releaseKeys);
          const geos = new Set<BufferGeometry>(),
            mats = new Set<Material>();
          scene.traverse((o) => {
            if (o instanceof T.Mesh || o instanceof T.Line) {
              if (o instanceof T.InstancedMesh) o.dispose();
              geos.add(o.geometry);
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material])
                mats.add(m);
            }
          });
          geos.forEach((g) => g.dispose());
          mats.forEach((m) => m.dispose());
          halos.forEach((halo) => halo.sprite.material.dispose());
          resources.forEach((t) => t.dispose());
          landscape.dispose();
          renderPass.dispose();
          ambientOcclusion.dispose();
          output.dispose();
          composer.dispose();
          renderer.dispose();
          el.remove();
        };
        animate(performance.now());
        setFailed(false);
        state.current.onReady(true);
        if (cancelled) cleanup();
      }
      build().catch((error) => {
        cleanup?.();
        if (!cancelled) {
          console.error('Landscape unavailable', error);
          setFailed(true);
          state.current.onReady(false);
        }
      });
      return () => {
        cancelled = true;
        cleanup?.();
      };
    }, []);
    return (
      <div ref={mount} className="landscape-canvas">
        {failed && (
          <div className="landscape-fallback">
            <h2>The rooms are still open.</h2>
            <p>
              The 3D landscape could not load on this device.
              <br />
              Use Rooms to read each part of the site.
            </p>
          </div>
        )}
      </div>
    );
  },
);
export default LandscapeScene;
