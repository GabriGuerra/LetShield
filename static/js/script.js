// script.js - para a dashboard (index.html)

function loadSuspects() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = '<tr class="empty"><td colspan="6">Carregando suspeitos...</td></tr>';

  fetch("/api/suspects", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      tbody.innerHTML = "";
      if (data.length === 0) {
        tbody.innerHTML = '<tr class="empty"><td colspan="6">Nenhum suspeito cadastrado ainda.</td></tr>';
        return;
      }

      data.forEach((item) => {
        const date = new Date(item.created_at).toLocaleString();
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td data-label="Nome">${item.name || "–"}</td>
          <td data-label="Link">
            <a href="/track/${item.token}" target="_blank" rel="noopener noreferrer">
              /track/${item.token}
            </a>
          </td>
          <td data-label="Data">${date}</td>
          <td data-label="Mapa">
            <a href="/map?token=${item.token}" target="_blank" class="btn-map" rel="noopener noreferrer">
              Ver Mapa
            </a>
          </td>
          <td data-label="Detalhes">
            <button class="btn-details" data-token="${item.token}">Ver Detalhes</button>
          </td>
          <td data-label="Excluir">
            <button class="btn-delete" data-token="${item.token}" aria-label="Excluir suspeito">X</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      attachDetailsListeners();
      attachDeleteListeners();
    })
    .catch(() => {
      tbody.innerHTML = '<tr class="empty"><td colspan="6">Erro ao carregar dados.</td></tr>';
    });
}

function attachDetailsListeners() {
  document.querySelectorAll(".btn-details").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const token = btn.dataset.token;
      try {
        const res = await fetch(`/api/suspect/${token}`, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao buscar detalhes");
        const data = await res.json();

        alert(`Detalhes do Suspeito:
- IP: ${data.ip || "–"}
- Cidade: ${data.city || "–"}
- País: ${data.country || "–"}
- Navegador: ${data.browser || "–"}
- Sistema: ${data.platform || "–"}
- Criado em: ${new Date(data.created_at).toLocaleString()}
- Último acesso: ${data.last_access ? new Date(data.last_access).toLocaleString() : "–"}`);
      } catch {
        alert("Erro ao carregar detalhes do suspeito.");
      }
    });
  });
}

function attachDeleteListeners() {
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const token = btn.dataset.token;
      const confirmDelete = confirm("Tem certeza que deseja excluir este suspeito?");
      if (!confirmDelete) return;

      try {
        const res = await fetch(`/api/suspect/${token}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error("Erro ao excluir suspeito");
        loadSuspects();
      } catch {
        alert("Erro ao excluir.");
      }
    });
  });
}

loadSuspects();

const form = document.getElementById("newTrackForm");
const nameInput = document.getElementById("nameInput");
const submitBtn = document.getElementById("submitBtn");
const resultDiv = document.getElementById("result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const slug = document.getElementById("slugInput").value.trim();
  const message = document.getElementById("messageInput").value.trim() || "Clique aqui";

  if (!name) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Criando...";
  resultDiv.textContent = "";
  resultDiv.classList.remove("error");

  try {
    const res = await fetch("/api/new-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
      credentials: "include",
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Erro na criação do link");
    }

    const data = await res.json();

    resultDiv.innerHTML = `
      Mensagem: <a href="${data.url}" target="_blank" rel="noopener noreferrer" style="color: var(--neon); font-weight: 600;">${message}</a>
    `;
    nameInput.value = "";
    document.getElementById("slugInput").value = "";
    document.getElementById("messageInput").value = "";
    loadSuspects();
  } catch (err) {
    resultDiv.textContent = err.message || "Erro ao criar link.";
    resultDiv.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar Link";
  }
});
