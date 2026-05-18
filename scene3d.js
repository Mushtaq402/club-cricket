/* AL-QAIM CC — Lightweight Three.js background */
function initScene3D() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  const point = new THREE.PointLight(0x00e5a0, 1.2, 40);
  point.position.set(4, 3, 6);
  scene.add(point);
  const point2 = new THREE.PointLight(0x00c8ff, 0.8, 40);
  point2.position.set(-5, -2, 4);
  scene.add(point2);

  const ballGeo = new THREE.SphereGeometry(0.55, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xc8102e,
    metalness: 0.35,
    roughness: 0.4,
    emissive: 0x1a0508,
    emissiveIntensity: 0.15
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.position.set(-2.2, 0.8, 0);
  scene.add(ball);

  const seamGeo = new THREE.TorusGeometry(0.56, 0.018, 8, 64);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.6, roughness: 0.3 });
  const seam = new THREE.Mesh(seamGeo, seamMat);
  seam.rotation.x = Math.PI / 2;
  ball.add(seam);

  const ringGeo = new THREE.TorusGeometry(2.8, 0.02, 8, 120);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.2;
  scene.add(ring);

  const particles = [];
  const particleGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const count = isMobile ? 40 : 90;
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0x00e5a0 : i % 3 === 1 ? 0x00c8ff : 0x7c5cfc,
      transparent: true,
      opacity: 0.5 + Math.random() * 0.4
    });
    const p = new THREE.Mesh(particleGeo, mat);
    p.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
    p.userData = { speed: 0.002 + Math.random() * 0.006, phase: Math.random() * Math.PI * 2 };
    scene.add(p);
    particles.push(p);
  }

  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY * 0.001; }, { passive: true });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize, { passive: true });

  let t0 = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const t = (now - t0) * 0.001;
    if (!prefersReduced) {
      ball.rotation.y = t * 0.45;
      ball.rotation.x = Math.sin(t * 0.3) * 0.2;
      ball.position.y = 0.8 + Math.sin(t * 0.7) * 0.35;
      ring.rotation.z = t * 0.12;
      ring.rotation.y = t * 0.08;
      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 0.5 - scrollY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      particles.forEach((p) => {
        p.position.y += Math.sin(t + p.userData.phase) * p.userData.speed;
        p.rotation.z += 0.01;
      });
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

if (document.readyState === 'complete') initScene3D();
else window.addEventListener('load', initScene3D);
