import express from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import db from './banco.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Serve arquivos estáticos (o dashboard.html vai ficar na raiz)
app.use(express.static(join(__dirname ,"publico")));

// Rota raiz → entrega o dashboard em http://localhost:3000/
    app.get("/", async (req, res) => {
        res.sendFile(join(__dirname, "publico/dashboard.html"));
    });

// ─── Leitura dos JSONs ────────────────────────────────────────────────────────

function lerJSON(arquivo) {
    const caminho = join(__dirname, "dados", arquivo);
    return JSON.parse(readFileSync(caminho, "utf-8"));
}

async function carregarDados() {
    const clientes           = lerJSON("clientes.json");
    const funcionarios       = lerJSON("funcionarios.json");
    const status             = lerJSON("status.json");
    const frequencias        = lerJSON("frequencias.json");
    const projetos           = lerJSON("projetos.json");
    const projetoFuncionario = lerJSON("projeto_funcionario.json");
    const notificacoes       = lerJSON("notificacoes.json");
    const [ rows ] = await db.query(`select
        count(p.id) as total_projetos,
        (select count(vps.id) from vw_projeto_saude vps where categoria = 'em_alerta' collate utf8mb4_0900_ai_ci) as total_alerta,
        (select count(vps.id) from vw_projeto_saude vps where categoria = 'critico' collate utf8mb4_0900_ai_ci) as total_critico,
        (select count(vps.id) from vw_projeto_saude vps where categoria = 'saudavel' collate utf8mb4_0900_ai_ci) as total_saudavel
        from vw_projeto_saude p
 where (
        p.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) = 0


        `);
    const resumo_por_status_query = await db.query(`

        SELECT COUNT(s.id) as total, s.nome
        FROM status s
        LEFT JOIN projeto p ON p.status_id = s.id
        WHERE s.nome IN (
            'Briefing em Construção',
            'Em Desenvolvimento',
            'Pronto para Aprovação',
            'Em Aprovação',
            'Em Alteração'
        )
        GROUP BY s.nome
        ORDER BY CASE s.nome
        WHEN 'A Fazer' THEN 1
        WHEN 'Briefing em Construção' THEN 2
        WHEN 'Em Desenvolvimento' THEN 3
        WHEN 'Pronto para Aprovação' THEN 4
        WHEN 'Em Aprovação' then 5
        WHEN 'Em Alteração' THEN 6
        END
        `);
    const resumo_por_status = resumo_por_status_query[0].reduce((acc, curr) => { acc[curr.nome] = curr.total; return acc; }, {});


    const [projetos_criticos] = await db.query(
        `
       SELECT
            vps.id,
            vps.nome as projeto,
            c.nome as cliente,
            vps.categoria,
            vps.qtd_alteracoes,
            vps.data_vencimento,
            case when vps.data_vencimento < now() then 'S' else 'N' end as vencido
        FROM vw_projeto_saude vps
        JOIN cliente c ON c.id = vps.cliente_id
        ##JOIN notificacao n ON n.projeto_id = vps.id

        WHERE (vps.categoria collate utf8mb4_0900_ai_ci) in ('em_alerta', 'critico') and

  (
        vps.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0


        ORDER BY
            CASE
                WHEN (vps.categoria = 'critico' collate utf8mb4_0900_ai_ci) THEN 1
                WHEN (vps.categoria = 'em_alerta' collate utf8mb4_0900_ai_ci) THEN 2
                ELSE 3
            END,
            vps.id
        `
    );

    const [projetos_por_saude] = await db.query(`
                    select count(vps.id) as total, vps.categoria from vw_projeto_saude vps
                      where (
        vps.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
        group by categoria
    `);
    const [projetos_por_status] = await db.query(`
        select
            count(p.id) as total,
            s.nome
        from projeto p
        join status s on s.id = p.status_id
        group by s.nome

        union
        select
            0 as total,
            s2.nome
        from
            status s2
        where s2.id not in (
        	select status_id from projeto p2
        )
        order by total desc
    `);

    const [media_dias_por_status] = await db.query(`
select
	round(avg(vst.dias_ate_proxima)) as media,
	s.nome as status
from
	vw_status_tempo vst
join status s on
	s.id = vst.status_id
join vw_projeto_saude p on
	p.id = vst.projeto_id
where
	(
        p.dt_finalizado is null
		and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) > 0
      )
	or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) = 0
group by
	s.nome,
	s.id
union
        select
	0 as media,
	s2.nome as status
from
	status s2
where
	s2.id not in (
	select
		vst.status_id
	from
		vw_status_tempo vst
        )
order by
	media desc
    `)

	const [projetos_linha_tempo_rows] = await db.query(`
		select
			p.nome as projeto,
			p.categoria as saude,
			c.nome as cliente,
			p.id as projeto_id,
			s.nome as status,
			ps.data,
			DATEDIFF(NOW(), (select max(data) from projeto_status where projeto_id = ps.projeto_id)) AS dias_parado,
			calcular_score(p.categoria, p.qtd_alteracoes) AS score
		from
			projeto_status ps
		join vw_projeto_saude p on
			p.id = ps.projeto_id
		join status s on
			s.id = ps.status_id
		join cliente c on
			c.id = p.cliente_id

where (
        p.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(p.data_vencimento, '%Y%m')) = 0
		order by
			score desc,
			ps.projeto_id,
			dias_parado desc,
			p.nome,
			ps.data asc
	`)

	let projetos_linha_tempo = projetos_linha_tempo_rows.reduce((acc, curr) => {
		if(!acc[curr.projeto]) {
			acc[curr.projeto] = {
				projeto_id: curr.projeto_id,
				projeto: curr.projeto,
				saude: curr.saude,
				dias_parado: curr.dias_parado,
				cliente: curr.cliente,
				score: parseInt(curr.score),
				eventos: []
			};
		}
		acc[curr.projeto].eventos.push(curr);
		return acc
	}, {});
	projetos_linha_tempo = Object.values(projetos_linha_tempo)
	const [projetos_lista_rows] = await db.query(`
		select
			vps.nome,
			vps.qtd_alteracoes,
			s.nome as status,
			c.nome as cliente,
			f.nome as funcionario,
			f.cargo,
			DATEDIFF(NOW(), (select max(data) from projeto_status where projeto_id = vps.id)) AS dias_parado,
			calcular_score(vps.categoria, vps.qtd_alteracoes) as score,
            vps.categoria as saude,
            vps.id
		from vw_projeto_saude vps
		join status s on s.id = vps.status_id
		join cliente c on c.id = vps.cliente_id
		join projeto_funcionario pf on pf.projeto_id = vps.id
		join funcionario f on f.id = pf.funcionario_id
where (
        vps.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
		order by
			score desc,
			vps.id,
			dias_parado desc

	`);
	const projetos_lista = Object.values(projetos_lista_rows.reduce((acc, curr) => {
		if(!acc[curr.nome]) {
			acc[curr.nome] = {...curr, funcionarios: []};
		}
		acc[curr.nome].funcionarios.push({
			nome: curr.funcionario, cargo: curr.cargo
		})
		return acc
	}, {}));
    const [prazos_row] = await db.query(`
select
    case when PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
              and day(curdate()) >= 10
              and not exists (
                  select 1 from projeto_status ps
                  where ps.projeto_id = vps.id
                    and ps.status_id not in (4,6,7,8,9,10,11,12,13,14)
              )
        then 'Atrasado'
        else 'Em dia'
    end as situacao_briefing_finalizado,

    case when PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
              and day(curdate()) > 10 and day(curdate()) <= 25
              and not exists (
                  select 1 from projeto_status ps
                  where ps.projeto_id = vps.id
                    and ps.status_id in (6,7,8,9,10,11,12,13,14)
              )
        then 'Atrasado'
        else 'Em dia'
    end as situacao_producao_criativos,

    case when PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
              and day(curdate()) >= 20 and day(curdate()) <= 25
              and not exists (
                  select 1 from projeto_status ps
                  where ps.projeto_id = vps.id
                    and ps.status_id in (7,8,9,11,12,13,14)
              )
        then 'Atrasado'
        else 'Em dia'
    end as situacao_fluxo_aprovacao,

    case when PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0
              and day(curdate()) >= 30
              and vps.status_id != 14
        then 'Atrasado'
        else 'Em dia'
    end as situacao_agendamento_posts,

    fn_fase_projeto(vps.data_vencimento) as fase_projeto,
	c.nome cliente,
    s.nome status,
    vps.nome as projeto,
    vps.*
from vw_projeto_saude vps
join cliente c on vps.cliente_id = c.id
join status s on s.id = vps.status_id
where vps.categoria <> 'cancelado' collate utf8mb4_0900_ai_ci and ((
        vps.dt_finalizado is null
        and PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) > 0
      )
   or PERIOD_DIFF(date_format(curdate(), '%Y%m'), date_format(vps.data_vencimento, '%Y%m')) = 0)
    `);
    const prazos = prazos_row.reduce((acc, curr) => {
        if(!acc[curr.fase_projeto]) acc[curr.fase_projeto] = [];
        acc[curr.fase_projeto].push(curr);
        return acc
    }, {});
    return {
        clientes,
        funcionarios,
        status,
        frequencias,
        projetos,
        projetoFuncionario,
        notificacoes,
        resumo:rows.pop(),
        resumo_por_status,
        projetos_criticos,
        projetos_por_saude,
		projetos_linha_tempo,
		projetos_lista,
        projetos_por_status,
        media_dias_por_status,
        prazos

    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diffDias(dataInicio, dataFim) {
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

// ─── Endpoint principal do dashboard ─────────────────────────────────────────
//
    // GET /api/dashboard
// Retorna tudo que o front precisa em uma única chamada.
    // Seções:
//   resumo            → cards do topo (totais e status geral)
//   projetos_lista    → tabela completa de projetos com campos enriquecidos
//   por_status        → contagem de projetos por status (para gráfico de barras)
//   por_cliente       → projetos por cliente com indicador de saúde
//   por_funcionario   → tempo médio e assertividade por funcionário
//   alertas_prazo     → projetos que violaram os prazos operacionais do mês
//   historico_projeto → linha do tempo de notificações por projeto

app.get("/api/dashboard", async (req, res) => {

    const { clientes, funcionarios, status, projetos, projetoFuncionario, notificacoes, resumo,
        resumo_por_status, projetos_criticos, projetos_por_saude, projetos_por_status
        ,media_dias_por_status, projetos_linha_tempo, projetos_lista
        , prazos
    } = await carregarDados();

    // Lookups rápidos por id
    const clienteMap     = Object.fromEntries(clientes.map(c => [c.id, c]));
    const funcionarioMap = Object.fromEntries(funcionarios.map(f => [f.id, f]));
    const statusMap      = Object.fromEntries(status.map(s => [s.id, s]));

    // Funcionários de cada projeto
    const funcsPorProjeto = {};
    for (const rel of projetoFuncionario) {
        if (!funcsPorProjeto[rel.projeto_id]) funcsPorProjeto[rel.projeto_id] = [];
        funcsPorProjeto[rel.projeto_id].push(funcionarioMap[rel.funcionario_id]);
    }

    // Notificações de cada projeto
    const notifsPorProjeto = {};
    for (const n of notificacoes) {
        if (!notifsPorProjeto[n.projeto_id]) notifsPorProjeto[n.projeto_id] = [];
        notifsPorProjeto[n.projeto_id].push(n);
    }

    // ── Indicador de saúde ────────────────────────────────────────────────────
    // Regras:
    //   > 2 ajustes/alterações + atraso  → alerta
    //   > 2 ajustes/alterações + no prazo → atencao
    //   ≤ 1 ajuste + no prazo             → saudavel
    //   demais                            → atencao

    const STATUS_ALTERACAO = [9, 10]; // "Em Alteração" e "Ajustes"
    const STATUS_FINALIZADO = [13, 14]; // "Aprovado" e "Finalizado"
    const STATUS_CANCELADO = 15;

    function calcularSaude(projeto) {
        if (projeto.status_id === STATUS_CANCELADO) return "cancelado";

        const notifs = notifsPorProjeto[projeto.id] || [];
        const totalAjustes = notifs.filter(n => STATUS_ALTERACAO.includes(n.alteracao_status_id)).length;

        const hoje = new Date("2025-07-31"); // data de referência do mock
        const vencimento = new Date(projeto.data_vencimento);
        const concluido = projeto.data_conclusao ? new Date(projeto.data_conclusao) : null;

        const atrasado = concluido
            ? concluido > vencimento
            : hoje > vencimento && !STATUS_FINALIZADO.includes(projeto.status_id);

        if (totalAjustes > 2 && atrasado) return "alerta";
        if (totalAjustes > 2 && !atrasado) return "atencao";
        if (totalAjustes <= 1 && !atrasado) return "saudavel";
        return "atencao";
    }

    // ── Alertas de prazo ─────────────────────────────────────────────────────
    // Prazos operacionais mensais:
    //   dia 10 → briefing finalizado (status_id 4) — Social Media
    //   dia 25 → em aprovação (status_id 8)
    //   dia 10 → nenhum projeto em aguardando materiais (status_id 5)
    //   dia 30 → aprovado (status_id 13)

    function verificarPrazos(projeto) {
        const alertas = [];
        const notifs  = (notifsPorProjeto[projeto.id] || []).sort((a, b) => new Date(a.data) - new Date(b.data));

        // Data em que o briefing foi finalizado (status 4)
        const briefingNotif = notifs.find(n => n.alteracao_status_id === 4);
        if (briefingNotif) {
            const diaBriefing = new Date(briefingNotif.data).getDate();
            if (diaBriefing > 10) {
                alertas.push({ tipo: "briefing_atrasado", descricao: `Briefing finalizado no dia ${diaBriefing} (prazo: dia 10)` });
            }
        } else if (projeto.status_id > 4) {
            alertas.push({ tipo: "briefing_sem_registro", descricao: "Sem registro de briefing finalizado" });
        }

        // Data em que entrou em aprovação (status 8) — pega a primeira vez
        const aprovNotif = notifs.find(n => n.alteracao_status_id === 8);
        if (aprovNotif) {
            const diaAprov = new Date(aprovNotif.data).getDate();
            if (diaAprov > 25) {
                alertas.push({ tipo: "aprovacao_atrasada", descricao: `Entrou em aprovação no dia ${diaAprov} (prazo: dia 25)` });
            }
        } else if (![STATUS_CANCELADO, 1, 2, 3, 4, 5, 6].includes(projeto.status_id)) {
            alertas.push({ tipo: "sem_aprovacao", descricao: "Projeto não chegou à aprovação no mês" });
        }

        // Projeto ficou em "Aguardando materiais" depois do dia 10
        const aguardNotif = notifs.find(n => n.alteracao_status_id === 5);
        if (aguardNotif && new Date(aguardNotif.data).getDate() > 10) {
            alertas.push({ tipo: "materiais_atrasados", descricao: "Aguardando materiais após dia 10" });
        }
        if (projeto.status_id === 5) {
            alertas.push({ tipo: "ainda_aguardando_materiais", descricao: "Projeto ainda aguardando materiais" });
        }

        // Aprovado até dia 30?
            const finalNotif = notifs.find(n => STATUS_FINALIZADO.includes(n.alteracao_status_id));
        if (finalNotif) {
            const diaFinal = new Date(finalNotif.data).getDate();
            if (diaFinal > 30) {
                alertas.push({ tipo: "aprovacao_final_atrasada", descricao: `Aprovado no dia ${diaFinal} (prazo: dia 30)` });
            }
        } else if (projeto.status_id !== STATUS_CANCELADO && !STATUS_FINALIZADO.includes(projeto.status_id)) {
            alertas.push({ tipo: "nao_aprovado_no_mes", descricao: "Projeto não foi aprovado até o final do mês" });
        }

        return alertas;
    }

    // ── Resumo (cards do topo) ────────────────────────────────────────────────

    const total = projetos_lista.length;
    const por_saude = {
        saudavel:  projetos_lista.filter(p => p.saude === "saudavel").length,
        atencao:   projetos_lista.filter(p => p.saude === "atencao").length,
        alerta:    projetos_lista.filter(p => p.saude === "alerta").length,
        cancelado: projetos_lista.filter(p => p.saude === "cancelado").length,
    };

    // ── Por status ────────────────────────────────────────────────────────────

    const contagemStatus = {};
    for (const p of projetos_lista) {
        contagemStatus[p.status] = (contagemStatus[p.status] || 0) + 1;
    }
    const por_status = Object.entries(contagemStatus).map(([nome, total]) => ({ nome, total }));

    // ── Por cliente ───────────────────────────────────────────────────────────

    const dadosCliente = {};
    for (const p of projetos_lista) {
        if (!dadosCliente[p.cliente]) {
            dadosCliente[p.cliente] = { cliente: p.cliente, total: 0, ajustes: 0, alertas: 0, projetos: [] };
        }
        dadosCliente[p.cliente].total++;
        dadosCliente[p.cliente].ajustes += p.total_ajustes;
        dadosCliente[p.cliente].projetos.push({ nome: p.nome, saude: p.saude, ajustes: p.total_ajustes });
    }
    const por_cliente = Object.values(dadosCliente);

    // ── Por funcionário ───────────────────────────────────────────────────────
    // Tempo médio que cada funcionário passou em projetos
    // e taxa de assertividade (projetos sem ajuste / total)

    const dadosFuncionario = {};
    for (const p of projetos_lista) {
        for (const f of p.funcionarios) {
            if (!dadosFuncionario[f.nome]) {
                dadosFuncionario[f.nome] = {
                    nome: f.nome,
                    cargo: f.cargo,
                    total_projetos: 0,
                    total_ajustes: 0,
                    projetos_sem_ajuste: 0,
                    soma_dias: 0,
                };
            }
            const d = dadosFuncionario[f.nome];
            d.total_projetos++;
            d.total_ajustes += p.total_ajustes;
            if (p.total_ajustes === 0) d.projetos_sem_ajuste++;
            if (p.dias_em_andamento) d.soma_dias += p.dias_em_andamento;
        }
    }

    const por_funcionario = Object.values(dadosFuncionario).map(f => ({
        ...f,
        media_dias:      f.total_projetos > 0 ? Math.round(f.soma_dias / f.total_projetos) : 0,
        assertividade:   f.total_projetos > 0
        ? Math.round((f.projetos_sem_ajuste / f.total_projetos) * 100)
        : 0,
    }));

    // ── Histórico por projeto (linha do tempo) ────────────────────────────────

    const historico_projeto = projetos.map(p => ({
        projeto_id:  p.id,
        nome:        p.nome,
        eventos: (notifsPorProjeto[p.id] || [])
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .map(n => ({
            data:        n.data,
            funcionario: funcionarioMap[n.funcionario_id]?.nome,
            cargo:       funcionarioMap[n.funcionario_id]?.cargo,
            comentario:  n.comentario,
            status:      statusMap[n.alteracao_status_id]?.nome,
        })),
    }));

    // ── Resposta final ────────────────────────────────────────────────────────
    res.json({
        resumo,
        por_status,
        por_cliente,
        por_funcionario,
        historico_projeto,
        resumo_por_status,
        projetos_criticos,
        projetos_por_saude,
		projetos_linha_tempo,
		projetos_lista,
        projetos_por_status,
        media_dias_por_status,
        prazos
    });
});
app.get('/projeto', (req, res) => {
    res.sendFile(join(__dirname, "publico/projeto.html"));
})
app.get('/api/projeto/:id', async (req, res) => {
    const id = req.params.id
    console.log('AQUIIIIIII')
    const [rows] = await db.query(`
            select
                vps.id,
                vps.nome,
                c.nome as cliente,
                s.nome as status,
                vps.categoria as saude,
                '' as categoria,
                'Mensal' as frequencia,
                1 as estimativa,
                vps.data_vencimento,
                vps.data_inicio as data_inicio,
                vps.dt_finalizado as data_conclusao,
                vps.qtd_alteracoes,
                DATEDIFF(NOW(), (select max(data) from projeto_status where projeto_id = ps.projeto_id)) AS dias_parado,
                s2.nome as hist_status_status,
                ps.data as hist_status_data,
                f.nome as hist_status_funcionario,
                f.cargo as hist_status_cargo,
                vps.qtd_alteracoes
            from
                vw_projeto_saude vps
            join cliente c on
                c.id = vps.cliente_id
            left join status s on
                vps.status_id = s.id
            left join projeto_status ps on
                ps.projeto_id = vps.id
            left join status s2 on s2.id = ps.status_id
            left join funcionario f on f.id = ps.funcionario_id

            where vps.id = ?
            order by ps.data desc
    `,[id]);
    const [rows_func] = await db.query(`
        select f.nome, f.cargo from projeto_funcionario pf
        left join funcionario f on f.id = pf.funcionario_id
        where pf.projeto_id = ?
    `, [id]);
    const [rows_noti] = await db.query(`
        select n.comentario, n.data, f.nome as funcionario, f.cargo  from notificacao n
        join funcionario f ON f.id = n.funcionario_id
        where n.projeto_id = ?
    `, [id]);
    const dados = rows.reduce((acc, row) => {
        if(!acc.nome) {
            acc = {...row};
            acc.funcionarios = rows_func;
            acc.comentarios = rows_noti;
            acc.historico_status = [];
        }
        const dados_status = {};
        Object.keys(row).filter(k=> k.indexOf('hist_status_') > -1).forEach(k => {
            const chave = k.split('hist_status_').pop();
            dados_status[chave] = row[k];
        });
        acc.historico_status.push(dados_status);
        return acc;
    }, {});
    res.json(dados);
})

// ─── Sobe o servidor ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Dashboard rodando em http://localhost:${PORT}`);
    console.log(`API:            http://localhost:${PORT}/api/dashboard`);
});
