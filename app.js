(() => {
  "use strict";
  const materials = window.MATERIAL_DATABASE || [];
  const $ = (id) => document.getElementById(id);
  const form = $("search-form"), densityInput = $("density"), unitSelect = $("unit");
  const toleranceSelect = $("tolerance"), results = $("results"), emptyState = $("empty-state");
  const densityMode = $("density-mode"), calculateMode = $("calculate-mode");
  const modeButtons = document.querySelectorAll(".mode-button");
  const massInput = $("mass"), volumeInput = $("volume");
  const massUnit = $("mass-unit"), volumeUnit = $("volume-unit");
  const calculationError = $("calculation-error"), calculationResult = $("calculation-result");
  let activeMode = "density";
  const resultsTitle = $("results-title"), resultCount = $("result-count");
  const dbSearch = $("db-search"), categoryFilter = $("category-filter"), databaseBody = $("database-body");
  const nf = new Intl.NumberFormat("fr-FR", {maximumFractionDigits: 4});
  const number = (v) => nf.format(v);
  const densityText = (m) => m.min === m.max ? number(m.min) : `${number(m.min)} – ${number(m.max)}`;
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Ajoute les familles présentes dans la base au filtre.
  [...new Set(materials.map(m => m.category))].sort((a,b)=>a.localeCompare(b,"fr")).forEach(category => {
    const option = document.createElement("option");
    option.value = category; option.textContent = category; categoryFilter.appendChild(option);
  });

  function renderDatabase() {
    const q = norm(dbSearch.value.trim()), category = categoryFilter.value;
    const filtered = materials.filter(m => (!q || norm(m.name).includes(q) || norm(m.category).includes(q)) &&
      (category === "all" || m.category === category));
    databaseBody.replaceChildren();
    filtered.forEach(m => {
      const tr = document.createElement("tr");
      [m.name, m.category, densityText(m), "kg/m³"].forEach((value, i) => {
        const td = document.createElement("td");
        if (i === 1) { const tag = document.createElement("span"); tag.className = "category-tag"; tag.textContent = value; td.appendChild(tag); }
        else td.textContent = value;
        tr.appendChild(td);
      });
      databaseBody.appendChild(tr);
    });
    $("database-count").textContent = `${filtered.length} substance${filtered.length > 1 ? "s" : ""} affichée${filtered.length > 1 ? "s" : ""} sur ${materials.length}`;
  }

  function renderMatches(value) {
    const tolerance = Number(toleranceSelect.value) / 100;
    const matches = materials.map(m => {
      const gap = value < m.min ? m.min - value : value > m.max ? value - m.max : 0;
      const midpoint = (m.min + m.max) / 2;
      const relativeGap = gap / Math.max(Math.abs(value), 1);
      const overlaps = value >= m.min * (1 - tolerance) && value <= m.max * (1 + tolerance);
      return {...m, gap, relativeGap, midpoint, overlaps};
    }).filter(m => m.overlaps || m.relativeGap <= Math.max(tolerance * 3, 0.03))
      .sort((a,b) => a.relativeGap - b.relativeGap || a.name.localeCompare(b.name, "fr"))
      .slice(0, 8);

    emptyState.hidden = true;
    results.replaceChildren();
    resultsTitle.textContent = `Analyse pour ${number(value)} kg/m³`;
    resultCount.textContent = `${matches.length} piste${matches.length !== 1 ? "s" : ""}`;

    if (!matches.length) {
      const msg = document.createElement("div"); msg.className = "no-results";
      msg.textContent = "Aucune correspondance proche dans la base intégrée. Essayez une tolérance plus large ou vérifiez l’unité et les conditions de mesure.";
      results.appendChild(msg); return;
    }
    matches.forEach((m, index) => {
      const item = document.createElement("article"); item.className = "result-item";
      const main = document.createElement("div"); main.className = "result-main";
      const rank = document.createElement("span"); rank.className = "result-rank"; rank.textContent = String(index + 1).padStart(2, "0");
      const details = document.createElement("div");
      const name = document.createElement("div"); name.className = "result-name"; name.textContent = m.name;
      const meta = document.createElement("div"); meta.className = "result-meta"; meta.textContent = m.category + (m.note ? ` · ${m.note}` : "");
      details.append(name, meta);
      if (m.overlaps) { const badge = document.createElement("span"); badge.className = "match-label"; badge.textContent = m.gap === 0 ? "Dans la plage de référence" : `Dans la tolérance ±${tolerance * 100}%`; details.appendChild(badge); }
      main.append(rank, details);
      const dens = document.createElement("div"); dens.className = "result-density"; dens.textContent = densityText(m);
      const bar = document.createElement("div"); bar.className = "result-bar";
      const fill = document.createElement("span");
      const closeness = Math.max(8, 100 * (1 - Math.min(m.relativeGap / Math.max(tolerance * 3, 0.03), 1)));
      fill.style.width = `${closeness}%`; bar.appendChild(fill);
      item.append(main, dens, bar); results.appendChild(item);
    });
  }

  function clearCalculationMessage() {
    calculationError.hidden = true;
    calculationError.textContent = "";
  }

  function setMode(mode) {
    activeMode = mode;
    densityMode.hidden = mode !== "density";
    calculateMode.hidden = mode !== "calculate";
    modeButtons.forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    clearCalculationMessage();
  }
  modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));

  function calculateDensity() {
    clearCalculationMessage();
    const mass = Number(massInput.value), volume = Number(volumeInput.value);
    if (massInput.value.trim() === "" || volumeInput.value.trim() === "" ||
        !Number.isFinite(mass) || !Number.isFinite(volume) || mass <= 0 || volume <= 0) {
      calculationError.textContent = "Saisissez une masse et un volume strictement positifs.";
      calculationError.hidden = false;
      calculationResult.hidden = true;
      return;
    }
    // Conversions vers kg et m³ avant le calcul rho = m / V.
    const massKg = massUnit.value === "kg" ? mass : massUnit.value === "mg" ? mass / 1e6 : mass / 1000;
    const volumeM3 = ({m3: 1, cm3: 1e-6, mm3: 1e-9, l: 1e-3, ml: 1e-6})[volumeUnit.value] * volume;
    const densityKgM3 = massKg / volumeM3;
    if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0) {
      calculationError.textContent = "Cette combinaison ne permet pas de calculer une valeur valide.";
      calculationError.hidden = false;
      calculationResult.hidden = true;
      return;
    }
    calculationResult.replaceChildren();
    const label = document.createElement("span"); label.textContent = "Masse volumique calculée";
    const value = document.createElement("strong"); value.textContent = `${number(densityKgM3)} kg/m³`;
    const detail = document.createElement("small"); detail.textContent = `${number(densityKgM3 / 1000)} g/cm³ · Résultat obtenu avec ρ = m / V`;
    calculationResult.append(label, value, detail);
    calculationResult.hidden = false;
    renderMatches(densityKgM3);
  }
  $("calculate-button").addEventListener("click", calculateDensity);
  [massInput, volumeInput, massUnit, volumeUnit].forEach(el => el.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); calculateDensity(); }
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeMode === "calculate") { calculateDensity(); return; }
    const raw = Number(densityInput.value);
    if (densityInput.value.trim() === "" || !Number.isFinite(raw) || raw <= 0) {
      densityInput.setCustomValidity("Entrez une masse volumique positive."); densityInput.reportValidity(); return;
    }
    densityInput.setCustomValidity("");
    // 1 g/cm³ = 1000 kg/m³
    const value = unitSelect.value === "gcm3" ? raw * 1000 : raw;
    renderMatches(value);
  });
  densityInput.addEventListener("input", () => densityInput.setCustomValidity(""));
  toleranceSelect.addEventListener("change", () => {
    if (activeMode === "calculate" && massInput.value && volumeInput.value) calculateDensity();
    else if (densityInput.value && Number(densityInput.value) > 0) form.requestSubmit();
  });
  document.querySelectorAll(".quick-chip").forEach(button => button.addEventListener("click", () => {
    setMode("density");
    densityInput.value = button.dataset.value; unitSelect.value = "kgm3"; form.requestSubmit();
  }));
  dbSearch.addEventListener("input", renderDatabase);
  categoryFilter.addEventListener("change", renderDatabase);
  renderDatabase();
})();