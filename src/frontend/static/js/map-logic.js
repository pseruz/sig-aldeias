// js/map-logic.js — Marcadores, camadas operacionais, validação (Fases 2.2-C/D + híbrido)

const STATUS_COLORS = {
    pendente: '#DC3545',
    validado: '#28A745',
    rejeitado: '#6C757D',
};

const VULNERABLE_BORDER = '#FFC107';
const EVACUATION_ROUTE_COLOR = '#0D6EFD';

const MOCK_FIRE_ZONES = [
    [
        [40.218, -8.062],
        [40.225, -8.048],
        [40.232, -8.055],
        [40.218, -8.062],
    ],
];

const MOCK_FLOOD_ZONES = [
    [
        [40.212, -8.038],
        [40.220, -8.028],
        [40.228, -8.035],
        [40.212, -8.038],
    ],
];

let map;
let markersLayer;
let lastHouseholds = [];
const markerRegistry = new Map();
let selectedHouseholdId = null;

window.evacuationLayer = null;
window.riskLayers = null;
window.fireLayer = null;
window.floodLayer = null;

function getMapMode() {
    return (
        window.PC_MAP_MODE ||
        document.getElementById('map-page-root')?.dataset.pcMode ||
        'command'
    );
}

function updateAuthSection() {
    const el = document.getElementById('auth-section');
    if (!el) return;
    const token = localStorage.getItem('access_token');
    el.textContent = token ? 'JWT ativo' : 'Sem token JWT';
    el.className = token ? 'pc-auth-badge pc-auth-badge--ok' : 'pc-auth-badge pc-auth-badge--warn';
}

/** Cores por status; borda amarela se idosos ou crianças */
function getColorCode(household) {
    const fillColor = STATUS_COLORS[household.status] || STATUS_COLORS.rejeitado;
    const vulnerable = Boolean(household.has_elderly || household.has_children);

    return {
        fillColor,
        color: vulnerable ? VULNERABLE_BORDER : fillColor,
        weight: vulnerable ? 3 : 1,
    };
}

function getMarkerStyle(household) {
    const { fillColor, color, weight } = getColorCode(household);
    const isPending = household.status === 'pendente';

    return {
        radius: 8,
        fillColor,
        color: isPending ? VULNERABLE_BORDER : color,
        weight: isPending ? 4 : weight,
        opacity: 1,
        fillOpacity: isPending ? 0.6 : 0.85,
    };
}

function formatVulnerabilityIcons(household) {
    const icons = [];
    if (household.has_elderly) icons.push('👵');
    if (household.has_children) icons.push('👶');
    if (household.has_mobility_issues) icons.push('♿');
    return icons.length ? icons.join(' ') : '—';
}

function formatPopup(household) {
    const statusLabel = {
        pendente: 'Pendente',
        validado: 'Validado',
        rejeitado: 'Rejeitado',
    }[household.status] || household.status;

    return `
        <div class="pc-map-popup">
            <strong>${household.name}</strong><br>
            <small>${statusLabel} · ${household.material}</small><br>
            <span>${formatVulnerabilityIcons(household)}</span><br>
            <small>${household.num_people} pessoas · ${household.num_floors} pisos</small>
        </div>
    `;
}

function formatDrawerContent(household) {
    const statusLabel = {
        pendente: 'Pendente',
        validado: 'Validado',
        rejeitado: 'Rejeitado',
    }[household.status] || household.status;

    const submitted = household.created_at
        ? new Date(household.created_at).toLocaleString('pt-PT')
        : '—';

    return `
        <p class="mb-2"><strong>Estado:</strong> ${statusLabel}</p>
        <p class="mb-2"><strong>Material:</strong> ${household.material}</p>
        <p class="mb-2"><strong>Ocupação:</strong> ${household.num_people} pessoas · ${household.num_floors} pisos</p>
        <p class="mb-2"><strong>Vulnerabilidade:</strong> ${formatVulnerabilityIcons(household)}</p>
        <p class="mb-2"><strong>Coordenadas:</strong> ${household.latitude.toFixed(5)}, ${household.longitude.toFixed(5)}</p>
        <p class="mb-2"><strong>Submissão:</strong> ${submitted}</p>
        ${household.rejection_reason ? `<p class="mt-2 mb-0"><strong>Motivo rejeição:</strong> ${household.rejection_reason}</p>` : ''}
    `;
}

function shouldShowBIM(household) {
    const name = (household.name || '').toLowerCase();
    const publicKeywords = ['hotel', 'pavilhão', 'pavilhao', 'escola'];
    const isPublic = publicKeywords.some((kw) => name.includes(kw));
    return (
        household.num_floors >= 2 ||
        household.material === 'betão' ||
        isPublic
    );
}

function renderInfraRevitPanel(household) {
    if (!shouldShowBIM(household)) return '';

    const exits = Math.floor(household.num_floors * 0.5) + 1;
    const hydrants = Math.max(1, Math.floor(household.num_floors / 2));
    const meetingPoints = 1;

    return `
        <section class="pc-bim-section" aria-label="Infraestrutura Revit">
            <h3>Infraestrutura Revit (Simulação)</h3>
            <div class="pc-bim-row">
                <i class="bi bi-door-open pc-bim-icon" aria-hidden="true"></i>
                <span class="pc-bim-label">Saídas de Emergência</span>
                <span class="pc-bim-count" id="exits-count">${exits}</span>
            </div>
            <div class="pc-bim-row">
                <i class="bi bi-fire pc-bim-icon" aria-hidden="true"></i>
                <span class="pc-bim-label">Bocas de Incêndio</span>
                <span class="pc-bim-count" id="hydrants-count">${hydrants}</span>
            </div>
            <div class="pc-bim-row">
                <i class="bi bi-geo-alt pc-bim-icon" aria-hidden="true"></i>
                <span class="pc-bim-label">Pontos de Encontro</span>
                <span class="pc-bim-count" id="meeting-points-count">${meetingPoints}</span>
            </div>
        </section>
    `;
}

/** Secção BIM condicional + botão Validar (modo campo / legado) */
function renderBIMPanel(household) {
    if (!shouldShowBIM(household)) return '';

    return `
        ${renderInfraRevitPanel(household)}
        <button type="button" class="btn pc-btn-critical w-100 mt-2" id="btn-validate-technical"
                data-household-id="${household.id}">
            Validar Dados Técnicos
        </button>
        <div id="validate-msg" class="pc-validate-msg" role="status" aria-live="polite"></div>
    `;
}

function renderValidationPanel(household) {
    let html = formatDrawerContent(household) + renderInfraRevitPanel(household);

    if (household.status === 'pendente') {
        html += `
            <div class="d-grid gap-2 mt-2">
                <button type="button" class="btn pc-btn-critical" id="btn-validate-publish">
                    ✓ Validar e Publicar
                </button>
                <button type="button" class="btn btn-outline-danger" id="btn-reject-open">
                    ✕ Rejeitar
                </button>
            </div>
        `;
    }

    html += '<div id="validate-msg" class="pc-validate-msg" role="status" aria-live="polite"></div>';
    return html;
}

function wireValidateButton(household) {
    const btn = document.getElementById('btn-validate-technical');
    if (!btn) return;
    btn.addEventListener('click', () =>
        validateHousehold(household.id, 'validado', 'Validação técnica operacional (mapa)')
    );
}

function wireCommandValidationButtons(household) {
    selectedHouseholdId = household.id;

    document.getElementById('btn-validate-publish')?.addEventListener('click', () =>
        validateHousehold(household.id, 'validado', 'Validado por supervisor')
    );

    document.getElementById('btn-reject-open')?.addEventListener('click', () => {
        const modal = document.getElementById('rejectModal');
        if (modal && window.bootstrap) {
            window.bootstrap.Modal.getOrCreateInstance(modal).show();
        }
    });

    document.getElementById('btn-reject-confirm')?.addEventListener('click', async () => {
        const reason = document.getElementById('reject-reason')?.value?.trim();
        if (!reason || reason.length < 5) {
            alert('A justificação deve ter pelo menos 5 caracteres.');
            return;
        }
        await validateHousehold(household.id, 'rejeitado', reason);
        const modal = document.getElementById('rejectModal');
        if (modal && window.bootstrap) {
            window.bootstrap.Modal.getOrCreateInstance(modal).hide();
        }
    });
}

function updateMarkerForHousehold(household) {
    const marker = markerRegistry.get(household.id);
    if (!marker) return;
    marker.setStyle(getMarkerStyle(household));
    marker.setPopupContent(formatPopup(household));
}

async function validateHousehold(householdId, status = 'validado', reason = 'Validado por supervisor') {
    const msgEl = document.getElementById('validate-msg');
    if (msgEl) {
        msgEl.textContent = 'A processar…';
        msgEl.className = 'pc-validate-msg';
    }

    try {
        const response = await fetch(`/validation/${householdId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ status, reason }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }

        const idx = lastHouseholds.findIndex((h) => h.id === householdId);
        if (idx >= 0) {
            lastHouseholds[idx].status = status;
            if (status === 'rejeitado') {
                lastHouseholds[idx].rejection_reason = reason;
            }
            updateMarkerForHousehold(lastHouseholds[idx]);
            abrirDetalhe(lastHouseholds[idx]);
        }

        if (msgEl) {
            msgEl.textContent =
                status === 'validado'
                    ? 'Agregado validado e publicado.'
                    : 'Agregado rejeitado.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--ok';
        }
    } catch (err) {
        console.error('Erro na validação:', err);
        if (msgEl) {
            msgEl.textContent = 'Falha na validação. Verifique token JWT e permissões.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--err';
        }
    }
}

function buildMockEvacuationRoutes(households) {
    const coords = households
        .map((h) => ({ lat: Number(h.latitude), lon: Number(h.longitude) }))
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && !(c.lat === 0 && c.lon === 0));

    const routes = [];
    for (let i = 0; i < coords.length - 1; i += 1) {
        const a = coords[i];
        const b = coords[i + 1];
        routes.push([
            [a.lat, a.lon],
            [(a.lat + b.lat) / 2 + 0.0008, (a.lon + b.lon) / 2 - 0.0006],
            [b.lat, b.lon],
        ]);
    }
    if (routes.length === 0 && coords.length === 1) {
        const c = coords[0];
        routes.push([[c.lat, c.lon], [c.lat + 0.002, c.lon + 0.001]]);
    }
    return routes;
}

function drawEvacuationRoutes(enabled) {
    if (!map) return;
    if (window.evacuationLayer) {
        map.removeLayer(window.evacuationLayer);
        window.evacuationLayer = null;
    }
    if (!enabled) return;

    window.evacuationLayer = L.layerGroup();
    buildMockEvacuationRoutes(lastHouseholds).forEach((latlngs) => {
        L.polyline(latlngs, { color: EVACUATION_ROUTE_COLOR, weight: 4, opacity: 0.7 })
            .bindPopup('<small>Rotas calculadas para evacuação prioritária</small>')
            .addTo(window.evacuationLayer);
    });
    window.evacuationLayer.addTo(map);
}

function drawRiskZones(enabled) {
    if (!map) return;
    if (window.riskLayers) {
        map.removeLayer(window.riskLayers);
        window.riskLayers = null;
    }
    if (!enabled) return;

    window.riskLayers = L.layerGroup();
    lastHouseholds.forEach((household) => {
        const lat = Number(household.latitude);
        const lon = Number(household.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        if (household.status === 'pendente') {
            L.circle([lat, lon], {
                radius: 100,
                color: '#DC3545',
                fillColor: '#DC3545',
                fillOpacity: 0.2,
                weight: 1,
            })
                .bindPopup(`<small>Alto risco — ${household.name}</small>`)
                .addTo(window.riskLayers);
        }
        if (household.has_elderly) {
            L.circle([lat, lon], {
                radius: 50,
                color: '#FFC107',
                fillColor: '#FFC107',
                fillOpacity: 0.2,
                weight: 1,
            })
                .bindPopup(`<small>Médio risco (idosos) — ${household.name}</small>`)
                .addTo(window.riskLayers);
        }
    });
    window.riskLayers.addTo(map);
}

function drawFireZones(enabled) {
    if (!map) return;
    if (window.fireLayer) {
        map.removeLayer(window.fireLayer);
        window.fireLayer = null;
    }
    if (!enabled) return;

    window.fireLayer = L.layerGroup();
    MOCK_FIRE_ZONES.forEach((ring) => {
        L.polygon(ring, {
            color: '#DC3545',
            fillColor: '#DC3545',
            fillOpacity: 0.2,
            weight: 2,
        })
            .bindPopup('<small>Mancha de incêndio (simulação)</small>')
            .addTo(window.fireLayer);
    });
    window.fireLayer.addTo(map);
}

function drawFloodZones(enabled) {
    if (!map) return;
    if (window.floodLayer) {
        map.removeLayer(window.floodLayer);
        window.floodLayer = null;
    }
    if (!enabled) return;

    window.floodLayer = L.layerGroup();
    MOCK_FLOOD_ZONES.forEach((ring) => {
        L.polygon(ring, {
            color: '#0D6EFD',
            fillColor: '#0D6EFD',
            fillOpacity: 0.2,
            weight: 2,
        })
            .bindPopup('<small>Zona de cheias (simulação)</small>')
            .addTo(window.floodLayer);
    });
    window.floodLayer.addTo(map);
}

function refreshOperationalLayers() {
    drawEvacuationRoutes(Boolean(document.getElementById('toggle-evacuation')?.checked));
    drawRiskZones(Boolean(document.getElementById('toggle-risk')?.checked));
    drawFireZones(Boolean(document.getElementById('toggle-fire')?.checked));
    drawFloodZones(Boolean(document.getElementById('toggle-flood')?.checked));
}

/** Marcador circular 8px com popup formatado */
function createCustomMarker(lat, lon, household) {
    const marker = L.circleMarker([lat, lon], getMarkerStyle(household));
    marker.bindPopup(formatPopup(household));
    marker.on('click', () => {
        marker.openPopup();
        abrirDetalhe(household);
    });
    markerRegistry.set(household.id, marker);
    return marker;
}

function buildFilterQuery() {
    const params = new URLSearchParams();
    const material = document.getElementById('filter-material')?.value;
    const status = document.getElementById('filter-status')?.value;
    const elderly = document.getElementById('filter-elderly')?.checked;
    const children = document.getElementById('filter-children')?.checked;

    if (material) params.set('material', material);
    if (status) params.set('status', status);
    if (elderly) params.set('has_elderly', 'true');
    if (children) params.set('has_children', 'true');
    return params;
}

function applyClientFilters(households) {
    const mobility = document.getElementById('filter-mobility')?.checked;
    if (!mobility) return households;
    return households.filter((h) => h.has_mobility_issues);
}

/** Fetch GET /households/ e renderiza marcadores */
async function loadHouseholdMarkers() {
    const params = buildFilterQuery();
    const url = params.toString() ? `/households/?${params}` : '/households/';

    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const households = applyClientFilters(Array.isArray(data) ? data : []);
        lastHouseholds = households;

        markersLayer.clearLayers();
        markerRegistry.clear();

        const bounds = [];
        households.forEach((household) => {
            const lat = Number(household.latitude);
            const lon = Number(household.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return;
            createCustomMarker(lat, lon, household).addTo(markersLayer);
            bounds.push([lat, lon]);
        });

        if (bounds.length === 1) map.setView(bounds[0], 15);
        else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });

        refreshOperationalLayers();
    } catch (err) {
        console.error('Erro ao carregar agregados:', err);
        const contentEl = document.getElementById('drawer-content');
        if (contentEl) {
            contentEl.innerHTML =
                '<p class="text-warning mb-0">Não foi possível carregar agregados. Verifique ligação ou token JWT.</p>';
        }
    }
}

/** Carrega apenas agregados pendentes (atalho supervisor) */
async function loadPendingMarkers() {
    const statusEl = document.getElementById('filter-status');
    if (statusEl) statusEl.value = 'pendente';
    await loadHouseholdMarkers();
}

function initMap() {
    map = L.map('map-container').setView([40.22, -8.05], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    window.evacuationLayer = null;
    window.riskLayers = null;
    window.fireLayer = null;
    window.floodLayer = null;
}

function wireMapControls() {
    document.getElementById('btn-refresh-map')?.addEventListener('click', () => loadHouseholdMarkers());
    document.getElementById('btn-load-pending')?.addEventListener('click', () => loadPendingMarkers());

    ['filter-material', 'filter-status', 'filter-elderly', 'filter-children', 'filter-mobility'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', () => loadHouseholdMarkers());
    });

    document.getElementById('toggle-evacuation')?.addEventListener('change', (e) =>
        drawEvacuationRoutes(e.target.checked)
    );
    document.getElementById('toggle-risk')?.addEventListener('change', (e) => drawRiskZones(e.target.checked));
    document.getElementById('toggle-fire')?.addEventListener('change', (e) => drawFireZones(e.target.checked));
    document.getElementById('toggle-flood')?.addEventListener('change', (e) => drawFloodZones(e.target.checked));
}

function abrirDetalhe(nomeOuHousehold) {
    const drawer = document.getElementById('drawer');
    const titleEl = document.getElementById('drawer-title');
    const contentEl = document.getElementById('drawer-content');

    if (typeof nomeOuHousehold === 'object' && nomeOuHousehold !== null) {
        titleEl.innerText = nomeOuHousehold.name;
        if (getMapMode() === 'command') {
            contentEl.innerHTML = renderValidationPanel(nomeOuHousehold);
            wireCommandValidationButtons(nomeOuHousehold);
        } else {
            contentEl.innerHTML =
                formatDrawerContent(nomeOuHousehold) + renderBIMPanel(nomeOuHousehold);
            wireValidateButton(nomeOuHousehold);
        }
    } else {
        titleEl.innerText = nomeOuHousehold;
        contentEl.innerHTML = `<p>Dados detalhados sobre ${nomeOuHousehold} serão carregados aqui...</p>`;
    }

    drawer.classList.add('open');
    const detailsToggle = document.getElementById('pc-toggle-details');
    if (detailsToggle) detailsToggle.checked = true;
}

function fecharDrawer() {
    document.getElementById('drawer').classList.remove('open');
}

function showSubmittedAlert() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('submitted') !== '1') return;
    const alertEl = document.getElementById('map-submitted-alert');
    if (alertEl) {
        alertEl.classList.remove('d-none');
        setTimeout(() => alertEl.classList.add('d-none'), 8000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    updateAuthSection();
    wireMapControls();
    showSubmittedAlert();

    if (getMapMode() === 'command') {
        const pendingBtn = document.getElementById('btn-load-pending');
        if (pendingBtn) pendingBtn.classList.remove('d-none');
    }

    loadHouseholdMarkers();
    map.invalidateSize();
});
