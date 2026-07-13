const API = "/administrador/funcionario";

const $ = (sel) => document.querySelector(sel);

const el = {
    loading: $("#loading"),
    error: $("#error"),
    content: $("#content"),
    tbody: $("#tbody"),
    empty: $("#emptyState"),
    total: $("#totalCount"),
    busca: $("#busca"),
    filtroCargo: $("#filtroCargo"),
    btnNovo: $("#btnNovo"),
    modalOverlay: $("#modalOverlay"),
    modalTitle: $("#modalTitle"),
    modalClose: $("#modalClose"),
    btnCancelar: $("#btnCancelar"),
    form: $("#form"),
    fId: $("#fId"),
    fNome: $("#fNome"),
    fEmail: $("#fEmail"),
    fCargo: $("#fCargo"),
    formError: $("#formError"),
    toast: $("#toast")
};

let TODOS = [];      // lista completa vinda da API
let cargoAtivo = "";  // filtro de cargo selecionado

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
        if (!resp.ok) throw new Error("Falha ao carregar funcionários.");
        TODOS = await resp.json();

        montarFiltroCargos();
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

function montarFiltroCargos() {
    const cargos = [...new Set(TODOS.map((f) => f.cargo))].sort();
    el.filtroCargo.innerHTML = `
        <button class="fbtn ${cargoAtivo === "" ? "is-active" : ""}" data-cargo="">
            Todos <span class="fb-n">${TODOS.length}</span>
        </button>
        ${cargos.map((c) => {
            const n = TODOS.filter((f) => f.cargo === c).length;
            return `<button class="fbtn ${cargoAtivo === c ? "is-active" : ""}" data-cargo="${esc(c)}">
                ${esc(c)} <span class="fb-n">${n}</span>
            </button>`;
        }).join("")}
    `;

    el.filtroCargo.querySelectorAll(".fbtn").forEach((btn) => {
        btn.addEventListener("click", () => {
            cargoAtivo = btn.dataset.cargo;
            montarFiltroCargos();
            renderizar();
        });
    });
}

function renderizar() {
    const termo = el.busca.value.trim().toLowerCase();

    const filtrados = TODOS.filter((f) => {
        const passaCargo = !cargoAtivo || f.cargo === cargoAtivo;
        const passaBusca = !termo ||
            f.nome.toLowerCase().includes(termo) ||
            (f.email ?? "").toLowerCase().includes(termo) ||
            f.cargo.toLowerCase().includes(termo);
        return passaCargo && passaBusca;
    });

    el.total.textContent = TODOS.length;

    if (filtrados.length === 0) {
        el.tbody.innerHTML = "";
        el.empty.hidden = false;
        return;
    }
    el.empty.hidden = true;

    el.tbody.innerHTML = filtrados.map((f) => `
        <tr>
            <td>${esc(f.nome)}</td>
            <td>${esc(f.email) || '<span style="color:var(--text-faint)">—</span>'}</td>
            <td><span class="status-chip">${esc(f.cargo)}</span></td>
            <td>
                <div class="row-actions">
                    <button class="icon-btn" title="Editar" data-editar="${f.id}">✎</button>
                    <button class="icon-btn danger" title="Remover" data-remover="${f.id}">🗑</button>
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
        const f = TODOS.find((x) => x.id === id);
        if (!f) return;
        el.modalTitle.textContent = "Editar funcionário";
        el.fId.value = f.id;
        el.fNome.value = f.nome;
        el.fEmail.value = f.email ?? "";
        el.fCargo.value = f.cargo;
    } else {
        el.modalTitle.textContent = "Novo funcionário";
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
    const payload = {
        nome: el.fNome.value.trim(),
        email: el.fEmail.value.trim() || null,
        cargo: el.fCargo.value.trim()
    };

    try {
        const resp = await fetch(id ? `${API}/${id}` : API, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            el.formError.textContent = data.erro || "Erro ao salvar funcionário.";
            el.formError.classList.add("show");
            return;
        }

        fecharModal();
        showToast(id ? "Funcionário atualizado." : "Funcionário criado.", "ok");
        await carregar();
    } catch (err) {
        el.formError.textContent = "Erro de conexão com o servidor.";
        el.formError.classList.add("show");
    }
}

async function remover(id) {
    const f = TODOS.find((x) => x.id === id);
    if (!f) return;

    if (!confirm(`Remover o funcionário "${f.nome}"? Essa ação não pode ser desfeita.`)) return;

    try {
        const resp = await fetch(`${API}/${id}`, { method: "DELETE" });
        const data = await resp.json();

        if (!resp.ok) {
            showToast(data.erro || "Erro ao remover funcionário.", "error");
            return;
        }

        showToast("Funcionário removido.", "ok");
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
