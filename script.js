/* =========================================================
   WANZZ DEPLOY — client logic
   Catatan: Semua "API Key" di bawah ini hanyalah representasi
   visual (sudah tertanam/hardcoded di sistem). Tidak ada input
   API Key dari pengguna, dan tidak ada key yang benar-benar
   dikirim ke luar — seluruh proses deploy adalah SIMULASI.
   ========================================================= */

(() => {
  "use strict";

  /* ---------- konfigurasi kredensial ----------
     Key TIDAK ditulis langsung di file ini. Semua diambil dari
     window.WANZZ_CONFIG yang didefinisikan di config.js — file
     lokal yang kamu isi sendiri di device kamu dan tidak boleh
     diupload/dibagikan (lihat komentar di config.js).
     Kalau config.js belum diisi, UI otomatis fallback ke status
     "NOT CONFIGURED" supaya jelas belum siap dipakai. */
  const cfg = window.WANZZ_CONFIG || {};

  function isPlaceholder(v){
    return !v || /^GANTI_DENGAN_/.test(v);
  }
  function maskToken(v){
    if (isPlaceholder(v)) return "—— belum diisi ——";
    return v.slice(0, 6) + "••••••••••••";
  }

  const EMBEDDED_KEYS = Object.freeze({
    github:  {
      status: isPlaceholder(cfg.githubToken)  ? "NOT CONFIGURED" : "CONNECTED",
      masked: maskToken(cfg.githubToken),
    },
    vercel:  {
      status: isPlaceholder(cfg.vercelToken)  ? "NOT CONFIGURED" : "READY TO USE",
      masked: maskToken(cfg.vercelToken),
    },
    netlify: {
      status: isPlaceholder(cfg.netlifyToken) ? "NOT CONFIGURED" : "CONNECTED",
      masked: maskToken(cfg.netlifyToken),
    },
  });
  const githubUser = isPlaceholder(cfg.githubUser) ? "belum diatur" : cfg.githubUser;
  // File ini tidak pernah mengirim token ke pihak manapun — status di atas
  // hanya dipakai untuk tampilan UI (simulasi). Lihat README untuk detail.

  /* ---------- particle background canvas ---------- */
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function initParticles(count){
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
    }));
  }
  function tickParticles(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${p.a})`;
      ctx.shadowColor = "rgba(0,240,255,0.8)";
      ctx.shadowBlur = 6;
      ctx.fill();
    });
    requestAnimationFrame(tickParticles);
  }
  resizeCanvas();
  initParticles(Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 14000)));
  tickParticles();
  window.addEventListener("resize", () => { resizeCanvas(); initParticles(particles.length); });

  /* ---------- banner floating particles (DOM based) ---------- */
  function spawnBannerParticles(){
    const host = document.getElementById("banner-particles");
    if (!host) return;
    for (let i = 0; i < 22; i++){
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.bottom = "-10px";
      s.style.animationDuration = 4 + Math.random() * 5 + "s";
      s.style.animationDelay = Math.random() * 6 + "s";
      host.appendChild(s);
    }
  }

  /* ---------- render status kredensial ke UI ---------- */
  function applyConfigToUI(){
    const navUser = document.getElementById("nav-user");
    if (navUser) navUser.textContent = `◆ ${githubUser} — Quick Session Aktif`;

    const cardMap = [
      { sel: ".api-card:nth-child(1)", data: EMBEDDED_KEYS.github },
      { sel: ".api-card:nth-child(2)", data: EMBEDDED_KEYS.vercel },
      { sel: ".api-card:nth-child(3)", data: EMBEDDED_KEYS.netlify },
    ];
    cardMap.forEach(({ sel, data }) => {
      const card = document.querySelector(sel);
      if (!card) return;
      const stateEl = card.querySelector(".api-state");
      const hintEl  = card.querySelector(".api-key-hint");
      if (hintEl) hintEl.textContent = "key: " + data.masked;
      if (stateEl){
        stateEl.innerHTML = `<span class="led"></span> ${data.status}`;
        stateEl.style.color = data.status === "NOT CONFIGURED" ? "var(--danger)" : "";
        const led = stateEl.querySelector(".led");
        if (led && data.status === "NOT CONFIGURED"){
          led.style.background = "var(--danger)";
          led.style.boxShadow = "0 0 8px var(--danger)";
        }
      }
    });
  }

  /* ---------- screen references ---------- */
  const landingPage   = document.getElementById("landing-page");
  const loadingScreen = document.getElementById("loading-screen");
  const dashboard      = document.getElementById("dashboard");
  const quickAccessBtn = document.getElementById("quick-access-btn");

  const percentNum   = document.getElementById("percent-num");
  const barFill       = document.getElementById("loading-bar-fill");
  const loadingStatus = document.getElementById("loading-status");
  const bootLog        = document.getElementById("boot-log");

  const LOADING_STEPS = [
    { at: 0,  msg: "INITIALIZING SECURE CHANNEL...",     log: "[core] booting wanzz-deploy runtime" },
    { at: 18, msg: "MEMUAT KREDENSIAL TERTANAM...",       log: "[env] reading embedded credentials (github, vercel, netlify)" },
    { at: 38, msg: "MEMVERIFIKASI GITHUB API...",         log: "[github] handshake ok — scope: repo:read" },
    { at: 55, msg: "MEMVERIFIKASI VERCEL API...",         log: "[vercel] handshake ok — team linked" },
    { at: 72, msg: "MEMVERIFIKASI NETLIFY API...",        log: "[netlify] handshake ok — site linked" },
    { at: 88, msg: "MENYIAPKAN DASHBOARD...",             log: "[ui] compiling dashboard modules" },
    { at: 100,msg: "AKSES DIBERIKAN. SELAMAT DATANG.",    log: "[core] ready" },
  ];

  function runLoadingSequence(){
    let pct = 0;
    let stepIndex = 0;
    bootLog.innerHTML = "";

    const interval = setInterval(() => {
      pct += Math.random() * 4 + 2;
      if (pct >= 100) pct = 100;

      percentNum.textContent = Math.floor(pct);
      barFill.style.width = pct + "%";

      while (stepIndex < LOADING_STEPS.length && pct >= LOADING_STEPS[stepIndex].at){
        const step = LOADING_STEPS[stepIndex];
        loadingStatus.textContent = step.msg;
        const line = document.createElement("div");
        line.textContent = "> " + step.log;
        bootLog.appendChild(line);
        bootLog.scrollTop = bootLog.scrollHeight;
        stepIndex++;
      }

      if (pct >= 100){
        clearInterval(interval);
        setTimeout(enterDashboard, 550);
      }
    }, 110);
  }

  function enterDashboard(){
    loadingScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    spawnBannerParticles();
    applyConfigToUI();
  }

  quickAccessBtn.addEventListener("click", () => {
    landingPage.classList.add("hidden");
    loadingScreen.classList.remove("hidden");
    percentNum.textContent = "0";
    barFill.style.width = "0%";
    runLoadingSequence();
  });

  /* ---------- repository selector ---------- */
  const repoCards = document.querySelectorAll(".repo-card");
  const selectedRepoLabel = document.getElementById("selected-repo-label");
  let selectedRepo = null;

  repoCards.forEach(card => {
    card.addEventListener("click", () => {
      repoCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedRepo = card.dataset.repo;
      selectedRepoLabel.textContent = selectedRepo;
    });
  });

  /* ---------- console log simulation ---------- */
  const consoleBody = document.getElementById("console-body");

  function pushConsoleLine(text, cls = "", withCursor = false){
    // hapus cursor lama jika ada
    const oldCursor = consoleBody.querySelector(".console-cursor");
    if (oldCursor) oldCursor.remove();

    const line = document.createElement("div");
    line.className = "console-line " + cls;
    line.textContent = text;
    if (withCursor){
      const cursor = document.createElement("span");
      cursor.className = "console-cursor";
      line.appendChild(cursor);
    }
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
    return line;
  }

  function clearConsole(){
    consoleBody.innerHTML = "";
  }

  function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

  async function runDeploySequence(target, btn){
    const targetKey = target.toLowerCase();
    const keyInfo = EMBEDDED_KEYS[targetKey] || EMBEDDED_KEYS.github;

    if (keyInfo.status === "NOT CONFIGURED"){
      clearConsole();
      pushConsoleLine(`$ wanzz deploy --target=${targetKey}`, "");
      pushConsoleLine(`✗ ${target} API key belum diisi di config.js`, "err");
      pushConsoleLine("  Isi window.WANZZ_CONFIG di config.js lalu refresh halaman.", "warn");
      return;
    }

    const otherBtns = document.querySelectorAll(".deploy-btn");
    otherBtns.forEach(b => b.classList.add("is-loading"));

    clearConsole();

    const repoName = selectedRepo || `${githubUser}/portfolio-site (default)`;

    const steps = [
      { text: `$ wanzz deploy --target=${target.toLowerCase()}`, cls: "" , wait: 250},
      { text: "Checking secured API keys...", cls: "dim", wait: 550 },
      { text: `✓ ${target} API key loaded from server env [${keyInfo.masked}]`, cls: "ok", wait: 500 },
      { text: `Fetching GitHub repo: ${repoName}...`, cls: "info", wait: 700 },
      { text: "✓ Repository cloned into build container", cls: "ok", wait: 500 },
      { text: "Installing dependencies (npm ci)...", cls: "dim", wait: 800 },
      { text: "✓ Dependencies installed (312 packages)", cls: "ok", wait: 450 },
      { text: "Running build script...", cls: "dim", wait: 900 },
      { text: "✓ Build completed in 8.4s", cls: "ok", wait: 500 },
      { text: `Deploying to ${target}...`, cls: "info", wait: 900 },
      { text: "Uploading static assets...", cls: "dim", wait: 650 },
      { text: "Provisioning edge network...", cls: "dim", wait: 600 },
      { text: `✓ Success! Deployed to https://${(selectedRepo || "app").split("/").pop()}.${targetKey === "vercel" ? "vercel.app" : "netlify.app"}`, cls: "ok", wait: 300 },
    ];

    for (const step of steps){
      pushConsoleLine(step.text, step.cls, false);
      await delay(step.wait);
    }
    pushConsoleLine("", "", true); // blinking cursor idle

    otherBtns.forEach(b => b.classList.remove("is-loading"));
  }

  document.querySelectorAll(".deploy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      runDeploySequence(target, btn);
    });
  });

  /* ---------- upload project (client-side only) ----------
     File apapun yang diupload di sini TIDAK dikirim ke server
     manapun. Untuk .zip, isinya dibaca & diekstrak langsung di
     browser memakai JSZip, lalu ditampilkan sebagai daftar file
     (bukan file .zip mentahnya). */
  const dropzone       = document.getElementById("dropzone");
  const fileInput       = document.getElementById("file-input");
  const uploadResult    = document.getElementById("upload-result");
  const uploadFileName  = document.getElementById("upload-file-name");
  const uploadFileList  = document.getElementById("upload-file-list");
  const uploadClearBtn  = document.getElementById("upload-clear-btn");

  function formatBytes(bytes){
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function renderFileRow(name, size, index){
    const row = document.createElement("div");
    row.className = "upload-file-row";
    row.style.animationDelay = (index * 0.04) + "s";
    row.innerHTML = `<span class="f-name">${name}</span><span class="f-size">${size}</span>`;
    return row;
  }

  function resetUploadUI(){
    uploadResult.classList.add("hidden");
    uploadFileList.innerHTML = "";
    uploadFileName.textContent = "—";
    fileInput.value = "";
  }

  async function handleUploadedFile(file){
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();

    uploadFileList.innerHTML = "";
    uploadResult.classList.remove("hidden");

    if (ext === "zip"){
      uploadFileName.textContent = `📦 ${file.name} — diekstrak otomatis`;
      if (typeof JSZip === "undefined"){
        uploadFileList.appendChild(renderFileRow("Gagal memuat pustaka ekstraksi ZIP.", "", 0));
        return;
      }
      try {
        const zip = await JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter(f => !f.dir);
        if (entries.length === 0){
          uploadFileList.appendChild(renderFileRow("ZIP kosong / tidak ada file.", "", 0));
          return;
        }
        let i = 0;
        for (const entry of entries){
          const content = await entry.async("uint8array");
          uploadFileList.appendChild(renderFileRow(entry.name, formatBytes(content.length), i));
          i++;
        }
      } catch (err){
        uploadFileList.appendChild(renderFileRow("Gagal membaca ZIP: file mungkin rusak.", "", 0));
      }
    } else if (ext === "html" || ext === "htm"){
      uploadFileName.textContent = `📄 ${file.name}`;
      uploadFileList.appendChild(renderFileRow(file.name, formatBytes(file.size), 0));
    } else {
      uploadFileName.textContent = `⚠ ${file.name}`;
      uploadFileList.appendChild(renderFileRow("Format tidak didukung — gunakan .html atau .zip", "", 0));
    }
  }

  if (dropzone && fileInput){
    dropzone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) handleUploadedFile(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove("drag-over");
      });
    });
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleUploadedFile(file);
    });
  }

  if (uploadClearBtn){
    uploadClearBtn.addEventListener("click", resetUploadUI);
  }

})();
