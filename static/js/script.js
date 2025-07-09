// LetShield Dashboard — script.js final com ajustes completos

function loadSuspects() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  fetch("/api/suspects", { credentials: "include" })
    .then((r) => r.json())
    .then((suspects) => {
      if (!suspects.length) {
        tbody.innerHTML = '<tr class="empty"><td colspan="3">Nenhum link criado ainda.</td></tr>';
        return;
      }

      const rows = suspects.map((item) =>
        fetch(`/api/suspect/${item.token}`, { credentials: "include" })
          .then((res) => res.json())
          .then((details) => {
            const date = new Date(item.created_at).toLocaleString();
            const token = item.token;
            const preset = guessPresetFromToken(token);
            const message = escapeHtml(details.message || "Clique aqui");
            const disfarcedLink = `/go/${token}?preset=${preset}`;
            const originalLink = `/track/${token}`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td data-label="Link">
                <a href="#" class="copy-link" data-url="${disfarcedLink}" data-message="${message}" title="Clique para copiar">
                  ${message}
                </a><br>
                <small class="original-link">${originalLink}</small>
              </td>
              <td data-label="Data" style="font-size:0.9rem;">${date}</td>
              <td data-label="Ações" style="text-align:right;">
                <a href="${originalLink}" class="neon btn-details">Detalhes</a>
                <button class="btn-delete neon" data-token="${token}">X</button>
              </td>
            `;
            tbody.appendChild(tr);
          })
      );

      Promise.all(rows).then(() => {
        attachDeleteListeners();
        attachCopyListeners();
      });
    })
    .catch(() => {
      tbody.innerHTML = '<tr class="empty"><td colspan="3">Erro ao carregar dados.</td></tr>';
    });
}

function attachDeleteListeners() {
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Excluir este rastreio?")) return;
      const token = btn.dataset.token;
      try {
        await fetch(`/api/suspect/${token}`, {
          method: "DELETE",
          credentials: "include",
        });
        loadSuspects();
      } catch {
        alert("Erro ao excluir.");
      }
    };
  });
}

function attachCopyListeners() {
  document.querySelectorAll(".copy-link").forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      const url = link.dataset.url;
      const message = link.dataset.message;
      navigator.clipboard.writeText(location.origin + url);
      link.textContent = "Copiado!";
      setTimeout(() => (link.textContent = message), 1200);
    };
  });
}

function guessPresetFromToken(token) {
  return "layout";
}

function escapeHtml(text) {
  return text.replace(/[<>&"]/g, (c) =>
    { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }
  );
}

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return "https://" + trimmed;
  }
  return trimmed;
}

loadSuspects();

const form = document.getElementById("newTrackForm");
const msgInput = document.getElementById("messageInput");
const presetSel = document.getElementById("presetSelect");
const customInput = document.getElementById("customUrlInput");
const resultDiv = document.getElementById("result");
const submitBtn = document.getElementById("submitBtn");

presetSel.onchange = () => {
  customInput.style.display = presetSel.value === "custom" ? "block" : "none";
};

form.onsubmit = async (e) => {
  e.preventDefault();

  const message = msgInput.value.trim() || "Clique aqui";
  const preset = presetSel.value;
  let custom = customInput.value.trim();
  if (preset === "custom" && custom) {
    custom = normalizeUrl(custom);
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Criando…";
  resultDiv.textContent = "";
  resultDiv.classList.remove("error");

  try {
    const res = await fetch("/api/new-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao criar link");
    }

    msgInput.value = "";
    customInput.value = "";
    resultDiv.innerHTML = `<p style="text-align:center;">Link criado com sucesso ✅</p>`;
    loadSuspects();
  } catch (err) {
    resultDiv.textContent = err.message;
    resultDiv.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar Link";
  }
};