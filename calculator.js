// ============================
// GOOD POOL CONCEPT — Devis
// Méthode de calcul identique à etancheite-piscine.fr
// ============================

// --- Pricing (posé, TTC, piscine rectangulaire) ---
const PRICING = {
    membrane: {
        'alkorplan-150': { price: 88,  label: 'Alkorplan 150/100' },
        'alkorplan-200': { price: 120, label: 'Alkorplan Touch 200/100' }
    },
    depose: 1200
};

const MAIL_TO = 'goodpoolconcept@outlook.fr';

// --- State ---
const state = {
    step: 1,
    totalSteps: 3,
    length: 8,
    width: 4,
    depthMin: 1.2,
    depthMax: 2,
    membrane: 'alkorplan-150',
    depose: false
};

// --- DOM refs ---
const form = document.getElementById('calculatorForm');
const progressBar = document.querySelector('.calc-progress-bar');
const steps = document.querySelectorAll('.calc-step');
const panels = document.querySelectorAll('.calc-panel');

// --- Formule etancheite-piscine.fr ---
// Fond incliné (pente prof. mini → prof. maxi le long de la longueur) :
//   Surface fond = √(L² + (profMax − profMin)²) × Largeur
// Parois :
//   Surface parois = 2 × (L + l) × Profondeur moyenne
function computeSurface() {
    const L = parseFloat(state.length)   || 0;
    const W = parseFloat(state.width)    || 0;
    const dMin = parseFloat(state.depthMin) || 0;
    const dMax = parseFloat(state.depthMax) || 0;
    const avgD = (dMin + dMax) / 2;

    const slopedFloorLength = Math.sqrt(L * L + Math.pow(dMax - dMin, 2));
    const bottomArea = slopedFloorLength * W;
    const wallArea   = 2 * (L + W) * avgD;
    const totalArea  = bottomArea + wallArea;
    const volume     = L * W * avgD;

    return {
        bottomArea: Math.round(bottomArea * 100) / 100,
        wallArea:   Math.round(wallArea   * 100) / 100,
        totalArea:  Math.round(totalArea  * 100) / 100,
        volume:     Math.round(volume     * 100) / 100
    };
}

function round2(n) { return Math.round(n * 100) / 100; }
function formatEuro(n) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Devis ---
function computeQuote() {
    const geom = computeSurface();
    const membrane = PRICING.membrane[state.membrane];
    const membraneCost = round2(geom.totalArea * membrane.price);
    const deposeCost   = state.depose ? PRICING.depose : 0;
    const total        = round2(membraneCost + deposeCost);

    return {
        geom,
        membraneLabel: membrane.label,
        membranePrice: membrane.price,
        membraneCost,
        deposeCost,
        total
    };
}

// --- Navigation ---
function goToStep(n) {
    state.step = Math.max(1, Math.min(state.totalSteps, n));
    panels.forEach(p => p.classList.toggle('active', +p.dataset.panel === state.step));
    steps.forEach(s => {
        const sn = +s.dataset.step;
        s.classList.toggle('active', sn === state.step);
        s.classList.toggle('done', sn < state.step);
    });
    const pct = ((state.step - 1) / (state.totalSteps - 1)) * 100;
    progressBar.style.background = `linear-gradient(90deg, var(--primary) ${pct}%, var(--line) ${pct}%)`;

    if (state.step === state.totalSteps) renderResult();
    document.querySelector('.calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Preview surface (étape dimensions) ---
function updatePreview() {
    const geom = computeSurface();
    const sp = document.getElementById('surfacePreview');
    const vp = document.getElementById('volumePreview');
    if (sp) sp.textContent = `${geom.totalArea} m²`;
    if (vp) vp.textContent = `${geom.volume} m³`;
}

// --- Construction du mailto pré-rempli ---
function buildMailto(q) {
    const subject = `Demande de devis PVC armé — ${q.membraneLabel}`;
    const lines = [
        'Bonjour,',
        '',
        'Je souhaite obtenir un devis pour la pose d\'une membrane PVC armé sur ma piscine. Voici l\'estimation obtenue via votre simulateur :',
        '',
        '— DIMENSIONS DU BASSIN —',
        `Longueur : ${state.length} m`,
        `Largeur : ${state.width} m`,
        `Profondeur mini : ${state.depthMin} m`,
        `Profondeur maxi : ${state.depthMax} m`,
        '',
        '— SURFACES CALCULÉES —',
        `Fond du bassin : ${q.geom.bottomArea} m²`,
        `Côtés du bassin : ${q.geom.wallArea} m²`,
        `Surface totale : ${q.geom.totalArea} m²`,
        `Volume approximatif : ${q.geom.volume} m³`,
        '',
        '— MEMBRANE CHOISIE —',
        `${q.membraneLabel} — ${q.membranePrice} €/m² posé`,
        `Coût membrane : ${formatEuro(q.membraneCost)} € TTC`
    ];
    if (q.deposeCost > 0) {
        lines.push(`Dépose ancien revêtement : ${formatEuro(q.deposeCost)} € TTC`);
    }
    lines.push(
        '',
        `ESTIMATION TOTALE : ${formatEuro(q.total)} € TTC`,
        '',
        '— MES COORDONNÉES —',
        'Nom :',
        'Téléphone :',
        'Ville du chantier :',
        '',
        'N\'hésitez pas à me recontacter pour convenir d\'une visite technique. Vous trouverez ci-joint quelques photos de mon bassin.',
        '',
        'Cordialement,'
    );
    const body = lines.join('\n');
    return `mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// --- Rendu résultat ---
function renderResult() {
    const q = computeQuote();
    document.getElementById('priceTotal').textContent = formatEuro(q.total) + ' € TTC';

    const list = document.getElementById('breakdownList');
    let html = '';
    html += `<li><span>Fond du bassin (incliné : √(L² + (Δprof)²) × largeur)</span><span>${q.geom.bottomArea} m²</span></li>`;
    html += `<li><span>Côtés du bassin (2 × (L + l) × prof. moyenne)</span><span>${q.geom.wallArea} m²</span></li>`;
    html += `<li class="breakdown-strong"><span>Surface totale à couvrir</span><span>${q.geom.totalArea} m²</span></li>`;
    html += `<li><span>${q.membraneLabel} — ${q.membranePrice} €/m² posé</span><span>${formatEuro(q.membraneCost)} €</span></li>`;
    if (q.deposeCost > 0) {
        html += `<li><span>Dépose ancien revêtement</span><span>${formatEuro(q.deposeCost)} €</span></li>`;
    }
    html += `<li class="breakdown-total"><span>Total estimé TTC</span><span>${formatEuro(q.total)} €</span></li>`;
    list.innerHTML = html;

    const mailBtn = document.getElementById('sendQuoteMail');
    if (mailBtn) mailBtn.setAttribute('href', buildMailto(q));
}

// --- Événements navigation ---
document.querySelectorAll('.calc-next').forEach(btn => {
    btn.addEventListener('click', () => goToStep(state.step + 1));
});
document.querySelectorAll('.calc-prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(state.step - 1));
});
document.querySelectorAll('.calc-restart').forEach(btn => {
    btn.addEventListener('click', () => goToStep(1));
});
document.querySelectorAll('.calc-step').forEach(s => {
    s.addEventListener('click', () => {
        const n = +s.dataset.step;
        if (n < state.step) goToStep(n);
    });
});

// --- Événements formulaire ---
form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'length')   state.length   = t.value;
    if (t.name === 'width')    state.width    = t.value;
    if (t.name === 'depthMin') state.depthMin = t.value;
    if (t.name === 'depthMax') state.depthMax = t.value;
    if (t.name === 'membrane') state.membrane = t.value;
    if (t.name === 'depose')   state.depose   = t.checked;
    updatePreview();
});

form.addEventListener('input', (e) => {
    if (['length','width','depthMin','depthMax'].includes(e.target.name)) {
        state[e.target.name] = e.target.value;
        updatePreview();
    }
});

// --- Nav scroll ---
window.addEventListener('scroll', () => {
    document.querySelector('.nav').classList.toggle('scrolled', window.scrollY > 20);
});

// --- Tarif tabs ---
document.querySelectorAll('.tarif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const key = tab.dataset.tab;
        document.querySelectorAll('.tarif-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.tarifs-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === key));
    });
});

// --- Init ---
updatePreview();
