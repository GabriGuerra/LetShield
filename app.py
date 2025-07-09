from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime
import uuid

app = Flask(__name__)

# Simulação de banco de dados em memória (substituir por banco real)
SUSPECTS_DB = {
    "abc123": {
        "name": "Fulano",
        "created_at": datetime(2025, 7, 9, 10, 30),
        "last_access": datetime(2025, 7, 9, 12, 0),
        "message": "Clique aqui para ver algo legal",
        "ip": "8.8.8.8",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    }
}

def get_geo_data(ip):
    try:
        response = requests.get(f'https://ipapi.co/{ip}/json/')
        if response.status_code == 200:
            return response.json()
        return {}
    except Exception:
        return {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/track/<token>')
def track(token):
    # Passa só o token para o template carregar os dados via JS
    return render_template("track.html", token=token)

@app.route('/api/suspects')
def api_suspects():
    suspects_list = []
    for token, data in SUSPECTS_DB.items():
        suspects_list.append({
            "token": token,
            "name": data.get("name"),
            "created_at": data.get("created_at").isoformat() if data.get("created_at") else None,
        })
    return jsonify(suspects_list)

@app.route('/api/suspect/<token>')
def api_suspect(token):
    suspect = SUSPECTS_DB.get(token)
    if not suspect:
        return jsonify({"error": "Token não encontrado"}), 404

    ip = suspect.get("ip", request.remote_addr)
    geo_data = get_geo_data(ip)

    data = {
        "name": suspect.get("name"),
        "message": suspect.get("message"),
        "ip": ip,
        "city": geo_data.get("city", "–"),
        "region": geo_data.get("region", "–"),
        "country": geo_data.get("country_name", "–"),
        "latitude": geo_data.get("latitude"),
        "longitude": geo_data.get("longitude"),
        "browser": suspect.get("user_agent"),
        "platform": "–",
        "created_at": suspect.get("created_at").isoformat() if suspect.get("created_at") else None,
        "last_access": suspect.get("last_access").isoformat() if suspect.get("last_access") else None,
        "token": token,
    }
    return jsonify(data)

@app.route('/api/new-track', methods=['POST'])
def api_new_track():
    data = request.get_json()
    name = data.get("name")
    slug = data.get("slug") or str(uuid.uuid4())[:8]
    message = data.get("message") or "Clique aqui"

    if not name:
        return jsonify({"detail": "Nome é obrigatório"}), 400

    if slug in SUSPECTS_DB:
        return jsonify({"detail": "Slug já existe"}), 400

    now = datetime.now()
    SUSPECTS_DB[slug] = {
        "name": name,
        "created_at": now,
        "last_access": None,
        "message": message,
        "ip": None,
        "user_agent": None,
    }

    url = f"/track/{slug}"
    return jsonify({"url": url})

@app.route('/api/suspect/<token>', methods=['DELETE'])
def api_delete_suspect(token):
    if token not in SUSPECTS_DB:
        return jsonify({"error": "Token não encontrado"}), 404
    del SUSPECTS_DB[token]
    return jsonify({"detail": "Suspeito removido com sucesso"})

if __name__ == '__main__':
     app.run(host='0.0.0.0', debug=True)
