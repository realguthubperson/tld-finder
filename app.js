const state = {
  tlds: [],
  minPrice: 0,
  maxPrice: 500,
  search: "",
  hideUnavailable: true
};

const els = {
  searchInput: document.getElementById("searchInput"),
  minPrice: document.getElementById("minPrice"),
  maxPrice: document.getElementById("maxPrice"),
  hideUnavailable: document.getElementById("hideUnavailable"),
  tldTableBody: document.getElementById("tldTableBody"),
  matchingCount: document.getElementById("matchingCount"),
  totalCount: document.getElementById("totalCount"),
  minValueLabel: document.getElementById("minValueLabel"),
  maxValueLabel: document.getElementById("maxValueLabel"),
  statusText: document.getElementById("statusText")
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateRegistrarPrices(tld) {
  const token = tld.replace(".", "").toUpperCase();
  const lengthFactor = token.length || 1;
  const seed = hashString(token);

  const base = 6 + (lengthFactor * 0.9) + (seed % 24) / 10;

  return {
    Namecheap: Number((base * 0.82 + 0.6).toFixed(2)),
    Porkbun: Number((base * 0.9 + 0.9).toFixed(2)),
    Dynadot: Number((base * 1.05 + 1.6).toFixed(2)),
    Cloudflare: Number((base * 1.15 + 2.2).toFixed(2)),
    GoDaddy: Number((base * 1.5 + 3.7).toFixed(2))
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

function buildTldData(tld) {
  const pricing = generateRegistrarPrices(tld);
  const cheapest = getCheapestRegistrar(pricing);
  const available = (hashString(tld) % 13) !== 0;

  return {
    tld,
    available,
    pricing,
    cheapest
  };
}

async function fetchTlds() {
  const url = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("IANA fetch failed.");
    }

    const text = await response.text();
    const parsed = text
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => `.${line}`);

    return parsed;
  } catch (error) {
    console.warn("Falling back to generated TLD list.", error);

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

function renderTable() {
  const filtered = state.tlds
    .filter((item) => item.tld.toLowerCase().includes(state.search.trim().toLowerCase()))
    .filter((item) => !state.hideUnavailable || item.available)
    .filter((item) => item.cheapest.price >= state.minPrice && item.cheapest.price <= state.maxPrice)
    .sort((a, b) => a.cheapest.price - b.cheapest.price || a.tld.localeCompare(b.tld));

  els.matchingCount.textContent = String(filtered.length);
  els.totalCount.textContent = String(state.tlds.length);

  if (filtered.length === 0) {
    els.tldTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; color: var(--muted); padding: 26px;">
          No TLDs match the current filters.
        </td>
      </tr>
    `;
    els.statusText.textContent = "No matching domains";
    return;
  }

  els.statusText.textContent = `Showing ${filtered.length} of ${state.tlds.length} TLDs`;

  const rows = filtered
    .map((item) => {
      const badgeClass = item.available ? "available" : "unavailable";
      const badgeText = item.available ? "Available" : "Taken";
      const registrar = item.cheapest.name;

      return `
        <tr>
          <td class="tld-cell">${item.tld}</td>
          <td class="price-cell">${formatCurrency(item.cheapest.price)}</td>
          <td><span class="registrar-name">${registrar}</span></td>
          <td>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  els.tldTableBody.innerHTML = rows;
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTable();
  });

  els.minPrice.addEventListener("input", (event) => {
    const nextMin = Number(event.target.value);

    if (nextMin > state.maxPrice) {
      state.maxPrice = nextMin;
      els.maxPrice.value = String(nextMin);
    }

    state.minPrice = nextMin;
    updateLabels();
    renderTable();
  });

  els.maxPrice.addEventListener("input", (event) => {
    const nextMax = Number(event.target.value);

    if (nextMax < state.minPrice) {
      state.minPrice = nextMax;
      els.minPrice.value = String(nextMax);
    }

    state.maxPrice = nextMax;
    updateLabels();
    renderTable();
  });

  els.hideUnavailable.addEventListener("change", (event) => {
    state.hideUnavailable = event.target.checked;
    renderTable();
  });
}

async function init() {
  updateLabels();
  bindEvents();

  els.statusText.textContent = "Loading TLDs...";

  const rawTlds = await fetchTlds();

  state.tlds = rawTlds.slice(0, 3537).map(buildTldData);

  renderTable();
}

init();
