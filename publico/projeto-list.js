const API_PROJETO = "/administrador/projeto";
const API_FUNCIONARIO = "/administrador/funcionario";
const API_STATUS = "/administrador/status";

const $ = (sel) => document.querySelector(sel);

const el = {
    loading: $("#loading"),
    error: $("#error"),
    content: $("#content"),
    tbody: $("#tbody"),
    empty: $("#emptyState"),
    total: $("#totalCount"),
    dialog: $("#dialogEquipe"),
    dialogProjNome: $("#dialogProjNome"),
    checklist: $("#checklist"),
    formEquipe: $("#formEquipe"),
    btnFecharDialog: $("#btnFecharDialog"),
    btnCancelarEquipe: $("#btnCancelarEquipe"),

    dialogStatus: $("#dialogStatus"),
    dialogStatusProjNome: $("#dialogStatusProjNome"),
    sFuncionario: $("#sFuncionario"),
    sStatus: $("#sStatus"),
    sComentario: $("#sComentario"),
    statusFormError: $("#statusFormError"),
    formStatus: $("#formStatus"),
    btnFecharDialogStatus: $("#btnFecharDialogStatus"),
    btnCancelarStatus: $("#btnCancelarStatus"),

    toast: $("#toast")
};

let PROJETOS = [];
let FUNCIONARIOS = [];
let STATUS = [];
let projetoAtualId = null;
let projetoStatusAtualId = null;

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

function fmtData(valor) {
    if (!valor) return "—";
    return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

async function carregar() {
    el.loading.hidden = false;
    el.error.hidden = true;
    el.content.hidden = true;

    try {
        const [respProjetos, respFuncionarios, respStatus] = await Promise.all([
            fetch(API_PROJETO),
            fetch(API_FUNCIONARIO),
            fetch(API_STATUS)
        ]);

        if (!respProjetos.ok) throw new Error("Falha ao carregar projetos.");
        if (!respFuncionarios.ok) throw new Error("Falha ao carregar funcionários.");
        if (!respStatus.ok) throw new Error("Falha ao carregar status.");

        PROJETOS = await respProjetos.json();
        FUNCIONARIOS = await respFuncionarios.json();
        STATUS = await respStatus.json();

        montarSelectsEstaticos();
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
    el.total.textContent = PROJETOS.length;

    if (PROJETOS.length === 0) {
        el.tbody.innerHTML = "";
        el.empty.hidden = false;
        return;
    }
    el.empty.hidden = true;

    el.tbody.innerHTML = PROJETOS.map((p) => `
        <tr>
            <td>
                <div class="cell-proj">
                    <div class="pn">${esc(p.nome)}</div>
                    <div class="pc">${esc(p.cliente_nome)}</div>
                </div>
            </td>
            <td><span class="status-chip">${esc(p.status_nome)}</span></td>
            <td class="mono">${fmtData(p.data_vencimento)}</td>
            <td>
                <div class="row-actions">
                    <a class="icon-btn" title="Editar" href="/projeto/${p.id}/editar">✎</a>
                    <button class="icon-btn" title="Atribuir equipe" data-atribuir="${p.id}">+</button>
                    <button class="icon-btn" title="Atualizar status / comentar" data-status="${p.id}">☰</button>
                    <button class="icon-btn danger" title="Remover" data-remover="${p.id}">🗑</button>
                </div>
            </td>
        </tr>
    `).join("");

    el.tbody.querySelectorAll("[data-atribuir]").forEach((btn) => {
        btn.addEventListener("click", () => abrirDialog(Number(btn.dataset.atribuir)));
    });
    el.tbody.querySelectorAll("[data-status]").forEach((btn) => {
        btn.addEventListener("click", () => abrirDialogStatus(Number(btn.dataset.status)));
    });
    el.tbody.querySelectorAll("[data-remover]").forEach((btn) => {
        btn.addEventListener("click", () => remover(Number(btn.dataset.remover)));
    });
}

async function abrirDialog(projetoId) {
    const projeto = PROJETOS.find((p) => p.id === projetoId);
    if (!projeto) return;

    projetoAtualId = projetoId;
    el.dialogProjNome.textContent = projeto.nome;
    el.checklist.innerHTML = `<div class="empty-state">Carregando equipe atual…</div>`;

    el.dialog.showModal();

    try {
        const resp = await fetch(`${API_PROJETO}/${projetoId}/funcionarios`);
        if (!resp.ok) throw new Error("Falha ao carregar equipe atual.");
        const atribuidos = await resp.json();
        const idsAtribuidos = new Set(atribuidos.map((f) => f.id));

        if (FUNCIONARIOS.length === 0) {
            el.checklist.innerHTML = `<div class="empty-state">Nenhum funcionário cadastrado.</div>`;
            return;
        }

        el.checklist.innerHTML = FUNCIONARIOS.map((f) => `
            <label class="checkbox-row">
                <input type="checkbox" value="${f.id}" ${idsAtribuidos.has(f.id) ? "checked" : ""} />
                <span class="cr-name">${esc(f.nome)}</span>
                <span class="cr-cargo">${esc(f.cargo)}</span>
            </label>
        `).join("");
    } catch (err) {
        el.checklist.innerHTML = `<div class="empty-state">Erro ao carregar equipe atual.</div>`;
    }
}

function montarSelectsEstaticos() {
    el.sStatus.innerHTML = `
        <option value="">Selecione…</option>
        ${STATUS.map((s) => `<option value="${s.id}">${esc(s.nome)}</option>`).join("")}
    `;
}

async function abrirDialogStatus(projetoId) {
    const projeto = PROJETOS.find((p) => p.id === projetoId);
    if (!projeto) return;

    projetoStatusAtualId = projetoId;
    el.dialogStatusProjNome.textContent = projeto.nome;
    el.formStatus.reset();
    el.statusFormError.classList.remove("show");

    el.sFuncionario.innerHTML = `<option value="">Carregando equipe…</option>`;
    el.sFuncionario.disabled = true;

    el.dialogStatus.showModal();

    try {
        const resp = await fetch(`${API_PROJETO}/${projetoId}/funcionarios`);
        if (!resp.ok) throw new Error("Falha ao carregar equipe do projeto.");
        const equipe = await resp.json();

        if (equipe.length === 0) {
            el.sFuncionario.innerHTML = `<option value="">Nenhum funcionário atribuído a este projeto</option>`;
            el.sFuncionario.disabled = true;
            el.statusFormError.textContent = "Atribua ao menos um funcionário à equipe do projeto antes de registrar um status.";
            el.statusFormError.classList.add("show");
        } else {
            el.sFuncionario.innerHTML = `
                <option value="">Selecione…</option>
                ${equipe.map((f) => `<option value="${f.id}">${esc(f.nome)} (${esc(f.cargo)})</option>`).join("")}
            `;
            el.sFuncionario.disabled = false;
        }
    } catch (err) {
        el.sFuncionario.innerHTML = `<option value="">Erro ao carregar equipe</option>`;
        el.statusFormError.textContent = "Erro ao carregar a equipe deste projeto.";
        el.statusFormError.classList.add("show");
    }

    // pre-seleciona o status atual do projeto, como ponto de partida
    el.sStatus.value = projeto.status_id;
}

function fecharDialogStatus() {
    el.dialogStatus.close();
    projetoStatusAtualId = null;
}

async function salvarStatus(e) {
    e.preventDefault();
    if (!projetoStatusAtualId) return;

    el.statusFormError.classList.remove("show");

    const payload = {
        funcionario_id: Number(el.sFuncionario.value),
        status_id: Number(el.sStatus.value),
        comentario: el.sComentario.value.trim() || undefined
    };

    try {
        const resp = await fetch(`${API_PROJETO}/${projetoStatusAtualId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            el.statusFormError.textContent = data.erro || "Erro ao atualizar status.";
            el.statusFormError.classList.add("show");
            return;
        }

        fecharDialogStatus();
        showToast("Status atualizado.", "ok");
        await carregar();
    } catch (err) {
        el.statusFormError.textContent = "Erro de conexão com o servidor.";
        el.statusFormError.classList.add("show");
    }
}

async function salvarEquipe(e) {
    e.preventDefault();
    if (!projetoAtualId) return;

    const ids = [...el.checklist.querySelectorAll('input[type="checkbox"]:checked')]
        .map((input) => Number(input.value));

    try {
        const resp = await fetch(`${API_PROJETO}/${projetoAtualId}/funcionarios`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ funcionario_ids: ids })
        });

        const data = await resp.json();

        if (!resp.ok) {
            showToast(data.erro || "Erro ao atribuir equipe.", "error");
            return;
        }

        fecharDialog();
        showToast("Equipe atualizada.", "ok");
    } catch (err) {
        showToast("Erro de conexão com o servidor.", "error");
    }
}

async function remover(id) {
    const p = PROJETOS.find((x) => x.id === id);
    if (!p) return;

    if (!confirm(`Remover o projeto "${p.nome}"? Essa ação não pode ser desfeita.`)) return;

    try {
        const resp = await fetch(`${API_PROJETO}/${id}`, { method: "DELETE" });
        const data = await resp.json();

        if (!resp.ok) {
            showToast(data.erro || "Erro ao remover projeto.", "error");
            return;
        }

        showToast("Projeto removido.", "ok");
        await carregar();
    } catch (err) {
        showToast("Erro de conexão com o servidor.", "error");
    }
}

// Eventos
el.formEquipe.addEventListener("submit", salvarEquipe);
el.btnFecharDialog.addEventListener("click", fecharDialogStatus);
el.btnCancelarEquipe.addEventListener("click", fecharDialogStatus);

el.formStatus.addEventListener("submit", salvarStatus);
el.btnFecharDialogStatus.addEventListener("click", fecharDialogStatus);
el.btnCancelarStatus.addEventListener("click", fecharDialogStatus);

// fecha ao clicar fora do conteudo (no backdrop do <dialog>)
el.dialog.addEventListener("click", (e) => {
    const rect = el.dialog.getBoundingClientRect();
    const dentroDoConteudo =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!dentroDoConteudo) fecharDialogStatus();
});
el.dialogStatus.addEventListener("click", (e) => {
    const rect = el.dialogStatus.getBoundingClientRect();
    const dentroDoConteudo =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!dentroDoConteudo) fecharDialogStatus();
});

carregar();
