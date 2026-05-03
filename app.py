import os
import csv
import io
import sqlite3
from functools import wraps
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, Response, g
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "changeme-secret-key")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "LaPalette")
DATABASE = os.environ.get("DATABASE", "members.db")


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
                joined_at DATETIME DEFAULT (datetime('now'))
            )
        """)
        for col, default in [("code_postal", "''"), ("ville", "''"), ("whatsapp_gazette", 0), ("email_newsletter", 0), ("facebook_updates", 0), ("volunteer_contact", 0), ("image_rights", 0), ("membership_amount", 0), ("payment_method", "''")]:
            try:
                db.execute(f"ALTER TABLE members ADD COLUMN {col} NOT NULL DEFAULT {default}")
            except sqlite3.OperationalError:
                pass
        db.commit()


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


@app.route("/", methods=["GET", "POST"])
def index():
    error = None
    if request.method == "POST":
        first = request.form.get("first_name", "").strip()
        last = request.form.get("last_name", "").strip()
        email = request.form.get("email", "").strip().lower()
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

        if not all([first, last, email, phone, code_postal, ville]):
            error = "Tous les champs sont obligatoires."
        else:
            db = get_db()
            existing = db.execute(
                "SELECT id FROM members WHERE email = ?", (email,)
            ).fetchone()
            if existing:
                error = "Cette adresse email est déjà enregistrée."
            else:
                db.execute(
                    "INSERT INTO members (first_name, last_name, email, phone, code_postal, ville, whatsapp_gazette, email_newsletter, facebook_updates, volunteer_contact, image_rights, membership_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (first, last, email, phone, code_postal, ville, whatsapp, newsletter, facebook, volunteer, image_rights, membership_amount, payment_method),
                )
                db.commit()
                return redirect(url_for("success"))

    return render_template("index.html", error=error)


@app.route("/success")
def success():
    return render_template("success.html")


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    if request.method == "POST":
        if request.form.get("password") == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect(url_for("admin"))
        error = "Mot de passe incorrect."
    return render_template("admin_login.html", error=error)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin_login"))


@app.route("/admin")
@admin_required
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
        "SELECT first_name, last_name, email, phone, code_postal, ville, whatsapp_gazette, email_newsletter, facebook_updates, volunteer_contact, image_rights, membership_amount, payment_method, joined_at FROM members ORDER BY last_name, first_name"
    ).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Prénom", "Nom", "Email", "Téléphone", "Code postal", "Ville", "Whatsapp Gazette", "Email Newsletter", "Facebook Updates", "Bénévolat", "Droit à l'image", "Montant adhésion", "Moyen de paiement", "Date d'inscription"])
    for m in members:
        row = list(m)
        row[6] = "Oui" if row[6] else "Non"
        row[7] = "Oui" if row[7] else "Non"
        row[8] = "Oui" if row[8] else "Non"
        row[9] = "Oui" if row[9] else "Non"
        row[10] = "Oui" if row[10] else "Non"
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
    
    # Add summary statistics
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


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
