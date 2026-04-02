// ============================================================
//  CALDEIRARIA — CHARTS MODULE  (v2)
//  Barras em vez de linhas + linha de capacidade
// ============================================================

const PALETTE = {
    '1200': { primary: '#1a56db', light: '#ebf2ff', accent: '#0e3fa0' },
    '1201': { primary: '#0891b2', light: '#ecfeff', accent: '#065f7e' },
    '1220': { primary: '#7c3aed', light: '#f5f3ff', accent: '#5b21b6' },
    '3201': { primary: '#d97706', light: '#fffbeb', accent: '#92400e' },
    '6200': { primary: '#059669', light: '#ecfdf5', accent: '#065f46' },
};

const COLORS_SERIES = [
    '#1a56db','#059669','#d97706','#dc2626','#7c3aed',
    '#0891b2','#db2777','#65a30d','#ea580c','#0e7490',
    '#9333ea','#b45309','#be185d','#4d7c0f','#b91c1c'
];

const CENTRO_LABELS = {
    '1200': 'Caldeiraria JGS',
    '1201': 'Caldeiraria SBC',
    '1220': 'Caldeiraria EOL',
    '3201': 'Caldeiraria WEM',
    '6200': 'Caldeiraria WII',
};

const CAP_LINE_BASE = {
    type: 'line',
    label: 'Capacidade',
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderDash: [6, 4],
    pointRadius: 4,
    pointBackgroundColor: '#ef4444',
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    tension: 0.3,
    order: 0,
};

const ChartModule = {
    instances: {},

    destroy(id) {
        if (this.instances[id]) {
            this.instances[id].destroy();
            delete this.instances[id];
        }
    },

    globalOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeInOutQuart' },
            plugins: {
                legend: {
                    labels: {
                        font: { family: "'DM Sans', sans-serif", size: 12 },
                        color: '#374151',
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                    }
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#111827',
                    bodyColor: '#374151',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'DM Sans', sans-serif", size: 12 },
                    callbacks: {
                        label(ctx) {
                            const val = ctx.parsed.y ?? ctx.parsed;
                            return ` ${ctx.dataset.label}: ${Number(val).toLocaleString('pt-BR', {minimumFractionDigits:1,maximumFractionDigits:1})}h`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#6b7280' },
                    border: { display: false }
                },
                y: {
                    grid: { color: '#f3f4f6', lineWidth: 1 },
                    ticks: {
                        font: { family: "'DM Sans', sans-serif", size: 11 },
                        color: '#6b7280',
                        callback(v) { return Number(v).toLocaleString('pt-BR') + 'h'; }
                    },
                    border: { display: false }
                }
            }
        };
    },

    // ── Bar chart por centro + linha de capacidade ─────────────
    renderLineCentro(canvasId, cent) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const semanas = DataEngine.getSemanas();
        const agg = DataEngine.agregadoPorCentroSemana()[cent] || {};
        const cap = DataEngine.capacidadePorCentroSemana()[cent] || {};
        const pal = PALETTE[cent] || PALETTE['1200'];
        const c = new Chart(ctx, {
            data: {
                labels: semanas,
                datasets: [
                    { type:'bar', label:`Horas`, data: semanas.map(s=>parseFloat((agg[s]||0).toFixed(2))),
                      backgroundColor: pal.primary+'cc', borderWidth:0, borderRadius:6, order:1 },
                    { ...CAP_LINE_BASE, data: semanas.map(s=>parseFloat((cap[s]||0).toFixed(2))) }
                ]
            },
            options: {
                ...this.globalOptions(),
                plugins: { ...this.globalOptions().plugins,
                    tooltip: { ...this.globalOptions().plugins.tooltip, mode:'index',
                        callbacks: {
                            title(ctx) { return `Semana ${ctx[0].label}`; },
                            label(ctx) {
                                const v = ctx.parsed.y;
                                return ` ${ctx.dataset.label}: ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1})}h`;
                            }
                        }
                    }
                }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Barras empilhadas por CenTrab + linha de capacidade ────
    renderStackedCenTrab(canvasId, cent, topN = 8) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const { labels, datasets } = DataEngine.chartDataStackedCenTrab(cent, topN);
        const cap = DataEngine.capacidadePorCentroSemana()[cent] || {};
        const c = new Chart(ctx, {
            data: {
                labels,
                datasets: [
                    ...datasets.map((ds,i) => ({
                        type:'bar', ...ds,
                        backgroundColor: COLORS_SERIES[i%COLORS_SERIES.length]+'cc',
                        borderWidth:0,
                        borderRadius: i===datasets.length-1?6:0,
                        borderSkipped:false, order:i+1
                    })),
                    { ...CAP_LINE_BASE, data: labels.map(s=>parseFloat((cap[s]||0).toFixed(2))) }
                ]
            },
            options: {
                ...this.globalOptions(),
                scales: {
                    x: { ...this.globalOptions().scales.x, stacked:true },
                    y: { ...this.globalOptions().scales.y, stacked:true }
                },
                plugins: { ...this.globalOptions().plugins,
                    tooltip: { ...this.globalOptions().plugins.tooltip, mode:'index' } }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Donut ──────────────────────────────────────────────────
    renderDonutCentros(canvasId) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const totais = DataEngine.totalPorCentro();
        const centros = Object.keys(totais);
        const values = centros.map(c => parseFloat(totais[c].toFixed(1)));
        const colors = centros.map(c => (PALETTE[c]||{primary:'#94a3b8'}).primary);
        const c = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: centros.map(c=>`${c} – ${CENTRO_LABELS[c]||c}`),
                datasets: [{ data:values, backgroundColor:colors.map(cl=>cl+'dd'), borderColor:colors, borderWidth:2, hoverOffset:12 }]
            },
            options: {
                responsive:true, maintainAspectRatio:false, animation:{duration:700},
                plugins: {
                    legend: { position:'bottom', labels:{ font:{family:"'DM Sans', sans-serif",size:11}, color:'#374151', padding:12, usePointStyle:true } },
                    tooltip: {
                        backgroundColor:'#fff', titleColor:'#111827', bodyColor:'#374151',
                        borderColor:'#e5e7eb', borderWidth:1, padding:12, cornerRadius:10,
                        callbacks: {
                            label(ctx) {
                                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                                const pct = ((ctx.parsed/total)*100).toFixed(1);
                                return ` ${Number(ctx.parsed).toLocaleString('pt-BR',{minimumFractionDigits:1})}h (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Radar comparativo ──────────────────────────────────────
    renderRadar(canvasId) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const semanas = DataEngine.getSemanas();
        const centros = DataEngine.getCentros();
        const agg = DataEngine.agregadoPorCentroSemana();
        const normed = {};
        semanas.forEach(s => {
            const vals = centros.map(c => agg[c]?.[s]||0);
            const max = Math.max(...vals)||1;
            centros.forEach(c => {
                if (!normed[c]) normed[c]=[];
                normed[c].push(parseFloat(((agg[c]?.[s]||0)/max*100).toFixed(1)));
            });
        });
        const c = new Chart(ctx, {
            type:'radar',
            data: {
                labels: semanas.map(s=>`Sem ${s.split('.')[0]}`),
                datasets: centros.map((cent,i)=>({
                    label:`${cent} – ${CENTRO_LABELS[cent]||cent}`,
                    data: normed[cent],
                    borderColor: COLORS_SERIES[i],
                    backgroundColor: COLORS_SERIES[i]+'20',
                    pointBackgroundColor: COLORS_SERIES[i],
                    pointRadius:4, borderWidth:2
                }))
            },
            options: {
                responsive:true, maintainAspectRatio:false, animation:{duration:700},
                plugins: {
                    legend: { labels:{ font:{family:"'DM Sans', sans-serif",size:12}, color:'#374151', padding:16, usePointStyle:true } },
                    tooltip: { backgroundColor:'#fff', titleColor:'#111827', bodyColor:'#374151', borderColor:'#e5e7eb', borderWidth:1, padding:12, cornerRadius:10 }
                },
                scales: { r: { grid:{color:'#e5e7eb'}, pointLabels:{font:{family:"'DM Sans',sans-serif",size:11},color:'#374151'}, ticks:{display:false}, angleLines:{color:'#e5e7eb'} } }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Multi-bar comparativo entre centros + cap lines ────────
    renderMultiLine(canvasId, visibleCentros) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const semanas = DataEngine.getSemanas();
        const centros = DataEngine.getCentros().filter(c => visibleCentros[c] !== false);
        const agg = DataEngine.agregadoPorCentroSemana();
        const cap = DataEngine.capacidadePorCentroSemana();
        const datasets = [];
        centros.forEach((c,i) => {
            const pal = PALETTE[c]||{primary:COLORS_SERIES[i]};
            datasets.push({ type:'bar', label:`${c}`, data:semanas.map(s=>parseFloat((agg[c]?.[s]||0).toFixed(2))),
                backgroundColor:pal.primary+'bb', borderWidth:0, borderRadius:4, order:i+1 });
        });
        centros.forEach((c,i) => {
            const pal = PALETTE[c]||{primary:COLORS_SERIES[i]};
            datasets.push({ ...CAP_LINE_BASE, label:`Cap. ${c}`, borderColor:pal.primary, borderDash:[5,3],
                pointRadius:3, pointBackgroundColor:pal.primary,
                data:semanas.map(s=>parseFloat((cap[c]?.[s]||0).toFixed(2))), order:0 });
        });
        const c = new Chart(ctx, {
            data: { labels:semanas, datasets },
            options: { ...this.globalOptions(), plugins: { ...this.globalOptions().plugins,
                tooltip: { ...this.globalOptions().plugins.tooltip, mode:'index' } } }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Barras horizontais — top CenTrabs ─────────────────────
    renderTopCenTrab(canvasId, cent, topN = 10) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const top = DataEngine.topCenTrabs(cent, topN);
        const pal = PALETTE[cent]||PALETTE['1200'];
        const c = new Chart(ctx, {
            type:'bar',
            data: {
                labels: top.map(t=>t.cenTrab),
                datasets: [{ label:'Horas Totais', data:top.map(t=>parseFloat(t.total.toFixed(2))),
                    backgroundColor: top.map((_,i)=>{
                        const alpha=Math.round(255*(1-i*0.06)).toString(16).padStart(2,'0');
                        return pal.primary+alpha;
                    }), borderWidth:0, borderRadius:6 }]
            },
            options: {
                ...this.globalOptions(), indexAxis:'y',
                plugins: { ...this.globalOptions().plugins, legend:{display:false},
                    tooltip: { ...this.globalOptions().plugins.tooltip,
                        callbacks: { label(ctx) { return ` ${Number(ctx.parsed.x).toLocaleString('pt-BR',{minimumFractionDigits:1})}h`; } } } },
                scales: {
                    x: { ...this.globalOptions().scales.x, ticks:{...this.globalOptions().scales.x.ticks, callback(v){return Number(v).toLocaleString('pt-BR')+'h';}} },
                    y: { ...this.globalOptions().scales.y, grid:{display:false} }
                }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Heatmap ───────────────────────────────────────────────
    renderHeatmap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const centros = DataEngine.getCentros();
        const semanas = DataEngine.getSemanas();
        const agg = DataEngine.agregadoPorCentroSemana();
        let maxVal = 0;
        centros.forEach(c => semanas.forEach(s => { if ((agg[c]?.[s]||0) > maxVal) maxVal = agg[c][s]; }));
        let html = `<table class="heatmap-table"><thead><tr><th>Centro</th>${semanas.map(s=>`<th>Sem ${s.split('.')[0]}</th>`).join('')}</tr></thead><tbody>`;
        centros.forEach(cent => {
            const pal = PALETTE[cent]||{primary:'#94a3b8'};
            html += `<tr><td class="heatmap-label"><span class="heatmap-dot" style="background:${pal.primary}"></span><span>${cent}</span><small>${CENTRO_LABELS[cent]||''}</small></td>`;
            semanas.forEach(s => {
                const val = agg[cent]?.[s]||0;
                const intensity = maxVal>0?val/maxVal:0;
                const alpha = Math.round(intensity*200+20);
                const bg = pal.primary+alpha.toString(16).padStart(2,'0');
                const textColor = intensity>0.5?'#fff':'#374151';
                html += `<td class="heatmap-cell" style="background:${bg};color:${textColor}" title="${cent} — Sem ${s}: ${val.toLocaleString('pt-BR',{minimumFractionDigits:1})}h">${val>0?val.toLocaleString('pt-BR',{minimumFractionDigits:0}):'–'}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    // ── Sparklines (barras mini) ───────────────────────────────
    renderSparkline(canvasId, cent) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const semanas = DataEngine.getSemanas();
        const agg = DataEngine.agregadoPorCentroSemana()[cent]||{};
        const pal = PALETTE[cent]||PALETTE['1200'];
        const c = new Chart(ctx, {
            type:'bar',
            data: { labels:semanas, datasets:[{ data:semanas.map(s=>parseFloat((agg[s]||0).toFixed(2))), backgroundColor:pal.primary+'99', borderRadius:2, borderWidth:0 }] },
            options: { responsive:true, maintainAspectRatio:false, animation:false,
                plugins:{legend:{display:false},tooltip:{enabled:false}},
                scales:{x:{display:false},y:{display:false}} }
        });
        this.instances[canvasId] = c;
    },

    // ── Variação % ────────────────────────────────────────────
    renderVariacao(canvasId, cent) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const data = DataEngine.variacaoSemanal(cent).filter(d => d.variacao!==null);
        const c = new Chart(ctx, {
            type:'bar',
            data: {
                labels: data.map(d=>d.semana),
                datasets:[{ label:'Variação %', data:data.map(d=>parseFloat(d.variacao.toFixed(1))),
                    backgroundColor:data.map(d=>d.variacao>=0?'#10b981cc':'#ef4444cc'),
                    borderColor:data.map(d=>d.variacao>=0?'#059669':'#dc2626'),
                    borderWidth:0, borderRadius:5 }]
            },
            options: {
                ...this.globalOptions(),
                plugins: { ...this.globalOptions().plugins, legend:{display:false},
                    tooltip: { ...this.globalOptions().plugins.tooltip,
                        callbacks:{ label(ctx){ const sign=ctx.parsed.y>=0?'+':''; return ` ${sign}${ctx.parsed.y.toFixed(1)}%`; } } } },
                scales: { ...this.globalOptions().scales,
                    y: { ...this.globalOptions().scales.y, ticks:{...this.globalOptions().scales.y.ticks, callback(v){return v+'%';}} } }
            }
        });
        this.instances[canvasId] = c;
        return c;
    },

    // ── Gráfico de Utilização de Capacidade % ─────────────────
    renderUtilizacao(canvasId, cent) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const semanas = DataEngine.getSemanas();
        const util = DataEngine.utilizacaoPorCentroSemana()[cent]||{};
        const pal = PALETTE[cent]||PALETTE['1200'];
        const vals = semanas.map(s=>util[s]);
        const c = new Chart(ctx, {
            data: {
                labels: semanas,
                datasets: [
                    { type:'bar', label:'Utilização %', data:vals,
                      backgroundColor:vals.map(v=>v===null?'#e5e7eb':v>100?'#ef4444cc':v>80?'#f59e0bcc':pal.primary+'cc'),
                      borderRadius:5, borderWidth:0, order:1 },
                    { type:'line', label:'100% Capacidade', data:semanas.map(()=>100),
                      borderColor:'#ef4444', borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false, order:0 }
                ]
            },
            options: {
                ...this.globalOptions(),
                plugins: { ...this.globalOptions().plugins,
                    tooltip: { ...this.globalOptions().plugins.tooltip, mode:'index',
                        callbacks:{ label(ctx){ if(ctx.parsed.y===null)return ' Sem dados'; return ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`; } } } },
                scales: { x:this.globalOptions().scales.x,
                    y: { ...this.globalOptions().scales.y, ticks:{...this.globalOptions().scales.y.ticks, callback(v){return v+'%';}} } }
            }
        });
        this.instances[canvasId] = c;
        return c;
    }
};

window.ChartModule = ChartModule;
window.PALETTE = PALETTE;
window.CENTRO_LABELS = CENTRO_LABELS;
window.COLORS_SERIES = COLORS_SERIES;