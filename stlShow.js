import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/STLLoader.js";

// Keep track of active viewers so we can clean them up / resize them.
const activeViewers = new Map();

export function showSTL(containerId, stlPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // If a viewer already exists in this container, dispose it first
  // (handles re-opening modals / re-rendering cards).
  if (activeViewers.has(containerId)) {
    const old = activeViewers.get(containerId);
    old.dispose();
    activeViewers.delete(containerId);
  }

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const indicator = document.createElement('div');
  indicator.className = 'drag-indicator';
  indicator.textContent = '👆 Drag to rotate';
  container.appendChild(indicator);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-1, -0.5, -1);
  scene.add(dirLight2);

  let mesh, controls, frameId;
  let disposed = false;

  const loader = new STLLoader();
  loader.load(
    stlPath,
    geometry => {
      if (disposed) return;

      // Center the geometry around its own bounding-box center
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      // Fit camera distance to the model size, regardless of source units
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;

      const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, metalness: 0.15, roughness: 0.6 });
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const fitDist = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
      camera.position.set(maxDim * 0.6, maxDim * 0.5, fitDist * 1.4);
      camera.near = maxDim / 100;
      camera.far = maxDim * 100;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.minDistance = maxDim * 0.3;
      controls.maxDistance = maxDim * 6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.update();

      let hasInteracted = false;
      controls.addEventListener('start', () => {
        if (!hasInteracted) {
          hasInteracted = true;
          indicator.style.opacity = '0';
          setTimeout(() => indicator.remove(), 300);
        }
      });

      function animate() {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    },
    undefined,
    err => {
      console.error('Failed to load STL:', stlPath, err);
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.6;font-size:0.85rem;">Could not load 3D model</div>';
    }
  );

  // Handle container resize (e.g. modal opening, window resize)
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  function dispose() {
    disposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    if (controls) controls.dispose();
    if (mesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    renderer.dispose();
  }

  activeViewers.set(containerId, { dispose });
}
