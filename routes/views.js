import express from "express";
import pool from "../banco.js"; // ajuste o path conforme sua estrutura

const router = express.Router();

router.get("/funcionario", (req, res) => {
    res.render("funcionario", { title: "Fluxo · Funcionários" });
});

router.get("/cliente", (req, res) => {
    res.render("cliente", { title: "Fluxo · Clientes" });
});

// GET /projeto -> listagem de projetos, com atribuicao de equipe
router.get("/projeto", (req, res) => {
    res.render("projeto", { title: "Fluxo · Projetos" });
});

// GET /projeto/novo -> formulario de criacao (status vem do banco)
router.get("/projeto/novo", async (req, res) => {
    try {
        const [status] = await pool.query("SELECT id, nome FROM status ORDER BY id ASC");
        res.render("projeto-form", {
            title: "Fluxo · Novo Projeto",
            status,
            projetoId: null
        });
    } catch (err) {
        console.error("Erro ao carregar formulario de projeto:", err);
        res.status(500).send("Erro ao carregar formulario de projeto.");
    }
});

// GET /projeto/:id/editar -> formulario de edicao (status vem do banco, dados do projeto via fetch no client)
router.get("/projeto/:id/editar", async (req, res) => {
    try {
        const [status] = await pool.query("SELECT id, nome FROM status ORDER BY id ASC");
        res.render("projeto-form", {
            title: "Fluxo · Editar Projeto",
            status,
            projetoId: req.params.id
        });
    } catch (err) {
        console.error("Erro ao carregar formulario de projeto:", err);
        res.status(500).send("Erro ao carregar formulario de projeto.");
    }
});

export default router;
