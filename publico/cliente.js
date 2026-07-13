const API = "/administrador/cliente";

const $ = (sel) => document.querySelector(sel);

const el = {
    loading: $("#loading"),
    error: $("#error"),
    content: $("#content"),
    tbody: $("#tbody"),
    empty: $("#emptyState"),
    total: $("#totalCount"),
    busca: $("#busca"),
    btnNovo: $("#btnNovo"),
    modalOverlay: $("#modalOverlay"),
    modalTitle: $("#modalTitle"),
    modalClose: $("#modalClose"),
    btnCancelar: $("#btnCancelar"),
    form: $("#form"),
    fId: $("#fId"),
    fNome: $("#fNome"),
    formError: $("#formError"),
    toast: $("#toast")
};

let TODOS = [];

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

async function carregar() {
    el.loading.hidden = false;
    el.error.hidden = true;
    el.content.hidden = true;

    try {
        const resp = await fetch(API);
        if (!resp.ok) throw new Error("Falha ao carregar clientes.");
        TODOS = await resp.json();

        renderizar();

        el.loading.hidden = true;
        el.content.hidden = false;
    } catch (err) {
        el.loading.hidden = true;
        el.error.hidden = false;
        el.error.innerHTML = `
            <h3>Erro ao carregar dados</h3>
            <p>${esc(err.message)}</p>
            <button onclick="location.reload()">Tentar novamente</button>
        `;
    }
}

function renderizar() {
    const termo = el.busca.value.trim().toLowerCase();
    const filtrados = TODOS.filter((c) => !termo || c.nome.toLowerCase().includes(termo));

    el.total.textContent = TODOS.length;

    if (filtrados.length === 0) {
        el.tbody.innerHTML = "";
        el.empty.hidden = false;
        return;
    }
    el.empty.hidden = true;

    el.tbody.innerHTML = filtrados.map((c) => `
        <tr>
            <td>${esc(c.nome)}</td>
            <td>
                <div class="row-actions">
                    <button class="icon-btn" title="Editar" data-editar="${c.id}">✎</button>
                    <button class="icon-btn danger" title="Remover" data-remover="${c.id}">🗑</button>
                </div>
            </td>
        </tr>
    `).join("");

    el.tbody.querySelectorAll("[data-editar]").forEach((btn) => {
        btn.addEventListener("click", () => abrirModal(Number(btn.dataset.editar)));
    });
    el.tbody.querySelectorAll("[data-remover]").forEach((btn) => {
        btn.addEventListener("click", () => remover(Number(btn.dataset.remover)));
    });
}

function abrirModal(id = null) {
    el.form.reset();
    el.formError.classList.remove("show");

    if (id) {
        const c = TODOS.find((x) => x.id === id);
        if (!c) return;
        el.modalTitle.textContent = "Editar cliente";
        el.fId.value = c.id;
        el.fNome.value = c.nome;
    } else {
        el.modalTitle.textContent = "Novo cliente";
        el.fId.value = "";
    }

    el.modalOverlay.classList.add("is-open");
    el.fNome.focus();
}

function fecharModal() {
    el.modalOverlay.classList.remove("is-open");
}

async function salvar(e) {
    e.preventDefault();
    el.formError.classList.remove("show");

    const id = el.fId.value;
    const payload = { nome: el.fNome.value.trim() };

    try {
        const resp = await fetch(id ? `${API}/${id}` : API, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            el.formError.textContent = data.erro || "Erro ao salvar cliente.";
            el.formError.classList.add("show");
            return;
        }

        fecharModal();
        showToast(id ? "Cliente atualizado." : "Cliente criado.", "ok");
        await carregar();
    } catch (err) {
        el.formError.textContent = "Erro de conexão com o servidor.";
        el.formError.classList.add("show");
    }
}

async function remover(id) {
    const c = TODOS.find((x) => x.id === id);
    if (!c) return;

    if (!confirm(`Remover o cliente "${c.nome}"? Essa ação não pode ser desfeita.`)) return;

    try {
        const resp = await fetch(`${API}/${id}`, { method: "DELETE" });
        const data = await resp.json();

        if (!resp.ok) {
            showToast(data.erro || "Erro ao remover cliente.", "error");
            return;
        }

        showToast("Cliente removido.", "ok");
        await carregar();
    } catch (err) {
        showToast("Erro de conexão com o servidor.", "error");
    }
}

// Eventos
el.btnNovo.addEventListener("click", () => abrirModal());
el.modalClose.addEventListener("click", fecharModal);
el.btnCancelar.addEventListener("click", fecharModal);
el.modalOverlay.addEventListener("click", (e) => { if (e.target === el.modalOverlay) fecharModal(); });
el.form.addEventListener("submit", salvar);
el.busca.addEventListener("input", renderizar);

carregar();
