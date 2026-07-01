-- =====================================================================
--  Classificação de saúde dos projetos
--
--  crítico   : está em atraso — existe notificação de status FINALIZADO
--              com data > data_vencimento, OU a última notificação que
--              NÃO é finalizado passou do data_vencimento.
--  em alerta : 2 ou mais notificações com status 9 (Em Alteração).
--  saudável  : nenhum dos dois acima.
--
--  Os três são mutuamente exclusivos, com o crítico tendo prioridade
--  (saudável = "nenhum dos dois"). 'finalizado' = Aprovado(13)+Finalizado(14);
--  troque por (14) na view se quiser apenas Finalizado.
-- =====================================================================

USE agencia_conteudo;

-- ---------------------------------------------------------------------
--  View base: calcula as métricas e a categoria de cada projeto.
--  (Definir uma vez; as três consultas abaixo só filtram por categoria.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_projeto_saude AS
SELECT
    m.*,
    CASE
      WHEN COALESCE(m.dt_finalizado      > m.data_vencimento, 0)
        OR COALESCE(m.dt_ultima_nao_final > m.data_vencimento, 0) THEN 'critico'
      WHEN m.qtd_alteracoes >= 2                                   THEN 'em_alerta'
      ELSE 'saudavel'
    END AS categoria
FROM (
    SELECT
        p.id,
        p.nome,
        p.cliente_id,
        p.status_id,
        p.data_vencimento,
        -- data da conclusão (status finalizado = Aprovado/Finalizado)
        MAX(CASE WHEN n.alteracao_status_id IN (13,14)
                 THEN DATE(n.data) END)                                    AS dt_finalizado,
        -- data da última notificação que NÃO é finalizado
        MAX(CASE WHEN n.alteracao_status_id NOT IN (13,14)
                   OR n.alteracao_status_id IS NULL
                 THEN DATE(n.data) END)                                    AS dt_ultima_nao_final,
        -- nº de idas para "Em Alteração" (status 9)
        SUM(CASE WHEN n.alteracao_status_id = 9 THEN 1 ELSE 0 END)         AS qtd_alteracoes
    FROM projeto p
    LEFT JOIN notificacao n ON n.projeto_id = p.id
    GROUP BY p.id, p.nome, p.cliente_id, p.status_id, p.data_vencimento
) AS m;


-- ---------------------------------------------------------------------
--  1) PROJETOS CRÍTICOS (em atraso)
-- ---------------------------------------------------------------------
SELECT v.id, v.nome, c.nome AS cliente, s.nome AS status,
       v.data_vencimento, v.dt_finalizado, v.dt_ultima_nao_final, v.qtd_alteracoes
FROM vw_projeto_saude v
JOIN cliente  c ON c.id = v.cliente_id
JOIN `status` s ON s.id = v.status_id
WHERE v.categoria = 'critico'
ORDER BY v.data_vencimento, v.id;


-- ---------------------------------------------------------------------
--  2) PROJETOS EM ALERTA (2+ "Em Alteração", sem atraso)
-- ---------------------------------------------------------------------
SELECT v.id, v.nome, c.nome AS cliente, s.nome AS status,
       v.qtd_alteracoes, v.data_vencimento
FROM vw_projeto_saude v
JOIN cliente  c ON c.id = v.cliente_id
JOIN `status` s ON s.id = v.status_id
WHERE v.categoria = 'em_alerta'
ORDER BY v.qtd_alteracoes DESC, v.id;


-- ---------------------------------------------------------------------
--  3) PROJETOS SAUDÁVEIS (nem crítico nem em alerta)
-- ---------------------------------------------------------------------
SELECT v.id, v.nome, c.nome AS cliente, s.nome AS status,
       v.qtd_alteracoes, v.data_vencimento
FROM vw_projeto_saude v
JOIN cliente  c ON c.id = v.cliente_id
JOIN `status` s ON s.id = v.status_id
WHERE v.categoria = 'saudavel'
ORDER BY v.id;


-- =====================================================================
--  Alternativa SEM view (caso não possa criar view): mesma lógica
--  embutida com CTE. Exemplo para os CRÍTICOS — para alerta/saudável
--  troque a cláusula final por:
--     em_alerta -> WHERE em_atraso = 0 AND qtd_alteracoes >= 2
--     saudavel  -> WHERE em_atraso = 0 AND qtd_alteracoes <  2
-- =====================================================================
WITH metrica AS (
    SELECT
        p.id, p.nome, p.cliente_id, p.status_id, p.data_vencimento,
        MAX(CASE WHEN n.alteracao_status_id IN (13,14) THEN DATE(n.data) END) AS dt_finalizado,
        MAX(CASE WHEN n.alteracao_status_id NOT IN (13,14) OR n.alteracao_status_id IS NULL
                 THEN DATE(n.data) END)                                       AS dt_ultima_nao_final,
        SUM(CASE WHEN n.alteracao_status_id = 9 THEN 1 ELSE 0 END)            AS qtd_alteracoes
    FROM projeto p
    LEFT JOIN notificacao n ON n.projeto_id = p.id
    GROUP BY p.id, p.nome, p.cliente_id, p.status_id, p.data_vencimento
),
classif AS (
    SELECT m.*,
           ( COALESCE(m.dt_finalizado > m.data_vencimento, 0)
             OR COALESCE(m.dt_ultima_nao_final > m.data_vencimento, 0) ) AS em_atraso
    FROM metrica m
)
SELECT id, nome, data_vencimento, dt_finalizado, dt_ultima_nao_final, qtd_alteracoes
FROM classif
WHERE em_atraso = 1
ORDER BY data_vencimento, id;
