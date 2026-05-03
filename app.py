import os
import csv
import io
import secrets
import sqlite3
import requests
import msal
from functools import wraps
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, Response, g, jsonify
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "changeme-secret-key")
DATABASE = os.environ.get("DATABASE", "members.db")

AZURE_CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "")
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID", "")
AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET", "")
AZURE_REDIRECT_URI = os.environ.get("AZURE_REDIRECT_URI", "http://localhost:5000/auth/callback")
ADMIN_GROUP = "gs-mesadherents-admin"
USER_GROUP = "gs-mesadherents-user"

API_KEY = os.environ.get("API_KEY", "")

AUTHORITY = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"
SCOPES = ["User.Read", "GroupMember.Read.All"]


def get_msal_app():
    return msal.ConfidentialClientApplication(
        AZURE_CLIENT_ID,
        authority=AUTHORITY,
        client_credential=AZURE_CLIENT_SECRET,
    )


def get_user_groups(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    groups = []
    url = "https://graph.microsoft.com/v1.0/me/memberOf?$select=displayName&$top=100"
    while url:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            break
        data = resp.json()
        groups.extend(item.get("displayName", "") for item in data.get("value", []))
        url = data.get("@odata.nextLink")
    return groups


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                date_naissance TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL,
                code_postal TEXT NOT NULL DEFAULT '',
                ville TEXT NOT NULL DEFAULT '',
                whatsapp_gazette INTEGER NOT NULL DEFAULT 0,
                email_newsletter INTEGER NOT NULL DEFAULT 0,
                facebook_updates INTEGER NOT NULL DEFAULT 0,
                volunteer_contact INTEGER NOT NULL DEFAULT 0,
                image_rights INTEGER NOT NULL DEFAULT 0,
                membership_amount INTEGER NOT NULL DEFAULT 0,
                payment_method TEXT NOT NULL DEFAULT '',
                latitude REAL,
                longitude REAL,
                joined_at DATETIME DEFAULT (datetime('now'))
            )
        """)
        for col, default in [("date_naissance", "''"), ("code_postal", "''"), ("ville", "''"), ("whatsapp_gazette", 0), ("email_newsletter", 0), ("facebook_updates", 0), ("volunteer_contact", 0), ("image_rights", 0), ("membership_amount", 0), ("payment_method", "''")]:
            try:
                db.execute(f"ALTER TABLE members ADD COLUMN {col} NOT NULL DEFAULT {default}")
            except sqlite3.OperationalError:
                pass
        for col in ("latitude", "longitude"):
            try:
                db.execute(f"ALTER TABLE members ADD COLUMN {col} REAL")
            except sqlite3.OperationalError:
                pass
        try:
            db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone ON members (phone)")
        except (sqlite3.OperationalError, sqlite3.IntegrityError):
            pass
        db.commit()


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("auth_login"))
        return f(*args, **kwargs)
    return decorated


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("is_admin") and not session.get("is_user"):
            return redirect(url_for("auth_login"))
        return f(*args, **kwargs)
    return decorated


def api_key_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not API_KEY or request.headers.get("X-API-Key") != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def geocode(code_postal, ville):
    try:
        resp = requests.get(
            f"https://geo.api.gouv.fr/communes?codePostal={code_postal}&fields=nom,centre&format=json",
            timeout=5,
        )
        for commune in resp.json():
            if commune["nom"].lower() == ville.lower() and commune.get("centre"):
                coords = commune["centre"]["coordinates"]
                return coords[1], coords[0]
    except Exception:
        pass
    return None, None


@app.route("/auth/login")
def auth_login():
    state = secrets.token_urlsafe(16)
    session["auth_state"] = state
    msal_app = get_msal_app()
    auth_url = msal_app.get_authorization_request_url(
        SCOPES,
        state=state,
        redirect_uri=AZURE_REDIRECT_URI,
    )
    return redirect(auth_url)


@app.route("/auth/callback")
def auth_callback():
    if request.args.get("state") != session.get("auth_state"):
        return render_template("admin_login.html", error="État invalide. Réessayez.")

    error = request.args.get("error")
    if error:
        return render_template("admin_login.html", error=request.args.get("error_description", "Authentification échouée."))

    code = request.args.get("code")
    if not code:
        return redirect(url_for("auth_login"))

    msal_app = get_msal_app()
    result = msal_app.acquire_token_by_authorization_code(
        code,
        scopes=SCOPES,
        redirect_uri=AZURE_REDIRECT_URI,
    )

    if "error" in result:
        return render_template("admin_login.html", error=result.get("error_description", "Authentification échouée."))

    access_token = result["access_token"]
    id_token_claims = result.get("id_token_claims", {})

    user_groups = get_user_groups(access_token)
    is_admin = ADMIN_GROUP in user_groups
    is_user = USER_GROUP in user_groups

    if not is_admin and not is_user:
        return render_template("admin_login.html", error="Accès refusé. Vous n'appartenez pas à un groupe autorisé.")

    session.pop("auth_state", None)
    session["is_admin"] = is_admin
    session["is_user"] = is_user
    session["user_name"] = id_token_claims.get("name", "")
    session["user_email"] = id_token_claims.get("preferred_username", "")

    return redirect(url_for("admin"))


@app.route("/auth/logout")
def auth_logout():
    session.clear()
    post_logout = url_for("index", _external=True)
    return redirect(f"{AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri={post_logout}")


@app.route("/", methods=["GET", "POST"])
def index():
    error = None
    if request.method == "POST":
        first = request.form.get("first_name", "").strip()
        last = request.form.get("last_name", "").strip()
        date_naissance = request.form.get("date_naissance", "").strip()
        email = request.form.get("email", "").strip().lower()
        try:
            latitude = float(request.form.get("latitude", ""))
            longitude = float(request.form.get("longitude", ""))
        except (ValueError, TypeError):
            latitude = longitude = None
        phone = request.form.get("phone", "").strip()
        code_postal = request.form.get("code_postal", "").strip()
        ville = request.form.get("ville", "").strip()

        whatsapp = 1 if request.form.get("whatsapp_gazette") else 0
        newsletter = 1 if request.form.get("email_newsletter") else 0
        facebook = 1 if request.form.get("facebook_updates") else 0
        volunteer = 1 if request.form.get("volunteer_contact") else 0
        image_rights = 1 if request.form.get("image_rights") else 0
        membership_amount = int(request.form.get("membership_amount", 0) or 0)
        payment_method = request.form.get("payment_method", "").strip()

        if not all([first, last, date_naissance, email, phone, code_postal, ville]):
            error = "Tous les champs sont obligatoires."
        else:
            db = get_db()
            existing = db.execute(
                "SELECT id FROM members WHERE email = ?", (email,)
            ).fetchone()
            if existing:
                error = "Cette adresse email est déjà enregistrée."
            elif db.execute("SELECT id FROM members WHERE phone = ?", (phone,)).fetchone():
                error = "Ce numéro de téléphone est déjà enregistré."
            else:
                db.execute(
                    "INSERT INTO members (first_name, last_name, date_naissance, email, phone, code_postal, ville, whatsapp_gazette, email_newsletter, facebook_updates, volunteer_contact, image_rights, membership_amount, payment_method, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (first, last, date_naissance, email, phone, code_postal, ville, whatsapp, newsletter, facebook, volunteer, image_rights, membership_amount, payment_method, latitude, longitude),
                )
                db.commit()
                return redirect(url_for("success"))

    return render_template("index.html", error=error)


@app.route("/success")
def success():
    return render_template("success.html")


@app.route("/guide")
def guide():
    return render_template("guide.html")


@app.route("/admin")
@login_required
def admin():
    db = get_db()
    q = request.args.get("q", "").strip()
    if q:
        pattern = f"%{q}%"
        members = db.execute(
            """SELECT * FROM members
               WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
               ORDER BY joined_at DESC""",
            (pattern, pattern, pattern, pattern),
        ).fetchall()
    else:
        members = db.execute(
            "SELECT * FROM members ORDER BY joined_at DESC"
        ).fetchall()
    count = db.execute("SELECT COUNT(*) FROM members").fetchone()[0]
    return render_template("admin.html", members=members, count=count, q=q)


@app.route("/admin/export")
@admin_required
def admin_export():
    db = get_db()
    members = db.execute(
        "SELECT first_name, last_name, date_naissance, email, phone, code_postal, ville, whatsapp_gazette, email_newsletter, facebook_updates, volunteer_contact, image_rights, membership_amount, payment_method, joined_at FROM members ORDER BY last_name, first_name"
    ).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Prénom", "Nom", "Date de naissance", "Email", "Téléphone", "Code postal", "Ville", "Whatsapp Gazette", "Email Newsletter", "Facebook Updates", "Bénévolat", "Droit à l'image", "Montant adhésion", "Moyen de paiement", "Date d'inscription"])
    for m in members:
        row = list(m)
        row[7] = "Oui" if row[7] else "Non"
        row[8] = "Oui" if row[8] else "Non"
        row[9] = "Oui" if row[9] else "Non"
        row[10] = "Oui" if row[10] else "Non"
        row[11] = "Oui" if row[11] else "Non"
        writer.writerow(row)
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=membres.csv"},
    )


@app.route("/admin/export-payments")
@admin_required
def admin_export_payments():
    db = get_db()
    payments = db.execute(
        "SELECT first_name, last_name, email, membership_amount, payment_method, joined_at FROM members WHERE membership_amount > 0 ORDER BY joined_at DESC"
    ).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Prénom", "Nom", "Email", "Montant", "Moyen de paiement", "Date"])
    for p in payments:
        writer.writerow(list(p))

    output.write("\n\nRésumé par moyen de paiement:\n")
    summary = db.execute(
        "SELECT payment_method, COUNT(*), SUM(membership_amount) FROM members WHERE membership_amount > 0 GROUP BY payment_method"
    ).fetchall()
    writer = csv.writer(output)
    writer.writerow(["Moyen de paiement", "Nombre", "Total"])
    for s in summary:
        writer.writerow(list(s))

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=paiements.csv"},
    )


@app.route("/admin/delete/<int:member_id>", methods=["POST"])
@admin_required
def admin_delete(member_id):
    db = get_db()
    db.execute("DELETE FROM members WHERE id = ?", (member_id,))
    db.commit()
    return redirect(url_for("admin"))


@app.route("/admin/map")
@login_required
def admin_map():
    return render_template("admin_map.html")


@app.route("/admin/map-data")
@login_required
def admin_map_data():
    from flask import jsonify
    db = get_db()
    rows = db.execute(
        "SELECT first_name, last_name, ville, latitude, longitude FROM members WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    ).fetchall()
    return jsonify([
        {"name": f"{r['first_name']} {r['last_name']}", "ville": r["ville"], "lat": r["latitude"], "lng": r["longitude"]}
        for r in rows
    ])


@app.route("/api/members/check")
@api_key_required
def api_check_member():
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "email required"}), 400
    db = get_db()
    exists = db.execute("SELECT id FROM members WHERE email = ?", (email,)).fetchone() is not None
    return jsonify({"exists": exists})


@app.route("/api/members", methods=["POST"])
@api_key_required
def api_register_member():
    data = request.get_json(silent=True) or {}
    first = data.get("first_name", "").strip()
    last = data.get("last_name", "").strip()
    date_naissance = data.get("date_naissance", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    code_postal = data.get("code_postal", "").strip()
    ville = data.get("ville", "").strip()
    whatsapp = 1 if data.get("whatsapp_gazette") else 0
    newsletter = 1 if data.get("email_newsletter") else 0
    facebook = 1 if data.get("facebook_updates") else 0
    volunteer = 1 if data.get("volunteer_contact") else 0
    image_rights = 1 if data.get("image_rights") else 0
    membership_amount = int(data.get("membership_amount", 0) or 0)
    payment_method = data.get("payment_method", "").strip()

    if not all([first, last, date_naissance, email, phone, code_postal, ville]):
        return jsonify({"error": "Tous les champs sont obligatoires."}), 400

    db = get_db()
    if db.execute("SELECT id FROM members WHERE email = ?", (email,)).fetchone():
        return jsonify({"error": "Cette adresse email est déjà enregistrée."}), 409
    if db.execute("SELECT id FROM members WHERE phone = ?", (phone,)).fetchone():
        return jsonify({"error": "Ce numéro de téléphone est déjà enregistré."}), 409

    latitude, longitude = geocode(code_postal, ville)
    db.execute(
        "INSERT INTO members (first_name, last_name, date_naissance, email, phone, code_postal, ville, whatsapp_gazette, email_newsletter, facebook_updates, volunteer_contact, image_rights, membership_amount, payment_method, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (first, last, date_naissance, email, phone, code_postal, ville, whatsapp, newsletter, facebook, volunteer, image_rights, membership_amount, payment_method, latitude, longitude),
    )
    db.commit()
    return jsonify({"message": f"{first} {last} inscrit(e) avec succès."}), 201


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
