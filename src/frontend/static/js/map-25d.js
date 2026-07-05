/**
 * SIG-Aldeias: Motor de Visualização 2.5D - Efeito Maquete Isométrica
 * Ficheiro: src/frontend/static/js/map-25d.js
 * 
 * Técnica: Vista oblíqua isométrica (luz do noroeste)
 * - Mapa permanece PLANO (sem rotação CSS)
 * - Telhado na posição real do agregado
 * - Paredes descem para SUL e ESTE (simulando profundidade)
 * - Sombras projetadas para sul/este
 * - 3 faces visíveis: Telhado + Parede Sul + Parede Este
 */

window.building25DLayer = null;

class Building25DLayer {
    constructor(map, householdsData, infrastructuresData) {
        this.map = map;
        this.households = householdsData || [];
        this.infrastructures = infrastructuresData || [];
        this.layerGroup = L.layerGroup();
        this.isActive = false;
        
        // Configurações de escala (ajustadas para efeito maquete)
        this.footprintSize = 0.00012;      // Tamanho da base (~12m)
        this.heightPerFloor = 0.00008;     // Altura por piso (~8m visual)
        
        // Paleta de cores profissional por material
        this.materialColors = {
            'betão': {
                roof: '#60a5fa',      // Azul claro (topo iluminado)
                wallSouth: '#2563eb', // Azul médio (parede sul)
                wallEast: '#1e40af',  // Azul escuro (parede este - sombra)
                outline: '#1e3a8a'    // Contorno
            },
            'madeira': {
                roof: '#f87171',      // Vermelho claro
                wallSouth: '#dc2626', // Vermelho médio
                wallEast: '#991b1b',  // Vermelho escuro
                outline: '#7f1d1d'
            },
            'alvenaria': {
                roof: '#fbbf24',      // Amarelo claro
                wallSouth: '#d97706', // Amarelo médio
                wallEast: '#92400e',  // Amarelo escuro
                outline: '#78350f'
            }
        };
        
        // Cores para infraestruturas
        this.infraColors = {
            'hydrant': {
                roof: '#f87171',
                wallSouth: '#dc2626',
                wallEast: '#991b1b'
            },
            'meeting_point': {
                roof: '#34d399',
                wallSouth: '#059669',
                wallEast: '#047857'
            },
            'public_building': {
                roof: '#a78bfa',
                wallSouth: '#7c3aed',
                wallEast: '#5b21b6'
            }
        };
    }

    init() {
        console.log('🏗️ Inicializando Maquete 2.5D com', this.households.length, 'agregados');
        
        // Desenhar agregados familiares
        this.households.forEach(h => {
            if (!h.latitude || !h.longitude) return;
            const floors = h.num_floors || 1;
            const colors = this.materialColors[h.material] || this.materialColors['betão'];
            this._drawBuilding(h.latitude, h.longitude, floors, colors, h.name);
        });

        // Desenhar infraestruturas
        this.infrastructures.forEach(infra => {
            if (!infra.geometry) return;
            const coords = this._parseWKT(infra.geometry);
            if (!coords) return;

            switch (infra.layer_type) {
                case 'hydrant':
                    this._drawCylinder(coords.lat, coords.lng, this.infraColors.hydrant, infra.name);
                    break;
                case 'meeting_point':
                    this._drawPlatform(coords.lat, coords.lng, this.infraColors.meeting_point, infra.name);
                    break;
                case 'public_building':
                    this._drawBuilding(coords.lat, coords.lng, 2, this.infraColors.public_building, infra.name);
                    break;
            }
        });
        
        console.log('✅ Maquete 2.5D inicializada com', this.layerGroup.getLayers().length, 'elementos');
    }

    /**
     * Desenha um edifício com efeito maquete isométrica
     * Técnica: Telhado na posição real + paredes descem para sul/este
     */
    _drawBuilding(lat, lng, floors, colors, name) {
        const h = floors * this.heightPerFloor;  // Altura total
        const s = this.footprintSize;             // Tamanho da base
        
        // Coordenadas do TELHADO (posição real, topo iluminado)
        const roofNW = [lat + s, lng - s];  // Noroeste
        const roofNE = [lat + s, lng + s];  // Nordeste
        const roofSE = [lat - s, lng + s];  // Sudeste
        const roofSW = [lat - s, lng - s];  // Sudoeste
        
        // Coordenadas da BASE (deslocada para sul e este = efeito profundidade)
        const baseNE = [lat + s - h, lng + s];      // Desce do NE
        const baseSE = [lat - s - h, lng + s];      // Desce do SE
        const baseSW = [lat - s - h, lng - s + h];  // Desce do SW (menos deslocamento)
        
        // --- DESENHAR NO MAPA ---
        
        // 1. SOMBRA (polígono preto transparente, deslocado para sul/este)
        const shadow = [
            [lat - s - h * 0.3, lng - s + h * 0.3],
            [lat - s - h * 0.3, lng + s + h * 0.3],
            [lat + s - h * 0.3, lng + s + h * 0.3],
            [lat + s - h * 0.3, lng - s + h * 0.3]
        ];
        
        const shadowPoly = L.polygon(shadow, {
            color: 'transparent',
            fillColor: '#000000',
            fillOpacity: 0.2,
            weight: 0
        });
        this.layerGroup.addLayer(shadowPoly);
        
        // 2. PAREDE SUL (face frontal - cor média)
        const wallSouth = [roofSW, roofSE, baseSE, baseSW];
        const wallSouthPoly = L.polygon(wallSouth, {
            color: colors.outline,
            weight: 1,
            fillColor: colors.wallSouth,
            fillOpacity: 0.95
        });
        wallSouthPoly.bindPopup(this._createPopup(name, floors, colors.roof, 'building'));
        this.layerGroup.addLayer(wallSouthPoly);
        
        // 3. PAREDE ESTE (face lateral - cor escura/sombra)
        const wallEast = [roofSE, roofNE, baseNE, baseSE];
        const wallEastPoly = L.polygon(wallEast, {
            color: colors.outline,
            weight: 1,
            fillColor: colors.wallEast,
            fillOpacity: 0.95
        });
        wallEastPoly.bindPopup(this._createPopup(name, floors, colors.roof, 'building'));
        this.layerGroup.addLayer(wallEastPoly);
        
        // 4. TELHADO (topo - cor clara/iluminada)
        const roof = [roofNW, roofNE, roofSE, roofSW];
        const roofPoly = L.polygon(roof, {
            color: colors.outline,
            weight: 1.5,
            fillColor: colors.roof,
            fillOpacity: 1
        });
        roofPoly.bindPopup(this._createPopup(name, floors, colors.roof, 'building'));
        this.layerGroup.addLayer(roofPoly);
        
        // 5. JANELAS (detalhe visual - linhas horizontais nas paredes)
        if (floors > 1) {
            for (let f = 1; f < floors; f++) {
                const floorHeight = f * this.heightPerFloor;
                
                // Linha na parede sul
                const windowSouth = [
                    [lat - s - floorHeight, lng - s],
                    [lat - s - floorHeight, lng + s]
                ];
                const windowSouthLine = L.polyline(windowSouth, {
                    color: colors.outline,
                    weight: 0.5,
                    opacity: 0.5
                });
                this.layerGroup.addLayer(windowSouthLine);
                
                // Linha na parede este
                const windowEast = [
                    [lat - s - floorHeight, lng + s],
                    [lat + s - floorHeight, lng + s]
                ];
                const windowEastLine = L.polyline(windowEast, {
                    color: colors.outline,
                    weight: 0.5,
                    opacity: 0.5
                });
                this.layerGroup.addLayer(windowEastLine);
            }
        }
    }

    /**
     * Desenha uma boca de incêndio (cilindro isométrico)
     */
    _drawCylinder(lat, lng, colors, name) {
        const radius = 0.00003;
        const height = 0.00008;
        const sides = 8;
        
        // Topo (círculo na posição real)
        const top = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            top.push([lat + Math.cos(angle) * radius, lng + Math.sin(angle) * radius]);
        }
        
        // Base (círculo deslocado para sul)
        const base = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            base.push([lat - height + Math.cos(angle) * radius, lng + Math.sin(angle) * radius]);
        }
        
        // Sombra
        const shadow = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            shadow.push([lat - height * 0.5 + Math.cos(angle) * radius, lng + height * 0.5 + Math.sin(angle) * radius]);
        }
        
        const shadowPoly = L.polygon(shadow, {
            color: 'transparent',
            fillColor: '#000000',
            fillOpacity: 0.2,
            weight: 0
        });
        this.layerGroup.addLayer(shadowPoly);
        
        // Paredes laterais (visíveis apenas do lado sul/este)
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            // Só desenha paredes que "olham" para sul/este (ângulos 0-π)
            if (i >= 0 && i < sides / 2) {
                const wall = L.polygon([top[i], top[next], base[next], base[i]], {
                    color: colors.wallEast,
                    weight: 1,
                    fillColor: colors.wallSouth,
                    fillOpacity: 0.95
                });
                wall.bindPopup(this._createPopup(name, null, colors.roof, 'hydrant'));
                this.layerGroup.addLayer(wall);
            }
        }
        
        // Topo
        const topPoly = L.polygon(top, {
            color: colors.wallEast,
            weight: 1.5,
            fillColor: colors.roof,
            fillOpacity: 1
        });
        topPoly.bindPopup(this._createPopup(name, null, colors.roof, 'hydrant'));
        this.layerGroup.addLayer(topPoly);
    }

    /**
     * Desenha um ponto de encontro (plataforma hexagonal isométrica)
     */
    _drawPlatform(lat, lng, colors, name) {
        const radius = 0.00020;
        const height = 0.00004;
        const sides = 6;
        
        // Topo (hexágono na posição real)
        const top = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            top.push([lat + Math.cos(angle) * radius, lng + Math.sin(angle) * radius]);
        }
        
        // Base (hexágono deslocado para sul)
        const base = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            base.push([lat - height + Math.cos(angle) * radius, lng + Math.sin(angle) * radius]);
        }
        
        // Sombra
        const shadow = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            shadow.push([lat - height * 0.5 + Math.cos(angle) * radius, lng + height * 0.5 + Math.sin(angle) * radius]);
        }
        
        const shadowPoly = L.polygon(shadow, {
            color: 'transparent',
            fillColor: '#000000',
            fillOpacity: 0.15,
            weight: 0
        });
        this.layerGroup.addLayer(shadowPoly);
        
        // Paredes laterais (visíveis apenas do lado sul)
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            if (i >= 0 && i < sides / 2) {
                const wall = L.polygon([top[i], top[next], base[next], base[i]], {
                    color: colors.wallEast,
                    weight: 1,
                    fillColor: colors.wallSouth,
                    fillOpacity: 0.9
                });
                wall.bindPopup(this._createPopup(name, null, colors.roof, 'meeting_point'));
                this.layerGroup.addLayer(wall);
            }
        }
        
        // Topo
        const topPoly = L.polygon(top, {
            color: colors.wallEast,
            weight: 2,
            fillColor: colors.roof,
            fillOpacity: 0.95
        });
        topPoly.bindPopup(this._createPopup(name, null, colors.roof, 'meeting_point'));
        this.layerGroup.addLayer(topPoly);
    }

    /**
     * Extrai coordenadas de uma string WKT POINT
     */
    _parseWKT(wkt) {
        if (!wkt) return null;
        const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
            return { 
                lng: parseFloat(match[1]), 
                lat: parseFloat(match[2]) 
            };
        }
        return null;
    }

    /**
     * Cria um popup profissional com ícones e informações
     */
    _createPopup(name, floors, color, type = 'building') {
        const icons = {
            'building': '🏢',
            'hydrant': '🔥',
            'meeting_point': '📍'
        };
        
        const labels = {
            'building': 'Edifício Residencial',
            'hydrant': 'Boca de Incêndio',
            'meeting_point': 'Ponto de Encontro'
        };
        
        const icon = icons[type] || '🏢';
        const label = labels[type] || 'Edifício';
        
        let floorsInfo = '';
        if (floors) {
            floorsInfo = `
                <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                    <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px;">
                        Altura
                    </div>
                    <div style="font-size: 16px; font-weight: bold; color: ${color};">
                        ${floors} ${floors === 1 ? 'piso' : 'pisos'}
                    </div>
                </div>
            `;
        }
        
        return `
            <div style="padding: 15px; min-width: 200px; font-family: Arial, sans-serif;">
                <div style="font-size: 36px; text-align: center; margin-bottom: 12px;">${icon}</div>
                <div style="font-weight: bold; color: ${color}; text-align: center; margin-bottom: 6px; font-size: 15px;">
                    ${name}
                </div>
                <div style="text-align: center; color: #666; font-size: 12px; margin-bottom: 12px;">
                    ${label}
                </div>
                ${floorsInfo}
                <div style="text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                    <span style="display: inline-block; width: 30px; height: 30px; background: ${color}; border-radius: 4px; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></span>
                </div>
            </div>
        `;
    }

    /**
     * Liga/desliga a visualização 2.5D
     */
    toggle() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.map.addLayer(this.layerGroup);
            console.log('✅ Maquete 2.5D ATIVADA - Vista isométrica');
        } else {
            this.map.removeLayer(this.layerGroup);
            console.log('❌ Maquete 2.5D DESATIVADA');
        }
        return this.isActive;
    }
}

/**
 * Função global para inicializar ou atualizar o 2.5D
 */
function initOrUpdate25D() {
    if (typeof map === 'undefined' || !map) {
        console.warn('⚠️ 2.5D: Mapa não inicializado');
        return;
    }
    
    if (typeof lastHouseholds === 'undefined' || !lastHouseholds) {
        console.warn('⚠️ 2.5D: Dados de agregados não disponíveis');
        return;
    }
    
    fetch('/infrastructures/', { 
        headers: { Accept: 'application/json' } 
    })
    .then(response => {
        if (!response.ok) throw new Error('Falha ao carregar infraestruturas');
        return response.json();
    })
    .then(infraData => {
        // Remover camada anterior se existir
        if (window.building25DLayer) {
            try {
                if (window.building25DLayer.layerGroup) {
                    map.removeLayer(window.building25DLayer.layerGroup);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao remover camada 2.5D anterior:', e);
            }
        }
        
        // Criar nova camada
        window.building25DLayer = new Building25DLayer(map, lastHouseholds, infraData);
        window.building25DLayer.init();
        
        // Se o toggle está ativo, reativar a camada
        const toggleBtn = document.getElementById('toggle25d');
        if (toggleBtn && toggleBtn.checked) {
            window.building25DLayer.toggle();
        }
    })
    .catch(err => {
        console.warn('⚠️ Erro ao inicializar 2.5D:', err);
    });
}

window.initOrUpdate25D = initOrUpdate25D;

console.log('✅ Módulo Maquete 2.5D Isométrica carregado com sucesso');