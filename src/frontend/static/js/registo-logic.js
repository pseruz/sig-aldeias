// registo-logic.js — Fluxo de campo: registo de agregado

function updateAuthSection() {
    const el = document.getElementById('auth-section');
    if (!el) return;
    const token = localStorage.getItem('access_token');
    el.textContent = token
        ? 'Sessão autenticada (JWT ativo)'
        : 'Sem token — faça login em /auth/login antes de submeter';
    el.className = token ? 'pc-auth-badge pc-auth-badge--ok' : 'pc-auth-badge pc-auth-badge--warn';
}

function captureGPS() {
    const statusEl = document.getElementById('gps-status');
    if (!navigator.geolocation) {
        statusEl.textContent = 'Geolocalização não suportada neste dispositivo.';
        return;
    }
    statusEl.textContent = 'A obter posição GPS…';
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('reg-latitude').value = pos.coords.latitude.toFixed(6);
            document.getElementById('reg-longitude').value = pos.coords.longitude.toFixed(6);
            statusEl.textContent = `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        },
        () => {
            statusEl.textContent = 'Erro ao capturar GPS. Verifique permissões do browser.';
        },
        { enableHighAccuracy: true, timeout: 15000 }
    );
}

function collectFormData() {
    const floors = document.querySelector('input[name="num_floors"]:checked')?.value || '1';
    const material = document.querySelector('input[name="material"]:checked')?.value || 'alvenaria';
    const lat = parseFloat(document.getElementById('reg-latitude').value);
    const lon = parseFloat(document.getElementById('reg-longitude').value);

    // ✅ NOVO: Ler infraestruturas do campo hidden (preenchido pelo inline script)
    let infrastructures = null;
    const infraJson = document.getElementById('infrastructures_json')?.value;
    if (infraJson) {
        try {
            infrastructures = JSON.parse(infraJson);
            console.log('📦 Infraestruturas carregadas:', infrastructures);
        } catch (e) {
            console.warn('⚠️ Erro ao parsear infraestruturas:', e);
        }
    }

    return {
        name: document.getElementById('reg-name').value.trim(),
        num_people: parseInt(document.getElementById('reg-people').value, 10),
        num_floors: parseInt(floors, 10),
        material,
        has_elderly: document.getElementById('reg-elderly').checked,
        has_children: document.getElementById('reg-children').checked,
        has_mobility_issues: document.getElementById('reg-mobility').checked,
        latitude: lat,
        longitude: lon,
        observations: document.getElementById('reg-notes').value.trim(),
        infrastructures, // ✅ NOVO
    };
}

/** POST /households/ — status pendente definido no backend */
async function submitRegistration(formData) {
    // ✅ NOVO: Construir payload incluindo infraestruturas se existirem
    const payload = {
        name: formData.name,
        num_people: formData.num_people,
        num_floors: formData.num_floors,
        material: formData.material,
        has_elderly: formData.has_elderly,
        has_children: formData.has_children,
        has_mobility_issues: formData.has_mobility_issues,
        latitude: formData.latitude,
        longitude: formData.longitude,
    };

    // Adicionar infraestruturas apenas se houver dados
    if (formData.infrastructures && Object.keys(formData.infrastructures).length > 0) {
        payload.infrastructures = formData.infrastructures;
    }

    const response = await fetch('/households/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload), // ✅ ALTERADO: usa payload em vez de objeto inline
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthSection();

    document.getElementById('btn-gps')?.addEventListener('click', captureGPS);

    document.getElementById('registo-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('registo-msg');
        const data = collectFormData();

        if (!data.name || data.name.length < 2) {
            msgEl.textContent = 'Indique um nome válido para o agregado.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--err';
            return;
        }
        if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
            msgEl.textContent = 'Capture a posição GPS antes de submeter.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--err';
            return;
        }

        msgEl.textContent = 'A submeter…';
        msgEl.className = 'pc-validate-msg';

        try {
            const created = await submitRegistration(data);
            if (data.observations) {
                localStorage.setItem(`obs_${created.id}`, data.observations);
            }
            window.location.href = '/map?mode=field&submitted=1';
        } catch (err) {
            console.error(err);
            msgEl.textContent = 'Falha no registo. Verifique autenticação JWT e dados.';
            msgEl.className = 'pc-validate-msg pc-validate-msg--err';
        }
    });
});