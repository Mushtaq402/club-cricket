/* AL-QAIM CC — Three.js hero background */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed: ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureThree() {
    if (typeof THREE !== 'undefined') return true;
    const sources = [
      'vendor/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
      'https://unpkg.com/three@0.128.0/build/three.min.js'
    ];
    for (const src of sources) {
      try {
        await loadScript(src);
        if (typeof THREE !== 'undefined') return true;
      } catch { /* try next */ }
    }
    return false;
  }

  function initScene3D() {
    if (typeof THREE === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      canvas.classList.add('canvas-static-fallback');
      return;
    }

    const isMobile = window.innerWidth < 768;
    let renderer;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 9);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      scene.add(ambient);

      const key = new THREE.DirectionalLight(0x00e5a0, 1.1);
      key.position.set(5, 8, 6);
      scene.add(key);

      const fill = new THREE.PointLight(0x00c8ff, 1.4, 50);
      fill.position.set(-6, 2, 5);
      scene.add(fill);

      const rim = new THREE.PointLight(0x7c5cfc, 0.7, 40);
      rim.position.set(0, -4, 3);
      scene.add(rim);

      const ballGeo = new THREE.SphereGeometry(0.85, 48, 48);
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xc8102e,
        metalness: 0.45,
        roughness: 0.35,
        emissive: 0x4a0810,
        emissiveIntensity: 0.35
      });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(2.4, 0.5, 0);
      scene.add(ball);

      const seamGeo = new THREE.TorusGeometry(0.86, 0.022, 10, 80);
      const seam = new THREE.Mesh(
        seamGeo,
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.25 })
      );
      seam.rotation.x = Math.PI / 2;
      ball.add(seam);

      const ringGeo = new THREE.TorusGeometry(3.2, 0.035, 12, 140);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = Math.PI / 2.15;
      scene.add(ring);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.02, 8, 100),
        new THREE.MeshBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.3 })
      );
      ring2.rotation.x = Math.PI / 3;
      ring2.rotation.z = 0.4;
      scene.add(ring2);

      const particleGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const particles = [];
      const count = isMobile ? 50 : 110;
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0x00e5a0 : i % 3 === 1 ? 0x00c8ff : 0x7c5cfc,
          transparent: true,
          opacity: 0.55 + Math.random() * 0.4
        });
        const p = new THREE.Mesh(particleGeo, mat);
        p.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 10);
        p.userData = { speed: 0.003 + Math.random() * 0.008, phase: Math.random() * Math.PI * 2 };
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

      canvas.classList.add('canvas-ready');
      let t0 = performance.now();

      function animate(now) {
        requestAnimationFrame(animate);
        const t = (now - t0) * 0.001;
        ball.rotation.y = t * 0.5;
        ball.rotation.x = Math.sin(t * 0.35) * 0.15;
        ball.position.y = 0.5 + Math.sin(t * 0.75) * 0.4;
        ring.rotation.z = t * 0.14;
        ring2.rotation.y = -t * 0.1;
        camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 0.6 - scrollY - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
        particles.forEach((p) => {
          p.position.y += Math.sin(t * 1.2 + p.userData.phase) * p.userData.speed;
        });
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    } catch (err) {
      console.warn('AL-QAIM 3D scene failed:', err);
      canvas.classList.add('canvas-static-fallback');
      if (renderer) renderer.dispose();
    }
  }

  async function boot() {
    const ok = await ensureThree();
    if (!ok) {
      console.warn('Three.js could not load — using CSS fallback.');
      canvas.classList.add('canvas-static-fallback');
      return;
    }
    initScene3D();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
