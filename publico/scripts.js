(function(){
    "use strict";

    const capitalize = (string) => {
        const cap = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
        return string.split(' ').map(cap).join(' ');
    }
    function fmtDate(data){
        if(!data) return '—';

        const d = new Date(data);

        if(isNaN(d.getTime())) return '—';

        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();

        return `${dia}/${mes}/${ano}`;
    }
    // ── Constantes de domínio ────────────────────────────────
    const REF = new Date(2025,6,31);            // data de referência do mock (31/07/2025)
    const FINAL = new Set([13,14]);             // Aprovado, Finalizado
    const CANCEL = 15;
    const DAY = 86400000;

    const PHASE = {
        'a fazer':'plan','reunião agendada':'plan','reuniao agendada':'plan',
        'briefing em construção':'brief','briefing em construcao':'brief','briefing finalizado':'brief',
        'aguardando materiais':'block',
        'em desenvolvimento':'prod','pronto para aprovação':'prod','pronto para aprovacao':'prod',
        'em aprovação':'aprov','em aprovacao':'aprov',
        'em alteração':'rework','em alteracao':'rework','ajustes':'rework',
        'pronto para agendamento':'sched','em agendamento':'sched',
        'aprovado':'done','finalizado':'done',
        'cancelado':'cancel'
    };
    const PHASE_COLOR = {plan:'#64748B',brief:'#38BDF8',block:'#FB923C',prod:'#818CF8',aprov:'#2DD4BF',rework:'#D946EF',sched:'#22D3EE',done:'#34D399',cancel:'#475569'};
    const PHASE_LABEL = {plan:'Planejamento',brief:'Briefing',block:'Bloqueio',prod:'Produção',aprov:'Aprovação',rework:'Retrabalho',sched:'Agendamento',done:'Concluído',cancel:'Cancelado'};
    const norm = s => (s||'').trim().toLowerCase();
    const phaseOf = s => PHASE[norm(s)] || 'plan';
    const statusColor = s => PHASE_COLOR[phaseOf(s)];

    const SAUDE = {
        saudavel:{label:'Saudável', cls:'b-ok', dot:'#34D399'},
        em_alerta:{label:'Atenção', cls:'b-warn', dot:'#FBBF24'},
        critico:{label:'Alerta', cls:'b-crit', dot:'#FB7185'},
        cancelado:{label:'Cancelado', cls:'b-mut', dot:'#6B7488'}
    };
    const SAUDE_RANK = {alerta:0, atencao:1, saudavel:2, cancelado:3};

    const ALERTAS_META = {
        briefing_atrasado:        {label:'Briefing atrasado', sev:'warn', regra:'Briefing até o dia 10', key:'brief'},
        briefing_sem_registro:    {label:'Briefing sem registro', sev:'warn', regra:'Briefing até o dia 10', key:'brief'},
        aprovacao_atrasada:       {label:'Aprovação atrasada', sev:'warn', regra:'Em aprovação até o dia 25', key:'aprov'},
        sem_aprovacao:            {label:'Não chegou à aprovação', sev:'crit', regra:'Em aprovação até o dia 25', key:'aprov'},
        materiais_atrasados:      {label:'Materiais após o dia 10', sev:'warn', regra:'Sem aguardar materiais (dia 10)', key:'mat'},
        ainda_aguardando_materiais:{label:'Ainda aguardando materiais', sev:'crit', regra:'Sem aguardar materiais (dia 10)', key:'mat'},
        aprovacao_final_atrasada: {label:'Aprovação final atrasada', sev:'warn', regra:'Aprovado até o dia 30', key:'final'},
        nao_aprovado_no_mes:      {label:'Não aprovado no mês', sev:'crit', regra:'Aprovado até o dia 30', key:'final'}
    };
    const CARGO_META = {
        'Social Media':{color:'#38BDF8', icon:'✎'},
        'Designer':{color:'#818CF8', icon:'◆'},
        'Audiovisual':{color:'#2DD4BF', icon:'►'}
    };

    // ── Helpers ──────────────────────────────────────────────
    const $ = (s,r=document)=>r.querySelector(s);
    const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const hueFromName = n => { let h=0; for(const c of (n||'')) h=(h*31+c.charCodeAt(0))%360; return h; };
    const avatarBg = n => `hsl(${hueFromName(n)} 62% 62%)`;

    function parseData(s){
        if(!s) return null;
        if(s instanceof Date) return isNaN(s)?null:s;
        if(/^\d{4}-\d{2}-\d{2}/.test(s)){ const d=new Date(s.includes('T')?s:s.replace(' ','T')); return isNaN(d)?null:d; }
        const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if(m){ return new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0)); }
        const d=new Date(s); return isNaN(d)?null:d;
    }
    const fmtData = s => { const d=parseData(s); if(!d) return '—'; return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); };
    const eventos = p => (p.eventos||[]).map(e=>({...e,_t:parseData(e.data)})).filter(e=>e._t).sort((a,b)=>a._t-b._t);

    // ── Derivações ───────────────────────────────────────────
    function diasSemMovimento(hist){
        const ev = eventos(hist); if(!ev.length) return null;
        return Math.max(0, Math.round((REF - ev[ev.length-1]._t)/DAY));
    }
    function tempoMedioPorStatus(historico){
        const acc = {};
        for(const proj of historico){
            const ev = eventos(proj).filter(e=>e.status);
            for(let i=0;i<ev.length-1;i++){
                const dias = (ev[i+1]._t - ev[i]._t)/DAY;
                if(dias<0) continue;
                const k = ev[i].status;
                (acc[k]=acc[k]||{soma:0,n:0}); acc[k].soma+=dias; acc[k].n++;
            }
        }
        return Object.entries(acc).map(([status,v])=>({status,media:v.soma/v.n,n:v.n})).sort((a,b)=>b.media-a.media);
    }
    function critScore(p, dias){
        let s=0;
        if(p.saude==='alerta') s+=4; else if(p.saude==='atencao') s+=2;
        for(const a of (p.alertas_prazo||[])) s += (ALERTAS_META[a.tipo]?.sev==='crit'?2:1);
        if(p.status_id===5) s+=3;
        if(dias!=null && p.status_id!==CANCEL && !FINAL.has(p.status_id)){ if(dias>14) s+=4; else if(dias>7) s+=2; }
        return s;
    }
    function reasons(p, dias){
        const out=[];
        if(p.saude==='alerta') out.push({t:'Alerta', c:'r-crit'});
        if(p.status_id===5) out.push({t:'Aguardando materiais', c:'r-crit'});
        if(dias!=null && dias>7 && p.status_id!==CANCEL && !FINAL.has(p.status_id)) out.push({t:`Parado ${dias}d`, c:'r-warn'});
        if(p.total_ajustes>2) out.push({t:`${p.total_ajustes} retrabalhos`, c:'r-warn'});
        const seen=new Set();
        for(const a of (p.alertas_prazo||[])){
            const m=ALERTAS_META[a.tipo]; if(!m||seen.has(m.label)) continue; seen.add(m.label);
            out.push({t:m.label, c:m.sev==='crit'?'r-crit':'r-warn'});
        }
        return out.slice(0,4);
    }
    const median = arr => { if(!arr.length) return 0; const a=[...arr].sort((x,y)=>x-y); const m=a.length>>1; return a.length%2?a[m]:(a[m-1]+a[m])/2; };

    // ── Estado / boot ────────────────────────────────────────
    let DATA=null, HISTMAP={}, DIAS={}, currentView='visao', curFilter='todos', curSort={key:null,dir:-1};
    const charts={};

    const VIEW_META = {
        visao:{title:'Visão geral', intro:'Onde o fluxo está travando e o que precisa de atenção agora.'},
        pipeline:{title:'Pipeline', intro:'A jornada de cada projeto no mês, com os prazos da agência marcados na linha do tempo.'},
        projetos:{title:'Projetos', intro:'Todos os projetos com saúde, retrabalho, tempo parado e violações de prazo.'},
        prazos:{title:'Prazos', intro:'Cumprimento das quatro metas mensais da agência e quem as violou.'},
        clientes:{title:'Clientes', intro:'Perfil de comportamento por cliente a partir de reprovações e prazos.'},
        equipe:{title:'Equipe', intro:'Velocidade e assertividade por profissional, agrupadas por cargo.'}
    };

    document.addEventListener('DOMContentLoaded', () => {
        $('#nav').addEventListener('click', e => { const b=e.target.closest('.nav-item'); if(b) switchView(b.dataset.view); });
        $('#btnRefresh').addEventListener('click', load);
        bindTooltip();
        load();
    });

    function switchView(v){
        if(!v) return; currentView=v;
        document.querySelectorAll('.nav-item').forEach(b=>{ const on=b.dataset.view===v; b.classList.toggle('is-active',on); b.setAttribute('aria-current',on?'page':'false'); });
        document.querySelectorAll('.view').forEach(s=>{ const on=s.id==='view-'+v; s.hidden=!on; s.classList.toggle('is-active',on); });
        const m=VIEW_META[v]; $('#viewTitle').textContent=m.title; $('#viewIntro').textContent=m.intro;
        if(v==='pipeline' && DATA) requestAnimationFrame(buildPipeline); // garante medidas corretas
    }

    async function load(){
        showState('loading');
        try{
            const res = await fetch('/api/dashboard',{cache:'no-store'});
            if(!res.ok) throw new Error('HTTP '+res.status);
            DATA = await res.json();
            prep(); renderAll(); showState('ready');
        }catch(err){ console.error(err); showError(err); }
    }
    function showState(s){
        $('#loading').hidden = s!=='loading';
        $('#error').hidden = true;
        document.querySelectorAll('.view').forEach(v=>{ if(s!=='ready') v.hidden=true; else v.hidden = v.id!=='view-'+currentView; });
    }
    function showError(err){
        $('#loading').hidden=true;
        document.querySelectorAll('.view').forEach(v=>v.hidden=true);
        const e=$('#error'); e.hidden=false;
        e.innerHTML = `<h3>Não foi possível carregar o painel</h3>
            <p>A chamada para <code>/api/dashboard</code> falhou (${esc(err.message)}).</p>
            <!-- <p>Confirme que o servidor está rodando com <code>npm start</code> e que a pasta <code>dados/</code> com os arquivos <code>.json</code> existe na raiz do projeto.</p> -->
            <button id="retry">Tentar de novo</button>`;
        $('#retry').addEventListener('click', load);
    }

    function prep(){
        HISTMAP={}; for(const h of (DATA.historico_projeto||[])) HISTMAP[h.projeto_id]=h;
        DIAS={};
        for(const p of (DATA.projetos_lista||[])){
            DIAS[p.id] = HISTMAP[p.id] ? diasSemMovimento(HISTMAP[p.id]) : null;
        }
    }

    function renderAll(){
        const mes = mesReferencia();
        $('#sideRef').textContent = mes; $('#eyebrow').textContent = `Agência · ${mes}`;
        renderTopMeta(); renderKPIs(); renderTriage();
        renderChartSaude(); renderChartStatus(); renderChartTempo();
        renderFilters(); renderTable();
        renderPrazos(); renderClientes(); renderEquipe(); renderLegend();
        if(currentView==='pipeline') requestAnimationFrame(buildPipeline);
    }

    function mesReferencia(){
        const ts=[]; for(const h of (DATA.historico_projeto||[])) for(const e of (h.eventos||[])){ const d=parseData(e.data); if(d) ts.push(+d); }
        const base = ts.length? new Date(Math.min(...ts)) : REF;
        return base.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
    }

    // ── Top meta ─────────────────────────────────────────────

    function renderTopMeta(){
        const r = DATA.resumo || {};

        const chips = [
            { n: r.total_projetos ?? 0, l: 'Projetos', cls: '' },
            { n: r.total_saudavel ?? 0, l: 'Saudável', cls: '' },
            { n: r.total_alerta ?? 0, l: 'Em alerta', cls: (r.total_alerta > 0 ? 'is-warn' : '') },
            { n: r.total_critico ?? 0, l: 'Críticos', cls: (r.total_critico > 0 ? 'is-crit' : '') }
        ];

        $('#topMeta').innerHTML = chips.map(c => `
            <div class="tchip ${c.cls}">
            <span class="n">${c.n}</span>
            <span class="l">${c.l}</span>
            </div>
            `).join('');
    }

    // ── KPIs ─────────────────────────────────────────────────

    function renderKPIs(){
        const r = DATA.resumo_por_status || {};

        const getClass = (status) => {
            switch(status) {
                case 'Briefing em Construção':
                    return 'k-ok';
                case 'Em Desenvolvimento':
                    return 'k-ok';
                case 'A Fazer':
                    return 'k-warn';
                case 'Pronto para Aprovação':
                    return 'k-warn';
                case 'Em Aprovação':
                    return 'k-warn';
                case 'Em Alteração':
                    return 'k-crit';
                default:
                    return 'k-mut';
            }
        };

        const order = [
            // 'A Fazer',
            'Briefing em Construção',
            'Em Desenvolvimento',
            'Pronto para Aprovação',
            'Em Aprovação',
            'Em Alteração'
        ];

        const total = Object.values(r).reduce((a, b) => a + b, 0);

        const cards = [
            ...order.map(status => ({
                label: capitalize(status),
                num: r[status] ?? 0,
                foot: 'Projetos neste status',
                cls: getClass(status)
            }))
        ];

        $('#kpis').innerHTML = cards.map(c => `
            <div class="kpi ${c.cls}">
            <div class="k-label">${c.label}</div>
            <div class="k-num">${c.num}</div>
            <div class="k-foot">${c.foot}</div>
            </div>
            `).join('');
    }
    // ── Triage / atenção imediata ────────────────────────────

    function renderTriage(){
        const list = (DATA.projetos_criticos || [])
            .filter(p => p.categoria !== 'cancelado')
            .map(p => ({ p }))
            .slice(0, 8);

        const el = $('#triage');

        if(!list.length){
            el.innerHTML = `<div class="panel" style="text-align:center; color:var(--text-dim)">
                Nada crítico no momento — todos os projetos dentro dos parâmetros. ✦
                </div>`;
            return;
        }

        const cards = list.map(({p}) => {

            const sev =
                p.categoria === 'critico'
                ? 'sev-alerta'
                : p.categoria === 'em_alerta'
                ? 'sev-atencao'
                : 'sev-stale';

            const info = `
                <span class="rchip ${p.qtd_alteracoes > 0 ? 'r-warn' : ''}">
                <b>${p.qtd_alteracoes}</b>&nbsp;${p.qtd_alteracoes == 1 ? 'retrabalho' : 'retrabalhos'}
                </span>

                <span class="rchip ${p.vencido === 'S' ? 'r-crit' : ''}">
                ${
                    p.vencido === 'S'
                        ? '<b>Vencido</b>'
                        : `Vence em <b>${fmtDate(p.data_vencimento)}</b>`
                }
                </span>
                `;

            return `
                <a class='link-clean' target='_blank' href='/projeto?id=${p.id}'>
                <div class="tcard ${sev}">
                <div class="tc-top">
                <div>
                <div class="tc-name">${esc(p.projeto)}</div>
                <div class="tc-id mono">${esc(p.cliente || '—')}</div>
                </div>

                <div class="tc-score" style="font-size:11px;color:var(--text-dim)">
                ${esc(p.categoria)}
                </div>
                </div>

                <div class="tc-reasons">
                ${info}
                </div>
                </div>
                </a>
                `;
        }).join('');

        el.innerHTML = `
            <div class="triage-head">
            <span class="pulse"></span>
            <h2>Atenção imediata</h2>
            <span class="count">
            ${list.length} ${list.length === 1 ? 'projeto' : 'projetos'} ordenados por criticidade
            </span>
            </div>

            <div class="triage-grid">
            ${cards}
            </div>
            `;
    }

    // ── Charts ───────────────────────────────────────────────
    function chartBase(){
        if(window.Chart){
            Chart.defaults.font.family="'Inter',sans-serif";
            Chart.defaults.color="#9AA3B7";
            Chart.defaults.borderColor="rgba(40,49,67,.55)";
        }
    }
    const centerText = {
        id:'centerText',
        afterDraw(chart, _a, opts){
            if(!opts || !opts.text) return;
            const {ctx, chartArea:{left,right,top,bottom}}=chart;
            const x=(left+right)/2, y=(top+bottom)/2;
            ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillStyle='#E7EBF3'; ctx.font="600 28px 'Space Grotesk',sans-serif"; ctx.fillText(opts.text,x,y-7);
            ctx.fillStyle='#9AA3B7'; ctx.font="500 11px 'Inter',sans-serif"; ctx.fillText(opts.sub||'',x,y+15);
            ctx.restore();
        }
    };

    function renderChartSaude(){
        if(!window.Chart) return; chartBase();
        let s=DATA.projetos_por_saude||{};
        s = s.reduce((acc, curr) => {
            acc[curr.categoria] = curr.total
            return acc
        }, {})
        const rows=[['Saudável',s['saudavel']||0,'#34D399'],['Crítico',s['critico']||0,'#FB7185'],['Alerta',s['em_alerta']||0,'#FBBF24'],['Cancelado',s['cancelado']||0,'#64748B']];//.filter(r=>r[1]>0);
        const total=rows.reduce((a,r)=>a+r[1],0);
        charts.saude?.destroy();
        charts.saude = new Chart($('#chartSaude'),{
            type:'doughnut',
            data:{labels:rows.map(r=>r[0]), datasets:[{data:rows.map(r=>r[1]), backgroundColor:rows.map(r=>r[2]), borderColor:'#141925', borderWidth:3, hoverOffset:6}]},
            options:{cutout:'68%', plugins:{legend:{position:'bottom', labels:{usePointStyle:true, pointStyle:'circle', padding:14, font:{size:12}}}, centerText:{text:String(total), sub:'projetos'}, tooltip:tooltipStyle()}},
            plugins:[centerText]
        });
    }
    function renderChartStatus(){
        if(!window.Chart) return; chartBase();
        const rows=[...(DATA.projetos_por_status||[])].sort((a,b)=>b.total-a.total);
        charts.status?.destroy();
        charts.status = new Chart($('#chartStatus'),{
            type:'bar',
            data:{labels:rows.map(r=>r.nome), datasets:[{data:rows.map(r=>r.total), backgroundColor:rows.map(r=>statusColor(r.nome)), borderRadius:5, barThickness:'flex', maxBarThickness:18}]},
            options:{indexAxis:'y', plugins:{legend:{display:false}, tooltip:tooltipStyle(ctx=>` ${ctx.parsed.x} projeto(s)`)},
                scales:{x:{beginAtZero:true, ticks:{precision:0}, grid:{color:'rgba(40,49,67,.4)'}}, y:{grid:{display:false}, ticks:{font:{size:11.5}}}}}
        });
    }
    function renderChartTempo(){
        if(!window.Chart) return; chartBase();
        const rows = DATA.media_dias_por_status.map( e => ({...e, media: parseInt(e.media)}));
        charts.tempo?.destroy();
        if(!rows.length){ $('#chartTempo').parentElement.innerHTML='<div style="color:var(--text-faint);font-size:12px;padding:30px 0;text-align:center">Sem transições suficientes no histórico.</div>'; return; }
        charts.tempo = new Chart($('#chartTempo'),{
            type:'bar',
            data:{labels:rows.map(r=>r.status), datasets:[{data:rows.map(r=>+r.media.toFixed(1)), backgroundColor:rows.map(r=>statusColor(r.status)), borderRadius:5, maxBarThickness:18}]},
            options:{indexAxis:'y', plugins:{legend:{display:false}, tooltip:tooltipStyle((ctx)=>{ const r=rows[ctx.dataIndex]; return ` ${r.media.toFixed(1)} dias · ${r.n} medição(ões)`; })},
                scales:{x:{beginAtZero:true, grid:{color:'rgba(40,49,67,.4)'}, title:{display:true, text:'dias', color:'#6B7488', font:{size:10}}}, y:{grid:{display:false}, ticks:{font:{size:11.5}}}}}
        });
    }
    function tooltipStyle(labelFn){
        return {backgroundColor:'#0d1119', borderColor:'#283143', borderWidth:1, titleColor:'#E7EBF3', bodyColor:'#9AA3B7', padding:10, cornerRadius:8, displayColors:true, usePointStyle:true,
            callbacks: labelFn? {label:labelFn} : undefined};
    }

    // ── Filtros + tabela ─────────────────────────────────────
    function renderLegend(){
        $('#legendPhase').innerHTML = Object.entries(PHASE_LABEL).map(([k,l])=>`<span class="lg"><span class="sw" style="background:${PHASE_COLOR[k]}"></span>${l}</span>`).join('');
    }
    const FILTERS = {
        todos: p=>p.status_id!==CANCEL || true,
        alerta: p=>p.saude==='em_alerta',
        saudavel: p=>p.saude==='saudavel',
        critico: p=>p.saude==='critico',
        cancelado: p=>p.status_id===CANCEL
    };
    function renderFilters() {
        const projetos = DATA.projetos_lista || [];

        // Definition of each filter: [key, label, count function]
        const filterDefs = [
            ['todos',     'Todos',                 projetos.length],
            ['critico',  '● Criticos',              projetos.filter(FILTERS.critico).length],
            ['alerta',   '● Em alerta',           projetos.filter(FILTERS.alerta).length],
            ['cancelado', 'Cancelados',            projetos.filter(FILTERS.cancelado).length],
        ];

        // Build filter button HTML
        const buttonsHtml = filterDefs
            .map(([key, label, count]) => {
                const activeClass = key === curFilter ? 'is-active' : '';
                return `<button class="fbtn ${activeClass}" data-f="${key}">${label}<span class="fb-n">${count}</span></button>`;
            })
            .join('');

        const filterBar = $('#filterbar');
        filterBar.innerHTML = buttonsHtml;

        // Click on a filter button → update curFilter and re-render
        filterBar.onclick = (event) => {
            const button = event.target.closest('.fbtn');
            if (!button) return;
            curFilter = button.dataset.f;
            renderFilters();
            renderTable();
        };

        // Click on a sortable header → change sort key/direction
        const tableHead = $('#tblProjetos thead');
        tableHead.onclick = (event) => {
            const header = event.target.closest('.sortable');
            if (!header) return;
            const sortKey = header.dataset.sort;
            if (curSort.key === sortKey) {
                curSort.dir *= -1;          // toggle direction
            } else {
                curSort.key = sortKey;
                curSort.dir = -1;           // descending first
            }
            renderTable();
        };
    }
    function sortVal(p,k){
        if(k==='saude') return SAUDE_RANK[p.saude]??9;
        if(k==='qtd_alteracoes') return p.qtd_alteracoes||0;
        if(k==='dias_parado') return p.dias_parado;
        if(k==='alertas') return (p.alertas_prazo||[]).length;
        return 0;
    }
    function renderTable(){

        let rows = [...(DATA.projetos_lista || [])];
        if(curSort.key){
            rows.sort((a,b)=>{
                const d = (sortVal(a, curSort.key) - sortVal(b, curSort.key)) * curSort.dir;
                return d || (b.score - a.score);
            });
        }else{
            rows.sort((a,b)=>b.score-a.score);
        }

        document.querySelectorAll('#tblProjetos thead .sortable').forEach(th=>{
            th.classList.toggle('sorted', th.dataset.sort===curSort.key);

            const arr = th.querySelector('.arr');
            if(arr){
                arr.textContent = th.dataset.sort === curSort.key ? (curSort.dir < 0 ? '▼' : '▲' ) : '▼';        }
        });

        if(!rows.length){
            $('#tblBody').innerHTML = `
                <tr>
                <td colspan="7" style="text-align:center;color:var(--text-faint);padding:30px">
                Nenhum projeto encontrado.
                </td>
                </tr>`;
            return;
        }
        if(curFilter){
            rows = rows.filter(FILTERS[curFilter]);
        }
        console.log(rows)
        $('#tblBody').innerHTML = rows.map(p=>{

            const sd = SAUDE[p.saude] || SAUDE.cancelado;
            const paradoCls =
                p.dias_parado > 14 ? 'hot' :
                p.dias_parado > 7  ? 'warm' : '';

            const ajustesCls =
                p.qtd_alteracoes > 2 ? 'hot' :
                p.qtd_alteracoes > 1 ? 'warm' : '';
            const funcs = (p.funcionarios || []).map(f=>`
                <span class="av" title="${esc(f.cargo || '')}">
                <span class="ini" style="background:${avatarBg(f.nome)}">
                ${initials(f.nome)}
                </span>
                ${f.nome}
                <span class="cg">${f.cargo}</span>
                </span>
                `).join('');

            return `
                <tr>
                <td>
                <div class="cell-proj">
                <div class="pn"><a target="_blank" href="/projeto?id=${p.id}">${esc(p.nome)}</a></div>
                </div>
                </td>

                <td>${esc(p.cliente || '—')}</td>

                <td>
                <span class="status-chip">
                <span class="sc-dot" style="background:${statusColor(p.status)}"></span>
                ${esc(p.status)}
                </span>
                </td>

                <td>
                <span class="badge ${sd.cls}">
                <span class="bd-dot"></span>
                ${sd.label}
                </span>
                </td>

                <td>
                <span class="num-pill ${ajustesCls}">
                ${p.qtd_alteracoes ?? 0}
                </span>
                </td>

                <td>
                <span class="num-pill ${paradoCls}">
                ${p.dias_parado ?? 0}d
                </span>
                </td>

                <td>
                <div class="funcs">
                ${funcs || '—'}
                </div>
                </td>
                </tr>
                `;

        }).join('');
    }

    function renderPrazos(){
        const L = [];
        Object.keys(DATA.prazos).forEach(p=>{
            L.push(...DATA.prazos[p])
        });
        const groups={}; // key regra -> {rule, items:[{p, descs:[]}]}
        const ruleCount={brief:0,mat:0,aprov:0,final:0};
        // for(const p of L){
        //     const byProj={};
        //     for(const a of (p.alertas_prazo||[])){
        //         const m=ALERTAS_META[a.tipo]; if(!m) continue;
        //         ruleCount[m.key]=(ruleCount[m.key]||0)+1;
        //         (groups[m.regra]=groups[m.regra]||{items:[]});
        //         (byProj[m.regra]=byProj[m.regra]||{p, descs:[], sev:m.sev});
        //         byProj[m.regra].descs.push(a.descricao||m.label);
        //         if(m.sev==='crit') byProj[m.regra].sev='crit';
        //     }
        //     for(const k in byProj) groups[k].items.push(byProj[k]);
        // }
        const fmtCount=(n)=> n? `<span class="badge b-crit"><span class="bd-dot"></span>${n} violação${n>1?'(ões)':''}</span>` : `<span class="badge b-ok"><span class="bd-dot"></span>Em dia</span>`;
        $('#rc-brief').innerHTML=fmtCount(L.filter(p => p.situacao_briefing_finalizado != 'Em dia').length);
        $('#rc-prod-cria').innerHTML=fmtCount(L.filter(p => p.situacao_producao_criativos != 'Em dia').length);
        $('#rc-fluxo-aprov').innerHTML=fmtCount(L.filter(p => p.situacao_fluxo_aprovacao != 'Em dia').length);
        $('#rc-final').innerHTML=fmtCount(L.filter(p => p.situacao_agendamento_posts != 'Em dia').length);

        if(!L.length){
            $('#violations').innerHTML=`<div class="panel" style="text-align:center;color:var(--text-dim)">Nenhuma violação de prazo registrada. Operação dentro das metas.</div>`;
            return;
        }
        $('#violations').innerHTML = Object.keys(DATA.prazos).map((fase_projeto) => {
            const rows = DATA.prazos[fase_projeto].map(row => {
                return `
                    <div class="viol-row">
                        <span class="badge ${row.saude==='crit'?'b-crit':'b-warn'}" style="flex:none"><span class="bd-dot"></span>${row.saude==='crit'?'Crítico':'Alerta'}</span>
                        <div class="vr-proj"> <a href="/projeto?id=${row.id}" target="_blank">${esc(row.projeto)} </a><small>${esc(row.cliente)}</small></div>
                        <div class="vr-desc">${esc(capitalize(row.status))}</div>
                    </div>
                `;
            }).join('');
            return `
                <div class="viol-group">
                    <div class="viol-head"><span class="vh-title">${esc(fase_projeto)}</span><span class="vh-rule">${DATA.prazos[fase_projeto].length} projeto(s)</span></div>
                    <div class="viol-list">${rows}</div>
                </div>
            `;
        }).join('')
    }
    function perfilCliente(projs){
        const ajustes = projs.reduce((a,p)=>a+(p.total_ajustes||0),0);
        const atraso = projs.some(p=>p.saude==='alerta' || (p.alertas_prazo||[]).some(a=>ALERTAS_META[a.tipo]?.sev==='crit'));
        const todosOk = projs.every(p=>p.saude==='saudavel'||p.saude==='cancelado');
        if(ajustes>2 && atraso) return {label:'Problemático até com atraso', cls:'b-crit'};
        if(ajustes>2 && !atraso) return {label:'Problemático até sem atraso', cls:'b-warn'};
        if(ajustes===0 && todosOk) return {label:'Rápido', cls:'b-ok'};
        return {label:'Regular', cls:'b-mut'};
    }
    function renderClientes(){
        const byCli={};
        for(const p of (DATA.projetos_lista||[])){ (byCli[p.cliente]=byCli[p.cliente]||[]).push(p); }
        const entries=Object.entries(byCli).map(([cli,projs])=>{
            const ajustes=projs.reduce((a,p)=>a+(p.total_ajustes||0),0);
            const alertas=projs.reduce((a,p)=>a+((p.alertas_prazo||[]).length),0);
            return {cli, projs, ajustes, alertas, perfil:perfilCliente(projs)};
        }).sort((a,b)=> b.ajustes-a.ajustes || b.alertas-a.alertas);

        $('#clientes').innerHTML = entries.map(e=>{
            const projs = e.projs.map(p=>{ const sd=SAUDE[p.saude]||SAUDE.cancelado; return `<div class="cc-proj"><span class="cp-dot" style="background:${sd.dot}"></span><span class="cp-name">${esc(p.nome||p.identifier)}</span><span class="cp-aj mono">${p.total_ajustes||0} aj</span></div>`; }).join('');
            return `<div class="ccard">
                <div class="cc-head">
                <div><div class="cc-name">${esc(e.cli||'â')}</div><div class="cc-sub">${e.projs.length} projeto(s)</div></div>
                <span class="badge ${e.perfil.cls}"><span class="bd-dot"></span>${e.perfil.label}</span>
                </div>
                <div class="cc-stats">
                <div class="cc-stat"><div class="v ${e.ajustes>2?'hot':''}">${e.ajustes}</div><div class="l">Retrabalhos</div></div>
                <div class="cc-stat"><div class="v">${e.projs.length}</div><div class="l">Projetos</div></div>
                </div>
                <div class="cc-projs">${projs}</div>
                </div>`;
        }).join('');
    }

    // ââ Equipe âââââââââââââââââââââââââââââââââââââââââââââââ
    function renderEquipe(){
        const F=DATA.por_funcionario||[];
        const medDias = median(F.map(f=>f.media_dias||0));
        const perfil = f => {
            const rapido = (f.media_dias||0) <= medDias;
            const assert = (f.assertividade||0) >= 60;
            const cls = (assert&&rapido)?'b-ok' : (!assert&&!rapido)?'b-crit' : 'b-warn';
            return {label:`${rapido?'Rápido':'Demorado'} até ${assert?'assertivo':'não assertivo'}`, cls};
        };
        const byCargo={};
        for(const f of F){ (byCargo[f.cargo||'â']=byCargo[f.cargo||'â']||[]).push(f); }
        const order=['Social Media','Designer','Audiovisual'];
        const cargos=Object.keys(byCargo).sort((a,b)=>{ const ia=order.indexOf(a), ib=order.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });

        $('#equipe').innerHTML = cargos.map(cargo=>{
            const meta=CARGO_META[cargo]||{color:'#64748B',icon:'â¢'};
            const cards=byCargo[cargo].sort((a,b)=>(b.assertividade||0)-(a.assertividade||0)).map(f=>{
                const pf=perfil(f);
                const aColor = (f.assertividade||0)>=60?'var(--ok)':(f.assertividade||0)>=35?'var(--warn)':'var(--crit)';
                return `<div class="fcard">
                    <div class="fc-top">
                    <div class="fc-ini" style="background:${avatarBg(f.nome)}">${esc(initials(f.nome))}</div>
                    <div><div class="fc-name">${esc(f.nome)}</div><span class="badge ${pf.cls}" style="margin-top:4px"><span class="bd-dot"></span>${pf.label}</span></div>
                    </div>
                    <div class="fmetrics">
                    <div class="fmetric"><div class="v">${f.media_dias??0}d</div><div class="l">Tempo mÃ©dio</div></div>
                    <div class="fmetric"><div class="v">${f.total_projetos??0}</div><div class="l">Projetos</div></div>
                    <div class="fmetric"><div class="v ${(f.total_ajustes||0)>2?'':''}" style="color:${(f.total_ajustes||0)>2?'var(--crit)':'inherit'}">${f.total_ajustes??0}</div><div class="l">Retrabalhos</div></div>
                    </div>
                    <div style="font-size:11px;color:var(--text-faint);display:flex;justify-content:space-between"><span>Assertividade</span><span class="mono" style="color:${aColor}">${f.assertividade??0}%</span></div>
                    <div class="assert-bar"><i style="width:${Math.max(3,f.assertividade||0)}%; background:${aColor}"></i></div>
                    </div>`;
            }).join('');
            return `<div class="cargo-block">
                <div class="cargo-head"><div class="ch-icon" style="background:${meta.color}22;color:${meta.color}">${meta.icon}</div><h3>${esc(cargo)}</h3><span class="ch-n">${byCargo[cargo].length} pessoa(s)</span></div>
                <div class="grid cards">${cards}</div>
                </div>`;
        }).join('');
    }

    // PIPELINE (signature)

    function buildPipeline() {
        const host = $('#pipe');
        if (!DATA) return;

        const lanesData = [DATA.projetos_linha_tempo[4]] || [];
        console.log(lanesData)


        const ts = [];
        for (const l of lanesData) {
            for (const e of (l.eventos || [])) {
                const d = parseData(e.data);
                if (d) ts.push(+d);
            }
        }

        if (!ts.length) {
            host.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-faint)">Sem histórico para montar a linha do tempo.</div>';
            return;
        }

        let start = new Date(Math.min(...ts));
        start = new Date(start.getFullYear(), start.getMonth(), 1);

        let lastEv = new Date(Math.max(...ts));
        let end = new Date(Math.max(+lastEv, +REF));
        end = new Date(+end + DAY);

        const span = Math.max(1, end - start);
        const x = t => ((t - start) / span) * 100;

        const ticks = [];
        const cur = new Date(start);

        while (cur <= end) {
            const dom = cur.getDate();
            if (dom === 1 || dom % 5 === 0)
                ticks.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }

        const mIdx = start.getMonth();
        const yIdx = start.getFullYear();

        const deadlines = [
            { day: 10, lbl: 'Briefing · 10' },
            { day: 25, lbl: 'Em aprovação · 25' },
            { day: 30, lbl: 'Aprovado · 30' }
        ]
            .map(d => ({
                ...d,
                t: +new Date(yIdx, mIdx, d.day)
            }))
            .filter(d => d.t >= +start && d.t <= +end);

        const axisTicks = ticks.map(d =>
            `<div class="axis-tick" style="left:${x(+d)}%">
            <span class="at-lbl">${String(d.getDate()).padStart(2,'0')}</span>
            <span class="at-line"></span>
            </div>`
        ).join('');

        const dlMarks = deadlines.map(d =>
            `<div class="deadline" style="left:${x(d.t)}%">
            <span class="dl-lbl">${d.lbl}</span>
            <span class="dl-line"></span>
            </div>`
        ).join('');

        const labelsHTML = lanesData.map(p => {

            const sd = SAUDE[p.saude] || SAUDE.cancelado;

            const stale =
                (p.dias_parado != null &&
                    p.dias_parado > 7 &&
                    p.status_id !== CANCEL &&
                    !FINAL.has(p.status_id))
                ? `<span class="ll-stale">parado ${p.dias_parado}d</span>`
                : '';

            return `
                <div class="lane-label">
                <div class="ll-top">
                <span class="ll-dot" style="background:${sd.dot}"></span>
                <span class="ll-name">${esc(p.projeto)}</span>
                </div>
                <div class="ll-sub">
                ${esc(p.cliente || '')}
            ${stale}
                </div>
                </div>`;
        }).join('');

        const lanesHTML = lanesData.map(p => {

            const ev = eventos(p);
            const stEv = ev.filter(e => e.status);

            let segs = '';

            for (let i = 0; i < stEv.length - 1; i++) {
                const a = x(+stEv[i]._t);
                const b = x(+stEv[i + 1]._t);

                segs += `
                    <span class="seg"
                style="
                left:${a}%;
                width:${Math.max(0,b-a)}%;
                background:${statusColor(stEv[i].status)}
                ">
                    </span>`;
            }

            if (
                stEv.length &&
                p.dias_parado != null &&
                p.dias_parado > 0 &&
                p.status_id !== CANCEL &&
                !FINAL.has(p.status_id)
            ) {

                const a = x(+stEv[stEv.length - 1]._t);
                const b = x(+REF);

                if (b > a) {
                    segs += `
                        <span class="seg seg-stale"
                    style="
                    left:${a}%;
                    width:${b-a}%;
                    ">
                        </span>`;
                }
            }

            const nodes = ev.map(e => {

                const isComment = !e.status;
                const color = isComment ? 'transparent' : statusColor(e.status);
                const isFinal = FINAL.has(statusId(e.status));

                const tip = JSON.stringify({
                    d: e._t.toLocaleString('pt-BR', {
                        day:'2-digit',
                        month:'short',
                        hour:'2-digit',
                        minute:'2-digit'
                    }),
                    s: e.status || 'Comentário',
                    f: e.funcionario || '',
                    c: e.cargo || '',
                    m: e.comentario || '',
                    color
                });

                return `
                    <span
                class="node ${isComment ? 'is-comment' : ''} ${isFinal ? 'is-final' : ''}"
                style="left:${x(+e._t)}%; background:${color}"
                data-tip='${esc(tip)}'>
                    </span>`;
            }).join('');

            return `<div class="lane">${segs}${nodes}</div>`;

        }).join('');

        host.innerHTML = `
            <div class="pipe-labels">
            <div class="pipe-axis-pad"></div>
            ${labelsHTML}
            </div>

            <div class="pipe-plot">
            <div class="plot-axis">
            ${axisTicks}
        ${dlMarks}
            </div>

            <div class="plot-body">
            ${lanesHTML}
            </div>
            </div>`;
    }



    function statusId(name){ // reverse lookup sÃ³ para marcar nÃ³s finais
        const map={'aprovado':13,'finalizado':14}; return map[norm(name)]||0;
    }

    function bindTooltip(){
        const tip=$('#tip');
        document.addEventListener('mouseover', e=>{
            const n=e.target.closest('.node'); if(!n) return;
            let d; try{ d=JSON.parse(n.dataset.tip); }catch(_){ return; }
            tip.innerHTML = `<div class="t-date">${esc(d.d)}</div>
                <div class="t-status"><span class="ts-dot" style="background:${d.color==='transparent'?'var(--text-faint)':d.color}"></span>${esc(d.s)}</div>
                ${ d.f? `<div class="t-meta">${esc(d.f)}${d.c?` até ${esc(d.c)}`:''}</div>`:''}
            ${ d.m? `<div class="t-comment">â${esc(d.m)}â</div>`:''}`;
            tip.classList.add('show'); moveTip(e);
        });
        document.addEventListener('mousemove', e=>{ if(tip.classList.contains('show')) moveTip(e); });
        document.addEventListener('mouseout', e=>{ if(e.target.closest('.node')) tip.classList.remove('show'); });
        function moveTip(e){
            const pad=14, w=tip.offsetWidth, h=tip.offsetHeight;
            let left=e.clientX+pad, top=e.clientY+pad;
            if(left+w>innerWidth-8) left=e.clientX-w-pad;
            if(top+h>innerHeight-8) top=e.clientY-h-pad;
            tip.style.left=left+'px'; tip.style.top=top+'px';
        }
    }
})();
