// src/frontend/static/js/ficha-logic.js

let isEditing = false;
let miniMap = null;
let markers = {};

// Cores dos marcadores no mini-mapa
const MARKER_COLORS = {
    household: '#FF6B00',      // Laranja (agregado)
    emergency_doors: '#0D6EFD', // Azul (saídas)
    fire_hydrants: '#DC3545',   // Vermelho (bocas)
    meeting_point: '#28A745'    // Verde (ponto encontro)
};

// Ícones dos marcadores
const MARKER_ICONS = {
    household: '🏠',
    emergency_doors: '🚪',
    fire_hydrants: '🔥',
    meeting_point: '📍'
};

// Criar ícone personalizado para Leaflet
function createCustomIcon(emoji, color) {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `<div style="
            background-color: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

// Função para validar coordenadas GPS
function validateCoordinates(lat, lng, label) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
        return { valid: false, error: `${label}: coordenadas devem ser números válidos` };
    }
    
    if (latNum < -90 || latNum > 90) {
        return { valid: false, error: `${label}: latitude deve estar entre -90 e 90` };
    }
    
    if (lngNum < -180 || lngNum > 180) {
        return { valid: false, error: `${label}: longitude deve estar entre -180 e 180` };
    }
    
    return { valid: true, lat: latNum, lng: lngNum };
}

// Carregar dados da ficha via API
async function loadFichaData() {
    console.log('🔄 A carregar ficha técnica #', FICHA_ID);
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('❌ Sem token de autenticação');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/login';
            return;
        }
        
        const response = await fetch(`/api/ficha/${FICHA_ID}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Erro na resposta:', response.status, response.statusText);
            if (response.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                window.location.href = '/login';
            } else {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return;
        }
        
        const data = await response.json();
        console.log('✅ Dados carregados com sucesso:', data);
        
        populateForm(data);
        
        setTimeout(() => {
            initMiniMap(data);
            initQRCode();
        }, 100);
        
    } catch (err) {
        console.error('❌ Erro ao carregar ficha:', err);
        alert('Erro ao carregar ficha técnica: ' + err.message);
    }
}

// Preencher formulário com dados
function populateForm(data) {
    console.log('📝 A preencher formulário...');
    
    document.getElementById('field-name').value = data.name || '';
    document.getElementById('field-num_people').value = data.num_people || 1;
    document.getElementById('field-num_floors').value = data.num_floors || 1;
    document.getElementById('field-material').value = data.material || 'alvenaria';
    document.getElementById('field-has_elderly').checked = data.has_elderly || false;
    document.getElementById('field-has_children').checked = data.has_children || false;
    document.getElementById('field-has_mobility_issues').checked = data.has_mobility_issues || false;
    document.getElementById('field-evacuation_point_name').value = data.evacuation_point_name || '';
    document.getElementById('field-evacuation_point_distance').value = data.evacuation_point_distance || '';
    document.getElementById('field-tee_minutes').value = data.tee_minutes || '';
    document.getElementById('field-observations').value = data.observations || '';
    document.getElementById('field-latitude').value = data.latitude || 0;
    document.getElementById('field-longitude').value = data.longitude || 0;
    
    if (data.utility_cutoffs) {
        document.getElementById('field-cutoff-water').value = data.utility_cutoffs.water || '';
        document.getElementById('field-cutoff-gas').value = data.utility_cutoffs.gas || '';
    }
    
    // Preencher coordenadas das infraestruturas
    if (data.infrastructures) {
        Object.keys(data.infrastructures).forEach(key => {
            const infra = data.infrastructures[key];
            if (infra.status === 'exists' && infra.lat && infra.lng) {
                const latField = document.getElementById(`field-infra-${key}-lat`);
                const lngField = document.getElementById(`field-infra-${key}-lng`);
                if (latField) latField.value = infra.lat;
                if (lngField) lngField.value = infra.lng;
            }
        });
    }
    
    console.log('✅ Formulário preenchido');
}

// Inicializar mini-mapa com TODOS os pontos
function initMiniMap(data) {
    console.log('🗺️ A inicializar mapa com múltiplos pontos');
    
    const lat = data.latitude;
    const lng = data.longitude;
    
    if (!lat || !lng || lat === 0 || lng === 0) {
        console.warn('⚠️ Coordenadas inválidas:', lat, lng);
        return;
    }
    
    try {
        if (miniMap) {
            miniMap.remove();
            miniMap = null;
        }
        
        // Mapa apenas visual (sem interação)
        miniMap = L.map('mini-map', {
            scrollWheelZoom: false,
            doubleClickZoom: false,
            dragging: false,
            zoomControl: false
        }).setView([lat, lng], 17);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(miniMap);
        
        // Limpar marcadores anteriores
        markers = {};
        
        // Adicionar marcador do agregado (principal)
        const householdIcon = createCustomIcon(MARKER_ICONS.household, MARKER_COLORS.household);
        markers.household = L.marker([lat, lng], { icon: householdIcon })
            .addTo(miniMap)
            .bindPopup(`<strong>🏠 Agregado</strong><br>${data.name}`)
            .openPopup();
        
        // Adicionar marcadores das infraestruturas
        if (data.infrastructures) {
            Object.keys(data.infrastructures).forEach(key => {
                const infra = data.infrastructures[key];
                if (infra.status === 'exists' && infra.lat && infra.lng) {
                    const color = MARKER_COLORS[key] || '#6C757D';
                    const emoji = MARKER_ICONS[key] || '📍';
                    const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    const icon = createCustomIcon(emoji, color);
                    markers[key] = L.marker([infra.lat, infra.lng], { icon: icon })
                        .addTo(miniMap)
                        .bindPopup(`<strong>${emoji} ${label}</strong><br>${infra.lat.toFixed(5)}, ${infra.lng.toFixed(5)}`);
                }
            });
        }
        
        setTimeout(() => {
            if (miniMap) {
                miniMap.invalidateSize();
                console.log('✅ Mapa inicializado com', Object.keys(markers).length, 'marcadores');
            }
        }, 200);
        
    } catch (err) {
        console.error('❌ Erro ao inicializar mapa:', err);
    }
}

// Inicializar QR Code
function initQRCode() {
    console.log('📱 A gerar QR Code...');
    
    try {
        const qrContainer = document.getElementById('qrcode');
        if (qrContainer) {
            qrContainer.innerHTML = '';
        }
        
        const url = `${window.location.origin}/ficha/${FICHA_ID}`;
        
        new QRCode(qrContainer, {
            text: url,
            width: 150,
            height: 150,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        console.log('✅ QR Code gerado');
        
    } catch (err) {
        console.error('❌ Erro ao gerar QR Code:', err);
    }
}

// Event Listeners
document.getElementById('btn-edit').addEventListener('click', () => {
    console.log('✏️ Modo de edição ativado');
    isEditing = true;
    enableEditing();
});

document.getElementById('btn-save').addEventListener('click', async () => {
    console.log('💾 A guardar ficha...');
    await saveFicha();
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    console.log('❌ Cancelar edição');
    isEditing = false;
    disableEditing();
    loadFichaData();
});

document.getElementById('btn-print').addEventListener('click', () => {
    console.log('🖨️ Imprimir ficha');
    window.print();
});

function enableEditing() {
    console.log(' Campos desbloqueados');
    
    // Desbloquear todos os campos
    const fields = document.querySelectorAll('.pc-input, .form-select, .form-check-input');
    fields.forEach(field => {
        field.disabled = false;
    });
    
    document.getElementById('btn-edit').classList.add('d-none');
    document.getElementById('btn-save').classList.remove('d-none');
    document.getElementById('btn-cancel').classList.remove('d-none');
}

function disableEditing() {
    console.log('🔒 Campos bloqueados');
    
    const fields = document.querySelectorAll('.pc-input, .form-select, .form-check-input');
    fields.forEach(field => {
        if (field.id.includes('has_')) {
            field.disabled = false; // Vulnerabilidades sempre editáveis
        } else {
            field.disabled = true;
        }
    });
    
    document.getElementById('btn-edit').classList.remove('d-none');
    document.getElementById('btn-save').classList.add('d-none');
    document.getElementById('btn-cancel').classList.add('d-none');
}

async function saveFicha() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
    }
    
    // ✅ Validar coordenadas do agregado
    const latInput = document.getElementById('field-latitude').value;
    const lngInput = document.getElementById('field-longitude').value;
    
    const householdValidation = validateCoordinates(latInput, lngInput, 'Agregado');
    if (!householdValidation.valid) {
        alert(`⚠️ ${householdValidation.error}`);
        return;
    }
    
    // ✅ Validar coordenadas das infraestruturas
    const infraCoords = {};
    const infraElements = document.querySelectorAll('.infra-coord');
    
    for (const el of infraElements) {
        const id = el.id; // ex: field-infra-fire_hydrants-lat
        const match = id.match(/^field-infra-(.+)-(lat|lng)$/);
        if (!match) continue;
        
        const key = match[1];
        const type = match[2];
        
        if (!infraCoords[key]) infraCoords[key] = {};
        infraCoords[key][type] = el.value;
    }
    
    // Validar cada infraestrutura
    for (const [key, coords] of Object.entries(infraCoords)) {
        const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const validation = validateCoordinates(coords.lat, coords.lng, label);
        if (!validation.valid) {
            alert(`⚠️ ${validation.error}`);
            return;
        }
        infraCoords[key] = validation;
    }
    
    // Preparar dados
    const cutoffWater = document.getElementById('field-cutoff-water').value;
    const cutoffGas = document.getElementById('field-cutoff-gas').value;
    
    // Atualizar infraestruturas com novas coordenadas
    const updatedInfrastructures = INFRASTRUCTURES || {};
    for (const [key, coords] of Object.entries(infraCoords)) {
        if (updatedInfrastructures[key]) {
            updatedInfrastructures[key].lat = coords.lat;
            updatedInfrastructures[key].lng = coords.lng;
        }
    }
    
    const data = {
        name: document.getElementById('field-name').value,
        num_people: parseInt(document.getElementById('field-num_people').value) || 1,
        num_floors: parseInt(document.getElementById('field-num_floors').value) || 1,
        material: document.getElementById('field-material').value,
        has_elderly: document.getElementById('field-has_elderly').checked,
        has_children: document.getElementById('field-has_children').checked,
        has_mobility_issues: document.getElementById('field-has_mobility_issues').checked,
        evacuation_point_name: document.getElementById('field-evacuation_point_name').value,
        evacuation_point_distance: parseInt(document.getElementById('field-evacuation_point_distance').value) || null,
        tee_minutes: parseInt(document.getElementById('field-tee_minutes').value) || null,
        observations: document.getElementById('field-observations').value,
        utility_cutoffs: {
            water: cutoffWater,
            gas: cutoffGas
        },
        latitude: householdValidation.lat,
        longitude: householdValidation.lng,
        infrastructures: updatedInfrastructures
    };
    
    console.log('📤 A enviar dados:', data);
    
    try {
        const response = await fetch(`/api/ficha/${FICHA_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            let errorMsg = `Erro ${response.status}`;
            
            if (contentType && contentType.includes('application/json')) {
                const err = await response.json();
                errorMsg = err.detail || errorMsg;
            } else {
                const text = await response.text();
                console.error('Resposta não-JSON:', text.substring(0, 200));
            }
            
            if (response.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                window.location.href = '/login';
            } else if (response.status === 403) {
                alert('Não tem permissão para editar esta ficha.');
            } else {
                alert(`Erro ao guardar: ${errorMsg}`);
            }
            return;
        }
        
        alert('✅ Ficha guardada com sucesso!');
        isEditing = false;
        disableEditing();
        loadFichaData();
        
    } catch (err) {
        console.error('❌ Erro ao guardar:', err);
        alert(`Erro ao guardar: ${err.message}`);
    }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - Ficha Técnica #', FICHA_ID);
    loadFichaData();
});