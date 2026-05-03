import os
import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Mes Adhérents", host="0.0.0.0", port=8000)

FLASK_API_URL = os.environ.get("FLASK_API_URL", "http://localhost/api")
API_KEY = os.environ.get("API_KEY", "")

HEADERS = {"X-API-Key": API_KEY}


@mcp.tool()
def register_member(
    first_name: str,
    last_name: str,
    date_naissance: str,
    email: str,
    phone: str,
    code_postal: str,
    ville: str,
    whatsapp_gazette: bool = False,
    email_newsletter: bool = False,
    facebook_updates: bool = False,
    volunteer_contact: bool = False,
    image_rights: bool = False,
    membership_amount: int = 0,
    payment_method: str = "",
) -> str:
    """
    Register a new member in the association.
    date_naissance must be in YYYY-MM-DD format.
    payment_method is one of: Chèque, Espèces, Carte (or empty).
    """
    resp = httpx.post(
        f"{FLASK_API_URL}/members",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "date_naissance": date_naissance,
            "email": email,
            "phone": phone,
            "code_postal": code_postal,
            "ville": ville,
            "whatsapp_gazette": whatsapp_gazette,
            "email_newsletter": email_newsletter,
            "facebook_updates": facebook_updates,
            "volunteer_contact": volunteer_contact,
            "image_rights": image_rights,
            "membership_amount": membership_amount,
            "payment_method": payment_method,
        },
        headers=HEADERS,
        timeout=15,
    )
    data = resp.json()
    if resp.status_code == 201:
        return data["message"]
    return f"Erreur {resp.status_code}: {data.get('error', 'Erreur inconnue')}"


@mcp.tool()
def check_email(email: str) -> str:
    """Check if an email address is already registered."""
    resp = httpx.get(
        f"{FLASK_API_URL}/members/check",
        params={"email": email},
        headers=HEADERS,
        timeout=10,
    )
    data = resp.json()
    if data.get("exists"):
        return f"L'email {email} est déjà enregistré."
    return f"L'email {email} est disponible."


if __name__ == "__main__":
    mcp.run(transport="sse")
