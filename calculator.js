// ============================
// GOOD POOL CONCEPT — Devis
// ============================

// --- Pricing model ---
const PRICING = {
    coating: {
        liner: { min: 55, max: 78 },     // €/m² (75/100)
        pvc:   { min: 95, max: 135 }     // €/m² (150/100)
    },
    // Épaisseur : supplément €/m² sur base coating
    thickness: {
        liner: { '75': 0, '100': 18 },
        pvc:   { '150': 0, '200': 28 }
    },
    structure: {
        beton:     1.0,
        panneaux:  1.05,
        coque:     1.12
    },
    shape: {
        rectangle: 1.0,
        oval:      1.08,
        round:     1.05,
        freeform:  1.18
    },
    color: {
        'bleu-clair': 1.0,
        'bleu-fonce': 1.0,
        'sable':      1.05,
        'gris':       1.08
    },
    options: {
        escalier:      { type: 'flat',   value: 850,  label: 'Escalier / banquette' },
        frise:         { type: 'flat',   value: 480,  label: 'Frise décorative ligne d\'eau' },
        antiderapant:  { type: 'perM2',  value: 32,   label: 'Antidérapant fond de bassin' },
        feutrine:      { type: 'perM2',  value: 12,   label: 'Feutrine de protection 400g' },
        projecteurs:   { type: 'flat',   value: 690,  label: 'Projecteurs LED (jeu de 2)' },
        skimmer:       { type: 'flat',   value: 420,  label: 'Remplacement skimmers & buses' },
        preparation:   { type: 'perM2',  value: 28,   label: 'Préparation du support' },
        vidange:       { type: 'flat',   value: 380,  label: 'Vidange & remise en eau' }
    },
    base: { min: 850, max: 1200 }
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// --- State ---
const state = {
    step: 1,
    totalSteps: 5,
    shape: 'rectangle',
    structure: 'beton',
    length: 8,
    width: 4,
    depthMin: 1.2,
    depthMax: 2,
    coating: 'liner',
    thicknessLiner: '75',
    thicknessPvc: '150',
    color: 'bleu-clair',
    options: [],
    files: []
};

// --- DOM refs ---
const form = document.getElementById('calculatorForm');
const progressBar = document.querySelector('.calc-progress-bar');
const steps = document.querySelectorAll('.calc-step');
const panels = document.querySelectorAll('.calc-panel');

// --- Compute geometry ---
function computeSurface() {
    const { shape, length, width, depthMin, depthMax } = state;
    const L = parseFloat(length) || 0;
    const W = parseFloat(width) || 0;
    const dMin = parseFloat(depthMin) || 0;
    const dMax = parseFloat(depthMax) || 0;
    const avgD = (dMin + dMax) / 2;

    let bottomArea, perimeter, wallHeight = avgD;

    switch (shape) {
        case 'rectangle':
            bottomArea = L * W;
            perimeter = 2 * (L + W);
            break;
        case 'oval': {
            const a = L / 2, b = W / 2;
            bottomArea = Math.PI * a * b;
            perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
            break;
        }
        case 'round': {
            const r = L / 2;
            bottomArea = Math.PI * r * r;
            perimeter = 2 * Math.PI * r;
            break;
        }
        case 'freeform':
            bottomArea = L * W * 0.85;
            perimeter = 2 * (L + W) * 1.1;
            break;
        default:
            bottomArea = L * W;
            perimeter = 2 * (L + W);
    }

    const wallArea = perimeter * wallHeight;
    const developedSurface = bottomArea + wallArea;
    const volume = bottomArea * avgD;

    return {
        bottomArea: Math.round(bottomArea * 10) / 10,
        wallArea: Math.round(wallArea * 10) / 10,
        developedSurface: Math.round(developedSurface * 10) / 10,
        volume: Math.round(volume * 10) / 10
    };
}

// --- Compute quote ---
function computeQuote() {
    const geom = computeSurface();
    const surface = geom.developedSurface;

    const coatingPrice = PRICING.coating[state.coating];
    const thicknessKey = state.coating === 'liner' ? state.thicknessLiner : state.thicknessPvc;
    const thicknessSupp = PRICING.thickness[state.coating][thicknessKey] || 0;
    const structureMult = PRICING.structure[state.structure] || 1;
    const shapeMult = PRICING.shape[state.shape] || 1;
    const colorFactor = PRICING.color[state.color] || 1;

    // Options
    let optionsMin = 0, optionsMax = 0;
    const optionDetails = [];
    state.options.forEach(key => {
        const opt = PRICING.options[key];
        if (!opt) return;
        if (opt.type === 'flat') {
            optionsMin += opt.value;
            optionsMax += opt.value;
            optionDetails.push({ label: opt.label, price: opt.value });
        } else if (opt.type === 'perM2') {
            const cost = Math.round(opt.value * surface);
            optionsMin += cost;
            optionsMax += cost;
            optionDetails.push({ label: opt.label, price: cost });
        }
    });

    const perM2Min = (coatingPrice.min + thicknessSupp) * structureMult * shapeMult * colorFactor;
    const perM2Max = (coatingPrice.max + thicknessSupp) * structureMult * shapeMult * colorFactor;

    const coatingCostMin = surface * perM2Min;
    const coatingCostMax = surface * perM2Max;

    const totalMin = Math.round((coatingCostMin + PRICING.base.min + optionsMin) / 10) * 10;
    const totalMax = Math.round((coatingCostMax + PRICING.base.max + optionsMax) / 10) * 10;

    return {
        geom,
        surface,
        coatingCostMin: Math.round(coatingCostMin),
        coatingCostMax: Math.round(coatingCostMax),
        baseMin: PRICING.base.min,
        baseMax: PRICING.base.max,
        optionsMin,
        optionsMax,
        optionDetails,
        totalMin,
        totalMax,
        thicknessKey,
        thicknessSupp
    };
}

// --- UI: navigation ---
function goToStep(n) {
    // Validation before leaving step 4 (going to result)
    state.step = Math.max(1, Math.min(state.totalSteps, n));
    panels.forEach(p => p.classList.toggle('active', +p.dataset.panel === state.step));
    steps.forEach(s => {
        const sn = +s.dataset.step;
        s.classList.toggle('active', sn === state.step);
        s.classList.toggle('done', sn < state.step);
    });
    const pct = ((state.step - 1) / (state.totalSteps - 1)) * 100;
    progressBar.style.background = `linear-gradient(90deg, var(--primary) ${pct}%, var(--line) ${pct}%)`;

    if (state.step === 5) renderResult();
    document.querySelector('.calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- UI: preview surface ---
function updatePreview() {
    const geom = computeSurface();
    const sp = document.getElementById('surfacePreview');
    const vp = document.getElementById('volumePreview');
    if (sp) sp.textContent = `${geom.developedSurface} m²`;
    if (vp) vp.textContent = `${geom.volume} m³`;
}

// --- UI: adapt dimensions for round shape ---
function adaptDimensionsToShape() {
    const widthGroup = document.getElementById('widthGroup');
    const lengthLabel = document.querySelector('label[for="length"]');
    if (!widthGroup) return;
    if (state.shape === 'round') {
        widthGroup.style.display = 'none';
        if (lengthLabel) lengthLabel.textContent = 'Diamètre (m)';
    } else {
        widthGroup.style.display = '';
        if (lengthLabel) lengthLabel.textContent = 'Longueur (m)';
    }
}

// --- UI: adapt thickness group based on coating ---
function adaptThicknessGroup() {
    const linerG = document.getElementById('thicknessLinerGroup');
    const pvcG = document.getElementById('thicknessPvcGroup');
    if (!linerG || !pvcG) return;
    if (state.coating === 'liner') {
        linerG.style.display = '';
        pvcG.style.display = 'none';
    } else {
        linerG.style.display = 'none';
        pvcG.style.display = '';
    }
}

// --- Render result ---
function renderResult() {
    const q = computeQuote();
    document.getElementById('priceMin').textContent = q.totalMin.toLocaleString('fr-FR') + ' €';
    document.getElementById('priceMax').textContent = q.totalMax.toLocaleString('fr-FR') + ' €';

    const list = document.getElementById('breakdownList');
    const coatingLabel = state.coating === 'liner'
        ? `Liner ${q.thicknessKey}/100`
        : `PVC Armé ${q.thicknessKey}/100`;
    const shapeLabels = { rectangle: 'Rectangulaire', oval: 'Ovale', round: 'Ronde', freeform: 'Forme libre' };
    const colorLabels = { 'bleu-clair': 'Bleu clair', 'bleu-fonce': 'Bleu foncé', 'sable': 'Sable', 'gris': 'Gris ardoise' };

    let html = '';
    html += `<li><span>Bassin ${shapeLabels[state.shape].toLowerCase()} · surface développée</span><span>${q.geom.developedSurface} m²</span></li>`;
    html += `<li><span>Revêtement ${coatingLabel} · coloris ${colorLabels[state.color]}</span><span>${q.coatingCostMin.toLocaleString('fr-FR')} — ${q.coatingCostMax.toLocaleString('fr-FR')} €</span></li>`;
    html += `<li><span>Forfait déplacement & mise en service</span><span>${q.baseMin.toLocaleString('fr-FR')} — ${q.baseMax.toLocaleString('fr-FR')} €</span></li>`;
    q.optionDetails.forEach(o => {
        html += `<li><span>Option · ${o.label}</span><span>${o.price.toLocaleString('fr-FR')} €</span></li>`;
    });
    html += `<li><span>Total estimé TTC</span><span>${q.totalMin.toLocaleString('fr-FR')} — ${q.totalMax.toLocaleString('fr-FR')} €</span></li>`;
    list.innerHTML = html;
}

// --- Event bindings: navigation ---
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

// --- Form changes ---
form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'shape') { state.shape = t.value; adaptDimensionsToShape(); updatePreview(); }
    if (t.name === 'structure') state.structure = t.value;
    if (t.name === 'length') state.length = t.value;
    if (t.name === 'width') state.width = t.value;
    if (t.name === 'depthMin') state.depthMin = t.value;
    if (t.name === 'depthMax') state.depthMax = t.value;
    if (t.name === 'coating') { state.coating = t.value; adaptThicknessGroup(); }
    if (t.name === 'thicknessLiner') state.thicknessLiner = t.value;
    if (t.name === 'thicknessPvc') state.thicknessPvc = t.value;
    if (t.name === 'color') state.color = t.value;
    if (t.name === 'options') {
        state.options = Array.from(document.querySelectorAll('input[name="options"]:checked')).map(i => i.value);
    }
    updatePreview();
});

form.addEventListener('input', (e) => {
    if (['length','width','depthMin','depthMax'].includes(e.target.name)) {
        state[e.target.name] = e.target.value;
        updatePreview();
    }
});

// --- Upload logic ---
const uploadZone = document.getElementById('uploadZone');
const uploadInput = document.getElementById('quoteFiles');
const uploadList = document.getElementById('uploadList');

function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function renderFileList() {
    uploadList.innerHTML = '';
    state.files.forEach((f, idx) => {
        const li = document.createElement('li');
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        if (f.preview) thumb.style.backgroundImage = `url('${f.preview}')`;
        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `<strong>${f.file.name}</strong><span>${humanSize(f.file.size)}</span>`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Retirer';
        btn.addEventListener('click', () => {
            state.files.splice(idx, 1);
            renderFileList();
        });
        li.appendChild(thumb);
        li.appendChild(info);
        li.appendChild(btn);
        uploadList.appendChild(li);
    });
}

function addFiles(fileList) {
    for (const file of fileList) {
        if (state.files.length >= MAX_FILES) {
            alert(`Vous pouvez joindre jusqu'à ${MAX_FILES} photos maximum.`);
            break;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert(`Le fichier "${file.name}" dépasse 10 Mo.`);
            continue;
        }
        const entry = { file, preview: null };
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                entry.preview = e.target.result;
                renderFileList();
            };
            reader.readAsDataURL(file);
        }
        state.files.push(entry);
    }
    renderFileList();
}

if (uploadZone && uploadInput) {
    uploadZone.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', (e) => {
        addFiles(e.target.files);
        uploadInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(ev => {
        uploadZone.addEventListener(ev, (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(ev => {
        uploadZone.addEventListener(ev, (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });
    });
    uploadZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
}

// --- Validation ---
function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validatePhone(v) {
    return /^[0-9\s().+-]{8,}$/.test(v.replace(/\s/g, ''));
}

function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const field = input.closest('.field');
    let err = field.querySelector('.field-error');
    if (!err) {
        err = document.createElement('span');
        err.className = 'field-error';
        field.appendChild(err);
    }
    err.textContent = message;
    field.classList.add('has-error');
}
function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const field = input.closest('.field');
    field.classList.remove('has-error');
}

// --- Send quote ---
document.getElementById('sendQuote').addEventListener('click', async function() {
    const nameEl = document.getElementById('quoteName');
    const emailEl = document.getElementById('quoteEmail');
    const phoneEl = document.getElementById('quotePhone');
    const cityEl = document.getElementById('quoteCity');
    const consentEl = document.getElementById('quoteConsent');
    const btn = this;

    let valid = true;

    if (!nameEl.value.trim()) {
        showError('quoteName', 'Merci de renseigner votre nom.');
        valid = false;
    } else clearError('quoteName');

    if (!emailEl.value.trim()) {
        showError('quoteEmail', 'L\'email est obligatoire.');
        valid = false;
    } else if (!validateEmail(emailEl.value.trim())) {
        showError('quoteEmail', 'Format d\'email invalide.');
        valid = false;
    } else clearError('quoteEmail');

    if (!phoneEl.value.trim()) {
        showError('quotePhone', 'Le téléphone est obligatoire.');
        valid = false;
    } else if (!validatePhone(phoneEl.value.trim())) {
        showError('quotePhone', 'Format de téléphone invalide.');
        valid = false;
    } else clearError('quotePhone');

    if (!consentEl.checked) {
        alert('Merci d\'accepter la clause pour finaliser votre demande.');
        valid = false;
    }

    if (!valid) return;

    const quote = computeQuote();

    const fd = new FormData();
    fd.append('name',  nameEl.value.trim());
    fd.append('email', emailEl.value.trim());
    fd.append('phone', phoneEl.value.trim());
    fd.append('city',  cityEl.value.trim());
    fd.append('project', JSON.stringify({
        shape:     state.shape,
        structure: state.structure,
        length:    state.length,
        width:     state.width,
        depthMin:  state.depthMin,
        depthMax:  state.depthMax,
        coating:   state.coating,
        thickness: state.coating === 'liner' ? state.thicknessLiner : state.thicknessPvc,
        color:     state.color,
        options:   state.options
    }));
    fd.append('estimate', JSON.stringify({
        surface:  quote.geom.developedSurface,
        volume:   quote.geom.volume,
        totalMin: quote.totalMin,
        totalMax: quote.totalMax
    }));
    state.files.forEach(f => fd.append('files[]', f.file, f.file.name));

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Envoi en cours…';

    try {
        const res = await fetch('send-devis.php', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({ ok: false, error: 'Réponse serveur invalide.' }));

        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'Erreur lors de l\'envoi.');
        }

        btn.innerHTML = '✓ Demande envoyée — nous vous recontactons sous 24h';
        btn.style.background = '#10b981';
    } catch (err) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        alert('Impossible d\'envoyer la demande : ' + err.message + '\n\nContactez-nous directement à goodpoolconcept@outlook.fr');
    }
});

// --- Contact form ---
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        const fd = new FormData(contactForm);

        const name    = (fd.get('name')    || '').toString().trim();
        const email   = (fd.get('email')   || '').toString().trim();
        const message = (fd.get('message') || '').toString().trim();

        if (!name || !email || !message) {
            alert('Merci de renseigner votre nom, votre email et un message.');
            return;
        }
        if (!validateEmail(email)) {
            alert('Format d\'email invalide.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = 'Envoi en cours…';

        try {
            const res  = await fetch('send-contact.php', { method: 'POST', body: fd });
            const data = await res.json().catch(() => ({ ok: false, error: 'Réponse serveur invalide.' }));
            if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur inconnue.');
            btn.innerHTML = '✓ Message envoyé';
            btn.style.background = '#10b981';
            contactForm.reset();
        } catch (err) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            alert('Impossible d\'envoyer le message : ' + err.message + '\n\nContactez-nous directement à goodpoolconcept@outlook.fr');
        }
    });
}

// --- Nav scroll effect ---
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
adaptDimensionsToShape();
adaptThicknessGroup();
updatePreview();
