-- =====================================================================
--  Agência de Conteúdo — Schema MySQL (DDL)
--  Gerado a partir da estrutura dos dados: projetos.json, notificacoes.json
--  e projeto_funcionario.json. As tabelas de apoio (cliente, funcionario,
--  status, frequencia) seguem o modelo de referência do projeto.
--
--  Engine: InnoDB  |  Charset: utf8mb4 (acentuação/emoji nos comentários)
--  Observação: a tabela `projeto` NÃO contém identifier, cenario,
--  tipo_tarefa nem ciclo_pdca_ativo (removidos a pedido).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS agencia_conteudo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agencia_conteudo;

SET NAMES utf8mb4;

-- Recria tudo do zero (ordem inversa de dependência) -------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notificacao;
DROP TABLE IF EXISTS projeto_funcionario;
DROP TABLE IF EXISTS projeto;
DROP TABLE IF EXISTS frequencia;
DROP TABLE IF EXISTS `status`;
DROP TABLE IF EXISTS funcionario;
DROP TABLE IF EXISTS cliente;
SET FOREIGN_KEY_CHECKS = 1;


-- ---------------------------------------------------------------------
--  CLIENTE
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
  id    INT          NOT NULL AUTO_INCREMENT,
  nome  VARCHAR(150) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Clientes da agência (1 projeto por cliente por mês).';


-- ---------------------------------------------------------------------
--  FUNCIONARIO
--  cargo: Social Media | Designer | Audiovisual
-- ---------------------------------------------------------------------
CREATE TABLE funcionario (
  id     INT          NOT NULL AUTO_INCREMENT,
  nome   VARCHAR(150) NOT NULL,
  email  VARCHAR(255)     DEFAULT NULL,
  cargo  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_funcionario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Equipe. cargo funciona como vocabulário controlado.';


-- ---------------------------------------------------------------------
--  STATUS  (vocabulário fixo, ids 1..15 — ver INSERTs de referência)
-- ---------------------------------------------------------------------
CREATE TABLE `status` (
  id    INT          NOT NULL,
  nome  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_status_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Estados do fluxo (A fazer ... Finalizado/Cancelado).';


-- ---------------------------------------------------------------------
--  FREQUENCIA  (ex.: Diária, Semanal, Quinzenal, Mensal — ids controlados)
-- ---------------------------------------------------------------------
CREATE TABLE frequencia (
  id    INT          NOT NULL,
  nome  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Frequência de entrega do projeto.';


-- ---------------------------------------------------------------------
--  PROJETO  (pacote de conteúdo mensal do cliente)
--  Removidos: identifier, cenario, tipo_tarefa, ciclo_pdca_ativo
-- ---------------------------------------------------------------------
CREATE TABLE projeto (
  id                INT           NOT NULL AUTO_INCREMENT,
  nome              VARCHAR(255)  NOT NULL,
  cliente_id        INT           NOT NULL,
  status_id         INT           NOT NULL,
  frequencia_id     INT           NOT NULL,
  etapa             VARCHAR(100)      DEFAULT NULL,
  projeto           VARCHAR(255)      DEFAULT NULL  COMMENT 'Categoria: Design, Audiovisual, Planejamento e Design...',
  estimativa        DECIMAL(5,2)      DEFAULT NULL  COMMENT 'Horas estimadas',
  data_inicio       DATE              DEFAULT NULL,
  data_criacao      DATE          NOT NULL,
  data_modificacao  DATE          NOT NULL,
  data_vencimento   DATE          NOT NULL,
  data_conclusao    DATE              DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_projeto_cliente    (cliente_id),
  KEY idx_projeto_status     (status_id),
  KEY idx_projeto_frequencia (frequencia_id),
  CONSTRAINT fk_projeto_cliente
    FOREIGN KEY (cliente_id)    REFERENCES cliente (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_projeto_status
    FOREIGN KEY (status_id)     REFERENCES `status` (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_projeto_frequencia
    FOREIGN KEY (frequencia_id) REFERENCES frequencia (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Um projeto por cliente por mês; várias frentes convivem nele.';


-- ---------------------------------------------------------------------
--  PROJETO_FUNCIONARIO  (N:N — quem atua no projeto)
-- ---------------------------------------------------------------------
CREATE TABLE projeto_funcionario (
  projeto_id     INT NOT NULL,
  funcionario_id INT NOT NULL,
  PRIMARY KEY (projeto_id, funcionario_id),
  KEY idx_pf_funcionario (funcionario_id),
  CONSTRAINT fk_pf_projeto
    FOREIGN KEY (projeto_id)     REFERENCES projeto (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pf_funcionario
    FOREIGN KEY (funcionario_id) REFERENCES funcionario (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Associação entre projetos e a equipe que trabalha neles.';


-- ---------------------------------------------------------------------
--  NOTIFICACAO  (histórico / linha do tempo do projeto)
-- ---------------------------------------------------------------------
CREATE TABLE notificacao (
  id                   INT       NOT NULL AUTO_INCREMENT,
  projeto_id           INT       NOT NULL,
  funcionario_id       INT       NOT NULL,
  comentario           TEXT          DEFAULT NULL,
  alteracao_status_id  INT           DEFAULT NULL  COMMENT 'NULL = comentário sem mudança de status',
  `data`               DATETIME  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notif_projeto     (projeto_id),
  KEY idx_notif_funcionario (funcionario_id),
  KEY idx_notif_status      (alteracao_status_id),
  KEY idx_notif_data        (`data`),
  CONSTRAINT fk_notif_projeto
    FOREIGN KEY (projeto_id)          REFERENCES projeto (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notif_funcionario
    FOREIGN KEY (funcionario_id)      REFERENCES funcionario (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_notif_status
    FOREIGN KEY (alteracao_status_id) REFERENCES `status` (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cada mudança de status/comentário; alimenta a timeline do dashboard.';
