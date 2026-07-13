import express from "express";

const router = express.Router();

router.get("/funcionario", (req, res) => {
    res.render("funcionario", { title: "Fluxo · Funcionários" });
});

router.get("/cliente", (req, res) => {
    res.render("cliente", { title: "Fluxo · Clientes" });
});

export default router;
