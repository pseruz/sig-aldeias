// js/map-logic.js — Marcadores Leaflet por status/vulnerabilidade (Fase 2.2-C)

const STATUS_COLORS = {
    pendente: '#DC3545',
    validado: '#28A745',
    rejeitado: '#6C757D',
};

const VULNERABLE_BORDER = '#FFC107';

let map;
let markersLayer;

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
}

// --- Painel direito (#drawer) — IDs preservados ---
function abrirDetalhe(nomeOuHousehold) {
    const drawer = document.getElementById('drawer');
    const titleEl = document.getElementById('drawer-title');
    const contentEl = document.getElementById('drawer-content');

    if (typeof nomeOuHousehold === 'object' && nomeOuHousehold !== null) {
        titleEl.innerText = nomeOuHousehold.name;
        contentEl.innerHTML = formatDrawerContent(nomeOuHousehold);
    } else {
        titleEl.innerText = nomeOuHousehold;
        contentEl.innerHTML = `<p>Dados detalhados sobre ${nomeOuHousehold} serão carregados aqui...</p>`;
    }

    drawer.classList.add('open');

    // Mobile: abre bottom sheet de detalhes
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
