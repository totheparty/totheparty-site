let allDeals = [];
let activeDestination = 'all';
let activeAirport = 'all';
let activeMonth = 'all';
let activeBoard = 'all';
let activeTag = 'all';
let activeMaxBudget = null;
let activeMinRating = 0;
let currentPage = 1;
const PAGE_SIZE = 10;

function matchesFilters(deal) {
  if (activeDestination !== 'all' && deal.destination !== activeDestination) return false;
  if (activeAirport !== 'all' && deal.airport !== activeAirport) return false;
  if (activeMonth !== 'all' && deal.departureMonth !== activeMonth) return false;
  if (activeBoard !== 'all' && deal.board !== activeBoard) return false;
  if (activeTag !== 'all' && deal.tag !== activeTag) return false;
  if (activeMaxBudget !== null && deal.now > activeMaxBudget) return false;
  if (activeMinRating > 0 && (!deal.rating || deal.rating < activeMinRating)) return false;
  return true;
}

function renderStars(rating) {
  const rounded = Math.round(rating);
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < rounded ? '★' : '☆';
  }
  return stars;
}

function renderDeals() {
  const grid = document.getElementById('deals-grid');
  const empty = document.getElementById('deals-empty');
  const pagination = document.getElementById('pagination');
  const filtered = allDeals.filter(matchesFilters);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    pagination.innerHTML = '';
    return;
  }
  empty.hidden = true;

  const start = (currentPage - 1) * PAGE_SIZE;
  const toShow = filtered.slice(start, start + PAGE_SIZE);

  grid.innerHTML = toShow.map(deal => {
    const wasLine = deal.was ? `<span class="deal-was">was £${deal.was}</span>` : '';
    const starsHtml = deal.rating ? `<div class="deal-stars">${renderStars(deal.rating)} <span class="deal-rating-num">${deal.rating.toFixed(1)}</span></div>` : '';
    const depositHtml = deal.deposit ? `<span class="deal-deposit">£${deal.deposit}pp deposit</span>` : '';
    const hotIconHtml = deal.tag === 'hot' ? `<span class="deal-hot-icon" aria-hidden="true">🔥</span>` : '';
    return `
    <a class="deal-card" href="${deal.link}" target="_blank" rel="noopener">
      <div class="deal-image" style="background-image: url('${deal.image}')">
        <span class="deal-tag-overlay ${deal.tag}">${deal.tag.replace('-', ' ')}</span>
        ${hotIconHtml}
        <div class="deal-overlay-content">
          <div class="deal-headline">${deal.headline}</div>
          ${starsHtml}
          <div class="deal-badges">
            <span class="badge">${deal.board}</span>
            <span class="badge">Hotel + Flight</span>
            <span class="badge">${deal.nights} nights</span>
          </div>
          <div class="deal-price-row">
            ${wasLine}
            <span class="deal-now">from £${deal.now}</span>
            <span class="deal-pp">pp</span>
          </div>
        </div>
        ${depositHtml}
      </div>
    </a>
  `;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-dot${i === currentPage ? ' active' : ''}" data-page="${i}" aria-label="Page ${i}" aria-current="${i === currentPage ? 'page' : 'false'}">${i}</button>`;
  }
  pagination.innerHTML = html;

  pagination.querySelectorAll('.page-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentPage = parseInt(dot.dataset.page, 10);
      renderDeals();
      document.getElementById('deals').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function updateStats() {
  const dealsEl = document.getElementById('stat-deals');
  const lowestEl = document.getElementById('stat-lowest');
  if (dealsEl) dealsEl.textContent = allDeals.length;
  if (lowestEl) {
    const lowest = Math.min(...allDeals.map(d => d.now));
    lowestEl.textContent = `£${lowest}`;
  }
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el || allDeals.length === 0) return;
  const dates = allDeals.map(d => d.lastUpdated).filter(Boolean).map(d => new Date(d));
  if (dates.length === 0) return;
  const mostRecent = new Date(Math.max(...dates));
  const formatted = mostRecent.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  el.textContent = `last updated: ${formatted}`;
}

function syncDestinationControls(value) {
  activeDestination = value;
  const destSelect = document.getElementById('finder-destination');
  if (destSelect) destSelect.value = value;
}

function resetAllCategoryShortcuts() {
  activeMinRating = 0;
  activeBoard = 'all';
  activeMaxBudget = null;
  activeTag = 'all';
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
}

function setupCategoryShortcuts() {
  const allShortcutBtns = document.querySelectorAll('.category-btn[data-rating-shortcut], .category-btn[data-board], .category-btn[data-budget-shortcut], .category-btn[data-tag-shortcut]');

  allShortcutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');
      resetAllCategoryShortcuts();

      if (!wasActive) {
        if (btn.dataset.ratingShortcut) activeMinRating = Number(btn.dataset.ratingShortcut);
        else if (btn.dataset.board) activeBoard = btn.dataset.board;
        else if (btn.dataset.budgetShortcut) activeMaxBudget = Number(btn.dataset.budgetShortcut);
        else if (btn.dataset.tagShortcut) activeTag = btn.dataset.tagShortcut;
        btn.classList.add('active');
      }

      currentPage = 1;
      renderDeals();
      if (!wasActive) {
        document.getElementById('deals').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function setupHeaderSearch() {
  const form = document.getElementById('header-search-form');
  const input = document.getElementById('header-search-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    const match = allDeals.find(d =>
      d.destination.toLowerCase().includes(query) ||
      (d.headline && d.headline.toLowerCase().includes(query)) ||
      (d.resort && d.resort.toLowerCase().includes(query))
    );
    if (match) {
      syncDestinationControls(match.destination);
      currentPage = 1;
      renderDeals();
    }
    document.getElementById('deals').scrollIntoView({ behavior: 'smooth' });
  });
}

function setupFinder() {
  const form = document.getElementById('finder-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    syncDestinationControls(document.getElementById('finder-destination').value);
    activeAirport = document.getElementById('finder-airport').value;
    activeMonth = document.getElementById('finder-month').value;
    currentPage = 1;
    document.getElementById('deals').scrollIntoView({ behavior: 'smooth' });
    renderDeals();
  });
}

function setupAlertForm() {
  const form = document.getElementById('alert-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('alert-form').hidden = true;
    document.getElementById('alert-confirm').hidden = false;
  });
}

function applyDestFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('dest');
  if (!dest) return;
  syncDestinationControls(dest);
}

function nudgeCategoryRow() {
  const row = document.getElementById('category-row');
  if (!row || window.innerWidth >= 640) return;

  function doNudge() {
    row.scrollTo({ left: 44, behavior: 'smooth' });
    setTimeout(() => {
      row.scrollTo({ left: 0, behavior: 'smooth' });
    }, 500);
  }

  setTimeout(() => {
    doNudge();
    setTimeout(doNudge, 3000);
  }, 700);
}

async function init() {
  try {
    const res = await fetch('deals.json');
    allDeals = await res.json();
  } catch (err) {
    console.error('Could not load deals', err);
    allDeals = [];
  }
  applyDestFromUrl();
  updateStats();
  updateLastUpdated();
  renderDeals();
  setupCategoryShortcuts();
  setupFinder();
  setupHeaderSearch();
  setupAlertForm();
  nudgeCategoryRow();
}

init();
