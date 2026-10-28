const state = {
  tlds: [],
  minPrice: 0,
  maxPrice: 500,
  query: "coffee",
  hideUnavailable: true,
  filterMode: "all"
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
  statusText: document.getElementById("statusText"),
  tabs: document.getElementById("tabs")
};

const resultCache = new Map();
let renderTimer = null;

const registrarTemplates = [
  { name: "Namecheap", registration: 4, renewal: 2, transfer: 1, payment: ["Bitcoin", "Credit Card", "PayPal", "Dwolla"] },
  { name: "Porkbun", registration: 41, renewal: 219, transfer: 102, payment: ["Credit Card", "PayPal", "Alipay", "Google Pay", "Apple Pay", "Bitcoin"] },
  { name: "GoDaddy", registration: 9, renewal: 8, transfer: 6, payment: ["PayPal", "Credit Card", "Bank Transfer", "Check", "Money Order", "Skrill", "Alipay"] },
  { name: "Dynadot", registration: 118, renewal: 148, transfer: 105, payment: ["Credit Card", "PayPal", "Skrill", "Money Order", "Check", "Bank Transfer"] },
  { name: "Cloudflare", registration: 6, renewal: 35, transfer: 11, payment: ["Credit Card", "PayPal"] },
  { name: "Spaceship", registration: 313, renewal: 48, transfer: 97, payment: ["Credit Card", "PayPal", "Bitcoin", "Google Pay", "Apple Pay", "Alipay"] },
  { name: "NameSilo", registration: 0, renewal: 3, transfer: 6, payment: ["Bitcoin", "PayPal", "Skrill", "Google Pay", "Credit Card"] },
  { name: "Gandi.net", registration: 20, renewal: 18, transfer: 40, payment: ["Bitcoin", "Credit Card", "PayPal", "Bank Transfer"] },
  { name: "Hostinger", registration: 40, renewal: 6, transfer: 24, payment: ["Credit Card", "PayPal", "Bitcoin"] },
  { name: "OVHcloud", registration: 217, renewal: 178, transfer: 45, payment: ["Credit Card", "PayPal", "Check", "Money Order", "Bank Transfer"] },
  { name: "Hexonet", registration: 24, renewal: 25, transfer: 12, payment: ["Credit Card", "PayPal", "Alipay", "Bank Transfer"] },
  { name: "Internet.bs", registration: 7, renewal: 3, transfer: 2, payment: ["Credit Card", "PayPal", "Skrill", "Alipay"] }
];

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

function getRegistrarPaymentMeta(paymentMethods) {
  const normalized = paymentMethods.map((item) => item.toLowerCase());

  const hasCrypto = normalized.some((item) =>
    item.includes("bitcoin") ||
    item.includes("crypto") ||
    item.includes("usdt") ||
    item.includes("ethereum") ||
    item.includes("doge")
  );

  const isCardOnly =
    paymentMethods.length > 0 &&
    paymentMethods.every((item) =>
      item.toLowerCase().includes("credit card") ||
      item.toLowerCase().includes("debit card") ||
      item.toLowerCase().includes("visa") ||
      item.toLowerCase().includes("mastercard")
    );

  return { hasCrypto, isCardOnly };
}

function makeRegistrarSetForTld(tld) {
  const base = hashString(tld);
  const rows = [];

  for (let i = 0; i < registrarTemplates.length; i++) {
    const template = registrarTemplates[i];
    const spread = (base % 11) / 10;
    const registration = Number((template.registration + (i * 1.9) + spread).toFixed(2));
    const renewal = Number((template.renewal + (i * 2.2) + spread).toFixed(2));
    const transfer = Number((template.transfer + (i * 1.5) + spread).toFixed(2));

    const payment = [...template.payment];
    const meta = getRegistrarPaymentMeta(payment);

    rows.push({
      name: template.name,
      registration,
      renewal,
      transfer,
      payment,
      hasCrypto: meta.hasCrypto,
      isCardOnly: meta.isCardOnly
    });
  }

  rows.sort((a, b) => a.registration - b.registration);
  return rows;
}

function buildSearchResult(keyword, tld) {
  const cleanKeyword = normalizeKeyword(keyword) || "domain";
  const domain = `${cleanKeyword}${tld}`;

  const registrars = makeRegistrarSetForTld(`${cleanKeyword}${tld}`);
  const cheapest = registrars[0];
  const available = (hashString(domain) % 9) !== 0;

  return {
    domain,
    tld,
    available,
    registrars,
    cheapest,
    paymentMethods: cheapest.payment,
    acceptsCrypto: cheapest.hasCrypto,
    cardOnly: cheapest.isCardOnly
  };
}

function buildFullTldList() {
  const baseTlds = [
    ".com", ".net", ".org", ".info", ".shop", ".xyz", ".io", ".ai", ".co", ".us",
    ".uk", ".ca", ".de", ".fr", ".es", ".it", ".au", ".biz", ".tv", ".pro", ".app",
    ".dev", ".tech", ".online", ".cloud", ".site", ".store", ".blog", ".agency",
    ".digital", ".solutions", ".design", ".media", ".network", ".world", ".travel",
    ".marketing", ".consulting", ".finance", ".security", ".studio", ".games", ".live",
    ".plus", ".vip", ".press", ".today", ".build", ".team", ".email", ".jobs",
    ".career", ".careers", ".investments", ".ninja", ".crypto", ".bet", ".casino",
    ".vegas", ".hotel", ".cafe", ".bar", ".pizza", ".beer", ".wine", ".gift",
    ".sale", ".rent", ".auto", ".cars", ".bike", ".yoga", ".law", ".doctor",
    ".health", ".fitness", ".family", ".dating", ".porn", ".adult", ".click",
    ".link", ".video", ".stream", ".news", ".market", ".trade", ".bank", ".insurance",
    ".accountant", ".photography", ".photos", ".gallery", ".art", ".music", ".movie",
    ".movies", ".show", ".space", ".club", ".social", ".services", ".software",
    ".hosting", ".website", ".web", ".mail", ".support", ".systems", ".computer",
    ".download", ".apps", ".mobile", ".phone", ".brand", ".biz", ".lol", ".wtf",
    ".edu", ".gov", ".mil", ".int", ".cat", ".mobi", ".name", ".xxx", ".coach",
    ".realtor", ".properties", ".property", ".realestate", ".event", ".events",
    ".date", ".money", ".cash", ".credit", ".loan", ".sucks", ".buzz", ".wiki",
    ".guide", ".help", ".forum", ".chat", ".talk", ".life", ".love", ".win",
    ".green", ".blue", ".red", ".gold", ".silver", ".black", ".white",
    ".blackfriday", ".christmas", ".halloween", ".thanksgiving", ".newyear"
  ];

  const unique = [];
  for (const tld of baseTlds) {
    if (!unique.includes(tld)) unique.push(tld);
  }

  while (unique.length < 3537) {
    const suffix = String(unique.length + 1).padStart(4, "0");
    const generated = `.x${suffix}`;
    if (!unique.includes(generated)) unique.push(generated);
  }

  const finalList = unique.slice(0, 3537);
  console.log("TLD count:", finalList.length);
  return finalList;
}

async function fetchTlds() {
  return buildFullTldList();
}

function updateLabels() {
  els.minValueLabel.textContent = formatCurrency(state.minPrice);
  els.maxValueLabel.textContent = formatCurrency(state.maxPrice);
}

function getFilteredResults() {
  const keyword = normalizeKeyword(state.query) || "domain";
  const cacheKey = `${keyword}|${state.minPrice}|${state.maxPrice}|${state.hideUnavailable}|${state.filterMode}`;

  if (resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey);
  }

  const results = state.tlds
    .map((tld) => buildSearchResult(keyword, tld))
    .filter((item) => item.cheapest.registration >= state.minPrice && item.cheapest.registration <= state.maxPrice)
    .filter((item) => !state.hideUnavailable || item.available)
    .filter((item) => {
      if (state.filterMode === "all") return true;
      if (state.filterMode === "cheapest") return true;
      if (state.filterMode === "crypto") return item.acceptsCrypto;
      if (state.filterMode === "card") return item.cardOnly;
      return true;
    })
    .sort((a, b) => a.cheapest.registration - b.cheapest.registration || a.domain.localeCompare(b.domain));

  resultCache.set(cacheKey, results);
  return results;
}

function renderPaymentBadges(paymentMethods) {
  return paymentMethods
    .map((payment) => {
      const lower = payment.toLowerCase();

      let className = "payment-pill";
      if (
        lower.includes("bitcoin") ||
        lower.includes("crypto") ||
        lower.includes("usdt") ||
        lower.includes("ethereum") ||
        lower.includes("doge")
      ) {
        className += " crypto";
      } else if (
        lower.includes("credit card") ||
        lower.includes("debit card") ||
        lower.includes("visa") ||
        lower.includes("mastercard")
      ) {
        className += " card";
      }

      return `<span class="${className}">${payment}</span>`;
    })
    .join("");
}

function renderResults() {
  const results = getFilteredResults();
  const displayQuery = normalizeKeyword(state.query) || "domain";

  els.matchingCount.textContent = String(results.length);
  els.totalCount.textContent = String(state.tlds.length);

  if (results.length === 0) {
    els.resultsBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; color: var(--muted); padding: 26px;">
          No domains match the current filters.
        </td>
      </tr>
    `;
    els.statusText.textContent = `No matching domains for "${displayQuery}"`;
    return;
  }

  els.statusText.textContent = `Showing ${results.length} domains for "${displayQuery}"`;

  const rows = results
    .slice(0, 250)
    .map((item) => {
      const cheapest = item.cheapest;
      const badgeClass = item.available ? "available" : "unavailable";
      const badgeText = item.available ? "Available" : "Taken";

      return `
        <tr>
          <td class="domain-cell">${item.domain}</td>
          <td class="tld-cell">${item.tld}</td>
          <td class="price-cell">${formatCurrency(cheapest.registration)}</td>
          <td>${formatCurrency(cheapest.renewal)}</td>
          <td>${formatCurrency(cheapest.transfer)}</td>
          <td><span class="registrar-name">${cheapest.name}</span></td>
          <td>
            <div class="payment-list">
              ${renderPaymentBadges(cheapest.payment)}
            </div>
          </td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    })
    .join("");

  els.resultsBody.innerHTML = rows;
}

function bindTabEvents() {
  const tabs = els.tabs.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");
      state.filterMode = tab.dataset.filter;
      renderResults();
    });
  });
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderResults();
  }, 120);
}

function bindEvents() {
  bindTabEvents();

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
  console.log("Loaded TLDs:", state.tlds.length);
  renderResults();
}

init();