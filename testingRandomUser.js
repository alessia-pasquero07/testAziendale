/**
 * testingRandomUser.js
 *
 * Libreria helper per Playwright (JavaScript).
 * Espone funzioni che ricevono un Playwright `page` e verificano le specifiche
 * elencate dall'utente. Le funzioni non dipendono dal test runner: restituiscono
 * un oggetto { ok: boolean, message?: string, details?: any } per essere riusate
 * come library.
 *
 * Uso rapido (esempio in un test Playwright):
 * const { runAll } = require('./testingRandomUser');
 * test('randomuser checks', async ({ page }) => {
 *   const results = await runAll(page, { url: 'http://localhost:3000' });
 *   expect(results.overall.ok).toBeTruthy();
 * });
 */

/** Default selectors e opzioni */
const DEFAULT_OPTIONS = {
  url: 'http://localhost:3000',
  selectors: {
    userCard: '.user-card',
    userName: '.user-name',
    userEmail: '.user-email',
    userNationality: '.user-nationality',
    refresh: '#refresh',
    navbarSecondItem: 'nav >> nth=1',
    userPhotoImg: '.user-photo img',
    documentation: '#documentation, .documentation',
    versionsNav: 'nav >> text=Versioni, nav >> text=RandomUser Versions, nav >> text=versioni',
    accessChart: '.access-chart, #access-chart',
    donateSection: '#donate, .donate'
  }
};

async function ensurePage(page, url) {
  const current = page.url();
  if (!current || current === 'about:blank') {
    await page.goto(url);
  }
}

async function checkUserCards(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const cards = await page.$$(sel.userCard);
  if (!cards || cards.length === 0) {
    return { ok: false, message: 'Nessuna user card trovata', details: { count: 0 } };
  }
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const name = await card.$(sel.userName);
    const email = await card.$(sel.userEmail);
    const nat = await card.$(sel.userNationality);
    if (!name || !email || !nat) {
      return { ok: false, message: `Card ${i} mancano campi obbligatori`, details: { index: i } };
    }
  }
  return { ok: true, message: 'User cards OK', details: { count: cards.length } };
}

async function checkRefreshCenters(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const refresh = await page.$(sel.refresh);
  if (refresh) await refresh.click();
  // prendi la prima card visibile e calcola se è approssimativamente al centro
  const card = await page.$(sel.userCard);
  if (!card) return { ok: false, message: 'Nessuna card trovata dopo refresh' };
  const box = await card.boundingBox();
  const viewport = page.viewportSize() || { width: 1024, height: 768 };
  if (!box) return { ok: false, message: 'Impossibile leggere bounding box della card' };
  const cardCenterX = box.x + box.width / 2;
  const cardCenterY = box.y + box.height / 2;
  const deltaX = Math.abs(cardCenterX - viewport.width / 2);
  const deltaY = Math.abs(cardCenterY - viewport.height / 2);
  const ok = deltaX < viewport.width * 0.25 && deltaY < viewport.height * 0.25;
  return { ok, message: ok ? 'Card centrata' : 'Card non centrata', details: { deltaX, deltaY, viewport } };
}

async function checkReadableInfo(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const cards = await page.$$(sel.userCard);
  if (!cards || cards.length === 0) return { ok: false, message: 'Nessuna card per verifica leggibilità' };
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    // verifica presenza di almeno un titolo e un paragrafo/testo
    const hasTitle = await card.$('h1, h2, h3, h4, h5, .title') !== null;
    const hasText = await card.$('p, span, .desc, .info') !== null;
    if (!hasTitle || !hasText) {
      return { ok: false, message: `Card ${i} non ha titolo o testo descrittivo`, details: { hasTitle, hasText } };
    }
  }
  return { ok: true, message: 'Informazioni di facile comprensione presenti' };
}

async function checkAdvancedSearchControls(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  // bottoni di navigazione
  const next = await page.$('button[aria-label="avanti"], button[aria-label="next"], button:has-text("Avanti")');
  const prev = await page.$('button[aria-label="indietro"], button[aria-label="prev"], button:has-text("Indietro")');
  const slider = await page.$('input[type="range"]');
  const radios = await page.$$('[type="radio"][name="gender"]');
  const checkboxes = await page.$$('[type="checkbox"][name="nationality"]');
  const ok = !!(next || prev) && !!slider && (radios && radios.length >= 2) && (checkboxes && checkboxes.length >= 1);
  return { ok, message: ok ? 'Controlli ricerca presenti' : 'Controlli ricerca mancanti o insufficienti', details: { next: !!next, prev: !!prev, slider: !!slider, radios: radios.length, checkboxes: checkboxes.length } };
}

async function checkNavbarPhotos(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const nav = await page.$(sel.navbarSecondItem);
  if (!nav) return { ok: false, message: 'Seconda voce navbar non trovata' };
  await nav.click();
  const imgs = await page.$$(sel.userPhotoImg);
  if (!imgs || imgs.length === 0) return { ok: false, message: 'Nessuna foto utente trovata' };
  // verifica transizione/opacità (semplice check: computed style opacity e transition)
  const first = imgs[0];
  const initialOpacity = await first.evaluate((el) => window.getComputedStyle(el).opacity);
  await page.waitForTimeout(500);
  const laterOpacity = await first.evaluate((el) => window.getComputedStyle(el).opacity);
  const transition = await first.evaluate((el) => window.getComputedStyle(el).transition || '');
  const ok = parseFloat(laterOpacity) >= parseFloat(initialOpacity) || transition.length > 0;
  return { ok, message: ok ? 'Foto con effetto progressivo rilevato' : 'Effetto progressivo non evidente', details: { initialOpacity, laterOpacity, transition } };
}

async function checkDocumentationAnchors(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const docs = await page.$(sel.documentation);
  if (!docs) return { ok: false, message: 'Sezione documentazione non trovata' };
  const anchors = await docs.$$('a[href^="#"]');
  if (!anchors || anchors.length === 0) return { ok: false, message: 'Nessun anchor interno nella documentazione' };
  for (let i = 0; i < anchors.length; i++) {
    const href = await anchors[i].getAttribute('href');
    if (href && href.startsWith('#')) {
      const id = href.slice(1);
      const target = await page.$(`#${id}`);
      if (!target) return { ok: false, message: `Anchor punta a id mancante: ${id}` };
    }
  }
  return { ok: true, message: 'Anchors validi nella documentazione', details: { anchors: anchors.length } };
}

async function checkVersionsNav(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const nav = await page.$(sel.versionsNav);
  return { ok: !!nav, message: nav ? 'Voce versioni presente' : 'Voce versioni assente' };
}

async function checkAccessChart(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  const chart = await page.$(sel.accessChart);
  if (!chart) return { ok: false, message: 'Grafico accessi non trovato' };
  const bars = await chart.$$('[class*="bar"], [class*="day"], div[data-progress]');
  return { ok: !!(bars && bars.length > 0), message: (bars && bars.length > 0) ? 'Grafico con elementi progressivi' : 'Grafico privo di elementi progressivi', details: { bars: bars ? bars.length : 0 } };
}

async function checkDonateAntiBot(page, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  await ensurePage(page, opts.url);
  const sel = opts.selectors;
  // prova ad aprire la sezione donate
  const donate = await page.$(sel.donateSection);
  if (!donate) return { ok: false, message: 'Sezione donate non trovata' };
  const robotCheckbox = await donate.$('input[type="checkbox"][aria-label*="robot"], label:has-text("non sono un robot")');
  const captchaFrame = await donate.$('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
  const ok = !!robotCheckbox || !!captchaFrame;
  return { ok, message: ok ? 'Anti-bot presente' : 'Anti-bot non trovato', details: { robotCheckbox: !!robotCheckbox, captchaFrame: !!captchaFrame } };
}

async function runAll(page, options = {}) {
  const results = {};
  results.userCards = await checkUserCards(page, options);
  results.refreshCenter = await checkRefreshCenters(page, options);
  results.readableInfo = await checkReadableInfo(page, options);
  results.advancedSearch = await checkAdvancedSearchControls(page, options);
  results.navbarPhotos = await checkNavbarPhotos(page, options);
  results.documentation = await checkDocumentationAnchors(page, options);
  results.versionsNav = await checkVersionsNav(page, options);
  results.accessChart = await checkAccessChart(page, options);
  results.donate = await checkDonateAntiBot(page, options);
  const overall = Object.values(results).every(r => r && r.ok);
  return { overall: { ok: overall }, details: results };
}

module.exports = {
  checkUserCards,
  checkRefreshCenters,
  checkReadableInfo,
  checkAdvancedSearchControls,
  checkNavbarPhotos,
  checkDocumentationAnchors,
  checkVersionsNav,
  checkAccessChart,
  checkDonateAntiBot,
  runAll
};
