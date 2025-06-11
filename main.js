// --- Three.js Scene Setup ---
const container = document.getElementById('solar-system-canvas');
let width = container.offsetWidth;
let height = container.offsetHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.set(0, 60, 120);
camera.lookAt(0, 0, 0);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry(6, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFDB813 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// --- Background Stars ---
let starMaterial = null;
function addStars(numStars = 400) {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  for (let i = 0; i < numStars; i++) {
    const x = (Math.random() - 0.5) * 800;
    const y = (Math.random() - 0.5) * 800;
    const z = (Math.random() - 0.5) * 800;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2.0 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}
addStars();

// --- Planet Data ---
const PLANETS = [
  { name: 'Mercury', color: 0xb1b1b1, size: 0.7, distance: 10, speed: 1 },
  { name: 'Venus', color: 0xeccc9a, size: 1.2, distance: 14, speed: 0.8 },
  { name: 'Earth', color: 0x2a5cdd, size: 1.3, distance: 18, speed: 0.6 },
  { name: 'Mars', color: 0xb55327, size: 1.1, distance: 22, speed: 0.5 },
  { name: 'Jupiter', color: 0xd2b48c, size: 2.8, distance: 28, speed: 0.3 },
  { name: 'Saturn', color: 0xf7e7b6, size: 2.4, distance: 34, speed: 0.25 },
  { name: 'Uranus', color: 0x7fffd4, size: 2.0, distance: 40, speed: 0.18 },
  { name: 'Neptune', color: 0x4166f5, size: 1.9, distance: 46, speed: 0.15 },
];

const planets = [];
const planetSpeeds = {};

// --- Orbital Rings ---
const ringMaterials = [];
const ringMeshes = [];
PLANETS.forEach((planet) => {
  const ringGeometry = new THREE.RingGeometry(planet.distance - 0.05, planet.distance + 0.05, 128);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  ringMaterials.push(ringMaterial);
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2; // Lay flat in XZ plane
  scene.add(ring);
  ringMeshes.push(ring);
});

// --- Create Planets ---
const planetMeshes = [];
const planetLabels = [];
PLANETS.forEach((planet, idx) => {
  const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: planet.color });
  const mesh = new THREE.Mesh(geometry, material);
  // Initial position
  mesh.position.set(planet.distance, 0, 0);
  mesh.userData.planetName = planet.name; // For raycasting
  scene.add(mesh);
  planets.push({ mesh, ...planet, angle: Math.random() * Math.PI * 2 });
  planetSpeeds[planet.name] = planet.speed;
  planetMeshes.push(mesh);

  // --- Add planet name label as a sprite ---
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.strokeText(planet.name, 128, 32);
  ctx.fillStyle = '#fff';
  ctx.fillText(planet.name, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(planet.size * 3.5, planet.size * 1.1, 1);
  scene.add(sprite);
  planetLabels.push({ sprite, planetIdx: idx });
});

// --- Animation Loop ---
let isPaused = false;
const clock = new THREE.Clock();

// --- Raycaster for Hover Labels ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Create label element
const label = document.createElement('div');
label.className = 'planet-label';
label.style.position = 'fixed';
label.style.pointerEvents = 'none';
label.style.background = 'rgba(30,30,40,0.95)';
label.style.color = '#fff';
label.style.padding = '2px 8px';
label.style.borderRadius = '4px';
label.style.fontSize = '0.95em';
label.style.zIndex = '10';
label.style.display = 'none';
document.body.appendChild(label);

container.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});

function animate() {
  requestAnimationFrame(animate);
  if (!isPaused) {
    const delta = clock.getDelta();
    planets.forEach((planet, i) => {
      // Update angle based on speed
      planet.angle += delta * planetSpeeds[planet.name];
      // Orbit around the Sun
      planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
      planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
      // Self-rotation
      planet.mesh.rotation.y += 0.03;
      // Update label position
      if (planetLabels[i]) {
        planetLabels[i].sprite.position.set(
          planet.mesh.position.x,
          planet.mesh.position.y + planet.mesh.geometry.parameters.radius + 1.2,
          planet.mesh.position.z
        );
        planetLabels[i].sprite.material.depthTest = false;
      }
    });
  }

  // --- Raycasting for planet hover ---
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length > 0) {
    const planetName = intersects[0].object.userData.planetName;
    label.textContent = planetName;
    label.style.display = 'block';
    label.style.left = `${window.event.clientX + 12}px`;
    label.style.top = `${window.event.clientY - 8}px`;
  } else {
    label.style.display = 'none';
  }

  renderer.render(scene, camera);
}

animate();

// --- Speed Controls ---
PLANETS.forEach((planet) => {
  const slider = document.getElementById(`speed-${planet.name.toLowerCase()}`);
  if (slider) {
    slider.addEventListener('input', (e) => {
      planetSpeeds[planet.name] = parseFloat(e.target.value);
    });
  }
});

// --- Pause/Resume Button ---
const pauseBtn = document.getElementById('pause-resume');
pauseBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

// --- Responsive Resize ---
window.addEventListener('resize', () => {
  width = container.offsetWidth;
  height = container.offsetHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// --- Theme Toggle ---
const themeBtn = document.getElementById('toggle-theme');
let isLight = false;
function setTheme(light) {
  isLight = light;
  document.body.classList.toggle('light-theme', isLight);
  renderer.setClearColor(isLight ? 0xe0e7ef : 0x000000);
  // Update label style
  label.style.background = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(30,30,40,0.95)';
  label.style.color = isLight ? '#222' : '#fff';
  label.style.border = isLight ? '1px solid #ccc' : 'none';
  // Update ring colors and width
  ringMaterials.forEach((mat, i) => {
    mat.color.set(isLight ? 0x000000 : 0xffffff);
  });
  ringMeshes.forEach((ring, i) => {
    const planet = PLANETS[i];
    const width = isLight ? 0.1 : 0.4;
    const geo = new THREE.RingGeometry(planet.distance - width, planet.distance + width, 128);
    ring.geometry.dispose();
    ring.geometry = geo;
  });
  // Update planet and sun sizes
  const scale = isLight ? 1 : 1.7;
  planetMeshes.forEach((mesh, i) => {
    const planet = PLANETS[i];
    mesh.geometry.dispose();
    mesh.geometry = new THREE.SphereGeometry(planet.size * scale, 32, 32);
    // Update label scale
    if (planetLabels[i]) {
      planetLabels[i].sprite.scale.set(planet.size * scale * 3.5, planet.size * scale * 1.1, 1);
    }
  });
  sun.scale.set(scale, scale, scale);
}
themeBtn.addEventListener('click', () => setTheme(!isLight));

// --- Camera Movement/Zoom on Click ---
let cameraTarget = { x: 0, y: 60, z: 120 };
let cameraTween = null;
function moveCameraTo(target, lookAt = { x: 0, y: 0, z: 0 }) {
  if (cameraTween) cancelAnimationFrame(cameraTween);
  const start = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const end = target;
  const duration = 40; // frames
  let frame = 0;
  function animateMove() {
    frame++;
    const t = Math.min(frame / duration, 1);
    camera.position.x = start.x + (end.x - start.x) * t;
    camera.position.y = start.y + (end.y - start.y) * t;
    camera.position.z = start.z + (end.z - start.z) * t;
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    if (t < 1) {
      cameraTween = requestAnimationFrame(animateMove);
    } else {
      cameraTween = null;
    }
  }
  animateMove();
}
container.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length > 0) {
    // Move camera to planet
    const obj = intersects[0].object;
    const pos = obj.position;
    moveCameraTo({ x: pos.x, y: pos.y + 4, z: pos.z + 8 }, pos);
  } else {
    // Reset camera
    moveCameraTo({ x: 0, y: 60, z: 120 }, { x: 0, y: 0, z: 0 });
  }
});

// --- Star Size Slider ---
const starSizeSlider = document.getElementById('star-size-slider');
if (starSizeSlider) {
  starSizeSlider.addEventListener('input', (e) => {
    if (starMaterial) {
      starMaterial.size = parseFloat(e.target.value);
    }
  });
} 