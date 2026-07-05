// js/map-logic.js — Versão Final (Motor 2.5D movido para map-25d.js)

const STATUS_COLORS = {
    pendente: '#DC3545',
    validado: '#28A745',
    rejeitado: '#6C757D',
};

const MATERIAL_COLORS = {
    'betão': '#0D6EFD',
    'alvenaria': '#FFC107',
    'madeira': '#DC3545'
};

const VULNERABLE_BORDER = '#FFC107';
const EVACUATION_ROUTE_COLOR = '#0D6EFD';

const MOCK_FIRE_ZONES = [
    [[40.218, -8.062], [40.225, -8.048], [40.232, -8.055], [40.218, -8.062]],
];

const MOCK_FLOOD_ZONES = [
    [[40.212, -8.038], [40.220, -8.028], [40.228, -8.035], [40.212, -8.038]],
];

const MOCK_FOREST_ZONES = [
    [[40.225, -8.065], [40.230, -8.060], [40.228, -8.055], [40.223, -8.058]],
    [[40.215, -8.045], [40.218, -8.040], [40.216, -8.038], [40.213, -8.042]],
];

const MOCK_STREETS = {
    rua_principal: {
        name: 'Rua Principal', type: 'evacuacao',
        coords: [[40.215, -8.055], [40.220, -8.050], [40.225, -8.045], [40.230, -8.040]],
    },
    rua_igreja: {
        name: 'Rua da Igreja', type: 'interdita',
        coords: [[40.218, -8.060], [40.222, -8.056], [40.226, -8.052]],
    },
    travessa_vale: {
        name: 'Travessa do Vale', type: 'evacuacao',
        coords: [[40.210, -8.048], [40.215, -8.044], [40.220, -8.040], [40.225, -8.036]],
    },
};

window._streetLayer = null;
window._infraMarkersLayer = null;
window.forestLayer = null;
window.infrastructuresLayer = null;
// ✅ 2.5D - Variável global inicializada em map-25d.js

// =========================================================================
// ✅ VARIÁVEIS DE MODO DE EDIÇÃO
// =========================================================================
let editMode = {
    active: false,
    type: null,
    layerType: null,
    drawingLayer: null,
    tempMarkers: [],
    tempPolygon: null
};

// =========================================================================
// ❌ MOTOR 2.5D REMOVIDO - Movido para map-25d.js
// =========================================================================
// A classe Building25DLayer e função initOrUpdate25D() 
// estão agora no ficheiro separado: map-25d.js

function drawStreet(key) {
    if (!map) return;
    if (window._streetLayer) {
        map.removeLayer(window._streetLayer);
        window._streetLayer = null;
    }
    if (!key || !MOCK_STREETS[key]) return;

    const street = MOCK_STREETS[key];
    const isEvacuacao = street.type === 'evacuacao';
    const color = isEvacuacao ? '#0D6EFD' : '#DC3545';
    const dashArray = isEvacuacao ? null : '5, 5';

    window._streetLayer = L.polyline(street.coords, {
        color, weight: 5, opacity: 0.85, dashArray,
    })
        .bindPopup(`<small><strong>${street.name}</strong><br>${isEvacuacao ? '🛣️ Rota de Evacuação' : '🚫 Via Interditada'}</small>`)
        .addTo(map);

    map.fitBounds(window._streetLayer.getBounds(), { padding: [50, 50] });
}

function drawForestZones(enabled) {
    if (!map) return;
    if (window.forestLayer) {
        map.removeLayer(window.forestLayer);
        window.forestLayer = null;
    }
    if (!enabled) return;

    window.forestLayer = L.layerGroup();
    MOCK_FOREST_ZONES.forEach((ring) => {
        L.polygon(ring, {
            color: '#228B22',
            fillColor: '#228B22',
            fillOpacity: 0.3,
            weight: 2,
        })
            .bindPopup('<small>🌲 Zona Florestal (simulação)</small>')
            .addTo(window.forestLayer);
    });
    window.forestLayer.addTo(map);
}

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

function getUserRole() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return 'anon';
        const payload = token.split('.')[1];
        if (!payload) return 'anon';
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded.role || decoded.sub?.role || 'user';
    } catch {
        return 'anon';
    }
}

function applyRoleUI(role) {
    const hasToken = Boolean(localStorage.getItem('access_token'));
    const isTecnico = role === 'tecnico';
    
    const elements = {
        'validation-panel': hasToken,
        'btn-load-pending': hasToken,
    };

    Object.entries(elements).forEach(([id, show]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('d-none', !show);
    });

    const toggles = ['toggle-fire', 'toggle-flood', 'toggle-evacuation', 'toggle-risk', 'toggle-forest'];
    toggles.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !hasToken;
        if (!hasToken) el.checked = false;
    });

    if (isTecnico) {
        const registoBtn = document.querySelector('a[href="/registo"]');
        if (registoBtn) registoBtn.classList.remove('d-none');
    }

    const editSection = document.querySelector('#panel-filters .p-2.rounded.mb-3[style*="border: 1px solid rgba(255,193,7,0.2)"]');
    
    if (editSection) {
        const isCommandRole = (role === 'admin' || role === 'coordenador');
        
        console.log('🔍 Debug Edição:', {
            role: role,
            isCommandRole: isCommandRole,
            editSectionFound: !!editSection
        });
        
        if (isCommandRole) {
            editSection.style.display = 'block';
            const editTitle = editSection.previousElementSibling;
            if (editTitle && editTitle.textContent.includes('Edição no Mapa')) {
                editTitle.style.display = 'block';
            }
        } else {
            editSection.style.display = 'none';
            const editTitle = editSection.previousElementSibling;
            if (editTitle && editTitle.textContent.includes('Edição no Mapa')) {
                editTitle.style.display = 'none';
            }
        }
    }
}

function getDominantMaterial(households) {
    const counts = {};
    households.forEach(h => {
        const mat = h.material || 'outro';
        counts[mat] = (counts[mat] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'outro');
}

function hasHighRiskInCluster(households) {
    return households.some(h => 
        h.status === 'pendente' || 
        h.has_elderly || 
        h.has_children || 
        h.has_mobility_issues
    );
}

function createHouseholdIcon(household) {
    const materialColor = MATERIAL_COLORS[household.material] || '#6C757D';
    const isPending = household.status === 'pendente';
    const borderColor = isPending ? VULNERABLE_BORDER : (household.has_elderly || household.has_children ? VULNERABLE_BORDER : '#fff');
    const borderWidth = isPending ? 4 : (household.has_elderly || household.has_children ? 3 : 2);
    const opacity = isPending ? 0.7 : 0.9;
    
    return L.divIcon({
        className: 'custom-household-marker',
        html: `<div style="
            width: 18px;
            height: 18px;
            background-color: ${materialColor};
            border: ${borderWidth}px solid ${borderColor};
            border-radius: 50%;
            opacity: ${opacity};
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11]
    });
}

function createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    const markers = cluster.getAllChildMarkers();
    const households = markers.map(m => m.household).filter(h => h);
    
    const dominantMaterial = getDominantMaterial(households);
    const hasRisk = hasHighRiskInCluster(households);
    
    const materialClass = {
        'betão': 'cluster-betão',
        'alvenaria': 'cluster-alvenaria',
        'madeira': 'cluster-madeira'
    }[dominantMaterial] || 'cluster-default';
    
    const riskClass = hasRisk ? 'cluster-risk' : '';
    
    let size = 40;
    let fontSize = '14px';
    if (count >= 10) { size = 55; fontSize = '16px'; }
    else if (count >= 5) { size = 48; fontSize = '15px'; }
    
    return L.divIcon({
        className: `custom-cluster-marker ${materialClass} ${riskClass}`,
        html: `<div class="cluster-content" style="
            width: ${size}px;
            height: ${size}px;
            font-size: ${fontSize};
        ">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

function getColorCode(household) {
    const materialColor = MATERIAL_COLORS[household.material] || '#6C757D';
    const vulnerable = Boolean(household.has_elderly || household.has_children);

    return {
        fillColor: materialColor,
        color: vulnerable ? VULNERABLE_BORDER : materialColor,
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
        <div class="pc-ficha-tecnica">
            <h6 class="pc-text fw-bold mb-3">Ficha Técnica do Agregado</h6>
            
            <div class="mb-2">
                <strong class="pc-text-muted d-block">Identificação</strong>
                <p class="mb-1 pc-text">${household.name}</p>
                <p class="mb-1 pc-text-small">Status: ${statusLabel}</p>
            </div>
            
            <div class="mb-2">
                <strong class="pc-text-muted d-block">Características</strong>
                <p class="mb-1 pc-text">Material: ${household.material}</p>
                <p class="mb-1 pc-text">Pisos: ${household.num_floors}</p>
                <p class="mb-1 pc-text">Ocupantes: ${household.num_people}</p>
            </div>
            
            <div class="mb-2">
                <strong class="pc-text-muted d-block">Vulnerabilidades</strong>
                <p class="mb-1 pc-text">${formatVulnerabilityIcons(household)}</p>
            </div>
            
            <div class="mb-2">
                <strong class="pc-text-muted d-block">Localização</strong>
                <p class="mb-1 pc-text-small">${household.latitude.toFixed(5)}, ${household.longitude.toFixed(5)}</p>
                <p class="mb-1 pc-text-small">Submissão: ${submitted}</p>
            </div>
            
            ${household.rejection_reason ? `<div class="mb-2"><strong class="pc-text-muted d-block">Motivo rejeição:</strong><p class="mb-0 pc-text">${household.rejection_reason}</p></div>` : ''}
        </div>
    `;
}

function renderInfrastructurePanel(household) {
    if (!household.infrastructures || Object.keys(household.infrastructures).length === 0) {
        return `
            <div class="pc-ficha-tecnica mt-3">
                <h6 class="pc-text fw-bold mb-2">
                    <i class="bi bi-gear-wide-connected me-2"></i>Infraestruturas Técnicas
                </h6>
                <p class="pc-text-muted small mb-0">Nenhuma infraestrutura registada.</p>
            </div>
        `;
    }

    const infra = household.infrastructures;
    const labels = {
        emergency_doors: { 
            name: 'Saídas de Emergência', 
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-2-4C6.48 3 3 6.48 3 11c0 2.03.76 3.87 2 5.28V20c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-3.72c1.24-1.41 2-3.25 2-5.28 0-4.52-3.48-8-8-8z"/></svg>',
            color: '#0D6EFD' 
        },
        fire_hydrants: { 
            name: 'Bocas de Incêndio', 
            icon: '🔥', 
            color: '#DC3545' 
        },
        meeting_point: { 
            name: 'Ponto de Encontro', 
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>',
            color: '#28A745' 
        }
    };

    let html = `
        <div class="pc-ficha-tecnica mt-3">
            <h6 class="pc-text fw-bold mb-3">
                <i class="bi bi-gear-wide-connected me-2"></i>Infraestruturas Técnicas
            </h6>
    `;

    Object.entries(infra).forEach(([key, data]) => {
        const info = labels[key] || { name: key, icon: '📍', color: '#6C757D' };
        
        if (data.status === 'na') {
            html += `
                <div class="mb-2 p-2 bg-dark rounded">
                    <p class="pc-text-muted small mb-0">
                        ${info.icon} <strong>${info.name}:</strong> N/A
                    </p>
                </div>
            `;
        } else if (data.status === 'exists') {
            const hasCoords = data.lat && data.lng;
            const coordsText = hasCoords 
                ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`
                : 'Sem coordenadas';
            
            html += `
                <div class="mb-2 p-2 bg-dark rounded" style="border-left: 3px solid ${info.color};">
                    <p class="pc-text small mb-1">
                        ${info.icon} <strong>${info.name}</strong>
                        <span class="badge bg-success ms-2">Existe</span>
                    </p>
                    ${hasCoords ? `
                        <p class="pc-text-muted small mb-1">
                            <i class="bi bi-geo-alt me-1"></i>${coordsText}
                        </p>
                        <button type="button" class="btn btn-sm btn-outline-warning w-100" 
                                onclick="focusInfrastructure(${data.lat}, ${data.lng}, '${info.name}')">
                            <i class="bi bi-crosshair me-1"></i>Ver no Mapa
                        </button>
                    ` : `
                        <p class="pc-text-muted small mb-0 fst-italic">Coordenadas não capturadas</p>
                    `}
                </div>
            `;
        }
    });

    html += `</div>`;
    return html;
}

function drawInfrastructureMarkers(household) {
    if (!map) return;
    
    if (window._infraMarkersLayer) {
        map.removeLayer(window._infraMarkersLayer);
    }
    
    if (!household.infrastructures) return;

    window._infraMarkersLayer = L.layerGroup();
    const infra = household.infrastructures;
    const colors = {
        emergency_doors: '#0D6EFD',
        fire_hydrants: '#DC3545',
        meeting_point: '#28A745'
    };

    Object.entries(infra).forEach(([key, data]) => {
        if (data.status === 'exists' && data.lat && data.lng) {
            const color = colors[key] || '#6C757D';
            
            const marker = L.circleMarker([data.lat, data.lng], {
                radius: 6, fillColor: color, color: '#fff',
                weight: 2, opacity: 1, fillOpacity: 0.8
            });
            
            marker.bindPopup(`<strong>${key.replace('_', ' ').toUpperCase()}</strong>`);
            marker.addTo(window._infraMarkersLayer);
        }
    });

    window._infraMarkersLayer.addTo(map);
}

window.focusInfrastructure = function(lat, lng, name) {
    if (!map) return;
    map.setView([lat, lng], 18);
    
    const tempMarker = L.circleMarker([lat, lng], {
        radius: 10, fillColor: '#FFC107', color: '#fff',
        weight: 3, opacity: 1, fillOpacity: 0.9
    }).addTo(map);
    
    tempMarker.bindPopup(`<strong>${name}</strong>`).openPopup();
    
    setTimeout(() => {
        map.removeLayer(tempMarker);
    }, 5000);
};

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
    let html = formatDrawerContent(household) + renderInfrastructurePanel(household) + renderInfraRevitPanel(household);

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
    btn.addEventListener('click', () => {
        validateHousehold(household.id, 'validado', 'Validação técnica operacional (mapa)');
    });
}

function wireCommandValidationButtons(household) {
    selectedHouseholdId = household.id;

    document.getElementById('btn-validate-publish')?.addEventListener('click', () => {
        validateHousehold(household.id, 'validado', 'Validado por supervisor');
    });

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
    marker.setIcon(createHouseholdIcon(household));
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
                radius: 100, color: '#DC3545', fillColor: '#DC3545',
                fillOpacity: 0.2, weight: 1,
            })
                .bindPopup(`<small>Alto risco — ${household.name}</small>`)
                .addTo(window.riskLayers);
        }
        if (household.has_elderly) {
            L.circle([lat, lon], {
                radius: 50, color: '#FFC107', fillColor: '#FFC107',
                fillOpacity: 0.2, weight: 1,
            })
                .bindPopup(`<small>Médio risco (idosos) — ${household.name}</small>`)
                .addTo(window.riskLayers);
        }
    });
    window.riskLayers.addTo(map);
}

function drawIncendioZones(enabled) {
    if (!map) return;
    if (window.fireLayer) {
        map.removeLayer(window.fireLayer);
        window.fireLayer = null;
    }
    if (!enabled) return;

    window.fireLayer = L.layerGroup();
    MOCK_FIRE_ZONES.forEach((ring) => {
        L.polygon(ring, {
            color: '#DC3545', fillColor: '#DC3545',
            fillOpacity: 0.2, weight: 2,
        })
            .bindPopup('<small>🔥 Mancha de incêndio</small>')
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
            color: '#0D6EFD', fillColor: '#0D6EFD',
            fillOpacity: 0.2, weight: 2,
        })
            .bindPopup('<small>🌊 Zona de cheias</small>')
            .addTo(window.floodLayer);
    });
    window.floodLayer.addTo(map);
}

function refreshOperationalLayers() {
    drawEvacuationRoutes(Boolean(document.getElementById('toggle-evacuation')?.checked));
    drawRiskZones(Boolean(document.getElementById('toggle-risk')?.checked));
    drawIncendioZones(Boolean(document.getElementById('toggle-fire')?.checked));
    drawFloodZones(Boolean(document.getElementById('toggle-flood')?.checked));
    drawForestZones(Boolean(document.getElementById('toggle-forest')?.checked));
}

function createCustomMarker(lat, lon, household) {
    const marker = L.marker([lat, lon], {
        icon: createHouseholdIcon(household)
    });
    marker.household = household;
    marker.bindPopup(formatPopup(household));

    marker.on('click', () => {
        marker.openPopup();
        abrirDetalhe(household);
    });
    
    marker.on('dblclick', () => {
        openFicha(household.id);
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

        updateAlertsAndRisk(households);
        refreshOperationalLayers();

        // ✅ 2.5D - Atualizar camada quando dados mudam (PROTEGIDO)
        if (typeof initOrUpdate25D === 'function') {
            try {
                initOrUpdate25D();
            } catch (err) {
                console.warn('⚠️ Erro no módulo 2.5D (não crítico):', err);
            }
        }

    } catch (err) {
        console.error('Erro ao carregar agregados:', err);
        const contentEl = document.getElementById('drawer-content');
        if (contentEl) {
            contentEl.innerHTML =
                '<p class="text-warning mb-0">Não foi possível carregar agregados.</p>';
        }
    }
}

async function loadPendingMarkers() {
    const statusEl = document.getElementById('filter-status');
    if (statusEl) statusEl.value = 'pendente';
    await loadHouseholdMarkers();
}

// =========================================================================
// ✅ CARREGAR INFRAESTRUTURAS (Pontos - Sempre visíveis)
// =========================================================================
async function carregarInfraestruturas() {
    try {
        const response = await fetch('/infrastructures/', {
            headers: { Accept: 'application/json' }
        });
        
        if (!response.ok) {
            console.warn('⚠️ Infraestruturas não disponíveis:', response.status);
            return;
        }
        
        const infraestruturas = await response.json();
        console.log(`✅ ${infraestruturas.length} infraestruturas carregadas`);
        
        if (window.infrastructuresLayer && map) {
            map.removeLayer(window.infrastructuresLayer);
        }
        
        window.infrastructuresLayer = L.layerGroup();
        if (map) {
            window.infrastructuresLayer.addTo(map);
        }
        
        infraestruturas.forEach(infra => {
            if (!infra.geometry) {
                console.warn('⚠️ Infraestrutura sem geometria ignorada:', infra.name);
                return;
            }

            try {
                const geom = infra.geometry.trim().toUpperCase();
                
                if (geom.startsWith('POINT(')) {
                    const match = infra.geometry.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
                    if (!match) return;
                    
                    const lng = parseFloat(match[1]);
                    const lat = parseFloat(match[2]);
                    
                    let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
                    let iconSize = [25, 41];
                    
                    if (infra.layer_type === 'hydrant') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
                    else if (infra.layer_type === 'public_building') { iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png'; iconSize = [30, 50]; }
                    else if (infra.layer_type === 'meeting_point') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
                    
                    const customIcon = L.icon({
                        iconUrl: iconUrl, iconSize: iconSize, iconAnchor: [12, 41], popupAnchor: [1, -34]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: customIcon })
                        .bindPopup(`<b>${infra.name}</b><br><small>${infra.description || infra.layer_type}</small>`)
                        .addTo(window.infrastructuresLayer);

                    const userRole = getUserRole();
                    if (userRole === 'admin' || userRole === 'coordenador') {
                        marker.on('click', () => {
                            mostrarOpcoesInfraestrutura(
                                infra.id,
                                infra.name,
                                infra.layer_type,
                                infra.geometry,
                                infra.description
                            );
                        });
                    }  
                }
            } catch (err) {
                console.error('Erro ao processar infraestrutura:', infra.name, err);
            }
        });
        
    } catch (error) {
        console.error('Erro geral ao carregar infraestruturas:', error);
    }
}

// =========================================================================
// ✅ CARREGAR CAMADAS OPERACIONAIS (Polígonos - Só quando ativadas)
// =========================================================================
async function carregarCamadasOperacionais(tipoCamada) {
    try {
        const response = await fetch('/infrastructures/', {
            headers: { Accept: 'application/json' }
        });
        
        if (!response.ok) return;
        
        const infraestruturas = await response.json();
        
        const layerName = `operationalLayer_${tipoCamada}`;
        if (window[layerName] && map) {
            map.removeLayer(window[layerName]);
        }
        
        const poligonos = infraestruturas.filter(infra => {
            if (!infra.geometry) return false;
            const geom = infra.geometry.trim().toUpperCase();
            return geom.startsWith('POLYGON(') && infra.layer_type === tipoCamada;
        });
        
        if (poligonos.length === 0) {
            console.log(`ℹ️ Sem ${tipoCamada} para mostrar`);
            return;
        }
        
        window[layerName] = L.layerGroup();
        if (map) {
            window[layerName].addTo(map);
        }
        
        const cores = {
            'fire_zone': { color: '#DC3545', fillColor: '#DC3545', label: '🔥 Zona de Incêndio' },
            'flood_zone': { color: '#0D6EFD', fillColor: '#0D6EFD', label: '🌊 Zona de Cheia' },
            'forest_zone': { color: '#198754', fillColor: '#198754', label: '🌲 Zona Florestal' },
            'evacuation_route': { color: '#FFC107', fillColor: '#FFC107', label: '🛣️ Rota de Evacuação' }
        };
        
        const cor = cores[tipoCamada] || { color: '#6C757D', fillColor: '#6C757D', label: 'Zona' };
        
        poligonos.forEach(infra => {
            try {
                const coordsMatch = infra.geometry.match(/POLYGON\(\((.*?)\)\)/i);
                if (!coordsMatch) return;
                
                const coordsString = coordsMatch[1];
                const latlngs = coordsString.split(',').map(coord => {
                    const parts = coord.trim().split(/\s+/);
                    return [parseFloat(parts[1]), parseFloat(parts[0])];
                });

                const polygon = L.polygon(latlngs, {
                    color: cor.color,
                    fillColor: cor.fillColor,
                    fillOpacity: 0.3,
                    weight: 2
                })
                .bindPopup(`<b>${cor.label}</b><br><small>${infra.name}</small><br><em>${infra.description || ''}</em>`)
                .addTo(window[layerName]);

                const userRole = getUserRole();
                if (userRole === 'admin' || userRole === 'coordenador') {
                    polygon.on('click', () => {
                        mostrarOpcoesInfraestrutura(
                            infra.id,
                            infra.name,
                            infra.layer_type,
                            infra.geometry,
                            infra.description
                        );
                    });
                }
                
            } catch (err) {
                console.error(`Erro ao processar ${tipoCamada}:`, infra.name, err);
            }
        });
        
        console.log(`✅ ${poligonos.length} ${tipoCamada} carregadas`);
        
    } catch (error) {
        console.error(`Erro ao carregar ${tipoCamada}:`, error);
    }
}

// =========================================================================
// ✅ FUNÇÕES DE EDIÇÃO NO MAPA
// =========================================================================
function ativarModoEdicao(tipo, layerType) {
    editMode.active = true;
    editMode.type = tipo;
    editMode.layerType = layerType;
    editMode.tempMarkers = [];
    map.getContainer().style.cursor = 'crosshair';
    const msg = tipo === 'point' 
        ? `📍 Clique no mapa para adicionar ${getLayerTypeName(layerType)}`
        : `✏️ Clique para adicionar vértices. Duplo clique para fechar a zona`;
    showEditModeMessage(msg);
    map.on('click', handleMapClickEdit);
    map.on('dblclick', handleMapDblClickEdit);
}

function desativarModoEdicao() {
    editMode.active = false;
    editMode.type = null;
    editMode.layerType = null;
    map.getContainer().style.cursor = '';
    if (editMode.drawingLayer) {
        map.removeLayer(editMode.drawingLayer);
        editMode.drawingLayer = null;
    }
    editMode.tempMarkers.forEach(marker => map.removeLayer(marker));
    editMode.tempMarkers = [];
    map.off('click', handleMapClickEdit);
    map.off('dblclick', handleMapDblClickEdit);
    hideEditModeMessage();
}

function getLayerTypeName(layerType) {
    const names = {
        'hydrant': 'Boca de Incêndio', 'public_building': 'Edifício Público',
        'meeting_point': 'Ponto de Encontro', 'fire_zone': 'Zona de Incêndio',
        'flood_zone': 'Zona de Cheia', 'forest_zone': 'Zona Florestal'
    };
    return names[layerType] || layerType;
}

function showEditModeMessage(msg) {
    let msgEl = document.getElementById('edit-mode-message');
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = 'edit-mode-message';
        msgEl.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #FFC107; color: #000; padding: 12px 24px; border-radius: 8px; font-weight: bold; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);`;
        document.body.appendChild(msgEl);
    }
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
}

function hideEditModeMessage() {
    const msgEl = document.getElementById('edit-mode-message');
    if (msgEl) msgEl.style.display = 'none';
}

async function handleMapClickEdit(e) {
    if (!editMode.active) return;
    const { lat, lng } = e.latlng;
    if (editMode.type === 'point') await criarPontoNoMapa(lat, lng);
    else if (editMode.type === 'polygon') adicionarVerticePoligono(lat, lng);
}

async function handleMapDblClickEdit(e) {
    if (!editMode.active || editMode.type !== 'polygon') return;
    if (editMode.tempMarkers.length < 3) {
        alert('⚠️ Um polígono precisa de pelo menos 3 vértices!');
        return;
    }
    await fecharEGuardarPoligono();
}

async function criarPontoNoMapa(lat, lng) {
    const nome = prompt(`📍 ${getLayerTypeName(editMode.layerType)}\n\nNome/Identificação:`);
    if (!nome) { desativarModoEdicao(); return; }
    const descricao = prompt('Descrição (opcional):') || '';
    const wkt = `POINT(${lng} ${lat})`;
    try {
        const response = await fetch('/infrastructures/', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: nome, layer_type: editMode.layerType, geometry: wkt, description: descricao, status: 'ACTIVE' })
        });
        if (response.ok) { 
            alert('✅ Criado com sucesso!'); 
            await carregarInfraestruturas();
            // ✅ 2.5D - Atualizar após criar ponto (PROTEGIDO)
            if (typeof initOrUpdate25D === 'function') {
                try { initOrUpdate25D(); } catch (err) { console.warn('⚠️ Erro 2.5D:', err); }
            }
        } 
        else { const err = await response.json(); alert(`❌ Erro: ${err.detail || 'Falha'}`); }
    } catch (error) { alert('❌ Erro de conexão'); }
    desativarModoEdicao();
}

function adicionarVerticePoligono(lat, lng) {
    const marker = L.circleMarker([lat, lng], { radius: 6, fillColor: '#FFC107', color: '#000', weight: 2, fillOpacity: 0.8 }).addTo(map);
    editMode.tempMarkers.push(marker);
    if (editMode.tempPolygon) map.removeLayer(editMode.tempPolygon);
    const latlngs = editMode.tempMarkers.map(m => m.getLatLng());
    editMode.tempPolygon = L.polygon(latlngs, { color: '#FFC107', fillColor: '#FFC107', fillOpacity: 0.3, weight: 2, dashArray: '5, 5' }).addTo(map);
}

// =========================================================================
// ✅ EDITAR E ELIMINAR INFRAESTRUTURAS EXISTENTES
// =========================================================================
function mostrarOpcoesInfraestrutura(infraId, infraNome, infraType, infraGeometry, infraDescription) {
    const existingPopup = document.getElementById('infra-edit-popup');
    if (existingPopup) existingPopup.remove();
    
    const popup = document.createElement('div');
    popup.id = 'infra-edit-popup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a2332;
        border: 2px solid #FFC107;
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        min-width: 300px;
        color: #fff;
    `;
    
    popup.innerHTML = `
        <h5 style="color: #FFC107; margin-bottom: 15px;">
            <i class="bi bi-gear-fill me-2"></i>${infraNome}
        </h5>
        <p style="font-size: 12px; color: #aaa; margin-bottom: 20px;">
            Tipo: ${getLayerTypeName(infraType)}<br>
            Descrição: ${infraDescription || 'N/A'}
        </p>
        <div class="d-grid gap-2">
            <button type="button" class="btn btn-sm btn-outline-warning" id="btn-edit-infra">
                <i class="bi bi-pencil me-2"></i>Editar
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" id="btn-delete-infra">
                <i class="bi bi-trash me-2"></i>Eliminar
            </button>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-close-popup">
                <i class="bi bi-x-circle me-2"></i>Cancelar
            </button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    document.getElementById('btn-edit-infra').addEventListener('click', () => {
        popup.remove();
        editarInfraestrutura(infraId, infraNome, infraType, infraGeometry, infraDescription);
    });
    
    document.getElementById('btn-delete-infra').addEventListener('click', () => {
        popup.remove();
        eliminarInfraestrutura(infraId, infraNome);
    });
    
    document.getElementById('btn-close-popup').addEventListener('click', () => {
        popup.remove();
    });
}

async function editarInfraestrutura(infraId, nomeAtual, layerType, geometry, description) {
    const novoNome = prompt(`✏️ Editar Nome:\n\nNome atual: ${nomeAtual}\n\nNovo nome:`, nomeAtual);
    if (!novoNome || novoNome === nomeAtual) return;
    
    const novaDescricao = prompt('✏️ Editar Descrição (opcional):', description || '') || '';
    
    try {
        const response = await fetch(`/infrastructures/${infraId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                name: novoNome,
                description: novaDescricao
            })
        });
        
        if (response.ok) {
            alert('✅ Infraestrutura atualizada com sucesso!');
            await carregarInfraestruturas();
            await carregarCamadasOperacionais(layerType);
            // ✅ 2.5D - Atualizar após editar (PROTEGIDO)
            if (typeof initOrUpdate25D === 'function') {
                try { initOrUpdate25D(); } catch (err) { console.warn('⚠️ Erro 2.5D:', err); }
            }
        } else {
            const err = await response.json();
            alert(`❌ Erro: ${err.detail || 'Falha ao atualizar'}`);
        }
    } catch (error) {
        console.error('Erro ao editar:', error);
        alert('❌ Erro de conexão ao servidor');
    }
}

async function eliminarInfraestrutura(infraId, nome) {
    if (!confirm(`⚠️ ELIMINAR "${nome}"?\n\nEsta ação não pode ser desfeita.\n\nTens a certeza?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/infrastructures/${infraId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('✅ Infraestrutura eliminada!');
            await carregarInfraestruturas();
            if (document.getElementById('toggle-fire')?.checked) {
                await carregarCamadasOperacionais('fire_zone');
            }
            if (document.getElementById('toggle-flood')?.checked) {
                await carregarCamadasOperacionais('flood_zone');
            }
            if (document.getElementById('toggle-forest')?.checked) {
                await carregarCamadasOperacionais('forest_zone');
            }
            // ✅ 2.5D - Atualizar após eliminar (PROTEGIDO)
            if (typeof initOrUpdate25D === 'function') {
                try { initOrUpdate25D(); } catch (err) { console.warn('⚠️ Erro 2.5D:', err); }
            }
        } else {
            alert('❌ Erro ao eliminar');
        }
    } catch (error) {
        console.error('Erro ao eliminar:', error);
        alert('❌ Erro de conexão');
    }
}

async function fecharEGuardarPoligono() {
    const nome = prompt(`️ ${getLayerTypeName(editMode.layerType)}\n\nNome/Identificação:`);
    if (!nome) { desativarModoEdicao(); return; }
    const descricao = prompt('Descrição (opcional):') || '';
    const coords = editMode.tempMarkers.map(m => { const ll = m.getLatLng(); return `${ll.lng} ${ll.lat}`; }).join(', ');
    const wkt = `POLYGON((${coords}))`;
    try {
        const response = await fetch('/infrastructures/', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: nome, layer_type: editMode.layerType, geometry: wkt, description: descricao, status: 'ACTIVE' })
        });
        if (response.ok) { 
            alert('✅ Zona criada com sucesso!'); 
            await carregarCamadasOperacionais(editMode.layerType);
            // ✅ 2.5D - Atualizar após criar polígono (PROTEGIDO)
            if (typeof initOrUpdate25D === 'function') {
                try { initOrUpdate25D(); } catch (err) { console.warn('⚠️ Erro 2.5D:', err); }
            }
        } 
        else { const err = await response.json(); alert(`❌ Erro: ${err.detail || 'Falha'}`); }
    } catch (error) { alert('❌ Erro de conexão'); }
    editMode.tempMarkers.forEach(m => map.removeLayer(m));
    if (editMode.tempPolygon) map.removeLayer(editMode.tempPolygon);
    editMode.tempMarkers = []; editMode.tempPolygon = null;
    desativarModoEdicao();
}

function initMap() {
    map = L.map('map-container').setView([40.22, -8.05], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
    }).addTo(map);
    
    markersLayer = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16,
        iconCreateFunction: createClusterIcon
    });
    map.addLayer(markersLayer);
    
    window.evacuationLayer = null;
    window.riskLayers = null;
    window.fireLayer = null;
    window.floodLayer = null;
    window.forestLayer = null;
    window._infraMarkersLayer = null;
    window.infrastructuresLayer = null;
    // ✅ 2.5D - Inicializado em map-25d.js
}

// =========================================================================
// ✅ SISTEMA DE NOTIFICAÇÕES TOAST
// =========================================================================
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.pc-toast-notification');
    existingNotifications.forEach(n => n.remove());
    
    const toast = document.createElement('div');
    toast.className = 'pc-toast-notification';
    
    const colors = {
        'success': { bg: '#198754', border: '#146c43', icon: '✅' },
        'error': { bg: '#DC3545', border: '#b02a37', icon: '❌' },
        'warning': { bg: '#FFC107', border: '#ffecb5', icon: '⚠️' },
        'info': { bg: '#0D6EFD', border: '#0a58ca', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors['info'];
    
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        font-weight: 600;
        font-size: 14px;
        border: 2px solid ${color.border};
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">${color.icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; transform: translateX(400px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function wireMapControls() {
    document.getElementById('btn-refresh-map')?.addEventListener('click', () => loadHouseholdMarkers());
    document.getElementById('btn-load-pending')?.addEventListener('click', () => loadPendingMarkers());

    ['filter-material', 'filter-status', 'filter-elderly', 'filter-children', 'filter-mobility'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', () => loadHouseholdMarkers());
    });

    document.getElementById('street-filter')?.addEventListener('change', (e) => drawStreet(e.target.value));

    document.getElementById('toggle-fire')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            carregarCamadasOperacionais('fire_zone');
        } else {
            if (window.operationalLayer_fire_zone && map) {
                map.removeLayer(window.operationalLayer_fire_zone);
            }
        }
    });
    
    document.getElementById('toggle-flood')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            carregarCamadasOperacionais('flood_zone');
        } else {
            if (window.operationalLayer_flood_zone && map) {
                map.removeLayer(window.operationalLayer_flood_zone);
            }
        }
    });
    
    document.getElementById('toggle-forest')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            carregarCamadasOperacionais('forest_zone');
        } else {
            if (window.operationalLayer_forest_zone && map) {
                map.removeLayer(window.operationalLayer_forest_zone);
            }
        }
    });
    
    document.getElementById('toggle-evacuation')?.addEventListener('change', (e) =>
        drawEvacuationRoutes(e.target.checked)
    );
    document.getElementById('toggle-risk')?.addEventListener('change', (e) => drawRiskZones(e.target.checked));
    
    // ✅ 2.5D - Toggle de visualização volumétrica (PROTEGIDO)
    document.getElementById('toggle25d')?.addEventListener('change', (e) => {
        if (window.building25DLayer) {
            try {
                const isOn = window.building25DLayer.toggle();
                console.log('2.5D Visualization:', isOn ? 'ON' : 'OFF');
            } catch (err) {
                console.warn('⚠️ Erro ao ativar 2.5D:', err);
            }
        } else {
            console.warn('⚠️ Módulo 2.5D não inicializado');
        }
    });

    document.getElementById('btn-add-hydrant')?.addEventListener('click', () => ativarModoEdicao('point', 'hydrant'));
    document.getElementById('btn-add-building')?.addEventListener('click', () => ativarModoEdicao('point', 'public_building'));
    document.getElementById('btn-add-meeting-point')?.addEventListener('click', () => ativarModoEdicao('point', 'meeting_point'));
    document.getElementById('btn-add-fire-zone')?.addEventListener('click', () => ativarModoEdicao('polygon', 'fire_zone'));
    document.getElementById('btn-add-flood-zone')?.addEventListener('click', () => ativarModoEdicao('polygon', 'flood_zone'));
    document.getElementById('btn-add-forest-zone')?.addEventListener('click', () => ativarModoEdicao('polygon', 'forest_zone'));
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => desativarModoEdicao());
    
    const btnUploadBim = document.getElementById('btn-upload-bim');
    const inputBimFile = document.getElementById('bim-file-input');

    if (btnUploadBim && inputBimFile) {
        btnUploadBim.addEventListener('click', () => {
            inputBimFile.click();
        });

        inputBimFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            showNotification(`A processar ${file.name}...`, 'info');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/infrastructures/upload-geojson', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    showNotification(`✅ ${result.imported_count} elementos BIM importados com sucesso!`, 'success');
                    
                    await carregarInfraestruturas();
                    if (document.getElementById('toggle-fire')?.checked) await carregarCamadasOperacionais('fire_zone');
                    if (document.getElementById('toggle-flood')?.checked) await carregarCamadasOperacionais('flood_zone');
                    if (document.getElementById('toggle-forest')?.checked) await carregarCamadasOperacionais('forest_zone');
                    
                    // ✅ 2.5D - Atualizar após upload BIM (PROTEGIDO)
                    if (typeof initOrUpdate25D === 'function') {
                        try { initOrUpdate25D(); } catch (err) { console.warn('⚠️ Erro 2.5D:', err); }
                    }
                } else {
                    showNotification('❌ Erro ao importar ficheiro. Verifica o formato.', 'error');
                }
            } catch (error) {
                console.error('Erro no upload BIM:', error);
                showNotification('❌ Erro de conexão ao servidor.', 'error');
            }
            
            e.target.value = '';
        });
    }
}

function abrirDetalhe(nomeOuHousehold) {
    const drawer = document.getElementById('drawer');
    const titleEl = document.getElementById('drawer-title');
    const contentEl = document.getElementById('drawer-content');

    if (typeof nomeOuHousehold === 'object' && nomeOuHousehold !== null) {
        document.querySelectorAll('.pc-pending-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.householdId) === nomeOuHousehold.id) {
                item.classList.add('active', 'bg-warning', 'bg-opacity-25');
            }
        });
        
        titleEl.innerText = nomeOuHousehold.name;
        if (getMapMode() === 'command') {
            contentEl.innerHTML = renderValidationPanel(nomeOuHousehold);
            wireCommandValidationButtons(nomeOuHousehold);
        } else {
            contentEl.innerHTML =
                formatDrawerContent(nomeOuHousehold) + 
                renderInfrastructurePanel(nomeOuHousehold) + 
                renderBIMPanel(nomeOuHousehold);
            wireValidateButton(nomeOuHousehold);
        }
        
        drawInfrastructureMarkers(nomeOuHousehold);
    } else {
        titleEl.innerText = nomeOuHousehold;
        contentEl.innerHTML = `<p>Dados detalhados sobre ${nomeOuHousehold}...</p>`;
    }

    drawer.classList.add('open');
    const detailsToggle = document.getElementById('pc-toggle-details');
    if (detailsToggle) detailsToggle.checked = true;
}

function fecharDrawer() {
    document.getElementById('drawer').classList.remove('open');
    if (window._infraMarkersLayer && map) {
        map.removeLayer(window._infraMarkersLayer);
        window._infraMarkersLayer = null;
    }
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

function renderPendingList(households) {
    const panel = document.getElementById('validation-panel');
    if (!panel) return;

    const pending = households.filter(h => h.status === 'pendente');
    
    const infraIcons = {
        emergency_doors: {
            svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#0D6EFD"><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-2-4C6.48 3 3 6.48 3 11c0 2.03.76 3.87 2 5.28V20c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-3.72c1.24-1.41 2-3.25 2-5.28 0-4.52-3.48-8-8-8z"/></svg>',
            label: 'Saídas de Emergência'
        },
        fire_hydrants: {
            svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#DC3545"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            label: 'Bocas de Incêndio'
        },
        meeting_point: {
            svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#28A745"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
            label: 'Ponto de Encontro'
        }
    };
    
    let html = `
        <p class="pc-panel__title pc-text mb-0">Validação de Dados Técnicos</p>

        <div id="drawer">
            <h2 id="drawer-title" class="pc-text h6">Selecione um agregado pendente</h2>
            <div id="drawer-content">
                ${pending.length === 0 ? `
                    <div class="alert alert-success" role="alert">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>Tudo validado!</strong>
                    </div>
                ` : `
                    <p class="pc-text-muted small mb-3">
                        Selecione um agregado pendente.
                    </p>
                    
                    <div class="list-group mb-3" id="pending-list">
                        ${pending.map(h => {
                            const infra = h.infrastructures || {};
                            const infraHtml = [];
                            
                            if (infra.emergency_doors?.status === 'exists') {
                                infraHtml.push(`<span class="pc-infra-icon" data-tooltip="${infraIcons.emergency_doors.label}">${infraIcons.emergency_doors.svg}</span>`);
                            }
                            if (infra.fire_hydrants?.status === 'exists') {
                                infraHtml.push(`<span class="pc-infra-icon" data-tooltip="${infraIcons.fire_hydrants.label}">${infraIcons.fire_hydrants.svg}</span>`);
                            }
                            if (infra.meeting_point?.status === 'exists') {
                                infraHtml.push(`<span class="pc-infra-icon" data-tooltip="${infraIcons.meeting_point.label}">${infraIcons.meeting_point.svg}</span>`);
                            }
                            
                            const infraDisplay = infraHtml.length > 0 
                                ? `<div class="mt-1">${infraHtml.join('')}</div>`
                                : '<div class="mt-1"><small class="text-muted fst-italic">Sem infraestruturas</small></div>';
                            
                            return `
                                <button type="button" 
                                        class="list-group-item list-group-item-action pc-pending-item"
                                        data-household-id="${h.id}">
                                    <div class="d-flex w-100 justify-content-between">
                                        <strong class="pc-text">${h.name}</strong>
                                        <small class="pc-text-muted">${h.num_floors} pisos</small>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center mt-1">
                                        <small class="pc-text-muted">
                                            👥 ${h.num_people} pessoas
                                        </small>
                                        <small class="pc-text-muted">
                                            ${h.has_elderly ? '👵 ' : ''}
                                            ${h.has_children ? '👶 ' : ''}
                                            ${h.has_mobility_issues ? '♿ ' : ''}
                                        </small>
                                    </div>
                                    ${infraDisplay}
                                    <small class="text-muted d-block mt-1">
                                        📍 ${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}
                                    </small>
                                </button>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
            <button type="button" class="btn btn-outline-light w-100 mt-2" id="btn-close-drawer" onclick="fecharDrawer()">
                Fechar painel
            </button>
        </div>
    `;
    
    const container = document.getElementById('validation-drawer-container');
    if (container) {
        container.innerHTML = html;
    } else {
        const panelContent = panel.querySelector('#drawer');
        if (panelContent) {
            panel.innerHTML = html;
        }
    }
    
    if (pending.length > 0) {
        document.querySelectorAll('.pc-pending-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.householdId);
                const household = households.find(h => h.id === id);
                if (household) {
                    abrirDetalhe(household);
                    const marker = markerRegistry.get(id);
                    if (marker && map) {
                        map.setView(marker.getLatLng(), 16);
                        marker.openPopup();
                    }
                }
            });
            
            item.addEventListener('dblclick', () => {
                const id = parseInt(item.dataset.householdId);
                window.location.href = `/ficha/${id}`;
            });
        });
    }
}

const originalLoadHouseholdMarkers = loadHouseholdMarkers;
loadHouseholdMarkers = async function() {
    await originalLoadHouseholdMarkers();
    renderPendingList(lastHouseholds);
};

function initPanelResizing() {
    const handles = document.querySelectorAll('.pc-resize-handle');
    
    let resizeState = {
        isResizing: false,
        startX: 0,
        startWidth: 0,
        panel: null,
        handle: null,
        direction: null
    };
    
    document.addEventListener('mousemove', (e) => {
        if (!resizeState.isResizing || !resizeState.panel) return;
        
        e.preventDefault();
        
        const deltaX = resizeState.direction === 'left' 
            ? e.clientX - resizeState.startX 
            : resizeState.startX - e.clientX;
        
        const newWidth = resizeState.startWidth + deltaX;
        
        if (newWidth >= 200 && newWidth <= 500) {
            resizeState.panel.style.width = newWidth + 'px';
            resizeState.panel.style.flex = 'none';
            
            if (map) {
                requestAnimationFrame(() => map.invalidateSize());
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (resizeState.isResizing) {
            resizeState.isResizing = false;
            if (resizeState.handle) {
                resizeState.handle.classList.remove('active');
            }
            document.body.classList.remove('resizing');
            
            if (map) {
                requestAnimationFrame(() => map.invalidateSize());
            }
        }
    });
    
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            resizeState.isResizing = true;
            resizeState.startX = e.clientX;
            resizeState.handle = handle;
            resizeState.direction = handle.dataset.resize;
            
            resizeState.panel = resizeState.direction === 'left' 
                ? document.getElementById('panel-filters')
                : document.getElementById('validation-panel');
            
            resizeState.startWidth = resizeState.panel.offsetWidth;
            
            handle.classList.add('active');
            document.body.classList.add('resizing');
            
            e.preventDefault();
        });
    });
}

let activeAlerts = [
    {
        id: 1,
        householdName: 'Família Silva',
        type: 'Evacuação Urgente',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        priority: 'high'
    }
];

function calculateRiskZones(households) {
    const risk = { high: 0, medium: 0, low: 0 };
    
    households.forEach(h => {
        if (h.status === 'pendente' || h.has_mobility_issues) {
            risk.high++;
        } else if (h.has_elderly || h.has_children) {
            risk.medium++;
        } else {
            risk.low++;
        }
    });
    
    return risk;
}

function renderActiveAlerts() {
    const container = document.getElementById('active-alert-container');
    if (!container) return;
    
    if (activeAlerts.length === 0) {
        container.innerHTML = `
            <div class="pc-no-alert">
                <div class="pc-no-alert-icon">✓</div>
                <div class="pc-no-alert-text">Sem Alertas Ativos</div>
                <div class="pc-no-alert-subtext">Tudo sob controlo</div>
            </div>
        `;
        return;
    }
    
    const alert = activeAlerts[0];
    const timeAgo = getTimeAgo(alert.timestamp);
    
    container.innerHTML = `
        <div class="pc-active-alert">
            <div class="pc-alert-header">
                <div class="pc-alert-icon">🚨</div>
                <div class="pc-alert-title">
                    ${alert.householdName}<br>
                    <small style="opacity: 0.9;">${alert.type}</small>
                </div>
            </div>
            <div class="pc-alert-time">
                <i class="bi bi-clock me-1"></i>${timeAgo}
            </div>
            <div class="pc-alert-status">
                <i class="bi bi-exclamation-triangle-fill pc-alert-status-icon"></i>
                <span class="pc-alert-status-text">Solicitação Ativa - ${timeAgo}</span>
            </div>
        </div>
    `;
}

function renderRiskZones(households) {
    const risk = calculateRiskZones(households);
    
    const highEl = document.getElementById('risk-high-count');
    const mediumEl = document.getElementById('risk-medium-count');
    const lowEl = document.getElementById('risk-low-count');
    
    if (highEl) highEl.textContent = risk.high;
    if (mediumEl) mediumEl.textContent = risk.medium;
    if (lowEl) lowEl.textContent = risk.low;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    return `${Math.floor(seconds / 86400)} dias`;
}

function updateAlertsAndRisk(households) {
    renderActiveAlerts();
    renderRiskZones(households);
}

function openFicha(householdId) {
    window.location.href = `/ficha/${householdId}`;
}

function initHamburgerMenus() {
    const btnFilters = document.getElementById('btn-hamburger-filters');
    const btnDetails = document.getElementById('btn-hamburger-details');
    const panelFilters = document.getElementById('panel-filters');
    const panelDetails = document.getElementById('validation-panel');

    let backdrop = document.querySelector('.pc-mobile-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'pc-mobile-backdrop';
        document.body.appendChild(backdrop);
    }

    function closeAllPanels() {
        panelFilters?.classList.remove('active');
        panelDetails?.classList.remove('active');
        backdrop.classList.remove('active');
        btnFilters?.classList.remove('active');
        btnDetails?.classList.remove('active');
    }

    btnFilters?.addEventListener('click', () => {
        const isActive = panelFilters?.classList.contains('active');
        closeAllPanels();

        if (!isActive) {
            panelFilters?.classList.add('active');
            backdrop.classList.add('active');
            btnFilters?.classList.add('active');
        }
    });

    btnDetails?.addEventListener('click', () => {
        const isActive = panelDetails?.classList.contains('active');
        closeAllPanels();

        if (!isActive) {
            panelDetails?.classList.add('active');
            backdrop.classList.add('active');
            btnDetails?.classList.add('active');
        }
    });

    backdrop.addEventListener('click', closeAllPanels);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllPanels();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            closeAllPanels();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPanelResizing();
    initMap();
    updateAuthSection();
    applyRoleUI(getUserRole());
    wireMapControls();
    showSubmittedAlert();
    initHamburgerMenus();

    if (getMapMode() === 'command') {
        const pendingBtn = document.getElementById('btn-load-pending');
        if (pendingBtn) pendingBtn.classList.remove('d-none');
    }

    loadHouseholdMarkers();
    carregarInfraestruturas();
    map.invalidateSize();
});