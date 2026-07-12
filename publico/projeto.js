(function () {
    "use strict";

    // ─────────────────────────────────────────────────────────────
    // Formato de dados esperado do endpoint (ajuste o fetch abaixo
    // se o seu back-end devolver algo diferente):
    //
    // GET /api/projeto/:id  →
    // {
    //   id, nome, cliente, status, status_id, saude,          // saude: 'saudavel' | 'em_alerta' | 'critico' | 'cancelado'
    //   frequencia, estimativa, categoria,
    //   data_inicio, data_vencimento, data_conclusao,
    //   qtd_alteracoes, dias_parado,
    //   funcionarios: [ { nome, cargo } ],
    //
    //   // vem da tabela `projeto_status` — cada mudança de status real
    //   historico_status: [ { status, funcionario, cargo, data } ],
    //
    //   // vem da tabela `notificacao` — o feed de comentários.
    //   // `status` aqui é só o alteracao_status_id (opcional/nullable),
    //   // não é join com projeto_status: é apenas informativo, mostrando
    //   // se aquele comentário foi publicado junto de uma mudança de status.
    //   comentarios: [ { funcionario, cargo, comentario, data, status } ]
    // }
    // ─────────────────────────────────────────────────────────────

    // ── Domínio (mesmo vocabulário do dashboard) ────────────────
    const PHASE = {
        'a fazer': 'plan', 'reunião agendada': 'plan', 'reuniao agendada': 'plan',
        'briefing em construção': 'brief', 'briefing em construcao': 'brief', 'briefing finalizado': 'brief',
        'aguardando materiais': 'block',
        'em desenvolvimento': 'prod', 'pronto para aprovação': 'prod', 'pronto para aprovacao': 'prod',
        'em aprovação': 'aprov', 'em aprovacao': 'aprov',
        'em alteração': 'rework', 'em alteracao': 'rework', 'ajustes': 'rework',
        'pronto para agendamento': 'sched', 'em agendamento': 'sched',
        'aprovado': 'done', 'finalizado': 'done',
        'cancelado': 'cancel'
    };
    const PHASE_COLOR = { plan: '#64748B', brief: '#38BDF8', block: '#FB923C', prod: '#818CF8', aprov: '#2DD4BF', rework: '#D946EF', sched: '#22D3EE', done: '#34D399', cancel: '#475569' };
    const SAUDE = {
        saudavel: { label: 'Saudável', cls: 'b-ok' },
        em_alerta: { label: 'Atenção', cls: 'b-warn' },
        critico: { label: 'Alerta', cls: 'b-crit' },
        cancelado: { label: 'Cancelado', cls: 'b-mut' }
    };
    const CARGO_META = {
        'Social Media': { color: '#38BDF8' },
        'Designer': { color: '#818CF8' },
        'Audiovisual': { color: '#2DD4BF' }
    };

    const norm = s => (s || '').trim().toLowerCase();
    const phaseOf = s => PHASE[norm(s)] || 'plan';
    const statusColor = s => PHASE_COLOR[phaseOf(s)];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const hueFromName = n => { let h = 0; for (const c of (n || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const avatarBg = n => `hsl(${hueFromName(n)} 62% 62%)`;

    function parseData(s) {
        if (!s) return null;
        if (s instanceof Date) return isNaN(s) ? null : s;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s.includes('T') ? s : s.replace(' ', 'T')); return isNaN(d) ? null : d; }
        const d = new Date(s); return isNaN(d) ? null : d;
    }
    const fmtData = s => { const d = parseData(s); if (!d) return '—'; return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
    const fmtDataHora = s => {
        const d = parseData(s);
        if (!d) return '—';
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        const hora = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${min}`;
    };

    const $ = (sel, r = document) => r.querySelector(sel);

    let DATA = null;

    function projectId() {
        const params = new URLSearchParams(location.search);
        return params.get('id');
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('#btnRefresh').addEventListener('click', load);
        load();
    });

    async function load() {
        const id = projectId();
        if (!id) {
            showError(new Error('Nenhum projeto informado na URL (esperado ?id=...).'));
            return;
        }
        showState('loading');
        try {
            const res = await fetch(`/api/projeto/${encodeURIComponent(id)}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            DATA = await res.json();
            render();
            showState('ready');
        } catch (err) {
            console.error(err);
            showError(err);
        }
    }

    function showState(s) {
        $('#loading').hidden = s !== 'loading';
        $('#error').hidden = true;
        $('#content').hidden = s !== 'ready';
    }

    function showError(err) {
        $('#loading').hidden = true;
        $('#content').hidden = true;
        const e = $('#error');
        e.hidden = false;
        e.innerHTML = `<h3>Não foi possível carregar o projeto</h3>
            <p>A chamada para <code>/api/projeto/${esc(projectId() || '')}</code> falhou (${esc(err.message)}).</p>
            <button id="retry">Tentar de novo</button>`;
        $('#retry').addEventListener('click', load);
    }

    function render() {
        const p = DATA;
        const sd = SAUDE[p.saude] || SAUDE.cancelado;

        document.title = `Fluxo · ${p.nome || 'Projeto'}`;
        $('#eyebrow').textContent = `Projeto · ${p.cliente || '—'}`;
        $('#projNome').textContent = p.nome || '—';
        $('#projSub').textContent = p.categoria ? `${p.categoria} · ${p.frequencia || ''}`.replace(/·\s*$/, '') : (p.frequencia || '');
        // $('#sideHint').textContent = `${p.nome || 'Projeto'} — ${p.cliente || ''}`;

        // ── chips do topo ──
        const chips = [
            `<span class="status-chip"><span class="sc-dot" style="background:${statusColor(p.status)}"></span>${esc(p.status || '—')}</span>`,
            `<span class="badge ${sd.cls}"><span class="bd-dot"></span>${sd.label}</span>`,
        ];
        if (p.qtd_alteracoes != null) {
            const cls = p.qtd_alteracoes > 2 ? 'hot' : p.qtd_alteracoes > 0 ? 'warm' : '';
            chips.push(`<span class="num-pill ${cls}">${p.qtd_alteracoes} retrabalho(s)</span>`);
        }
        if (p.dias_parado != null) {
            const cls = p.dias_parado > 14 ? 'hot' : p.dias_parado > 7 ? 'warm' : '';
            chips.push(`<span class="num-pill ${cls}">${p.dias_parado}d parado</span>`);
        }
        $('#topMeta').innerHTML = chips.join('');

        renderDetalhes(p);
        renderEquipe(p);
        renderStatusTimeline(p);
        renderComentarios(p);
    }

    function renderDetalhes(p) {
        const rows = [
            ['Cliente', esc(p.cliente || '—')],
            ['Estimativa', p.estimativa != null ? `${p.estimativa}h` : '—'],
            ['Início', fmtData(p.data_inicio)],
            ['Vencimento', fmtData(p.data_vencimento)],
            ['Conclusão', p.data_conclusao ? fmtData(p.data_conclusao) : '—'],
        ];
        $('#detailsGrid').innerHTML = rows.map(([label, val]) => `
            <div class="detail-item">
                <div class="dt">${label}</div>
                <div class="dd mono">${val}</div>
            </div>
        `).join('');
    }

    function renderEquipe(p) {
        const equipe = p.funcionarios || [];
        $('#equipeCount').textContent = `${equipe.length} pessoa(s)`;
        if (!equipe.length) {
            $('#equipeList').innerHTML = `<div class="empty-note">Nenhum funcionário associado.</div>`;
            return;
        }
        $('#equipeList').innerHTML = equipe.map(f => {
            const meta = CARGO_META[f.cargo] || { color: '#64748B' };
            return `
                <div class="team-item">
                    <span class="avatar" style="background:${avatarBg(f.nome)}">${esc(initials(f.nome))}</span>
                    <div>
                        <div class="ti-name">${esc(f.nome)}</div>
                        <div class="ti-cargo" style="color:${meta.color}">${esc(f.cargo || '—')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderStatusTimeline(p) {
        const statusEvents = (p.historico_status || [])
            .map(e => ({ ...e, _t: parseData(e.data) }))
            .filter(e => e._t)
            // .sort((a, b) => a._t - b._t);
        $('#statusCount').textContent = `${statusEvents.length} mudança(s) de status`;

        if (!statusEvents.length) {
            $('#statusTimeline').innerHTML = `<div class="empty-note">Nenhuma mudança de status registrada ainda.</div>`;
            return;
        }

        const items = statusEvents.map((e, i) => {
            const color = statusColor(e.status);
            const isLast = i === statusEvents.length - 1;
            return `
                <div class="tl-item">
                    <div class="tl-rail">
                        <span class="tl-dot" style="background:${color}"></span>
                        ${isLast ? '' : `<span class="tl-line"></span>`}
                    </div>
                    <div class="tl-body">
                        <div class="tl-head">
                            <span class="status-chip"><span class="sc-dot" style="background:${color}"></span>${esc(e.status)}</span>
                            <span class="tl-date mono">${fmtDataHora(e.data)}</span>
                        </div>
                        <div class="tl-who">
                            ${esc(e.funcionario || '—')}${e.cargo ? ` <span class="tw-cargo">· ${esc(e.cargo)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        $('#statusTimeline').innerHTML = `<div class="timeline">${items}</div>`;
    }

    function renderComentarios(p) {
        console.log(p)
        const comments = (p.comentarios || [])
            .map(e => ({ ...e, _t: parseData(e.data) }))
            .filter(e => e._t)
            .sort((a, b) => b._t - a._t); // mais recentes primeiro

        $('#commentCount').textContent = `${comments.length} comentário(s)`;

        if (!comments.length) {
            $('#commentsList').innerHTML = `<div class="empty-note">Nenhum comentário registrado ainda.</div>`;
            return;
        }

        $('#commentsList').innerHTML = comments.map(e => {
            const color = e.status ? statusColor(e.status) : null;
            return `
                <div class="comment-card">
                    <div class="comment-top">
                        <div class="comment-author">
                            <span class="avatar-sm" style="background:${avatarBg(e.funcionario)}">${esc(initials(e.funcionario))}</span>
                            <span class="ca-name">${esc(e.funcionario || '—')}</span>
                            ${e.cargo ? `<span class="ca-cargo">${esc(e.cargo)}</span>` : ''}
                        </div>
                        <span class="comment-date mono">${fmtDataHora(e.data)}</span>
                    </div>
                    ${e.status ? `<div class="comment-status"><span class="status-chip"><span class="sc-dot" style="background:${color}"></span>${esc(e.status)}</span></div>` : ''}
                    <p class="comment-text">${esc(e.comentario)}</p>
                </div>
            `;
        }).join('');
    }
})();
