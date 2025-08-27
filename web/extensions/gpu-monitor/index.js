// gpu-monitor v4.3 — toolbar uyumlu, dinamik bar, sabit metin genişliği,
// grip SAĞDA ve mini (yalnız gripten sürüklenir), snap
// Not: Klavye kısayolları yok.
(function () {
  const DEFAULT_START = { top: 8, right: 340 }; // sağ üst bant için ofset
  const POWER_MAX = 500;
  const COLORS = { gpu:"#6AE3FF", vram:"#A4F36A", temp:"#FFB86A", w:"#FF6AA6" };
  const LS_KEY = "gpu_monitor_v43_pos";

  const readPos = () => {
    try { return Object.assign({left:null, top:null}, JSON.parse(localStorage.getItem(LS_KEY)||"{}")); }
    catch { return {left:null, top:null}; }
  };
  const writePos = (s) => localStorage.setItem(LS_KEY, JSON.stringify(s));

  const pick = {
    gpu:  v => COLORS.gpu,
    vram: v => (v >= 90 ? "#FF4D4D" : v >= 80 ? "#FFC14D" : COLORS.vram),
    temp: t => (t >= 85 ? "#FF4D4D" : t >= 75 ? "#FFC14D" : COLORS.temp),
    w:    p => (p >= 450 ? "#FF4D4D" : p >= 350 ? "#FFC14D" : COLORS.w),
  };

  function createPanel(){
    if (document.getElementById("gpu-monitor")) return null;
    const saved = readPos();

    const panel = document.createElement("div");
    panel.id = "gpu-monitor";
    Object.assign(panel.style, {
      position:"fixed", zIndex:9999,
      height:"28px",
      display:"flex", alignItems:"center", gap:"8px",
      padding:"0 8px",
      border:"1px solid rgba(255,255,255,0.14)",
      borderRadius:"8px",
      background:"rgba(18,18,24,0.6)",
      boxShadow:"0 4px 12px rgba(0,0,0,0.35)",
      font:"10px/1 monospace", color:"#fff",
      userSelect:"none",
      whiteSpace:"nowrap"
    });

    if (saved.left != null && saved.top != null) {
      panel.style.left = saved.left + "px";
      panel.style.top  = saved.top  + "px";
    } else {
      panel.style.top   = DEFAULT_START.top + "px";
      panel.style.right = DEFAULT_START.right + "px";
    }

    function item(label, baseColor, valueWidthCh){
      const wrap = document.createElement("div");
      Object.assign(wrap.style, { display:"flex", alignItems:"center", gap:"6px", height:"22px" });

      const badge = document.createElement("span");
      badge.textContent = label;
      Object.assign(badge.style, {
        background:"rgba(255,255,255,0.06)",
        color: baseColor,
        border:`1px solid ${baseColor}55`,
        padding:"2px 6px",
        borderRadius:"6px",
        font:"700 9px monospace",
      });

      const cv = document.createElement("canvas"); // bar
      cv.width = 10; cv.height = 16;

      const val = document.createElement("span"); // sabit genişlik metin
      val.textContent = "-";
      Object.assign(val.style, {
        font:"700 11px monospace",
        display:"inline-block",
        textAlign:"right",
        width:valueWidthCh
      });

      wrap.append(badge, cv, val);
      return {wrap, badge, cv, val};
    }

    const cards = {
      gpu:  item("GPU",  COLORS.gpu,  "4ch"),
      vram: item("VRAM", COLORS.vram, "4ch"),
      temp: item("°C",   COLORS.temp, "3ch"),
      w:    item("W",    COLORS.w,    "6ch"),
    };
    Object.values(cards).forEach(c => panel.appendChild(c.wrap));

    // sağda mini grip — yalnız gripten sürüklenir
    const grip = document.createElement("span");
    grip.textContent = "⋮";
    Object.assign(grip.style, {
      opacity:"0.5",
      font:"700 10px/1 monospace",
      padding:"0 2px",
      marginLeft:"6px",
      borderLeft:"1px solid rgba(255,255,255,0.12)",
      userSelect:"none",
      cursor:"grab"
    });
    grip.title = "Taşı (sürükle)";
    grip.onmouseenter = () => grip.style.opacity = "0.85";
    grip.onmouseleave = () => grip.style.opacity = "0.5";
    panel.appendChild(grip);

    document.body.appendChild(panel);

    // drag sadece gripten
    let dragging=false, sx=0, sy=0, sl=0, stt=0;
    const onDown = (e)=>{
      dragging=true; sx=e.clientX; sy=e.clientY;
      const r=panel.getBoundingClientRect(); sl=r.left; stt=r.top;
      panel.style.right=""; grip.style.cursor="grabbing";
      e.preventDefault();
    };
    const onMove = (e)=>{
      if(!dragging) return;
      panel.style.left=(sl+e.clientX-sx)+"px";
      panel.style.top =(stt+e.clientY-sy)+"px";
    };
    const onUp = ()=>{
      if(!dragging) return; dragging=false;
      const r=panel.getBoundingClientRect();
      const ww=window.innerWidth, wh=window.innerHeight, snap=8;
      let L=r.left, T=r.top;
      if (L < snap) L = 4;
      if (T < snap) T = 4;
      if (ww - (L + r.width) < snap) L = ww - r.width - 4;
      if (wh - (T + r.height) < snap) T = wh - r.height - 4;
      panel.style.left = L+"px"; panel.style.top = T+"px";
      grip.style.cursor="grab";
      writePos({left:L, top:T});
    };
    grip.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return { panel, cards };
  }

  function drawBar(cv, value, max, color) {
    const ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0,0,w,h);
    const v = Math.max(0, Math.min(max, value));
    const innerH = h - 4;
    const height = Math.round(innerH * (v / max));
    const y = h - 2 - height;
    ctx.fillStyle = color;
    ctx.fillRect(2, y, w - 4, height);
  }

  function boot(){
    const ui = createPanel(); if(!ui) return;
    setInterval(async()=>{
      try{
        const r = await fetch("/gpu");
        const j = await r.json();
        if(!j.ok || !j.gpus?.length) return;
        const g = j.gpus[0];

        const util = g.util ?? 0;
        const used = g.mem_used_mb ?? 0, total = g.mem_total_mb ?? 1;
        const vramPct = Math.round((used/total) * 100);
        const temp  = g.temp_c ?? 0;
        const power = typeof g.power_w === "number" ? g.power_w : 0;

        ui.cards.gpu.val.textContent  = util + "%";
        ui.cards.vram.val.textContent = vramPct + "%";
        ui.cards.temp.val.textContent = String(temp);
        ui.cards.w.val.textContent    = power ? power.toFixed(1) : "-";

        const gpuColor  = pick.gpu(util);
        const vramColor = pick.vram(vramPct);
        const tempColor = pick.temp(temp);
        const wattColor = pick.w(power);

        ui.cards.gpu.badge.style.color  = gpuColor;  ui.cards.gpu.badge.style.borderColor  = gpuColor + "88";
        ui.cards.vram.badge.style.color = vramColor; ui.cards.vram.badge.style.borderColor = vramColor + "88";
        ui.cards.temp.badge.style.color = tempColor; ui.cards.temp.badge.style.borderColor = tempColor + "88";
        ui.cards.w.badge.style.color    = wattColor; ui.cards.w.badge.style.borderColor    = wattColor + "88";

        drawBar(ui.cards.gpu.cv,  util,    100,       gpuColor);
        drawBar(ui.cards.vram.cv, vramPct, 100,       vramColor);
        drawBar(ui.cards.temp.cv, temp,    100,       tempColor);
        drawBar(ui.cards.w.cv,    power,   POWER_MAX, wattColor);
      }catch{}
    }, 1000);
  }

  if (document.readyState !== "loading") boot();
  else window.addEventListener("load", boot);
})();
