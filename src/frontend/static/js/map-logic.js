// js/map-logic.js — Marcadores, BIM/Revit e camadas de evacuação (Fases 2.2-C / 2.2-D)

const STATUS_COLORS = {
    pendente: '#DC3545',
    validado: '#28A745',
    rejeitado: '#6C757D',
};

const VULNERABLE_BORDER = '#FFC107';
const EVACUATION_ROUTE_COLOR = '#0D6EFD';

let map;
let markersLayer;
let lastHouseholds = [];

window.evacuationLayer = null;
window.riskLayers = null;

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

    return `
        <p class="mb-2"><strong>Estado:</strong> ${statusLabel}</p>
        <p class="mb-2"><strong>Material:</strong> ${household.material}</p>
        <p class="mb-2"><strong>Ocupação:</strong> ${household.num_people} pessoas · ${household.num_floors} pisos</p>
        <p class="mb-2"><strong>Vulnerabilidade:</strong> ${formatVulnerabilityIcons(household)}</p>
        <p class="mb-0"><strong>Coordenadas:</strong> ${household.latitude.toFixed(5)}, ${household.longitude.toFixed(5)}</p>
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

/** Secção BIM condicional + botão Validar Dados Técnicos */
function renderBIMPanel(household) {
    if (!shouldShowBIM(household)) {
        return '';
    }

    const exits = Math.floor(household.num_floors * 0.5) + 1;
    const hydrants = Math.max(1, Math.floor(household.num_floors / 2));
    const meetingPoints = 1;

    return `
        <section class="pc-bim-section" aria-label="Plano técnico de emergência">
            <h3>Plano Técnico de Emergência (Simulação BIM/Revit)</h3>
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
            <button type="button" class="btn pc-btn-critical w-100 mt-2" id="btn-validate-technical"
                    data-household-id="${household.id}">
                Validar Dados Técnicos
            </button>
            <div id="validate-msg" class="pc-validate-msg" role="status" aria-live="polite"></div>
        </section>
    `;
}

function wireValidateButton(household) {
    const btn = document.getElementById('btn-validate-technical');
    if (!btn) return;

    btn.addEventListener('click', () => validateHousehold(household.id));
}

async function validateHousehold(householdId) {
    const msgEl = document.getElementById('validate-msg');
    if (msgEl) {
        msgEl.textContent = 'A validar…';
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
            body: JSON.stringify({
                status: 'validado',
                reason: 'Validação técnica operacional (mapa)',
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }

        if (msgEl) {
            msgEl.textContent = 'Agregado validado com sucesso.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--ok';
        }
        await loadHouseholdMarkers();
    } catch (err) {
        console.error('Erro na validação:', err);
        if (msgEl) {
            msgEl.textContent = 'Falha na validação. Verifique o token JWT e permissões de técnico.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--err';
        }
    }
}

/** Gera rotas mock ligando agregados próximos */
function buildMockEvacuationRoutes(households) {
    const coords = households
        .map((h) => ({
            lat: Number(h.latitude),
            lon: Number(h.longitude),
        }))
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && !(c.lat === 0 && c.lon === 0));

    const routes = [];
    for (let i = 0; i < coords.length - 1; i += 1) {
        const a = coords[i];
        const b = coords[i + 1];
        const midLat = (a.lat + b.lat) / 2 + 0.0008;
        const midLon = (a.lon + b.lon) / 2 - 0.0006;
        routes.push([
            [a.lat, a.lon],
            [midLat, midLon],
            [b.lat, b.lon],
        ]);
    }

    if (routes.length === 0 && coords.length === 1) {
        const c = coords[0];
        routes.push([
            [c.lat, c.lon],
            [c.lat + 0.002, c.lon + 0.001],
            [c.lat + 0.001, c.lon + 0.003],
        ]);
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

    const routes = buildMockEvacuationRoutes(lastHouseholds);
    window.evacuationLayer = L.layerGroup();

    routes.forEach((latlngs) => {
        const line = L.polyline(latlngs, {
            color: EVACUATION_ROUTE_COLOR,
            weight: 4,
            opacity: 0.7,
        });
        line.bindPopup('<small>Rotas calculadas para evacuação prioritária</small>');
        window.evacuationLayer.addLayer(line);
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

function refreshOperationalLayers() {
    const evacToggle = document.getElementById('toggle-evacuation');
    const riskToggle = document.getElementById('toggle-risk');
    drawEvacuationRoutes(Boolean(evacToggle?.checked));
    drawRiskZones(Boolean(riskToggle?.checked));
}

/** Marcador circular 8px com popup formatado */
function createCustomMarker(lat, lon, household) {
    const { fillColor, color, weight } = getColorCode(household);

    const marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor,
        color,
        weight,
        opacity: 1,
        fillOpacity: 0.85,
    });

    marker.bindPopup(formatPopup(household));
    marker.on('click', () => {
        marker.openPopup();
        abrirDetalhe(household);
    });

    return marker;
}

function buildFilterQuery() {
    const params = new URLSearchParams();
    const material = document.getElementById('filter-material')?.value;
    const elderly = document.getElementById('filter-elderly')?.checked;
    const children = document.getElementById('filter-children')?.checked;

    if (material) params.set('material', material);
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
            headers: {
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const households = applyClientFilters(Array.isArray(data) ? data : []);
        lastHouseholds = households;

        markersLayer.clearLayers();

        const bounds = [];
        households.forEach((household) => {
            const lat = Number(household.latitude);
            const lon = Number(household.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
                return;
            }
            const marker = createCustomMarker(lat, lon, household);
            marker.addTo(markersLayer);
            bounds.push([lat, lon]);
        });

        if (bounds.length === 1) {
            map.setView(bounds[0], 15);
        } else if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }

        refreshOperationalLayers();
    } catch (err) {
        console.error('Erro ao carregar agregados:', err);
        document.getElementById('drawer-content').innerHTML =
            '<p class="text-warning mb-0">Não foi possível carregar agregados da API. Verifique a ligação ou o token JWT.</p>';
    }
}

/** Inicializa mapa Leaflet (camada base OSM preservada) */
function initMap() {
    map = L.map('map-container').setView([40.22, -8.05], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    window.evacuationLayer = null;
    window.riskLayers = null;
}

function wireMapControls() {
    const refreshBtn = document.getElementById('btn-refresh-map');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadHouseholdMarkers());
    }

    ['filter-material', 'filter-elderly', 'filter-children', 'filter-mobility'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => loadHouseholdMarkers());
        }
    });

    const evacToggle = document.getElementById('toggle-evacuation');
    if (evacToggle) {
        evacToggle.addEventListener('change', (e) => drawEvacuationRoutes(e.target.checked));
    }

    const riskToggle = document.getElementById('toggle-risk');
    if (riskToggle) {
        riskToggle.addEventListener('change', (e) => drawRiskZones(e.target.checked));
    }
}

// --- Painel direito (#drawer) — IDs preservados ---
function abrirDetalhe(nomeOuHousehold) {
    const drawer = document.getElementById('drawer');
    const titleEl = document.getElementById('drawer-title');
    const contentEl = document.getElementById('drawer-content');

    if (typeof nomeOuHousehold === 'object' && nomeOuHousehold !== null) {
        titleEl.innerText = nomeOuHousehold.name;
        contentEl.innerHTML =
            formatDrawerContent(nomeOuHousehold) + renderBIMPanel(nomeOuHousehold);
        wireValidateButton(nomeOuHousehold);
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

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    wireMapControls();
    loadHouseholdMarkers();
    map.invalidateSize();
});
