import smtplib
from email.mime.text import MIMEText

def send_email(to_email, name, info_dict):
    message = f"🔍 Rastreio de {name}\n\n"
    for key, value in info_dict.items():
        message += f"{key}: {value}\n"

    msg = MIMEText(message)
    msg["Subject"] = f"[Gab&Let Shield] Acesso detectado de {name}"
    msg["From"] = "seuemail@exemplo.com"
    msg["To"] = to_email

    # Configure abaixo com os dados reais
    SMTP_SERVER = "smtp.gmail.com"  # ou smtp-mail.outlook.com, etc.
    SMTP_PORT = 587
    USER = "seuemail@exemplo.com"
    PASS = "sua_senha_de_app"

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(USER, PASS)
            server.send_message(msg)
            print("📩 Email enviado com sucesso!")
    except Exception as e:
        print("Erro ao enviar email:", e)
