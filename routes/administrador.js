import express from "express";
import pool from "../banco.js"; // ajuste o path conforme sua estrutura

const router = express.Router();

/* ============================================================
   FUNCIONARIO
   ============================================================ */

// GET /administrador/funcionario -> lista todos
// GET /administrador/funcionario?cargo=xxx -> filtra por cargo (opcional)
router.get("/funcionario", async (req, res) => {
    try {
        const { cargo } = req.query;

        let sql = "SELECT id, nome, email, cargo FROM funcionario";
        const params = [];

        if (cargo) {
            sql += " WHERE cargo = ?";
            params.push(cargo);
        }

        sql += " ORDER BY nome ASC";

        const [rows] = await pool.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        console.error("Erro ao listar funcionarios:", err);
        return res.status(500).json({ erro: "Erro ao listar funcionarios." });
    }
});

// GET /administrador/funcionario/:id -> busca por id
router.get("/funcionario/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            "SELECT id, nome, email, cargo FROM funcionario WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Funcionario nao encontrado." });
        }

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar funcionario:", err);
        return res.status(500).json({ erro: "Erro ao buscar funcionario." });
    }
});

// normaliza o body para sempre virar um array de objetos, aceitando:
// 1) JSON de objeto unico: { nome, email, cargo }
// 2) JSON de array de objetos: [{ nome, email, cargo }, ...]
// 3) form data (urlencoded) de objeto unico: nome=X&email=Y&cargo=Z
// 4) form data (urlencoded) com campos repetidos: nome[]=X&nome[]=W&email[]=Y&email[]=Z&cargo[]=A&cargo[]=B
function normalizarBodyParaArray(body, campos) {
    if (Array.isArray(body)) {
        return body; // ja veio como array de objetos (JSON)
    }

    // verifica se algum dos campos esperados veio como array (form data repetido)
    const algumCampoEhArray = campos.some((campo) => Array.isArray(body[campo]));

    if (!algumCampoEhArray) {
        return [body]; // objeto unico (JSON ou form data simples)
    }

    // form data com arrays paralelos -> zipa em array de objetos
    const tamanho = Math.max(
        ...campos.map((campo) => (Array.isArray(body[campo]) ? body[campo].length : 1))
    );

    const itens = [];
    for (let i = 0; i < tamanho; i++) {
        const item = {};
        for (const campo of campos) {
            const valor = body[campo];
            item[campo] = Array.isArray(valor) ? valor[i] : valor;
        }
        itens.push(item);
    }
    return itens;
}

// POST /administrador/funcionario -> cria um ou varios (aceita JSON ou form data, objeto unico ou array/campos repetidos)
router.post("/funcionario", async (req, res) => {
    const itens = normalizarBodyParaArray(req.body, ["nome", "email", "cargo"]);

    if (itens.length === 0) {
        return res.status(400).json({ erro: "Envie ao menos um funcionario." });
    }

    // valida todos antes de tentar inserir
    for (let i = 0; i < itens.length; i++) {
        const { nome, cargo } = itens[i];
        if (!nome || !cargo) {
            return res.status(400).json({
                erro: `Item ${i}: campos 'nome' e 'cargo' sao obrigatorios.`
            });
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const criados = [];
        for (const item of itens) {
            const { nome, email, cargo } = item;

            const [result] = await connection.query(
                "INSERT INTO funcionario (nome, email, cargo) VALUES (?, ?, ?)",
                [nome, email ?? null, cargo]
            );

            criados.push({ id: result.insertId, nome, email: email ?? null, cargo });
        }

        await connection.commit();

        // se so processou 1 item, responde objeto unico; se processou mais de 1, responde array
        return res.status(201).json(criados.length === 1 ? criados[0] : criados);
    } catch (err) {
        await connection.rollback();

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ erro: "Ja existe um funcionario com esse email." });
        }
        console.error("Erro ao criar funcionario:", err);
        return res.status(500).json({ erro: "Erro ao criar funcionario." });
    } finally {
        connection.release();
    }
});

// PUT /administrador/funcionario/:id -> atualiza
router.put("/funcionario/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, cargo } = req.body;

        if (!nome || !cargo) {
            return res.status(400).json({ erro: "Campos 'nome' e 'cargo' sao obrigatorios." });
        }

        const [result] = await pool.query(
            "UPDATE funcionario SET nome = ?, email = ?, cargo = ? WHERE id = ?",
            [nome, email ?? null, cargo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Funcionario nao encontrado." });
        }

        return res.status(200).json({ id: Number(id), nome, email: email ?? null, cargo });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ erro: "Ja existe um funcionario com esse email." });
        }
        console.error("Erro ao atualizar funcionario:", err);
        return res.status(500).json({ erro: "Erro ao atualizar funcionario." });
    }
});

// DELETE /administrador/funcionario/:id -> remove
router.delete("/funcionario/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM funcionario WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Funcionario nao encontrado." });
        }

        return res.status(200).json({ mensagem: "Funcionario removido com sucesso." });
    } catch (err) {
        console.error("Erro ao remover funcionario:", err);
        return res.status(500).json({ erro: "Erro ao remover funcionario." });
    }
});

/* ============================================================
   CLIENTE
   ============================================================ */

// GET /administrador/cliente -> lista todos
router.get("/cliente", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nome FROM cliente ORDER BY nome ASC"
        );
        return res.status(200).json(rows);
    } catch (err) {
        console.error("Erro ao listar clientes:", err);
        return res.status(500).json({ erro: "Erro ao listar clientes." });
    }
});

// GET /administrador/cliente/:id -> busca por id
router.get("/cliente/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            "SELECT id, nome FROM cliente WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Cliente nao encontrado." });
        }

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar cliente:", err);
        return res.status(500).json({ erro: "Erro ao buscar cliente." });
    }
});

// POST /administrador/cliente -> cria um ou varios (aceita JSON ou form data, objeto unico ou array/campos repetidos)
router.post("/cliente", async (req, res) => {
    const itens = normalizarBodyParaArray(req.body, ["nome"]);

    if (itens.length === 0) {
        return res.status(400).json({ erro: "Envie ao menos um cliente." });
    }

    // valida todos antes de tentar inserir
    for (let i = 0; i < itens.length; i++) {
        const { nome } = itens[i];
        if (!nome) {
            return res.status(400).json({
                erro: `Item ${i}: campo 'nome' e obrigatorio.`
            });
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const criados = [];
        for (const item of itens) {
            const { nome } = item;

            const [result] = await connection.query(
                "INSERT INTO cliente (nome) VALUES (?)",
                [nome]
            );

            criados.push({ id: result.insertId, nome });
        }

        await connection.commit();

        // se so processou 1 item, responde objeto unico; se processou mais de 1, responde array
        return res.status(201).json(criados.length === 1 ? criados[0] : criados);
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao criar cliente:", err);
        return res.status(500).json({ erro: "Erro ao criar cliente." });
    } finally {
        connection.release();
    }
});

// PUT /administrador/cliente/:id -> atualiza
router.put("/cliente/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ erro: "Campo 'nome' e obrigatorio." });
        }

        const [result] = await pool.query(
            "UPDATE cliente SET nome = ? WHERE id = ?",
            [nome, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Cliente nao encontrado." });
        }

        return res.status(200).json({ id: Number(id), nome });
    } catch (err) {
        console.error("Erro ao atualizar cliente:", err);
        return res.status(500).json({ erro: "Erro ao atualizar cliente." });
    }
});

// DELETE /administrador/cliente/:id -> remove
router.delete("/cliente/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM cliente WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Cliente nao encontrado." });
        }

        return res.status(200).json({ mensagem: "Cliente removido com sucesso." });
    } catch (err) {
        // FK constraint: cliente vinculado a projeto(s) nao pode ser removido
        if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
            return res.status(409).json({ erro: "Cliente possui projetos vinculados e nao pode ser removido." });
        }
        console.error("Erro ao remover cliente:", err);
        return res.status(500).json({ erro: "Erro ao remover cliente." });
    }
});

/* ============================================================
   PROJETO
   ============================================================ */

// GET /administrador/projeto -> lista todos
// GET /administrador/projeto?cliente_id=1&status_id=2 -> filtra (opcional)
router.get("/projeto", async (req, res) => {
    try {
        const { cliente_id, status_id, frequencia_id } = req.query;

        let sql = `
            SELECT id, nome, cliente_id, status_id, frequencia_id, etapa, projeto,
                   estimativa, data_inicio, data_criacao, data_modificacao,
                   data_vencimento, data_conclusao
            FROM projeto
        `;
        const condicoes = [];
        const params = [];

        if (cliente_id) {
            condicoes.push("cliente_id = ?");
            params.push(cliente_id);
        }
        if (status_id) {
            condicoes.push("status_id = ?");
            params.push(status_id);
        }
        if (frequencia_id) {
            condicoes.push("frequencia_id = ?");
            params.push(frequencia_id);
        }

        if (condicoes.length > 0) {
            sql += " WHERE " + condicoes.join(" AND ");
        }

        sql += " ORDER BY data_vencimento ASC";

        const [rows] = await pool.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        console.error("Erro ao listar projetos:", err);
        return res.status(500).json({ erro: "Erro ao listar projetos." });
    }
});

// GET /administrador/projeto/:id -> busca por id
router.get("/projeto/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT id, nome, cliente_id, status_id, frequencia_id, etapa, projeto,
                    estimativa, data_inicio, data_criacao, data_modificacao,
                    data_vencimento, data_conclusao
             FROM projeto WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Projeto nao encontrado." });
        }

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar projeto:", err);
        return res.status(500).json({ erro: "Erro ao buscar projeto." });
    }
});

// POST /administrador/projeto -> cria (SOMENTE objeto unico, nao aceita array)
router.post("/projeto", async (req, res) => {
    try {
        const {
            nome,
            cliente_id,
            status_id,
            frequencia_id,
            etapa,
            projeto,
            estimativa,
            data_inicio,
            data_criacao,
            data_modificacao,
            data_vencimento,
            data_conclusao
        } = req.body;

        if (!nome || !cliente_id || !status_id || !frequencia_id || !data_criacao || !data_modificacao || !data_vencimento) {
            return res.status(400).json({
                erro: "Campos 'nome', 'cliente_id', 'status_id', 'frequencia_id', 'data_criacao', 'data_modificacao' e 'data_vencimento' sao obrigatorios."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO projeto
                (nome, cliente_id, status_id, frequencia_id, etapa, projeto, estimativa,
                 data_inicio, data_criacao, data_modificacao, data_vencimento, data_conclusao)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                cliente_id,
                status_id,
                frequencia_id,
                etapa ?? null,
                projeto ?? null,
                estimativa ?? null,
                data_inicio ?? null,
                data_criacao,
                data_modificacao,
                data_vencimento,
                data_conclusao ?? null
            ]
        );

        return res.status(201).json({
            id: result.insertId,
            nome,
            cliente_id,
            status_id,
            frequencia_id,
            etapa: etapa ?? null,
            projeto: projeto ?? null,
            estimativa: estimativa ?? null,
            data_inicio: data_inicio ?? null,
            data_criacao,
            data_modificacao,
            data_vencimento,
            data_conclusao: data_conclusao ?? null
        });
    } catch (err) {
        if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
            return res.status(400).json({ erro: "cliente_id, status_id ou frequencia_id informado nao existe." });
        }
        console.error("Erro ao criar projeto:", err);
        return res.status(500).json({ erro: "Erro ao criar projeto." });
    }
});

// PUT /administrador/projeto/:id -> atualiza
router.put("/projeto/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            cliente_id,
            status_id,
            frequencia_id,
            etapa,
            projeto,
            estimativa,
            data_inicio,
            data_criacao,
            data_modificacao,
            data_vencimento,
            data_conclusao
        } = req.body;

        if (!nome || !cliente_id || !status_id || !frequencia_id || !data_criacao || !data_modificacao || !data_vencimento) {
            return res.status(400).json({
                erro: "Campos 'nome', 'cliente_id', 'status_id', 'frequencia_id', 'data_criacao', 'data_modificacao' e 'data_vencimento' sao obrigatorios."
            });
        }

        const [result] = await pool.query(
            `UPDATE projeto SET
                nome = ?, cliente_id = ?, status_id = ?, frequencia_id = ?, etapa = ?,
                projeto = ?, estimativa = ?, data_inicio = ?, data_criacao = ?,
                data_modificacao = ?, data_vencimento = ?, data_conclusao = ?
             WHERE id = ?`,
            [
                nome,
                cliente_id,
                status_id,
                frequencia_id,
                etapa ?? null,
                projeto ?? null,
                estimativa ?? null,
                data_inicio ?? null,
                data_criacao,
                data_modificacao,
                data_vencimento,
                data_conclusao ?? null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Projeto nao encontrado." });
        }

        return res.status(200).json({
            id: Number(id),
            nome,
            cliente_id,
            status_id,
            frequencia_id,
            etapa: etapa ?? null,
            projeto: projeto ?? null,
            estimativa: estimativa ?? null,
            data_inicio: data_inicio ?? null,
            data_criacao,
            data_modificacao,
            data_vencimento,
            data_conclusao: data_conclusao ?? null
        });
    } catch (err) {
        if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
            return res.status(400).json({ erro: "cliente_id, status_id ou frequencia_id informado nao existe." });
        }
        console.error("Erro ao atualizar projeto:", err);
        return res.status(500).json({ erro: "Erro ao atualizar projeto." });
    }
});

// DELETE /administrador/projeto/:id -> remove
router.delete("/projeto/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM projeto WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Projeto nao encontrado." });
        }

        return res.status(200).json({ mensagem: "Projeto removido com sucesso." });
    } catch (err) {
        // FK constraint: projeto vinculado a outra tabela (ex: projeto_status) nao pode ser removido
        if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
            return res.status(409).json({ erro: "Projeto possui registros vinculados e nao pode ser removido." });
        }
        console.error("Erro ao remover projeto:", err);
        return res.status(500).json({ erro: "Erro ao remover projeto." });
    }
});

export default router;
