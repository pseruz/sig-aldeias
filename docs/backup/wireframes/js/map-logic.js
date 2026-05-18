// js/map-logic.js

// 1. Inicializar Mapa
const map = L.map('map-container').setView([40.22, -8.05], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Lógica do Drawer
function abrirDetalhe(nome) {
    document.getElementById('drawer-title').innerText = nome;
    document.getElementById('drawer-content').innerHTML = `<p>Dados detalhados sobre ${nome} serão carregados aqui...</p>`;
    document.getElementById('drawer').classList.add('open');
}

function fecharDrawer() {
    document.getElementById('drawer').classList.remove('open');
}