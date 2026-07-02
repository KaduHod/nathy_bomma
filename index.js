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
        from projeto p`);
    const resumo_por_status_query = await db.query(`

        SELECT COUNT(s.id) as total, s.nome
        FROM status s
        LEFT JOIN projeto p ON p.status_id = s.id
        WHERE s.nome IN (
            'A fazer',
            'Briefing em construção',
            'Em desenvolvimento',
            'Pronto pra aprovação',
            'Em aprovação',
            'Em Alteração'
        )
        GROUP BY s.nome
        ORDER BY CASE s.nome
        WHEN 'A fazer' THEN 1
        WHEN 'Briefing em construção' THEN 2
        WHEN 'Em desenvolvimento' THEN 3
        WHEN 'Pronto pra aprovação' THEN 4
        WHEN 'Em aprovação' then 5
        WHEN 'Em Alteração' THEN 6
        END;
        `);
    const resumo_por_status = resumo_por_status_query[0].reduce((acc, curr) => { acc[curr.nome] = curr.total; return acc; }, {});


    const [rows_projeto_status_e_tres_ultimas_notificacoes] = await db.query(
        `
        SELECT
            vps.nome as projeto,
            c.nome as cliente,
            n.comentario,
            s.nome as status,
            n.data,
            vps.categoria,
            vps.qtd_alteracoes,
            vps.data_vencimento
        FROM vw_projeto_saude vps
        JOIN cliente c ON c.id = vps.cliente_id
        JOIN notificacao n ON n.projeto_id = vps.id
        JOIN status s ON s.id = n.alteracao_status_id
        WHERE (
            SELECT COUNT(*)
            FROM notificacao n2
            WHERE n2.projeto_id = vps.id
              AND (
                  (n2.data > n.data)
                  OR (n2.data = n.data AND n2.id <= n.id)
              )
        ) <= 3 and (vps.categoria collate utf8mb4_0900_ai_ci) in ('em_alerta', 'critico')
        ORDER BY
            CASE
                WHEN (vps.categoria = 'critico' collate utf8mb4_0900_ai_ci) THEN 1
                WHEN (vps.categoria = 'em_alerta' collate utf8mb4_0900_ai_ci) THEN 2
                ELSE 3
            END,
            vps.id,
            (n.data IS NULL) DESC,
            n.data ASC;


        `
    );
    const projetos_criticos = {}
    rows_projeto_status_e_tres_ultimas_notificacoes.forEach(i => {
        if(!projetos_criticos[i.projeto]) {
            projetos_criticos[i.projeto] = {
                projeto: i.projeto,
                cliente: i.cliente,
                categoria: i.categoria,
                notificacoes: []
            }
        }
        projetos_criticos[i.projeto].notificacoes.push({comentario:i.comentario,status:i.status,data:i.data})
    })
    console.log(projetos_criticos)
    return { clientes, funcionarios, status, frequencias, projetos, projetoFuncionario, notificacoes, resumo:rows.pop(), resumo_por_status: resumo_por_status, projetos_criticos, projetos_criticos };
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
    const { clientes, funcionarios, status, projetos, projetoFuncionario, notificacoes, resumo, resumo_por_status, projetos_criticos} = await carregarDados();

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

    // ── Montar lista de projetos enriquecidos ─────────────────────────────────

    const projetos_lista = projetos.map(p => {
        const notifs  = (notifsPorProjeto[p.id] || []).sort((a, b) => new Date(a.data) - new Date(b.data));
        const ajustes = notifs.filter(n => STATUS_ALTERACAO.includes(n.alteracao_status_id)).length;
        const funcs   = funcsPorProjeto[p.id] || [];

        const diasEmAndamento = p.data_inicio
            ? diffDias(p.data_inicio, p.data_conclusao || "2025-07-31")
            : null;

        return {
            id:               p.id,
            identifier:       p.identifier,
            nome:             p.nome,
            cenario:          p.cenario,
            cliente:          clienteMap[p.cliente_id]?.nome,
            status:           statusMap[p.status_id]?.nome,
            status_id:        p.status_id,
            projeto:          p.projeto,
            tipo_tarefa:      p.tipo_tarefa,
            estimativa:       p.estimativa,
            data_inicio:      p.data_inicio,
            data_vencimento:  p.data_vencimento,
            data_conclusao:   p.data_conclusao,
            funcionarios:     funcs.map(f => ({ nome: f.nome, cargo: f.cargo })),
            total_ajustes:    ajustes,
            dias_em_andamento: diasEmAndamento,
            saude:            calcularSaude(p),
            alertas_prazo:    verificarPrazos(p),
        };
    });

    // ── Resumo (cards do topo) ────────────────────────────────────────────────

    const total = projetos_lista.length;
    const por_saude = {
        saudavel:  projetos_lista.filter(p => p.saude === "saudavel").length,
        atencao:   projetos_lista.filter(p => p.saude === "atencao").length,
        alerta:    projetos_lista.filter(p => p.saude === "alerta").length,
        cancelado: projetos_lista.filter(p => p.saude === "cancelado").length,
    };

    const em_atraso = projetos_lista.filter(p =>
        p.alertas_prazo.some(a => ["nao_aprovado_no_mes", "aprovacao_final_atrasada"].includes(a.tipo))
    ).length;

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
        dadosCliente[p.cliente].alertas += p.alertas_prazo.length;
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
        projetos_lista,
        por_status,
        por_cliente,
        por_funcionario,
        historico_projeto,
        resumo_por_status,
        projetos_criticos
    });
});

// ─── Sobe o servidor ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Dashboard rodando em http://localhost:${PORT}`);
    console.log(`API:            http://localhost:${PORT}/api/dashboard`);
});
