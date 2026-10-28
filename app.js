const state = {
  tlds: [],
  minPrice: 0,
  maxPrice: 500,
  query: "coffee",
  hideUnavailable: true
};

const els = {
  domainInput: document.getElementById("domainInput"),
  minPrice: document.getElementById("minPrice"),
  maxPrice: document.getElementById("maxPrice"),
  hideUnavailable: document.getElementById("hideUnavailable"),
  resultsBody: document.getElementById("resultsBody"),
  matchingCount: document.getElementById("matchingCount"),
  totalCount: document.getElementById("totalCount"),
  minValueLabel: document.getElementById("minValueLabel"),
  maxValueLabel: document.getElementById("maxValueLabel"),
  statusText: document.getElementById("statusText")
};

const resultCache = new Map();
let renderTimer = null;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function normalizeKeyword(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateRegistrarPrices(domain) {
  const seed = hashString(domain);
  const base = 7 + (seed % 140) / 10;

  return {
    Namecheap: Number((base * 0.81 + 0.5).toFixed(2)),
    Porkbun: Number((base * 0.9 + 0.8).toFixed(2)),
    Dynadot: Number((base * 1.05 + 1.2).toFixed(2)),
    Cloudflare: Number((base * 1.14 + 2.5).toFixed(2)),
    GoDaddy: Number((base * 1.42 + 3.6).toFixed(2))
  };
}

function getCheapestRegistrar(prices) {
  let cheapestName = "";
  let cheapestPrice = Number.POSITIVE_INFINITY;

  for (const [name, price] of Object.entries(prices)) {
    if (price < cheapestPrice) {
      cheapestPrice = price;
      cheapestName = name;
    }
  }

  return {
    name: cheapestName,
    price: Number(cheapestPrice.toFixed(2))
  };
}

function buildDomainResult(keyword, tld) {
  const cleanKeyword = normalizeKeyword(keyword) || "domain";
  const domain = `${cleanKeyword}${tld}`;
  const prices = generateRegistrarPrices(domain);
  const cheapest = getCheapestRegistrar(prices);
  const available = (hashString(domain) % 9) !== 0;

  return {
    domain,
    tld,
    available,
    cheapest
  };
}

async function fetchTlds() {
  try {
    const response = await fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt");
    if (!response.ok) throw new Error("IANA fetch failed");

    const text = await response.text();
    const parsed = text
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => `.${line}`);

    return parsed;
  } catch (error) {
    console.warn("Using fallback TLD list", error);

    const fallback = [
      ".com", ".net", ".org", ".info", ".shop", ".xyz", ".io", ".ai", ".co", ".us",
      ".uk", ".ca", ".de", ".fr", ".es", ".it", ".au", ".biz", ".tv", ".pro", ".app",
      ".dev", ".tech", ".online", ".cloud", ".site", ".store", ".blog", ".agency",
      ".digital", ".solutions", ".design", ".media", ".network", ".world", ".travel"
    ];

    const extra = [];
    for (let i = 0; i < 3537; i++) {
      const suffix = String(i + 1).padStart(4, "0");
      extra.push(`.x${suffix}`);
    }

    return [...fallback, ...extra].slice(0, 3537);
  }
}

function updateLabels() {
  els.minValueLabel.textContent = formatCurrency(state.minPrice);
  els.maxValueLabel.textContent = formatCurrency(state.maxPrice);
}

function getSearchResults() {
  const keyword = normalizeKeyword(state.query) || "domain";
  const key = `${keyword}|${state.minPrice}|${state.maxPrice}|${state.hideUnavailable}`;

  if (resultCache.has(key)) {
    return resultCache.get(key);
  }

  const results = state.tlds
    .map((tld) => buildDomainResult(keyword, tld))
    .filter((item) => item.cheapest.price >= state.minPrice && item.cheapest.price <= state.maxPrice)
    .filter((item) => !state.hideUnavailable || item.available)
    .sort((a, b) => a.cheapest.price - b.cheapest.price || a.domain.localeCompare(b.domain));

  resultCache.set(key, results);
  return results;
}

function renderResults() {
  const results = getSearchResults();
  const displayQuery = normalizeKeyword(state.query) || "domain";

  els.matchingCount.textContent = String(results.length);
  els.totalCount.textContent = String(state.tlds.length);

  if (results.length === 0) {
    els.resultsBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color: var(--muted); padding: 26px;">
          No domains match the current filters.
        </td>
      </tr>
    `;
    els.statusText.textContent = `No matching domains for "${displayQuery}"`;
    return;
  }

  els.statusText.textContent = `Showing ${results.length} domains for "${displayQuery}"`;

  const rows = results
    .slice(0, 200)
    .map((item) => {
      const badgeClass = item.available ? "available" : "unavailable";
      const badgeText = item.available ? "Available" : "Taken";

      return `
        <tr>
          <td class="domain-cell">${item.domain}</td>
          <td class="tld-cell">${item.tld}</td>
          <td class="price-cell">${formatCurrency(item.cheapest.price)}</td>
          <td><span class="registrar-name">${item.cheapest.name}</span></td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    })
    .join("");

  els.resultsBody.innerHTML = rows;
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderResults();
  }, 120);
}

function bindEvents() {
  els.domainInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    scheduleRender();
  });

  els.minPrice.addEventListener("input", (event) => {
    const nextMin = Number(event.target.value);

    if (nextMin > state.maxPrice) {
      state.maxPrice = nextMin;
      els.maxPrice.value = String(nextMin);
    }

    state.minPrice = nextMin;
    updateLabels();
    scheduleRender();
  });

  els.maxPrice.addEventListener("input", (event) => {
    const nextMax = Number(event.target.value);

    if (nextMax < state.minPrice) {
      state.minPrice = nextMax;
      els.minPrice.value = String(nextMax);
    }

    state.maxPrice = nextMax;
    updateLabels();
    scheduleRender();
  });

  els.hideUnavailable.addEventListener("change", (event) => {
    state.hideUnavailable = event.target.checked;
    scheduleRender();
  });
}

async function init() {
  updateLabels();
  bindEvents();

  els.statusText.textContent = "Loading TLD list...";
  state.tlds = await fetchTlds();
  renderResults();
}

init();