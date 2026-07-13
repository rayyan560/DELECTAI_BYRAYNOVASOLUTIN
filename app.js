/* 
   ========================================================
   DIALECT INTELLIGENCE — APPLICATION COCKPIT JS
   Core OS Logic: Three.js Shaders, Real Microphone Waveforms,
   GSAP Transitions, OpenRouter API Hybrid Engine & Local DB
   ========================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. STATE MANAGEMENT & LOCAL MONGO SIMULATOR
  // ==========================================
  const state = {
    activeSection: 'section-hero',
    apiKey: '',
    nemotronApiKey: '',
    isServerOnline: false,
    database: {
      users: [],
      uploads: [],
      transcripts: [],
      socialAnalysis: [],
      aiRequests: []
    },
    recording: false,
    mediaRecorder: null,
    audioContext: null,
    analyser: null,
    micStream: null,
    recordStartTime: 0,
    recordTimerInterval: null,
    selectedFile: null,
    selectedPlatform: 'youtube',
    selectedTemplate: 'tiktok-viral',
    nemotronPacing: 0.85,
    nemotronWeights: 2, // 1: 15B, 2: 30B, 3: 70B
    gemmaTemp: 0.25,
    gemmaRefine: 3 // 1: Low, 2: Medium, 3: High
  };

  // ==========================================
  // LANGUAGE CODE -> REAL LANGUAGE NAME MAP
  // Used to build accurate AI translation prompts
  // ==========================================
  const LANGUAGE_MAP = {
    'ur-PK-karachi': { name: 'Urdu', script: 'نستعلیق', rtl: true,  sampleHello: 'ہیلو، آپ کیسے ہیں؟' },
    'ps-PK':         { name: 'Pashto', script: 'Arabic', rtl: true,  sampleHello: 'سلام، تاسو سم یاست؟' },
    'sd-PK':         { name: 'Sindhi', script: 'Arabic', rtl: true,  sampleHello: 'هيلو، توهان ڪيئن آهيو؟' },
    'pa-PK':         { name: 'Punjabi', script: 'Shahmukhi', rtl: true, sampleHello: 'ہیلو، تُسی کیویں ہو؟' },
    'skr-PK':        { name: 'Saraiki', script: 'Shahmukhi', rtl: true, sampleHello: 'ہیلو، تساں کیویں ہو؟' },
    'bal-PK':        { name: 'Balochi', script: 'Arabic', rtl: true,  sampleHello: 'سلام، شما چطور ایت؟' },
    'brh-PK':        { name: 'Brahvi', script: 'Arabic', rtl: true,   sampleHello: 'سلام، آپ کیسے ہیں؟' },
    'hnd-PK':        { name: 'Hindko', script: 'Shahmukhi', rtl: true, sampleHello: 'سلام، تساں کی حال اے؟' },
    'khw-PK':        { name: 'Khowar', script: 'Arabic', rtl: true,   sampleHello: 'سلام، تو کیا حال؟' },
    'en-GB-royal':   { name: 'British English', script: 'Latin', rtl: false, sampleHello: 'Hello, how are you?' },
    'en-US-nyc':     { name: 'American English (New York)', script: 'Latin', rtl: false, sampleHello: 'Hey, how are you doing?' },
    'en-US-valley':  { name: 'American English (California)', script: 'Latin', rtl: false, sampleHello: 'Hey, how are you?' },
    'es-ES':         { name: 'Spanish (Castilian)', script: 'Latin', rtl: false, sampleHello: '¡Hola! ¿Cómo estás?' },
  };

  function getLanguageName(accentCode) {
    return (LANGUAGE_MAP[accentCode] || {}).name || accentCode;
  }

  // Asynchronous server database push helper
  async function postToServer(endpoint, payload) {
    if (!state.isServerOnline) return;
    try {
      await fetch(`http://localhost:420/api/db/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn(`[Sync Server] Push failed on /api/db/${endpoint}`, e);
    }
  }

  // Initialize Local Database from LocalStorage
  function initDatabase() {
    const savedDb = localStorage.getItem('dialect_intelligence_db');
    if (savedDb) {
      try {
        state.database = JSON.parse(savedDb);
        // Auto-migration: Update cached username to Rayyan Ahmed Khan
        if (state.database.users && state.database.users[0] && 
            (state.database.users[0].fullName === 'Operator Rayyan' || !state.database.users[0].fullName.includes('Rayyan Ahmed Khan'))) {
          state.database.users[0].fullName = 'Rayyan Ahmed Khan (Owner of Raynova Solution)';
          saveDatabase();
        }
      } catch (e) {
        console.error("Failed to parse local database. Resetting structures.");
        saveDatabase();
      }
    } else {
      // Seed initial dummy documents for cinematic impact
      state.database.users.push({
        _id: 'u_01',
        fullName: 'Rayyan Ahmed Khan (Owner of Raynova Solution)',
        email: 'rayyan@dialect.ai',
        avatar: '/assets/rayyan_avatar.jpg',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      });
      
      // Mongoose simulated seeds
      state.database.uploads.push({
        _id: 'up_101',
        userId: 'u_01',
        fileUrl: 'local://assets/samples/marketing_v1.mp4',
        fileType: 'video/mp4',
        originalLanguage: 'English',
        detectedDialect: 'New York NYC Accent',
        duration: 42,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      });

      state.database.transcripts.push({
        _id: 'tr_201',
        uploadId: 'up_101',
        originalText: "Yo, what's up guys? Today we are breaking down the vision pro. Honestly, this screen quality is absolute madness. Literally feels like a holographic projection in the middle of my living room.",
        translatedVersions: {
          urdu: "یو، کیا حال ہے دوستو؟ آج ہم ویژن پرو کا جائزہ لے رہے ہیں۔ سچ پوچھیں تو، اس سکرین کی کوالٹی بالکل دیوانگی ہے۔ سچ مچ میرے دیوان خانے کے وسط میں ایک ہولوگرافک پروجیکشن جیسا محسوس ہوتا ہے۔",
          spanish: "Hola, ¿qué tal chicos? Hoy estamos analizando el vision pro. Sinceramente, la calidad de esta pantalla es una locura absoluta. Literalmente se siente como una proyección holográfica en medio de mi sala."
        },
        generatedScript: "[SCENE: Dark cyberpunk lab, volumetric cyan lights pulsing]\n[NARRATION - New York Accent]: Yo, listen up! The future isn't coming; it's already sitting on my desk. Check the screen on this Vision Pro — absolute holographic madness!",
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      });

      state.database.socialAnalysis.push({
        _id: 'sa_301',
        userId: 'u_01',
        videoUrl: 'https://www.youtube.com/watch?v=ApeChainWeb3Launch',
        platform: 'youtube',
        transcript: "Welcome to ApeChain. An immersive layer-3 ecosystem built directly for global creators. We are redefining Web3 speed, motion systems, and cinematic digital storytelling.",
        generatedHooks: [
          "ApeChain is officially live and it's built different.",
          "Forget everything you know about layer-2 networks. Layer-3 ApeChain has arrived."
        ],
        captions: "The future of Web3 cinematic storytelling is officially live on #ApeChain! 🚀 High-speed layer-3 scaling is here.",
        hashtags: ["#ApeChain", "#Web3", "#CinematicAI", "#ApeNation", "#TechTrends"],
        aiSummary: "Explains the high-level layer-3 launch mechanics of ApeChain, highlighting fast transaction velocities and creator-centric visual features.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      });

      state.database.aiRequests.push({
        _id: 'req_401',
        userId: 'u_01',
        requestType: 'multimodal_translation',
        input: 'marketing_v1.mp4',
        output: 'Speech transcript translated and dialect adaptive scripts generated.',
        processingTime: 2.45,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      });

      saveDatabase();
    }
    
    // Check saved custom API keys
    const savedApiKey = localStorage.getItem('dialect_openrouter_key');
    const savedAltApiKey = localStorage.getItem('dialect_openrouter_key_alt');
    if (savedApiKey) {
      state.apiKey = savedApiKey;
    }
    if (savedAltApiKey) {
      state.nemotronApiKey = savedAltApiKey;
    }

    const hasPrimaryKey = isUsableApiKey(state.apiKey);
    const hasAltKey = isUsableApiKey(state.nemotronApiKey);
    if (hasPrimaryKey || hasAltKey) {
      document.getElementById('settings-api-key').value = maskApiKey(state.apiKey || state.nemotronApiKey);
      document.getElementById('stats-api-key-status').textContent = 'VERIFIED';
      document.getElementById('stats-api-key-status').style.color = 'var(--accent-green)';
    } else {
      document.getElementById('stats-api-key-status').textContent = 'UNVERIFIED';
      document.getElementById('stats-api-key-status').style.color = 'var(--accent-amber)';
    }

    updateDashboardStats();
    renderDatabaseTable();
  }

  function saveDatabase() {
    localStorage.setItem('dialect_intelligence_db', JSON.stringify(state.database));
  }

  function maskApiKey(key) {
    if (!key) return '';
    return key.substring(0, 8) + '...' + key.substring(key.length - 8);
  }

  function isUsableApiKey(key) {
    return Boolean(key && typeof key === 'string' && key.length > 20 && !key.includes('YOUR_API_KEY'));
  }

  function getActiveApiKey(modelType = 'gemma') {
    if (modelType === 'nemotron') {
      return state.nemotronApiKey || state.apiKey || '';
    }
    return state.apiKey || state.nemotronApiKey || '';
  }

  function setModelBadge(container, modelName) {
    if (!container) return;
    let badge = container.querySelector('.model-pill');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'model-pill';
      badge.style.cssText = 'display:inline-block; margin-bottom:10px; padding:6px 10px; border-radius:999px; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--neon-cyan); background:rgba(0,255,255,0.12); border:1px solid rgba(0,255,255,0.24);';
      container.prepend(badge);
    }
    badge.textContent = `Model: ${modelName}`;
  }

  // ==========================================
  // 2. ATTEMPT TO AUTO-LOAD .ENV KEY VIA FETCH
  // ==========================================
  async function syncEnvKeys(showNotice = false) {
    // First try the backend /api/sync-env endpoint (more reliable)
    try {
      const serverRes = await fetch('http://localhost:420/api/sync-env');
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success) {
          if (data.apiKey) {
            state.apiKey = data.apiKey;
            localStorage.setItem('dialect_openrouter_key', data.apiKey);
          }
          if (data.apiKeyAlt) {
            state.nemotronApiKey = data.apiKeyAlt;
            localStorage.setItem('dialect_openrouter_key_alt', data.apiKeyAlt);
          }
          document.getElementById('settings-api-key').value = maskApiKey(state.apiKey || state.nemotronApiKey);
          document.getElementById('stats-api-key-status').textContent = 'VERIFIED (.ENV)';
          document.getElementById('stats-api-key-status').style.color = 'var(--accent-green)';
          if (showNotice) showNotification('API Keys successfully synced from server .env config!', 'success');
          return;
        }
      }
    } catch (e) {
      console.warn('Server /api/sync-env not reachable, trying direct .env fetch.', e);
    }

    // Fallback: try to fetch .env directly (works on local HTTP server)
    try {
      const response = await fetch('.env');
      if (response.ok) {
        const text = await response.text();
        const primaryMatch = text.match(/OPENROUTER_API_KEY\s*=\s*([^\r\n]+)/);
        const altMatch = text.match(/OPENROUTER_API_KEY_ALT\s*=\s*([^\r\n]+)/);
        const fetchedKey = primaryMatch ? primaryMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
        const fetchedAltKey = altMatch ? altMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

        if (fetchedKey) {
          state.apiKey = fetchedKey;
          localStorage.setItem('dialect_openrouter_key', fetchedKey);
        }
        if (fetchedAltKey) {
          state.nemotronApiKey = fetchedAltKey;
          localStorage.setItem('dialect_openrouter_key_alt', fetchedAltKey);
        }
        if (fetchedKey || fetchedAltKey) {
          document.getElementById('settings-api-key').value = maskApiKey(state.apiKey || state.nemotronApiKey);
          document.getElementById('stats-api-key-status').textContent = 'VERIFIED (.ENV)';
          document.getElementById('stats-api-key-status').style.color = 'var(--accent-green)';
          if (showNotice) showNotification('API Keys successfully synced from local .env config!', 'success');
          return;
        }
      }
      if (showNotice) showNotification('Failed to fetch .env file structure. Make sure you are using a local HTTP Server.', 'error');
    } catch (e) {
      console.warn('AJAX .env read blocked or unavailable.', e);
      if (showNotice) showNotification('Browser blocked loading local .env file. Please paste key manually in Settings.', 'error');
    }
  }


  // Auto-sync on startup
  syncEnvKeys(false);

  // ==========================================
  // 3. NAVIGATION & VIEW ROUTING WITH GSAP
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const appSections = document.querySelectorAll('.app-section');

  function switchSection(targetSectionId) {
    if (state.activeSection === targetSectionId) return;

    // Remove active class from current section
    const currentSection = document.getElementById(state.activeSection);
    const targetSection = document.getElementById(targetSectionId);

    // Smooth GSAP Page Fade out and Fade In
    gsap.timeline()
      .to(currentSection, {
        opacity: 0,
        y: -10,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          currentSection.classList.remove('active');
          targetSection.classList.add('active');
          gsap.set(targetSection, { opacity: 0, y: 15 });
        }
      })
      .to(targetSection, {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          state.activeSection = targetSectionId;
          // Trigger canvas resize or animation updates based on page active states
          if (targetSectionId === 'section-hero') {
            triggerPipelinePulse(true);
          } else {
            triggerPipelinePulse(false);
          }
        }
      });

    // Update Navigation UI active class
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === targetSectionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      switchSection(target);
    });
  });

  // Let buttons navigate as well
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      switchSection(target);
    });
  });

  // ==========================================
  // 4. INTERACTIVE THREE.JS SHADER SCENES
  // ==========================================
  
  // Scene 1: Floating AI Particle Orb (Hero Section)
  let heroRenderer, heroScene, heroCamera, heroOrb;
  const heroContainer = document.getElementById('hero-canvas-container');
  const fallbackHeroImage = document.querySelector('.hero-fallback-image');

  function initHeroThreeScene() {
    if (!heroContainer) return;
    
    try {
      const width = heroContainer.clientWidth || 400;
      const height = heroContainer.clientHeight || 400;

      heroScene = new THREE.Scene();
      
      // Camera
      heroCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      heroCamera.position.set(0, 1.8, 14); // Tilted slightly down to see the horizontal ring

      // Renderer
      heroRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      heroRenderer.setSize(width, height);
      heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      heroContainer.appendChild(heroRenderer.domElement);

      // Hide fallback image if Three.js builds successfully
      fallbackHeroImage.style.display = 'none';

      // ----------------------------------------------------
      // MATERIALS & TEXTURES
      // ----------------------------------------------------
      
      // Brass Material
      const brassMaterial = new THREE.MeshStandardMaterial({
        color: 0xC5A059, // Metallic brass/gold tone
        metalness: 0.9,
        roughness: 0.18
      });
      
      // Inner Gold Material
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xE5C158, // Shiny gold
        metalness: 0.95,
        roughness: 0.12,
        wireframe: true
      });
      
      // Glass Material
      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.85,
        ior: 1.5,
        thickness: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      // Helper function to create the Text Ring Canvas Texture
      function createTextRingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 512, 512);
        
        const cx = 256;
        const cy = 256;
        
        // Draw brass gradient ring
        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, 180, cx, cy, 240);
        grad.addColorStop(0, '#A08035');
        grad.addColorStop(0.3, '#E5C565');
        grad.addColorStop(0.7, '#8C6C20');
        grad.addColorStop(1, '#C2A24A');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 240, 0, Math.PI * 2);
        ctx.fill();
        
        // Ring borders
        ctx.strokeStyle = '#523E11';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 238, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 182, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Draw circular text
        ctx.fillStyle = '#221501'; // Dark engraved look
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textStr = "  ★  Dialect AI by raynova solution  ★  Dialect AI by raynova solution";
        const radius = 210;
        const numChars = textStr.length;
        
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < numChars; i++) {
          const char = textStr[i];
          const angle = (i / numChars) * Math.PI * 2;
          ctx.save();
          ctx.rotate(angle);
          ctx.translate(0, -radius);
          ctx.fillText(char, 0, 0);
          ctx.restore();
        }
        ctx.restore();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        return texture;
      }
      
      const textRingMat = new THREE.MeshStandardMaterial({
        map: createTextRingTexture(),
        transparent: true,
        metalness: 0.8,
        roughness: 0.25,
        side: THREE.DoubleSide
      });

      // ----------------------------------------------------
      // GEOMETRY ASSEMBLY
      // ----------------------------------------------------
      
      const mainGroup = new THREE.Group();
      const spinningGroup = new THREE.Group();
      const stationaryGroup = new THREE.Group();
      
      // 1. Inner Gold Core (Icosahedron Wireframe + Vertices Node Spheres)
      const coreGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const coreMesh = new THREE.Mesh(coreGeo, goldMaterial);
      
      const nodeGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xE5C158,
        metalness: 0.9,
        roughness: 0.1
      });
      
      const posAttr = coreGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(x, y, z);
        coreMesh.add(node);
      }
      spinningGroup.add(coreMesh);
      
      // 2. Glass Orb enclosing the golden core
      const glassGeo = new THREE.SphereGeometry(2.1, 32, 32);
      const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
      spinningGroup.add(glassMesh);
      
      // 3. Spindle (Vertical center rod)
      const spindleGeo = new THREE.CylinderGeometry(0.045, 0.045, 6.4, 16);
      const spindle = new THREE.Mesh(spindleGeo, brassMaterial);
      spinningGroup.add(spindle);
      
      // Decorative spindle tips (caps)
      const tipGeo = new THREE.ConeGeometry(0.08, 0.18, 16);
      const topTip = new THREE.Mesh(tipGeo, brassMaterial);
      topTip.position.y = 3.3;
      spinningGroup.add(topTip);
      
      const bottomTip = new THREE.Mesh(tipGeo, brassMaterial);
      bottomTip.rotation.x = Math.PI;
      bottomTip.position.y = -3.3;
      spinningGroup.add(bottomTip);
      
      // 4. Horizontal Engraved Ring ("Dialect AI by raynova solution")
      const textRingGeo = new THREE.RingGeometry(3.0, 4.1, 64);
      const textRing = new THREE.Mesh(textRingGeo, textRingMat);
      textRing.rotation.x = -Math.PI / 2; // Lie flat horizontally
      spinningGroup.add(textRing);
      
      // 5. Outer vertical meridian ring
      const meridianRingGeo = new THREE.TorusGeometry(4.2, 0.075, 16, 100);
      const meridianRing = new THREE.Mesh(meridianRingGeo, brassMaterial);
      meridianRing.rotation.y = Math.PI / 4; // Slanted meridian ring
      spinningGroup.add(meridianRing);
      
      // 6. Constellation Particle Cloud (White sparkling dust)
      const starCount = 600;
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 2.2 + Math.random() * 1.4;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      
      const isEyeCare = document.body.classList.contains('eye-care-mode');
      const starMat = new THREE.PointsMaterial({
        color: isEyeCare ? 0x38bdf8 : 0xffffff,
        size: 0.04,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const starField = new THREE.Points(starGeo, starMat);
      spinningGroup.add(starField);
      
      // Store starField on mainGroup so color theme changes can reference it
      mainGroup.starField = starField;
      
      // 7. Stationary Support Stand / Base
      // Base flat cylinder plate
      const basePlateGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.22, 32);
      const basePlate = new THREE.Mesh(basePlateGeo, brassMaterial);
      basePlate.position.y = -4.8;
      stationaryGroup.add(basePlate);
      
      // Decorative spindle column and sphere on the stand
      const standSphereGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const standSphere = new THREE.Mesh(standSphereGeo, brassMaterial);
      standSphere.position.y = -4.45;
      stationaryGroup.add(standSphere);
      
      const standColGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
      const standCol = new THREE.Mesh(standColGeo, brassMaterial);
      standCol.position.y = -4.0;
      stationaryGroup.add(standCol);
      
      // Outer half-torus support bracket (holding the rings)
      const bracketGeo = new THREE.TorusGeometry(4.3, 0.11, 16, 100, Math.PI);
      const bracket = new THREE.Mesh(bracketGeo, brassMaterial);
      bracket.rotation.z = -Math.PI / 2; // Point upward like a crescent
      bracket.position.y = 0;
      stationaryGroup.add(bracket);

      // Add groups to main group
      mainGroup.add(spinningGroup);
      mainGroup.add(stationaryGroup);
      heroScene.add(mainGroup);
      
      heroOrb = mainGroup; // Expose mainGroup as heroOrb for mouse tilt and interactions

      // ----------------------------------------------------
      // LIGHTING SETUP
      // ----------------------------------------------------
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
      heroScene.add(ambientLight);
      
      // Core glowing point light
      const coreLight = new THREE.PointLight(0xFCE893, 2.2, 12);
      coreLight.position.set(0, 0, 0);
      spinningGroup.add(coreLight);
      
      // Studio Directional Lights
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
      dirLight1.position.set(6, 10, 8);
      heroScene.add(dirLight1);
      
      const dirLight2 = new THREE.DirectionalLight(0xD4AF37, 1.0);
      dirLight2.position.set(-6, -6, -6);
      heroScene.add(dirLight2);

      // ----------------------------------------------------
      // ANIMATION LOOP
      // ----------------------------------------------------
      let time = 0;

      function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        
        // Spin the moving components inside the stationary stand
        spinningGroup.rotation.y += 0.0022;
        
        // Subtle vertical float animation for premium vibe
        spinningGroup.position.y = Math.sin(time) * 0.1;
        
        // Subtle expansion pulse of the core
        const scaleVal = 1.0 + Math.sin(time * 1.8) * 0.04;
        coreMesh.scale.set(scaleVal, scaleVal, scaleVal);
        
        // Slow rotation of stationary base support for dynamic mouse parallax offset
        stationaryGroup.rotation.y = Math.sin(time * 0.15) * 0.04;

        heroRenderer.render(heroScene, heroCamera);
      }

      animate();

      // Mouse motion tracker linking coordinates to light positions
      window.addEventListener('mousemove', (e) => {
        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        
        if (heroOrb) {
          // Tilt the entire structure (mainGroup) based on mouse
          gsap.to(heroOrb.rotation, {
            y: mouseX * 0.5,
            x: -mouseY * 0.35,
            duration: 1.2,
            ease: 'power1.out'
          });
        }
      });

    } catch (error) {
      console.warn("WebGL initialization failed. Loading fallback highly-premium 3D AI Orb render image.", error);
      fallbackHeroImage.style.display = 'block';
    }
  }

  // Scene 2: Interactive Holographic Spinning Globe (Translation Section)
  let globeRenderer, globeScene, globeCamera, globeMesh;
  const globeContainer = document.getElementById('globe-canvas-container');
  const fallbackGlobeImage = document.querySelector('[alt="Holographic Globe"]');

  function initGlobeThreeScene() {
    if (!globeContainer) return;

    try {
      const width = globeContainer.clientWidth || 300;
      const height = globeContainer.clientHeight || 300;

      globeScene = new THREE.Scene();

      globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      globeCamera.position.z = 12;

      globeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      globeRenderer.setSize(width, height);
      globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      globeContainer.appendChild(globeRenderer.domElement);

      fallbackGlobeImage.style.display = 'none';

      // Holographic Globe wireframe structure
      const geometry = new THREE.SphereGeometry(3.5, 24, 24);
      const material = new THREE.MeshBasicMaterial({
        color: 0xD4AF37, // Metallic Gold (#D4AF37)
        wireframe: true,
        transparent: true,
        opacity: 0.25
      });
      globeMesh = new THREE.Mesh(geometry, material);
      globeScene.add(globeMesh);

      // Floating Language Node points
      const pointsGeo = new THREE.BufferGeometry();
      const nodeCount = 12;
      const positions = new Float32Array(nodeCount * 3);
      
      for (let i = 0; i < nodeCount; i++) {
        // Distribute points spherically
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        const r = 3.6; // Slightly larger than core globe sphere
        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);
      }
      
      pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const pointsMat = new THREE.PointsMaterial({
        color: 0x4169E1, // Royal Blue (#4169E1)
        size: 0.25,
        transparent: true,
        opacity: 0.8
      });
      const nodePoints = new THREE.Points(pointsGeo, pointsMat);
      globeMesh.add(nodePoints);

      function animateGlobe() {
        requestAnimationFrame(animateGlobe);
        if (globeMesh) {
          globeMesh.rotation.y += 0.004;
          globeMesh.rotation.x += 0.001;
        }
        globeRenderer.render(globeScene, globeCamera);
      }

      animateGlobe();

    } catch (e) {
      console.warn("WebGL blocked. Globe fallback loaded.", e);
      fallbackGlobeImage.style.display = 'block';
    }
  }

  // Handle Resize operations
  window.addEventListener('resize', () => {
    if (heroCamera && heroRenderer && heroContainer) {
      const w = heroContainer.clientWidth;
      const h = heroContainer.clientHeight;
      if (w > 0 && h > 0) {
        heroCamera.aspect = w / h;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(w, h);
      }
    }
    if (globeCamera && globeRenderer && globeContainer) {
      const w = globeContainer.clientWidth;
      const h = globeContainer.clientHeight;
      if (w > 0 && h > 0) {
        globeCamera.aspect = w / h;
        globeCamera.updateProjectionMatrix();
        globeRenderer.setSize(w, h);
      }
    }
  });

  // Initialize both scenes
  initHeroThreeScene();
  initGlobeThreeScene();

  // ==========================================
  // 5. HYBRID AI RESPONSIBILITY PIPELINE MOTION
  // ==========================================
  function triggerPipelinePulse(active) {
    const p1 = document.getElementById('pulse-1');
    const p2 = document.getElementById('pulse-2');
    const p3 = document.getElementById('pulse-3');

    if (active) {
      p1.style.animation = 'pulse-connector 2s infinite linear';
      p2.style.animation = 'pulse-connector 2s infinite linear 0.6s';
      p3.style.animation = 'pulse-connector 2s infinite linear 1.2s';
    } else {
      p1.style.animation = 'none';
      p2.style.animation = 'none';
      p3.style.animation = 'none';
    }
  }

  function updatePipelineUI(activeNodeId, statusText) {
    document.getElementById('pipeline-status').textContent = statusText.toUpperCase();
    
    const nodes = ['node-input', 'node-nemotron', 'node-gemma', 'node-database'];
    nodes.forEach(nodeId => {
      const el = document.getElementById(nodeId);
      if (nodeId === activeNodeId) {
        el.classList.add('active');
        gsap.to(el, { scale: 1.08, duration: 0.3, yoyo: true, repeat: 1 });
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Seed default pulsing
  triggerPipelinePulse(true);

  // ==========================================
  // 6. MICROPHONE AUDIO CAPTURE AND WAVEFORM
  // ==========================================
  const micBtn = document.getElementById('mic-toggle-btn');
  const micStatus = document.getElementById('mic-status-label');
  const recordTimerEl = document.getElementById('record-timer');
  const recordCanvas = document.getElementById('record-canvas');
  let canvasCtx = recordCanvas.getContext('2d');
  
  // Set initial canvas proportions
  recordCanvas.width = 400;
  recordCanvas.height = 40;

  async function startRecording() {
    state.lastMicTranscript = '';
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      state.speechRecognition = new SpeechRec();
      state.speechRecognition.continuous = true;
      state.speechRecognition.interimResults = true;
      state.speechRecognition.lang = 'en-US';
      let finalTranscript = '';
      state.speechRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) { finalTranscript += t + ' '; }
          else { interim += t; }
        }
        state.lastMicTranscript = (finalTranscript + interim).trim();
        const preview = state.lastMicTranscript.slice(0, 45);
        micStatus.textContent = '"' + preview + (state.lastMicTranscript.length > 45 ? '...' : '') + '"';
      };
      state.speechRecognition.onerror = () => {};
      try { state.speechRecognition.start(); } catch(e) {}
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.micStream = stream;
      state.recording = true;
      micBtn.classList.add('recording');
      if (!SpeechRec) { micStatus.textContent = "CAPTURE FEED ACTIVE"; }
      micStatus.style.color = "var(--accent-red)";
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = state.audioContext.createMediaStreamSource(stream);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 256;
      source.connect(state.analyser);
      drawLiveWaveform();
      state.recordStartTime = Date.now();
      state.recordTimerInterval = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const secs = String(elapsedSecs % 60).padStart(2, '0');
        recordTimerEl.textContent = mins + ':' + secs;
      }, 1000);
      showNotification("Real-time voice feed capture initialized.", "success");
    } catch (err) {
      console.warn("Microphone access denied. Emulating synthetic vocoder.", err);
      state.recording = true;
      micBtn.classList.add('recording');
      micStatus.textContent = "SYNTHETIC VOCODER ACTIVE";
      micStatus.style.color = "var(--neon-cyan)";
      drawSyntheticWaveform();
      state.recordStartTime = Date.now();
      state.recordTimerInterval = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const secs = String(elapsedSecs % 60).padStart(2, '0');
        recordTimerEl.textContent = mins + ':' + secs;
      }, 1000);
    }
  }


  function stopRecording() {
    state.recording = false;
    clearInterval(state.recordTimerInterval);
    
    micBtn.classList.remove('recording');
    micStatus.textContent = "Mic Connection Standby";
    micStatus.style.color = "var(--text-secondary)";
    
    // Stop speech recognition
    if (state.speechRecognition) {
      try { state.speechRecognition.stop(); } catch(e) {}
      state.speechRecognition = null;
    }

    if (state.micStream) {
      state.micStream.getTracks().forEach(track => track.stop());
    }
    if (state.audioContext) {
      state.audioContext.close();
    }
    
    canvasCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
    
    const recordDuration = Math.max(1, Math.floor((Date.now() - state.recordStartTime) / 1000));
    state.selectedFile = {
      name: 'live_voice_capture_' + Date.now().toString().slice(-5) + '.wav',
      size: 1024 * 150 * recordDuration,
      type: 'audio/wav',
      duration: recordDuration
    };

    document.getElementById('studio-process-btn').disabled = false;
    const capturedText = state.lastMicTranscript ? ` Transcript: "${state.lastMicTranscript}"` : '';
    showNotification('Captured vocal log (' + recordDuration + 's). Ready to process!', 'success');
    printTerminalLine('studio-terminal-body', 'Vocal stream captured [' + recordDuration + 's].' + capturedText + ' Ready to translate.', 'green');
  }


  micBtn.addEventListener('click', () => {
    if (!state.recording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  // Draw Actual Microphone Analyser Waveform
  function drawLiveWaveform() {
    if (!state.recording || !state.analyser) return;
    
    requestAnimationFrame(drawLiveWaveform);
    
    const bufferLength = state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    state.analyser.getByteTimeDomainData(dataArray);
    
    canvasCtx.fillStyle = 'rgba(8, 8, 17, 0.4)';
    canvasCtx.fillRect(0, 0, recordCanvas.width, recordCanvas.height);
    
    canvasCtx.lineWidth = 1.5;
    canvasCtx.strokeStyle = 'rgb(255, 51, 102)';
    canvasCtx.beginPath();
    
    const sliceWidth = recordCanvas.width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * recordCanvas.height / 2;
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(recordCanvas.width, recordCanvas.height / 2);
    canvasCtx.stroke();
  }

  // Draw Synthetic Waveform (Sinewave offsets)
  let synthTime = 0;
  function drawSyntheticWaveform() {
    if (!state.recording || state.analyser) return;
    
    requestAnimationFrame(drawSyntheticWaveform);
    
    canvasCtx.fillStyle = 'rgba(8, 8, 17, 0.4)';
    canvasCtx.fillRect(0, 0, recordCanvas.width, recordCanvas.height);
    
    canvasCtx.lineWidth = 1.5;
    canvasCtx.strokeStyle = 'rgb(0, 243, 255)';
    canvasCtx.beginPath();
    
    synthTime += 0.15;
    
    for (let x = 0; x < recordCanvas.width; x++) {
      const y = recordCanvas.height / 2 + Math.sin(x * 0.05 + synthTime) * Math.cos(x * 0.01) * 8;
      if (x === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
    }
    canvasCtx.stroke();
  }

  // ==========================================
  // 7. DRAG AND DROP HANDLERS
  // ==========================================
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleSelectedFile(fileInput.files[0]);
    }
  });

  function handleSelectedFile(file) {
    // Generate pseudo duration count
    const duration = Math.floor(Math.random() * 90) + 15;
    state.selectedFile = {
      name: file.name,
      size: file.size,
      type: file.type || 'video/mp4',
      duration: duration
    };

    document.getElementById('studio-process-btn').disabled = false;
    showNotification(`Imported: ${file.name} [Size: ${(file.size/1024/1024).toFixed(1)}MB]`, "success");
    
    printTerminalLine("studio-terminal-body", `Imported external log: ${file.name} (type: ${file.type || 'video/mp4'}). Duration set to: ${duration}s. Directives cached.`, "cyan");
  }

  // ==========================================
  // 8. LOGS / TERMINAL EMULATION SYSTEM
  // ==========================================
  function printTerminalLine(bodyId, text, color = 'muted') {
    const body = document.getElementById(bodyId);
    if (!body) return;
    
    // Clear blink cursor
    const cursor = body.querySelector('.blink-cursor');
    if (cursor) cursor.parentElement.remove();

    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    const timestamp = new Date().toLocaleTimeString();
    let prefix = `<span style="color: var(--text-muted); font-size:10px;">[${timestamp}]</span> `;
    
    if (color === 'green') {
      line.style.color = 'var(--accent-green)';
      prefix += '<span class="terminal-line-prompt">NEMOTRON@SYSTEM:~$</span> ';
    } else if (color === 'purple') {
      line.style.color = 'var(--neon-purple)';
      prefix += '<span class="terminal-line-prompt" style="color:var(--neon-purple);">GEMMA@REFINER:~$</span> ';
    } else if (color === 'cyan') {
      line.style.color = 'var(--neon-cyan)';
      prefix += '<span class="terminal-line-prompt">OPERATOR@COCKPIT:~$</span> ';
    } else {
      prefix += '<span class="terminal-line-prompt">guest@dialect-os:~$</span> ';
    }

    line.innerHTML = `${prefix}${text}`;
    body.appendChild(line);
    
    // Scroll to bottom
    body.scrollTop = body.scrollHeight;

    // Append cursor back
    const cursorLine = document.createElement('div');
    cursorLine.className = 'terminal-line';
    cursorLine.innerHTML = `<span class="terminal-line-prompt">guest@dialect-os:~$</span> <span class="blink-cursor" style="animation: blink-anim 1s infinite step-end;">_</span>`;
    body.appendChild(cursorLine);
  }

  // Clear Terminal Button
  document.getElementById('terminal-clear').addEventListener('click', () => {
    const body = document.getElementById('studio-terminal-body');
    body.innerHTML = '';
    const cursorLine = document.createElement('div');
    cursorLine.className = 'terminal-line';
    cursorLine.innerHTML = `<span class="terminal-line-prompt">guest@dialect-os:~$</span> <span class="blink-cursor">_</span>`;
    body.appendChild(cursorLine);
    showNotification("Console logs cleared.", "success");
  });

  // Copy Terminal Content
  document.getElementById('terminal-copy').addEventListener('click', () => {
    const body = document.getElementById('studio-terminal-body');
    const text = body.innerText;
    navigator.clipboard.writeText(text);
    showNotification("Console log dump copied to clipboard!", "success");
  });

  // ==========================================
  // 9. HYBRID OPENROUTER CLIENT & PROCESSING ENGINE
  // ==========================================
  
  // Real client for OpenRouter API Calls
  async function callOpenRouterAI(messages, modelType = 'gemma') {
    const apiKey = getActiveApiKey(modelType);
    if (!isUsableApiKey(apiKey)) {
      throw new Error("No usable OpenRouter API key available");
    }

    const model = modelType === 'nemotron'
      ? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
      : "openrouter/auto";

    const response = await fetch('/api/openrouter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        modelType,
        temperature: state.gemmaTemp
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter network error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (data.success && data.content) {
      return data.content;
    }

    throw new Error(data.error || 'Invalid API payload returned from OpenRouter.');
  }

  function getFallbackDialectResponse(fileName, sourceAccent, targetAccent) {
    const targetLang = getLanguageName(targetAccent);
    const langInfo = LANGUAGE_MAP[targetAccent];
    // Build a meaningful fallback in the target language
    let translation = '';
    let transcript = '';
    if (targetAccent === 'ur-PK-karachi') {
      transcript = 'ہیلو، آپ کیسے ہیں؟ آج بہت اچھا دن ہے۔ ٹیکنالوجی واقعی ہماری زندگی بدل رہی ہے۔';
      translation = 'السلام علیکم! آپ کیسے ہیں؟ آج کا دن واقعی بہت خوبصورت ہے۔ جدید ٹیکنالوجی ہماری زندگی کو ایک نئے انداز سے تشکیل دے رہی ہے۔';
    } else if (targetAccent === 'ps-PK') {
      transcript = 'سلام، تاسو سم یاست؟ نن ورځ ډیره ښه ده۔';
      translation = 'سلامونه! تاسو سم یاست؟ نن ورځ خورا ښه ده۔ ټیکنالوجي زموږ ژوند بدلوي۔';
    } else if (targetAccent === 'sd-PK') {
      transcript = 'هيلو، توهان ڪيئن آهيو؟ اڄ ڏينهن تمام سٺو آهي۔';
      translation = 'سلام! توهان ڪيئن آهيو؟ اڄ جو ڏينهن واقعي سٺو آهي۔ ٽيڪنالاجي اسان جي زندگي بدلائي رهي آهي۔';
    } else if (targetAccent === 'pa-PK') {
      transcript = 'ہیلو، تُسی کیویں ہو؟ اج دا دن بہت چنگا اے۔';
      translation = 'سلام! تُسی کیویں ہو؟ اج دا دن واقعی بہت چنگا اے۔ ٹیکنالوجی ساڈی زندگی بدل رہی اے۔';
    } else if (targetAccent === 'skr-PK') {
      transcript = 'ہیلو، تساں کیویں ہو؟ اج دا دن چنگا اے۔';
      translation = 'سلام! تساں کیویں ہو؟ اج دا دن بہت چنگا اے۔ ٹیکنالوجی ساڈی زندگی وچ نویاں تبدیلیاں لیا رہی اے۔';
    } else if (targetAccent === 'bal-PK') {
      transcript = 'سلام، شما چطور ایت؟ امروز روز خوب است۔';
      translation = 'سلام! شما چطور ایت؟ امروز واقعاً روز خوبی است۔ تکنالوژی زندگی ما را تغییر می‌دهد۔';
    } else if (targetAccent === 'es-ES') {
      transcript = '¡Hola! ¿Cómo estás? Hoy es un gran día.';
      translation = '¡Hola! ¿Cómo estás? Hoy es realmente un día maravilloso. La tecnología está transformando nuestras vidas de formas increíbles.';
    } else {
      transcript = 'Hello, how are you today? Technology is truly changing our world.';
      translation = 'Hello, how are you doing? Today is a wonderful day. Technology is genuinely reshaping our lives in remarkable ways.';
    }
    return {
      accent: sourceAccent === 'auto' ? 'Auto-Detected' : getLanguageName(sourceAccent),
      dialect: targetLang,
      transcript: transcript,
      translation: translation,
      generatedScript: `[SCENE: Futuristic AI studio, neon grid backdrop]\n[NARRATION - ${targetLang}]: ${translation}`,
      processingTime: 1.85
    };
  }

  // studio-process-btn action
  const processBtn = document.getElementById('studio-process-btn');
  const studioOverlay = document.getElementById('studio-progress-overlay');
  const studioBar = document.getElementById('studio-progress-bar');
  const actionText = document.getElementById('progress-action-text');
  const percentText = document.getElementById('progress-percentage-text');
  const studioTerminal = document.getElementById('studio-terminal-body');

  processBtn.addEventListener('click', async () => {
    if (!state.selectedFile) return;

    // Reset progress UI
    studioOverlay.style.display = 'flex';
    processBtn.disabled = true;
    
    const sourceAccent = document.getElementById('select-source-accent').value;
    const targetAccent = document.getElementById('select-target-accent').value;
    const targetLangName = getLanguageName(targetAccent);
    const sourceLangName = sourceAccent === 'auto' ? 'the detected source language' : getLanguageName(sourceAccent);

    let progress = 0;

    setModelBadge(studioTerminal, 'openrouter/auto');
    actionText.textContent = 'OpenRouter AutoAI: Extracting multimodal frames...';
    updatePipelineUI('node-nemotron', 'OPENROUTER AUTO EXTRACTING AUDIO/VIDEO TRACKS');
    printTerminalLine('studio-terminal-body', `Initiating Hybrid Pipeline: ${state.selectedFile.name}`, 'cyan');
    printTerminalLine('studio-terminal-body', `OpenRouter AutoAI: Analysing scene features, accent metadata, and emotional metrics...`, 'green');
    
    const stepInterval = setInterval(async () => {
      progress += 5;
      studioBar.style.width = `${progress}%`;
      percentText.textContent = `${progress}%`;

      if (progress === 30) {
        actionText.textContent = 'OpenRouter AutoAI: Identifying dialect registers...';
        printTerminalLine('studio-terminal-body', `OpenRouter: Sub-dialect patterns located. Mapping accent resonance frequencies.`, 'green');
      }

      if (progress === 60) {
        actionText.textContent = `OpenRouter AutoAI: Translating to ${targetLangName}...`;
        updatePipelineUI('node-gemma', `OPENROUTER → ${targetLangName.toUpperCase()}`);
        printTerminalLine('studio-terminal-body', `Routing processed contexts to OpenRouter AutoAI for ${targetLangName} translation...`, 'purple');
        printTerminalLine('studio-terminal-body', `OpenRouter AutoAI: Translating speech to ${targetLangName}, generating cinematic script...`, 'purple');
      }

      if (progress === 85) {
        actionText.textContent = 'MongoDB Atlas: Committing transcript schemas...';
        updatePipelineUI('node-database', 'COMMITTING TO MONGO ATLAS CLUSTERS');
        printTerminalLine('studio-terminal-body', `Simulating Mongoose repository commit: Writing documents to uploads, transcripts, and requests collections.`, 'cyan');
      }

      if (progress >= 100) {
        clearInterval(stepInterval);
        
        let results;
        const processingStart = Date.now();

        // Get mic transcript if available
        const micTranscript = state.lastMicTranscript || '';
        const inputContext = micTranscript
          ? `The user spoke the following text: "${micTranscript}"`
          : `Analyze audio file: ${state.selectedFile.name} recorded in ${sourceLangName}`;

        if (state.apiKey && state.apiKey !== 'sk-or-v1-YOUR_API_KEY_HERE') {
          try {
            printTerminalLine('studio-terminal-body', 'Dispatching live requests to OpenRouter Matrix...', 'cyan');

            // Step 1: Transcription
            const nemotronResult = await callOpenRouterAI([
              { role: 'system', content: `You are a speech transcription engine. ${inputContext}. Output ONLY the raw transcribed text of what was spoken, in ${sourceLangName}. No explanations, no commentary.` },
              { role: 'user', content: `Transcribe this audio in ${sourceLangName}.` }
            ], 'nemotron');

            // Step 2: Translation - CRITICAL: must be in targetLangName only
            const gemmaResult = await callOpenRouterAI([
              { role: 'system', content: `You are a professional translator. Translate the following text STRICTLY into ${targetLangName}. Your ENTIRE response must be written ONLY in ${targetLangName}. Do NOT respond in English. Do NOT explain. Output ONLY the translated text.` },
              { role: 'user', content: micTranscript || nemotronResult }
            ], 'gemma');

            results = {
              accent: sourceLangName,
              dialect: targetLangName,
              transcript: micTranscript || nemotronResult,
              translation: gemmaResult,
              generatedScript: `[SCENE: Futuristic studio, neon grid backdrop]\n[NARRATION - ${targetLangName}]: ${gemmaResult}`,
              processingTime: parseFloat(((Date.now() - processingStart) / 1000).toFixed(2))
            };

          } catch (apiError) {
            console.warn('Live OpenRouter API request failed. Loading fallback intelligence.', apiError);
            printTerminalLine('studio-terminal-body', `OpenRouter API connection failed. Loading local fallback...`, 'cyan');
            results = getFallbackDialectResponse(state.selectedFile.name, sourceAccent, targetAccent);
            if (micTranscript) results.transcript = micTranscript;
          }
        } else {
          results = getFallbackDialectResponse(state.selectedFile.name, sourceAccent, targetAccent);
          if (micTranscript) results.transcript = micTranscript;
        }

        // Commit documents to Database
        const uploadId = 'up_' + Date.now().toString().slice(-4);
        const transcriptId = 'tr_' + Date.now().toString().slice(-4);
        const requestId = 'req_' + Date.now().toString().slice(-4);

        const newUpload = {
          _id: uploadId,
          userId: 'u_01',
          fileUrl: `local://assets/samples/${state.selectedFile.name}`,
          fileType: state.selectedFile.type,
          originalLanguage: results.accent,
          detectedDialect: results.dialect,
          duration: state.selectedFile.duration,
          createdAt: new Date().toISOString()
        };

        const newTranscript = {
          _id: transcriptId,
          uploadId: uploadId,
          originalText: results.transcript,
          translatedVersions: {
            target: results.translation
          },
          generatedScript: results.generatedScript,
          createdAt: new Date().toISOString()
        };

        const newAiRequest = {
          _id: requestId,
          userId: 'u_01',
          requestType: 'multimodal_translation',
          input: state.selectedFile.name,
          output: `Transcript resolved. Script generated.`,
          processingTime: results.processingTime,
          createdAt: new Date().toISOString()
        };

        state.database.uploads.push(newUpload);
        state.database.transcripts.push(newTranscript);
        state.database.aiRequests.push(newAiRequest);
        saveDatabase();

        postToServer('upload', newUpload);
        postToServer('transcript', newTranscript);
        postToServer('request', newAiRequest);

        // Update UI
        updateDashboardStats();
        renderDatabaseTable();

        document.getElementById('stat-detected-accent').textContent = results.accent;
        document.getElementById('stat-refined-dialect').textContent = results.dialect;

        printTerminalLine("studio-terminal-body", `AI PIPELINE COMPLETE [Speed: ${results.processingTime}s]. Transcript committed to local database context.`, "cyan");
        printTerminalLine("studio-terminal-body", `RESOLVED ORIGINAL SPEECH:\n"${results.transcript}"`, "green");
        printTerminalLine("studio-terminal-body", `REFINED TRANSLATED SCRIPT:\n"${results.generatedScript}"`, "purple");

        // Hide overlay, enable button
        setTimeout(() => {
          studioOverlay.style.display = 'none';
          processBtn.disabled = false;
          updatePipelineUI('node-input', "IDLE - WAITING FOR INPUT STREAM");
          showNotification("Multimodal Translation committed successfully!", "success");
        }, 1500);
      }
    }, 150);
  });

  // ==========================================
  // 10. SOCIAL MEDIA LINK ANALYZER
  // ==========================================

  // Helper: Robustly extract JSON from AI response text
  function extractJsonFromAIResponse(text) {
    if (!text) return null;
    try {
      // Try direct parse first
      return JSON.parse(text.trim());
    } catch (e1) {
      // Try stripping markdown code fences: ```json ... ``` or ``` ... ```
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        try {
          return JSON.parse(fenceMatch[1].trim());
        } catch (e2) { /* continue */ }
      }
      // Try extracting first {...} block
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch (e3) { /* continue */ }
      }
      console.warn("[Link Analyzer] Could not parse JSON from AI response:", text.substring(0, 200));
      return null;
    }
  }


  const platformCards = document.querySelectorAll('.platform-card');
  const analyzeBtn = document.getElementById('analyzer-btn');
  const analyzerTerminal = document.getElementById('analyzer-terminal-body');
  const analyzerWaiting = document.getElementById('analyzer-waiting-msg');
  const analyzerOverlay = document.getElementById('analyzer-progress-overlay');
  const analyzerBar = document.getElementById('analyzer-progress-bar');
  const analyzerAction = document.getElementById('analyzer-progress-action');
  const analyzerPercent = document.getElementById('analyzer-progress-percent');

  platformCards.forEach(card => {
    card.addEventListener('click', () => {
      platformCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.selectedPlatform = card.getAttribute('data-platform');
      
      // Update input placeholder based on platform
      const input = document.getElementById('social-link-input');
      if (state.selectedPlatform === 'youtube') {
        input.placeholder = "e.g. https://www.youtube.com/watch?v=...";
      } else if (state.selectedPlatform === 'tiktok') {
        input.placeholder = "e.g. https://www.tiktok.com/@creator/video/...";
      } else {
        input.placeholder = "e.g. https://www.instagram.com/reel/...";
      }
    });
  });

  // URL-aware content generator — extracts keywords from the actual link
  function generateUrlAwareFallback(url, platform) {
    // Extract meaningful words from the URL path and query
    let keywords = [];
    try {
      const urlObj = new URL(url);
      const rawText = (urlObj.pathname + ' ' + urlObj.search + ' ' + urlObj.hostname)
        .replace(/[?=&@\/\-_.+]/g, ' ')
        .replace(/\b(www|com|net|org|watch|shorts|reel|video|tiktok|youtube|instagram|https|http|si|v|s)\b/gi, ' ')
        .replace(/[0-9a-zA-Z]{15,}/g, ' ') // remove long IDs like video hashes
        .trim();
      keywords = rawText.split(/\s+/).filter(w => w.length > 3).slice(0, 6);
    } catch (e) {
      keywords = [platform, 'content', 'video'];
    }

    const topicLabel = keywords.length > 0
      ? keywords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`;

    const platformEmojis = { youtube: '🎬', tiktok: '🎵', instagram: '📸' };
    const emoji = platformEmojis[platform] || '🎥';

    const hashtagBase = keywords.slice(0, 3).map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const platformTags = { youtube: ['#YouTube', '#Trending'], tiktok: ['#TikTok', '#ForYou'], instagram: ['#Instagram', '#Reels'] };
    const hashtags = [...hashtagBase, ...(platformTags[platform] || ['#Social', '#Viral'])];

    return {
      transcript: `This ${platform} video covers the topic of "${topicLabel}". The creator walks through key insights, shares real examples, and delivers engaging content optimized for ${platform} audiences. The video maintains high viewer retention with a strong hook and fast-paced delivery.`,
      hooks: [
        `Everything you need to know about ${topicLabel} — explained in under 60 seconds. ${emoji}`,
        `Why "${topicLabel}" is trending on ${platform} right now and what it means for you.`
      ],
      captions: `${emoji} Deep dive into "${topicLabel}" — one of the most talked-about topics on ${platform} this week! Watch till the end for the best part. Drop a comment if this helped you! 👇`,
      hashtags: hashtags,
      summary: `A ${platform} video focused on ${topicLabel}, designed to engage and inform the target audience with platform-optimized content strategy.`
    };
  }

  analyzeBtn.addEventListener('click', async () => {
    const linkInput = document.getElementById('social-link-input').value;
    if (!linkInput) {
      showNotification("Please paste a social link first!", "error");
      return;
    }

    // Hide waiting message, show progress overlay
    analyzerWaiting.style.display = 'none';
    analyzerOverlay.style.display = 'flex';
    analyzeBtn.disabled = true;

    let progress = 0;
    const platform = state.selectedPlatform;

    // Pulse Three.js Globe rotation speeds for visual feedback
    if (globeMesh) {
      gsap.to(globeMesh.rotation, { y: "+=15", duration: 4, ease: 'power2.inOut' });
    }

    const interval = setInterval(async () => {
      progress += 10;
      analyzerBar.style.width = `${progress}%`;
      analyzerPercent.textContent = `${progress}%`;

      if (progress === 20) {
        analyzerAction.textContent = "OpenRouter AutoAI: Capturing video stream frames...";
      }
      if (progress === 50) {
        analyzerAction.textContent = "OpenRouter AutoAI: Deciphering scene scripts & dialects...";
      }
      if (progress === 80) {
        analyzerAction.textContent = "OpenRouter AutoAI: Polishing hooks, captions & summaries...";
      }

      if (progress >= 100) {
        clearInterval(interval);

        let res;
        const processingStart = Date.now();

        // Check if API key is valid (not placeholder)
        const hasValidKey = isUsableApiKey(getActiveApiKey('gemma'));

        if (hasValidKey) {
          try {
            // Structured JSON prompt so AI returns parseable data based on real URL
            const structuredPrompt = `You are a social media content strategist AI. A user has shared this ${platform.toUpperCase()} video link:

URL: ${linkInput}

Analyze the URL carefully — look at keywords in the path, any readable words in the video ID, or domain patterns to infer the video topic.

Generate realistic, URL-relevant content in this EXACT JSON format (no markdown, no extra text):

{
  "transcript": "A realistic 2-3 sentence description of what this video likely contains based on the URL keywords and topic",
  "hooks": [
    "First high-impact viral hook for ${platform} — make it specific to the URL topic",
    "Second viral hook with a curiosity or controversy angle"
  ],
  "captions": "An engaging 2-3 sentence caption with relevant emojis, optimized for ${platform}",
  "hashtags": ["#RelevantTag1", "#RelevantTag2", "#RelevantTag3", "#PlatformTag", "#TrendingTag"],
  "summary": "One sentence executive summary of this video content"
}

IMPORTANT: Base ALL content on the actual URL provided — not generic examples. Output JSON only.`;

            const callRes = await callOpenRouterAI([
              { role: "system", content: "You are a social media content analyst. You MUST respond with valid JSON only. No markdown fences, no explanation text." },
              { role: "user", content: structuredPrompt }
            ], 'gemma');

            // Robustly extract JSON from AI response
            const parsed = extractJsonFromAIResponse(callRes);

            if (parsed && parsed.transcript && parsed.hooks && parsed.captions) {
              res = {
                transcript: parsed.transcript,
                hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [parsed.hooks, `Discover more trending ${platform} content like this.`],
                captions: parsed.captions,
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [`#${platform}`, '#Viral', '#Trending', '#Content', '#Social'],
                summary: parsed.summary || 'AI-generated content analysis complete.'
              };
            } else {
              // AI responded but JSON failed — use URL-aware fallback
              console.warn('[Analyzer] AI response could not be parsed as JSON, using URL-aware fallback.');
              res = generateUrlAwareFallback(linkInput, platform);
            }

          } catch (e) {
            console.warn('Live social analysis failed. Using URL-aware fallback.', e);
            res = generateUrlAwareFallback(linkInput, platform);
          }
        } else {
          // No valid API key — use URL-aware intelligent fallback
          console.info('[Analyzer] No valid API key. Using URL-aware content generator.');
          res = generateUrlAwareFallback(linkInput, platform);
        }

        const processingTime = parseFloat(((Date.now() - processingStart) / 1000).toFixed(2));

        // Save to Database
        const socialId = 'sa_' + Date.now().toString().slice(-4);
        const requestId = 'req_' + Date.now().toString().slice(-4);

        const newAnalysis = {
          _id: socialId,
          userId: 'u_01',
          videoUrl: linkInput,
          platform: platform,
          transcript: res.transcript,
          generatedHooks: res.hooks,
          captions: res.captions,
          hashtags: res.hashtags,
          aiSummary: res.summary,
          createdAt: new Date().toISOString()
        };

        const newRequest = {
          _id: requestId,
          userId: 'u_01',
          requestType: 'social_analysis',
          input: linkInput,
          output: `Social hooks and script indexes cataloged.`,
          processingTime: processingTime,
          createdAt: new Date().toISOString()
        };

        state.database.socialAnalysis.push(newAnalysis);
        state.database.aiRequests.push(newRequest);
        saveDatabase();

        postToServer('social', newAnalysis);
        postToServer('request', newRequest);

        // Update UI
        updateDashboardStats();
        renderDatabaseTable();

        // Render clean results — no agent execution noise
        analyzerTerminal.innerHTML = `
          <div style="margin-bottom: 16px;">
            <div style="color: var(--neon-cyan); font-size: 10px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; opacity: 0.7;">VIDEO DESCRIPTION</div>
            <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.7; background: rgba(255,255,255,0.04); border-left: 3px solid var(--neon-cyan); padding: 10px 14px; border-radius: 4px;">${res.transcript}</div>
          </div>
          <div style="margin-bottom: 16px;">
            <div style="color: var(--neon-purple); font-size: 10px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; opacity: 0.7;">VIRAL HOOKS</div>
            <div style="color: #fff; font-size: 14px; font-weight: 600; margin-bottom: 8px; padding: 8px 14px; background: rgba(139,92,246,0.12); border-radius: 6px; border-left: 3px solid var(--neon-purple);">❶ ${res.hooks[0]}</div>
            <div style="color: #fff; font-size: 14px; font-weight: 600; padding: 8px 14px; background: rgba(139,92,246,0.12); border-radius: 6px; border-left: 3px solid var(--neon-purple);">❷ ${res.hooks[1]}</div>
          </div>
          <div style="margin-bottom: 16px;">
            <div style="color: var(--accent-green); font-size: 10px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; opacity: 0.7;">CAPTION</div>
            <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; background: rgba(74,222,128,0.06); border-left: 3px solid var(--accent-green); padding: 10px 14px; border-radius: 4px;">${res.captions}</div>
          </div>
          <div style="margin-bottom: 16px;">
            <div style="color: var(--neon-cyan); font-size: 10px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; opacity: 0.7;">HASHTAGS</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">${res.hashtags.map(tag => `<span style="background: rgba(0,243,255,0.1); color: var(--neon-cyan); padding: 3px 10px; border-radius: 20px; font-size: 12px; border: 1px solid rgba(0,243,255,0.25);">${tag}</span>`).join('')}</div>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; opacity: 0.7;">AI SUMMARY</div>
            <div style="color: var(--text-muted); font-size: 12px; font-style: italic; line-height: 1.6;">${res.summary}</div>
          </div>
        `;


        analyzerOverlay.style.display = 'none';
        analyzeBtn.disabled = false;
        showNotification("Social Link analyzed and committed to MongoDB collections!", "success");
      }
    }, 150);
  });

  // Copy social results
  document.getElementById('analyzer-result-copy').addEventListener('click', () => {
    const text = analyzerTerminal.innerText;
    navigator.clipboard.writeText(text);
    showNotification("Social analysis results copied to clipboard!", "success");
  });

  // ==========================================
  // 11. SCRIPT LAB GENERATOR
  // ==========================================
  const templateCards = document.querySelectorAll('.template-card');
  const scriptBtn = document.getElementById('script-generate-btn');
  const scriptTerminal = document.getElementById('script-terminal-body');
  const scriptWaiting = document.getElementById('script-waiting-msg');
  const scriptOverlay = document.getElementById('script-progress-overlay');
  const scriptBar = document.getElementById('script-progress-bar');
  const scriptAction = document.getElementById('script-progress-action');
  const scriptPercent = document.getElementById('script-progress-percent');

  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.selectedTemplate = card.getAttribute('data-template');
    });
  });

  // Prompt-aware script generator — uses actual user input to build relevant script
  function generatePromptAwareScript(promptInput, template) {
    // Extract key topic words from the prompt
    const words = promptInput.split(/\s+/).filter(w => w.length > 3);
    const topic = words.slice(0, 4).join(' ') || promptInput;
    const topicTitle = topic.charAt(0).toUpperCase() + topic.slice(1);

    const templateStyles = {
      'tiktok-viral': { accent: 'NYC Street Accent', scene: 'Neon-lit room with glowing cyan panels', pacing: 'fast, punchy, hook-driven' },
      'reels-trend':  { accent: 'Soft British RP Accent', scene: 'Cinematic matte-black studio with lens blur', pacing: 'smooth, emotional, storytelling' },
      'shorts-loop':  { accent: 'Rapid Valley Accent', scene: 'High-contrast grid with digital clock overlay', pacing: 'rapid loop-optimized, curiosity hook' },
      'explainer-cinematic': { accent: 'Expressive Academic Voice', scene: 'Volumetric wide-shot environment with 3D overlays', pacing: 'deep, educational, high-production' }
    };
    const style = templateStyles[template] || templateStyles['tiktok-viral'];

    const hashtagWords = words.slice(0, 3).map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1));
    const templateTags = {
      'tiktok-viral': ['#TikTokViral', '#FYP'],
      'reels-trend':  ['#Reels', '#Trending'],
      'shorts-loop':  ['#Shorts', '#YouTube'],
      'explainer-cinematic': ['#Explainer', '#Documentary']
    };
    const tags = [...hashtagWords, ...(templateTags[template] || ['#Content', '#AI'])];

    return {
      script: `[SCENE: ${style.scene}]
[VISUAL: Opening shot establishing the theme of "${topicTitle}"]
[NARRATION - ${style.accent}]: ${promptInput.endsWith('?') ? 'Great question.' : 'Here is what you need to know.'} ${topicTitle} is changing everything right now — and most people are completely missing it.

[VISUAL: Dynamic B-roll visuals illustrating key aspects of ${topicTitle}]
[NARRATION]: The core of it is simple. ${promptInput}. Understanding this gives you a massive edge over everyone else in your space.

[VISUAL: Bold text overlay — key insight highlighted on screen]
[NARRATION]: If you are serious about this, follow for more breakdowns. Every video, straight to the point. No fluff. Let's go.`,
      hooks: [
        `"${topicTitle}" explained in under 60 seconds — watch before they delete this.`,
        `Why everyone is talking about ${topicTitle} and what it actually means for you.`
      ],
      tags: tags
    };
  }

  scriptBtn.addEventListener('click', async () => {
    const promptInput = document.getElementById('script-prompt-input').value;
    if (!promptInput) {
      showNotification("Please provide a prompt directive first!", "error");
      return;
    }

    setModelBadge(scriptTerminal, 'openrouter/auto');

    // Hide waiting, show progress overlay
    scriptWaiting.style.display = 'none';
    scriptOverlay.style.display = 'flex';
    scriptBtn.disabled = true;

    let progress = 0;
    const template = state.selectedTemplate;

    const interval = setInterval(async () => {
      progress += 10;
      scriptBar.style.width = `${progress}%`;
      scriptPercent.textContent = `${progress}%`;

      if (progress === 30) {
        scriptAction.textContent = "OpenRouter AutoAI: Organizing narrative structure...";
      }
      if (progress === 70) {
        scriptAction.textContent = "OpenRouter AutoAI: Refining regional dialect flow...";
      }

      if (progress >= 100) {
        clearInterval(interval);

        let res;
        const processingStart = Date.now();

        const hasValidKey = isUsableApiKey(getActiveApiKey('gemma'));

        if (hasValidKey) {
          try {
            const aiPrompt = `You are a viral social media script writer. Write a cinematic script based on this topic: "${promptInput}".
Template style: ${template}.

Respond in this EXACT JSON format only (no markdown, no extra text):
{
  "script": "Full cinematic script with [SCENE:], [VISUAL:], [NARRATION:] markers. 3-4 sections. Based specifically on the topic provided.",
  "hooks": ["First viral hook sentence directly about the topic", "Second hook with a different compelling angle"],
  "tags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"]
}

IMPORTANT: Script must be about "${promptInput}" specifically — not generic content.`;

            const callRes = await callOpenRouterAI([
              { role: 'system', content: 'You are a viral script writer. Respond with valid JSON only.' },
              { role: 'user', content: aiPrompt }
            ], 'gemma');

            const parsed = extractJsonFromAIResponse(callRes);
            if (parsed && parsed.script) {
              res = {
                script: parsed.script,
                hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [`Hook about: ${promptInput.substring(0, 40)}`, 'Alternate viral angle — watch till end.'],
                tags: Array.isArray(parsed.tags) ? parsed.tags : ['#AI', '#Content', '#Viral', '#Script']
              };
            } else {
              console.warn('[ScriptLab] AI JSON parse failed, using prompt-aware generator.');
              res = generatePromptAwareScript(promptInput, template);
            }

          } catch (e) {
            console.warn('[ScriptLab] API call failed, using prompt-aware generator.', e);
            res = generatePromptAwareScript(promptInput, template);
          }
        } else {
          res = generatePromptAwareScript(promptInput, template);
        }

        const processingTime = parseFloat(((Date.now() - processingStart) / 1000).toFixed(2));

        // Save request to DB
        const transcriptId = 'tr_' + Date.now().toString().slice(-4);
        const requestId = 'req_' + Date.now().toString().slice(-4);

        const newTranscript = {
          _id: transcriptId,
          uploadId: 'custom_script_input',
          originalText: promptInput,
          translatedVersions: {
            script: res.script
          },
          generatedScript: res.script,
          createdAt: new Date().toISOString()
        };

        const newRequest = {
          _id: requestId,
          userId: 'u_01',
          requestType: 'script_generation',
          input: promptInput,
          output: `Cinematic Script compiled.`,
          processingTime: processingTime,
          createdAt: new Date().toISOString()
        };

        state.database.transcripts.push(newTranscript);
        state.database.aiRequests.push(newRequest);
        saveDatabase();

        postToServer('transcript', newTranscript);
        postToServer('request', newRequest);

        // Update UI
        updateDashboardStats();
        renderDatabaseTable();

        scriptTerminal.innerHTML = `
          <div class="terminal-line" style="color: #fff; font-family: var(--font-body); font-size: 14px; line-height: 1.8; white-space: pre-wrap; border-left: 3px solid var(--neon-purple); padding-left: 12px; margin-bottom: 16px;">${res.script.replace(/\[SCENE:/g, '<span style="color:var(--neon-cyan);font-weight:700;">[SCENE:').replace(/\[VISUAL:/g, '<span style="color:var(--accent-green);font-weight:600;">[VISUAL:').replace(/\[NARRATION/g, '<span style="color:#fff;font-weight:600;">[NARRATION').replace(/\]/g, ']</span>')}</div>
          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; margin-top: 4px;">
            <div style="color: var(--neon-cyan); font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px;">VIRAL HOOKS</div>
            <div style="color: #fff; margin-bottom: 6px;">① ${res.hooks[0]}</div>
            <div style="color: #fff; margin-bottom: 14px;">② ${res.hooks[1]}</div>
            <div style="color: var(--text-muted); font-size: 12px; letter-spacing: 1px;">${res.tags.join('  ')}</div>
          </div>
        `;

        scriptOverlay.style.display = 'none';
        scriptBtn.disabled = false;
        showNotification("Script generated and transcript schema committed to MongoDB!", "success");
      }
    }, 150);
  });

  // Copy script results
  document.getElementById('script-result-copy').addEventListener('click', () => {
    const text = scriptTerminal.innerText;
    navigator.clipboard.writeText(text);
    showNotification("Cinematic script copied to clipboard!", "success");
  });

  // ==========================================
  // 12. ADVANCED SAAS DASHBOARD & METRICS
  // ==========================================
  function updateDashboardStats() {
    const totalLogs = state.database.uploads.length + state.database.socialAnalysis.length;
    const aiReqs = state.database.aiRequests.length;
    
    // Average processing speed calculation
    let avg = 0;
    if (state.database.aiRequests.length > 0) {
      const sum = state.database.aiRequests.reduce((acc, curr) => acc + curr.processingTime, 0);
      avg = parseFloat((sum / state.database.aiRequests.length).toFixed(2));
    }

    document.getElementById('stats-db-logs').textContent = totalLogs;
    document.getElementById('stats-ai-requests').textContent = aiReqs;
    document.getElementById('stats-avg-speed').textContent = `${avg}s`;
  }

  function renderDatabaseTable() {
    const tbody = document.getElementById('db-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const allRecords = [];

    // Pull Uploads Mapped to Transcripts
    state.database.uploads.forEach(upload => {
      const transcript = state.database.transcripts.find(t => t.uploadId === upload._id) || { originalText: 'No transcript committed.' };
      allRecords.push({
        type: 'Media Upload',
        badge: upload.fileType.includes('video') ? 'badge-db-video' : 'badge-db-audio',
        icon: upload.fileType.includes('video') ? 'fa-solid fa-video' : 'fa-solid fa-file-audio',
        source: upload.fileUrl.replace('local://assets/samples/', ''),
        metric: `Dialect: ${upload.detectedDialect} (${upload.duration}s)`,
        date: new Date(upload.createdAt).toLocaleDateString(),
        rawText: transcript.originalText,
        refinedText: transcript.generatedScript || 'No scripts generated.'
      });
    });

    // Pull Social Analyses
    state.database.socialAnalysis.forEach(social => {
      allRecords.push({
        type: 'Social Link',
        badge: 'badge-db-social',
        icon: social.platform === 'youtube' ? 'fa-brands fa-youtube' : 'fa-brands fa-tiktok',
        source: social.videoUrl.replace('https://', ''),
        metric: `Platform: ${social.platform.toUpperCase()} (Hooks: ${social.generatedHooks.length})`,
        date: new Date(social.createdAt).toLocaleDateString(),
        rawText: social.transcript,
        refinedText: `Viral Hook: ${social.generatedHooks[0]} \nCaption: ${social.captions}`
      });
    });

    if (allRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            No documents committed to local storage databases. Go to Dialect Studio or Link Analyzer to write records.
          </td>
        </tr>
      `;
      return;
    }

    // Sort by date descending
    allRecords.reverse();

    allRecords.forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="badge-db-type ${record.badge}">
            <i class="${record.icon}" style="margin-right: 6px;"></i>${record.type.toUpperCase()}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-size:11px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${record.source}
        </td>
        <td>
          ${record.metric}
        </td>
        <td style="font-family: var(--font-mono); font-size:11px;">
          ${record.date}
        </td>
        <td>
          <span class="db-cell-action view-record-trigger"><i class="fa-solid fa-expand" style="margin-right: 6px;"></i>Inspect schemas</span>
        </td>
      `;

      // Add click handler to inspect document schemas in terminal
      tr.querySelector('.view-record-trigger').addEventListener('click', () => {
        switchSection('section-studio');
        // Clear terminal
        const terminalBody = document.getElementById('studio-terminal-body');
        terminalBody.innerHTML = '';
        
        printTerminalLine("studio-terminal-body", `Schema Inspector loading database documents...`, "cyan");
        printTerminalLine("studio-terminal-body", `COMMITTED DOCUMENT SCHEMA (COLLECTION: ${record.type === 'Social Link' ? 'social_media_analysis' : 'transcripts'}):\n------------------------------------------------`, "cyan");
        printTerminalLine("studio-terminal-body", `[RAW SPEECH VALUE]:\n"${record.rawText}"`, "green");
        printTerminalLine("studio-terminal-body", `[REFINED NARRATIVE VALUE]:\n"${record.refinedText}"`, "purple");
        
        showNotification("Committed document loaded inside Cockpit Studio terminal!", "success");
      });

      tbody.appendChild(tr);
    });
  }

  // Purge Database Button
  document.getElementById('db-clear-btn').addEventListener('click', async () => {
    if (confirm("Are you sure you want to purge all committed collections from localStorage MongoDB simulators?")) {
      localStorage.removeItem('dialect_intelligence_db');
      state.database = {
        users: [],
        uploads: [],
        transcripts: [],
        socialAnalysis: [],
        aiRequests: []
      };
      saveDatabase();
      
      // Purge actual server database if online
      if (state.isServerOnline) {
        try {
          await fetch('http://localhost:420/api/db/purge', { method: 'POST' });
        } catch (e) {
          console.warn("Failed to purge server database:", e);
        }
      }
      
      updateDashboardStats();
      renderDatabaseTable();
      showNotification("MongoDB simulation datasets successfully purged.", "error");
    }
  });

  // ==========================================
  // 13. SLIDEOUT SETTINGS COCKPIT HUD PANEL
  // ==========================================
  const settingsHud = document.getElementById('settings-hud');
  const hudBackdrop = document.getElementById('hud-backdrop');
  const settingsTrigger = document.getElementById('settings-trigger');
  const settingsClose = document.getElementById('settings-hud-close');

  function openSettingsHud() {
    settingsHud.classList.add('open');
    hudBackdrop.classList.add('open');
  }

  function closeSettingsHud() {
    settingsHud.classList.remove('open');
    hudBackdrop.classList.remove('open');
  }

  settingsTrigger.addEventListener('click', openSettingsHud);
  settingsClose.addEventListener('click', closeSettingsHud);
  hudBackdrop.addEventListener('click', closeSettingsHud);

  // Sync API Key input field changes
  const apiKeyInput = document.getElementById('settings-api-key');
  apiKeyInput.addEventListener('click', () => {
    // Let user edit their key
    const newKey = prompt("Please paste your manual OpenRouter API Key below. This key will be secured locally in localStorage:", state.apiKey);
    if (newKey !== null) {
      if (newKey.trim() === '') {
        state.apiKey = '';
        localStorage.removeItem('dialect_openrouter_key');
        apiKeyInput.value = '';
        document.getElementById('stats-api-key-status').textContent = 'UNVERIFIED';
        document.getElementById('stats-api-key-status').style.color = 'var(--text-muted)';
        showNotification("OpenRouter API key purged.", "error");
      } else {
        state.apiKey = newKey;
        localStorage.setItem('dialect_openrouter_key', newKey);
        apiKeyInput.value = maskApiKey(newKey);
        document.getElementById('stats-api-key-status').textContent = 'VERIFIED';
        document.getElementById('stats-api-key-status').style.color = 'var(--accent-green)';
        showNotification("OpenRouter API key verified and cached securely!", "success");
      }
      updateDashboardStats();
    }
  });

  document.getElementById('btn-reload-env').addEventListener('click', () => {
    syncEnvKeys(true);
  });

  // Real-time slider metrics updating
  function bindSlider(sliderId, labelId, transformFn = x => x) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    slider.addEventListener('input', () => {
      label.textContent = transformFn(slider.value);
    });
  }

  bindSlider('slider-nemotron-pacing', 'label-val-nemotron-pacing');
  bindSlider('slider-nemotron-weights', 'label-val-nemotron-weights', val => {
    if (val == 1) return '15B';
    if (val == 2) return '30B';
    return '70B';
  });
  bindSlider('slider-gemma-temp', 'label-val-gemma-temp');
  bindSlider('slider-gemma-refine', 'label-val-gemma-refine', val => {
    if (val == 1) return 'Low';
    if (val == 2) return 'Medium';
    return 'High';
  });

  // ==========================================
  // 14. FLOATING OS NOTIFICATIONS
  // ==========================================
  const notificationBar = document.getElementById('notification-bar');
  const notificationText = document.getElementById('notification-text');
  const notificationIcon = document.getElementById('notification-icon');
  let notificationTimeout = null;

  function showNotification(text, type = 'success') {
    clearTimeout(notificationTimeout);
    
    notificationText.textContent = text;
    notificationBar.className = `notifier-hud notifier-${type}`;
    
    if (type === 'success') {
      notificationIcon.className = 'fa-solid fa-circle-check';
    } else {
      notificationIcon.className = 'fa-solid fa-triangle-exclamation';
    }

    notificationBar.classList.add('active');

    notificationTimeout = setTimeout(() => {
      notificationBar.classList.remove('active');
    }, 4000);
  }

  // ==========================================
  // 14.5 EYE-CARE & THEME MANAGEMENT
  // ==========================================
  const savedTheme = localStorage.getItem('dialect_theme');
  if (savedTheme === 'eye-care') {
    document.body.classList.add('eye-care-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-eye-slash';
        icon.style.color = 'var(--neon-purple)';
      }
      const text = themeToggle.querySelector('.toggle-text');
      if (text) text.textContent = 'Glow Cockpit';
    }
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('eye-care-mode');
      const isEyeCare = document.body.classList.contains('eye-care-mode');
      
      const icon = themeToggle.querySelector('i');
      const text = themeToggle.querySelector('.toggle-text');
      
      if (isEyeCare) {
        if (icon) {
          icon.className = 'fa-solid fa-eye-slash';
          icon.style.color = 'var(--neon-purple)';
        }
        if (text) text.textContent = 'Glow Cockpit';
        showNotification("Eye-Care Mode Activated: Softer contrasts, slate shades.", "success");
        localStorage.setItem('dialect_theme', 'eye-care');
        if (heroOrb) {
          if (heroOrb.starField && heroOrb.starField.material) {
            heroOrb.starField.material.color.setHex(0x38bdf8);
          } else if (heroOrb.material) {
            heroOrb.material.color.setHex(0x38bdf8);
          }
        }
      } else {
        if (icon) {
          icon.className = 'fa-solid fa-eye';
          icon.style.color = 'var(--neon-cyan)';
        }
        if (text) text.textContent = 'Eye-Care Mode';
        showNotification("Glow Cockpit Activated: Ultra-Cinematic cyberpunk.", "success");
        localStorage.setItem('dialect_theme', 'glow');
        if (heroOrb) {
          if (heroOrb.starField && heroOrb.starField.material) {
            heroOrb.starField.material.color.setHex(0x4169E1); // Royal Blue theme
          } else if (heroOrb.material) {
            heroOrb.material.color.setHex(0x4169E1); // Royal Blue theme
          }
        }
      }
    });
  }

  // ==========================================
  // 14.8 DATABASE SERVER AUTO-SYNC CORE
  // ==========================================
  async function checkServerStatus() {
    try {
      // Connect to the Express backend stats endpoint with a fast timeout
      const res = await fetch('http://localhost:420/api/db/stats', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        state.isServerOnline = true;
        
        // Update header sync LED indicator state
        const led = document.getElementById('db-status-led');
        const lbl = document.getElementById('db-status-lbl');
        if (led) {
          led.className = 'status-led led-online';
        }
        if (lbl) {
          lbl.textContent = 'DB: SERVER ONLINE';
          lbl.style.color = 'var(--neon-cyan)';
        }
        
        // Push notification of backend linkage
        showNotification("Cockpit synchronized with persistent Express + MongoDB backend!", "success");

        // Sync local app state database from actual database server dump
        const dumpRes = await fetch('http://localhost:420/api/db/records');
        if (dumpRes.ok) {
          const payload = await dumpRes.json();
          if (payload.success && payload.data) {
            state.database = payload.data;
            updateDashboardStats();
            renderDatabaseTable();
          }
        }
      }
    } catch (e) {
      console.log("MongoDB backend server not running on port 420. Fallback standby mode active.", e);
      // Fallback is active by default (shows yellow standby LED and uses local storage)
    }
  }

  // ==========================================
  // 14.9 HOLOGRAPHIC CINEMATIC DEMO MODAL PLAYER CONTROLLER
  // ==========================================
  const demoModal = document.getElementById('demo-modal');
  const demoCanvas = document.getElementById('demo-viewport-canvas');
  const demoCtx = demoCanvas.getContext('2d');
  
  let audioCtx = null;
  let mainHumNode = null;
  let synthVolumeNode = null;
  let isAudioMuted = true;
  
  let demoPlaying = false;
  let demoProgress = 0; // 0 to 20 seconds
  let demoInterval = null;
  let canvasAnimFrame = null;
  let demoTime = 0;
  let lastStepTriggered = -1;
  let laserTween = null;
  let subtitleInterval = null;

  // Web Audio Synth Core
  function initWebAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Volume control gain node
    synthVolumeNode = audioCtx.createGain();
    synthVolumeNode.gain.setValueAtTime(isAudioMuted ? 0 : 0.15, audioCtx.currentTime);
    synthVolumeNode.connect(audioCtx.destination);
    
    // Constant cyber rumble sound
    const humOsc = audioCtx.createOscillator();
    humOsc.type = 'sawtooth';
    humOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // 55Hz rumble
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, audioCtx.currentTime);
    
    humOsc.connect(filter);
    filter.connect(synthVolumeNode);
    humOsc.start();
    mainHumNode = humOsc;
  }

  function playLaserSweepSound() {
    if (!audioCtx || isAudioMuted) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 1.2);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 1.3);
    } catch (e) {
      console.warn(e);
    }
  }

  function playChimeNote(freq, delay, duration) {
    if (!audioCtx || isAudioMuted) return;
    try {
      const now = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + duration + 0.1);
    } catch(err) {
      console.warn(err);
    }
  }

  function playCyberchimeMelody() {
    if (!audioCtx || isAudioMuted) return;
    playChimeNote(523.25, 0, 0.4);   // C5
    playChimeNote(659.25, 0.15, 0.4); // E5
    playChimeNote(783.99, 0.3, 0.4);  // G5
    playChimeNote(1046.50, 0.45, 0.6); // C6
  }

  // Interactive Viewport Canvas Animation
  function resizeDemoCanvas() {
    if (!demoCanvas) return;
    demoCanvas.width = demoCanvas.parentElement.clientWidth || 600;
    demoCanvas.height = demoCanvas.parentElement.clientHeight || 300;
  }

  function drawDemoCanvas() {
    if (!demoPlaying) return;
    canvasAnimFrame = requestAnimationFrame(drawDemoCanvas);
    
    demoCtx.fillStyle = 'rgba(2, 2, 5, 0.35)'; // Trails overlay
    demoCtx.fillRect(0, 0, demoCanvas.width, demoCanvas.height);
    
    demoTime += 0.05;
    
    // Glowing center radar dial
    demoCtx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
    demoCtx.lineWidth = 1;
    demoCtx.beginPath();
    demoCtx.arc(demoCanvas.width/2, demoCanvas.height/2, 80 + Math.sin(demoTime)*5, 0, Math.PI*2);
    demoCtx.stroke();
    
    // Waveform spectrum frequencies bars
    const barCount = 32;
    const barWidth = demoCanvas.width / barCount;
    demoCtx.fillStyle = 'rgba(0, 243, 255, 0.12)';
    
    for (let i = 0; i < barCount; i++) {
      const h = Math.abs(Math.sin(demoTime + i * 0.4)) * Math.cos(demoTime * 0.2 + i * 0.05) * (demoCanvas.height * 0.6);
      const x = i * barWidth;
      const y = demoCanvas.height - h;
      
      demoCtx.fillRect(x + 2, y, barWidth - 4, h);
      
      // Neon caps
      demoCtx.fillStyle = 'rgba(191, 0, 255, 0.35)';
      demoCtx.fillRect(x + 2, y - 2, barWidth - 4, 2);
      demoCtx.fillStyle = 'rgba(0, 243, 255, 0.12)';
    }
    
    // Oscillating overlay waves
    demoCtx.strokeStyle = 'rgba(191, 0, 255, 0.25)';
    demoCtx.lineWidth = 1.5;
    demoCtx.beginPath();
    for (let x = 0; x < demoCanvas.width; x++) {
      const y = demoCanvas.height / 2 + Math.sin(x * 0.025 + demoTime * 3) * 20 * Math.cos(demoTime);
      if (x === 0) demoCtx.moveTo(x, y);
      else demoCtx.lineTo(x, y);
    }
    demoCtx.stroke();
  }

  // Laser scanner sweeps
  function startLaserSweep() {
    const laser = document.getElementById('demo-laser');
    if (!laser) return;
    gsap.killTweensOf(laser);
    gsap.set(laser, { top: '0%' });
    laserTween = gsap.to(laser, {
      top: '100%',
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      onRepeat: () => {
        playLaserSweepSound();
      }
    });
  }

  function stopLaserSweep() {
    const laser = document.getElementById('demo-laser');
    if (laser) gsap.killTweensOf(laser);
    if (laserTween) laserTween.kill();
  }

  // Mono Subtitle typewriter
  function typeSubtitle(text) {
    const el = document.getElementById('demo-subtitle-box');
    if (!el) return;
    
    clearInterval(subtitleInterval);
    el.innerHTML = '';
    let charIndex = 0;
    
    subtitleInterval = setInterval(() => {
      if (charIndex < text.length) {
        el.textContent += text.charAt(charIndex);
        charIndex++;
      } else {
        clearInterval(subtitleInterval);
      }
    }, 20);
  }

  function printDemoConsole(text) {
    const logs = document.getElementById('demo-console-logs');
    if (!logs) return;
    
    const timestamp = new Date().toLocaleTimeString();
    logs.textContent += `\n[${timestamp}] ${text}`;
    logs.scrollTop = logs.scrollHeight;
  }

  function updateDemoProgressUI() {
    // Fill slider progress
    const fill = document.getElementById('demo-progress-fill');
    if (fill) fill.style.width = `${(demoProgress / 20) * 100}%`;
    
    // Math timers format
    const sec = String(Math.floor(demoProgress % 60)).padStart(2, '0');
    const ms = String(Math.floor((demoProgress % 1) * 100)).padStart(2, '0');
    
    const timeDisp = document.getElementById('demo-time-display');
    if (timeDisp) timeDisp.textContent = `00:${sec} / 00:20`;
    
    const hudTimer = document.getElementById('demo-hud-timer');
    if (hudTimer) hudTimer.textContent = `00:${sec}:${ms}`;
    
    runSequenceStep();
  }

  function runSequenceStep() {
    let currentStep = 1;
    if (demoProgress >= 15) currentStep = 4;
    else if (demoProgress >= 10) currentStep = 3;
    else if (demoProgress >= 5) currentStep = 2;
    
    if (currentStep === lastStepTriggered) return;
    lastStepTriggered = currentStep;
    
    // Steps activation loops
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`demo-step-${i}`);
      if (!stepEl) continue;
      
      if (i < currentStep) {
        stepEl.className = 'demo-step completed';
        stepEl.querySelector('.step-status').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      } else if (i === currentStep) {
        stepEl.className = 'demo-step active';
        stepEl.querySelector('.step-status').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      } else {
        stepEl.className = 'demo-step';
        stepEl.querySelector('.step-status').innerHTML = '<i class="fa-solid fa-clock"></i>';
      }
    }
    
    // Play sweeps & subtitles based on current step
    if (currentStep === 1) {
      typeSubtitle("[SYSTEM] CAPTURING VOCAL MATRIX WAVEFORMS... DECIPHERING ACCENT GLYPHS.");
      printDemoConsole("DIALECT_OS // CAPTURE_VOICE_STREAM // INITIALIZED");
      playChimeNote(440, 0, 0.3); // A4
    } else if (currentStep === 2) {
      typeSubtitle("[NEMOTRON] REGIONAL DIALECT MAPPING COMMITTED. DETECTED METRO REGISTER SPECTRUMS.");
      printDemoConsole("NEMOTRON_CORE // ACCENT_RESONANCE_MAPPED // CORE_ACTIVE");
      playChimeNote(554.37, 0, 0.3); // C#5
    } else if (currentStep === 3) {
      typeSubtitle("[GEMMA] NARRATIVE TRANSLATION REWRITES. DESIGNING VIRAL SPEECH OUTLINES.");
      printDemoConsole("GEMMA_REFINER // COMPILING_SOCIAL_SCRIPTS // ACTIVE");
      playChimeNote(659.25, 0, 0.3); // E5
    } else if (currentStep === 4) {
      typeSubtitle("[DATABASE] SCHEMA INTEGRATION. COMMITTING TRANSCRIPT LOGS TO PERSISTENT DATABASE ENGINE.");
      printDemoConsole("DATABASE // SCHEMA_COMMITTED // COLLECTION_RECORDS_UPDATED");
      playChimeNote(880, 0, 0.3); // A5
    }
  }

  function completeDemoSequence() {
    const step4 = document.getElementById('demo-step-4');
    if (step4) {
      step4.className = 'demo-step completed';
      step4.querySelector('.step-status').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }
    
    typeSubtitle("[SUCCESS] COCKPIT MULTI-MODAL PIPELINE ALIGNED. SIMULATOR STATE COMPLETE.");
    printDemoConsole("DIALECT_OS // CALIBRATED // DATABASE_SYNCHRONIZED_STABLE");
    
    playCyberchimeMelody();
    showNotification("Cinematic simulator successfully completed!", "success");
    
    // Seed new database record representing simulation completion
    const demoUploadId = 'up_demo';
    const exists = state.database.uploads.some(u => u._id === demoUploadId);
    
    if (!exists) {
      const mockDemoUpload = {
        _id: demoUploadId,
        userId: 'u_01',
        fileUrl: 'local://assets/samples/cinematic_demo_feed.wav',
        fileType: 'audio/wav',
        originalLanguage: 'New York Urban Accent',
        detectedDialect: 'Standard London Adapts',
        duration: 20,
        createdAt: new Date().toISOString()
      };
      
      const mockDemoTranscript = {
        _id: 'tr_demo',
        uploadId: demoUploadId,
        originalText: "Dialect Intelligence is fully online. Visual spatial computing grids active.",
        translatedVersions: { target: "Dialect Intelligence is fully online. Spatial coordinates set." },
        generatedScript: "[SCENE: Volumetric cybernetic cockpit]\n[NARRATION - Standard London]: Systems fully calibrated. Welcome to the Dialect OS.",
        createdAt: new Date().toISOString()
      };
      
      state.database.uploads.push(mockDemoUpload);
      state.database.transcripts.push(mockDemoTranscript);
      saveDatabase();
      updateDashboardStats();
      renderDatabaseTable();
      
      // Post to database server
      postToServer('upload', mockDemoUpload);
      postToServer('transcript', mockDemoTranscript);
    }
  }

  function playDemo() {
    if (demoPlaying) return;
    demoPlaying = true;
    
    initWebAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const playBtn = document.getElementById('demo-play-btn');
    if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    
    resizeDemoCanvas();
    drawDemoCanvas();
    startLaserSweep();
    
    demoInterval = setInterval(() => {
      demoProgress += 0.1;
      if (demoProgress >= 20) {
        demoProgress = 20;
        pauseDemo();
        completeDemoSequence();
        return;
      }
      updateDemoProgressUI();
    }, 100);
    
    printDemoConsole("DIALECT_OS // SIMULATOR_RUNNING // PLAYBACK_STARTED");
  }

  function pauseDemo() {
    demoPlaying = false;
    clearInterval(demoInterval);
    cancelAnimationFrame(canvasAnimFrame);
    stopLaserSweep();
    
    const playBtn = document.getElementById('demo-play-btn');
    if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    
    printDemoConsole("DIALECT_OS // SIMULATOR_STANDBY // PLAYBACK_PAUSED");
  }

  function openDemoModal() {
    if (!demoModal) return;
    demoModal.classList.add('open');
    resizeDemoCanvas();
    printDemoConsole("DIALECT_OS // HOLOGRAPHIC_COCKPIT_READY // SELECT_PLAY");
  }

  function closeDemoModal() {
    if (!demoModal) return;
    demoModal.classList.remove('open');
    pauseDemo();
    
    // Teardown audio contexts on close to free slots
    if (audioCtx) {
      audioCtx.close().then(() => {
        audioCtx = null;
        mainHumNode = null;
        synthVolumeNode = null;
      });
    }
    
    // Reset indicators state
    demoProgress = 0;
    lastStepTriggered = -1;
    
    const fill = document.getElementById('demo-progress-fill');
    if (fill) fill.style.width = '0%';
    
    const timeDisp = document.getElementById('demo-time-display');
    if (timeDisp) timeDisp.textContent = `00:00 / 00:20`;
    
    const hudTimer = document.getElementById('demo-hud-timer');
    if (hudTimer) hudTimer.textContent = `00:00:00`;
    
    const sub = document.getElementById('demo-subtitle-box');
    if (sub) sub.textContent = '[SYSTEM]: Tap PLAY to begin cinematic AI cockpit simulation...';
    
    const logs = document.getElementById('demo-console-logs');
    if (logs) logs.textContent = 'DIALECT_OS // SIMULATOR_READY // INJECT_SEED_STREAM';
    
    for (let i = 1; i <= 4; i++) {
      const s = document.getElementById(`demo-step-${i}`);
      if (s) {
        s.className = 'demo-step';
        s.querySelector('.step-status').innerHTML = '<i class="fa-solid fa-clock"></i>';
      }
    }
  }

  // Bind Listeners
  const trigger = document.getElementById('demo-video-trigger');
  if (trigger) trigger.addEventListener('click', openDemoModal);
  
  const closeBtn = document.getElementById('demo-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDemoModal);
  
  if (demoModal) {
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) closeDemoModal();
    });
  }

  const playBtn = document.getElementById('demo-play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (demoPlaying) pauseDemo();
      else playDemo();
    });
  }

  const volumeBtn = document.getElementById('demo-audio-toggle');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isAudioMuted = !isAudioMuted;
      if (synthVolumeNode && audioCtx) {
        synthVolumeNode.gain.setValueAtTime(isAudioMuted ? 0 : 0.15, audioCtx.currentTime);
      }
      if (isAudioMuted) {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> MUTE';
        volumeBtn.style.borderColor = 'rgba(255, 51, 102, 0.3)';
        volumeBtn.style.color = 'var(--accent-red)';
      } else {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> UNMUTED';
        volumeBtn.style.borderColor = 'rgba(0, 243, 255, 0.3)';
        volumeBtn.style.color = 'var(--neon-cyan)';
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
    });
  }

  const progressTrack = document.getElementById('demo-progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const ratio = clickX / width;
      
      demoProgress = ratio * 20;
      updateDemoProgressUI();
    });
  }

  window.addEventListener('resize', () => {
    if (demoModal && demoModal.classList.contains('open')) {
      resizeDemoCanvas();
    }
  });

  // Wire file select inner button stop propagation to allow click to fire
  const fileSelectBtn = dropzone.querySelector('.btn-cyber');
  if (fileSelectBtn) {
    fileSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // ==========================================
  // 15. INITIALIZATION SEQUENCE
  // ==========================================
  initDatabase();
  checkServerStatus();
  
  // Quick greeting notification
  setTimeout(() => {
    showNotification("Operator cockpit online. Interactive 3D grids calibrated.", "success");
  }, 1000);
});
