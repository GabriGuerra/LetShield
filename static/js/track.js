// static/js/track.js

document.addEventListener("DOMContentLoaded", () => {
    const token = window.location.pathname.split("/").pop();
  
    const messageText = document.getElementById("messageText");
    const ipSpan = document.getElementById("ip");
    const citySpan = document.getElementById("city");
    const countrySpan = document.getElementById("country");
    const browserSpan = document.getElementById("browser");
    const platformSpan = document.getElementById("platform");
    const createdAtSpan = document.getElementById("createdAt");
    const lastAccessSpan = document.getElementById("lastAccess");
  
    // Inicializa mapa Leaflet
    const map = L.map("map").setView([0, 0], 2);
  
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  
    fetch(`/api/suspect/${token}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar dados do rastreamento.");
        return res.json();
      })
      .then((data) => {
        messageText.textContent = data.message || "Detalhes do rastreamento:";
  
        ipSpan.textContent = data.ip || "–";
        citySpan.textContent = data.city || "–";
        countrySpan.textContent = data.country || "–";
        browserSpan.textContent = data.browser || "–";
        platformSpan.textContent = data.platform || "–";
        createdAtSpan.textContent = data.created_at
          ? new Date(data.created_at).toLocaleString()
          : "–";
        lastAccessSpan.textContent = data.last_access
          ? new Date(data.last_access).toLocaleString()
          : "–";
  
        if (data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lon = parseFloat(data.longitude);
  
          if (!isNaN(lat) && !isNaN(lon)) {
            map.setView([lat, lon], 13);
            L.marker([lat, lon])
              .addTo(map)
              .bindPopup(
                `${data.city || "Localização"} - ${data.country || ""}`
              )
              .openPopup();
          }
        }
      })
      .catch(() => {
        messageText.textContent =
          "Erro ao carregar dados do rastreamento. Verifique o token.";
      });
  });
  