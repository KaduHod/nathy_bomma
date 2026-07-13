const API_PROJETO = "/administrador/projeto";
const API_CLIENTE = "/administrador/cliente";

const $ = (sel) => document.querySelector(sel);

const el = {
    loading: $("#loading"),
    error: $("#error"),
    content: $("#content"),
    form: $("#form"),
    fId: $("#fId"),
    fNome: $("#fNome"),
    fCliente: $("#fCliente"),
    fStatus: $("#fStatus"),
    fEtapa: $("#fEtapa"),
    fCategoria: $("#fCategoria"),
    fEstimativa: $("#fEstimativa"),
    fDataInicio: $("#fDataInicio"),
    fDataVencimento: $("#fDataVencimento"),
    fDataConclusao: $("#fDataConclusao"),
    formError: $("#formError"),
    toast: $("#toast")
};

const projetoId = el.fId.value || null;

function showToast(msg, tipo = "ok") {
    el.toast.textContent = msg;
    el.toast.className = `toast show toast-${tipo}`;
    setTimeout(() => { el.toast.className = "toast"; }, 3000);
}

function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// converte "2026-07-13T00:00:00.000Z" ou "2026-07-13" -> "2026-07-13" (formato do <input type="date">)
function paraInputDate(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 10);
}

async function carregarClientes(clienteSelecionadoId = null) {
    const resp = await fetch(API_CLIENTE);
    if (!resp.ok) throw new Error("Falha ao carregar clientes.");
    const clientes = await resp.json();

    el.fCliente.innerHTML = `
        <option value="">Selecione…</option>
        ${clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}
    `;

    if (clienteSelecionadoId) {
        el.fCliente.value = clienteSelecionadoId;
    }
}

async function carregarProjeto() {
    const resp = await fetch(`${API_PROJETO}/${projetoId}`);
    if (!resp.ok) throw new Error("Projeto não encontrado.");
    const p = await resp.json();

    el.fNome.value = p.nome;
    el.fStatus.value = p.status_id;
    el.fEtapa.value = p.etapa ?? "";
    el.fCategoria.value = p.projeto ?? "";
    el.fEstimativa.value = p.estimativa ?? "";
    el.fDataInicio.value = paraInputDate(p.data_inicio);
    el.fDataVencimento.value = paraInputDate(p.data_vencimento);
    el.fDataConclusao.value = paraInputDate(p.data_conclusao);

    return p.cliente_id;
}

async function iniciar() {
    try {
        if (projetoId) {
            const clienteId = await carregarProjeto();
            await carregarClientes(clienteId);
            el.loading.hidden = true;
            el.content.hidden = false;
        } else {
            await carregarClientes();
        }
    } catch (err) {
        el.loading.hidden = true;
        el.error.hidden = false;
        el.error.innerHTML = `
            <h3>Erro ao carregar formulário</h3>
            <p>${esc(err.message)}</p>
            <button onclick="location.reload()">Tentar novamente</button>
        `;
    }
}

async function salvar(e) {
    e.preventDefault();
    el.formError.classList.remove("show");

    const payload = {
        nome: el.fNome.value.trim(),
        cliente_id: Number(el.fCliente.value),
        status_id: Number(el.fStatus.value),
        etapa: el.fEtapa.value.trim() || null,
        projeto: el.fCategoria.value || null,
        estimativa: el.fEstimativa.value ? Number(el.fEstimativa.value) : null,
        data_inicio: el.fDataInicio.value || null,
        data_vencimento: el.fDataVencimento.value,
        data_conclusao: el.fDataConclusao.value || null
    };

    const btn = $("#btnSalvar");
    btn.disabled = true;

    try {
        const resp = await fetch(projetoId ? `${API_PROJETO}/${projetoId}` : API_PROJETO, {
            method: projetoId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            el.formError.textContent = data.erro || "Erro ao salvar projeto.";
            el.formError.classList.add("show");
            btn.disabled = false;
            return;
        }

        showToast(projetoId ? "Projeto atualizado." : "Projeto criado.", "ok");
        setTimeout(() => { window.location.href = "/"; }, 900);
    } catch (err) {
        el.formError.textContent = "Erro de conexão com o servidor.";
        el.formError.classList.add("show");
        btn.disabled = false;
    }
}

el.form.addEventListener("submit", salvar);
iniciar();
