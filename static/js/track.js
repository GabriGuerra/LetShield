document.addEventListener("DOMContentLoaded", () => {
  const token = window.location.pathname.split("/").pop();

  const messageText    = document.getElementById("messageText");
  const ipSpan         = document.getElementById("ip");
  const citySpan       = document.getElementById("city");
  const countrySpan    = document.getElementById("country");
  const browserSpan    = document.getElementById("browser");
  const platformSpan   = document.getElementById("platform");
  const createdAtSpan  = document.getElementById("createdAt");
  const lastAccessSpan = document.getElementById("lastAccess");

  const mapContainer = document.getElementById("map");
  const map = L.map("map").setView([0, 0], 2);

  // Modo escuro: CartoDB DarkMatter
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; CartoDB",
    maxZoom: 19
  }).addTo(map);

  // Ícone vermelho estilizado
  const redIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });

  fetch(`/api/suspect/${token}`, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao buscar dados do rastreamento.");
      return res.json();
    })
    .then((data) => {
      messageText.textContent = data.message || "Detalhes do rastreamento:";

      ipSpan.textContent         = data.ip || "–";
      citySpan.textContent       = data.city || "–";
      countrySpan.textContent    = data.country || "–";
      browserSpan.textContent    = data.browser || "–";
      platformSpan.textContent   = data.platform || "–";
      createdAtSpan.textContent  = formatDate(data.created_at);
      lastAccessSpan.textContent = formatDate(data.last_access);

      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);

      if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 13);
        L.marker([lat, lon], { icon: redIcon })
          .addTo(map)
          .bindPopup(`${data.city || "Local"} – ${data.country || ""}`)
          .openPopup();
      } else {
        map.remove();
        mapContainer.innerHTML = "<p class='error-message'>Localização não disponível para este IP.</p>";
      }
    })
    .catch(() => {
      messageText.textContent = "Erro ao carregar rastreamento. Token inválido ou expirado.";
      map.remove();
      mapContainer.innerHTML = "<p class='error-message'>Não foi possível renderizar o mapa.</p>";
    });
});

function formatDate(dateStr) {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleString();
}