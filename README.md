# Mes Adhérents — Guide d'utilisation

## Inscription d'un membre

Ouvrez l'application dans votre navigateur et remplissez le formulaire :

1. **Prénom et Nom**
2. **Date de naissance**
3. **Adresse email** — doit être unique, un email déjà enregistré sera refusé
4. **Code postal** — saisissez 5 chiffres, la liste des villes se charge automatiquement
5. **Ville** — choisissez dans la liste
6. **Téléphone** — doit être unique, un numéro déjà enregistré sera refusé

Cochez ensuite les options souhaitées :

- **Recevoir l'actualité** — Whatsapp, Email et/ou Facebook
- **Bénévolat** — si le membre souhaite être contacté pour aider
- **Droit à l'image** — autorisation d'utiliser photos/vidéos du membre

Indiquez enfin le **montant de l'adhésion** et le **moyen de paiement** (Chèque, Espèces ou Carte).

Cliquez sur **S'inscrire**. Une page de confirmation s'affiche en cas de succès.

---

## Espace administrateur

Accessible à l'adresse `/admin`. La connexion se fait via votre compte Microsoft (Entra ID).

### Niveaux d'accès

| Groupe Entra ID | Accès |
|---|---|
| `gs-mesadherents-admin` | Consultation, export CSV, suppression |
| `gs-mesadherents-user` | Consultation uniquement |

### Actions disponibles

| Action | Description | Rôle requis |
|---|---|---|
| **Rechercher** | Cherchez par nom, prénom, email ou téléphone | Tous |
| **Exporter Membres** | Télécharge la liste complète en CSV | Admin |
| **Exporter Paiements** | Télécharge les paiements avec totaux par moyen | Admin |
| **Supprimer** | Supprime définitivement un membre | Admin |

---

## Configuration (déploiement)

Copiez `.env.example` en `.env` et renseignez les valeurs :

```
SECRET_KEY=        # clé secrète Flask (chaîne aléatoire)
DATABASE=          # chemin vers la base SQLite (ex: /data/members.db)
AZURE_CLIENT_ID=   # ID de l'application Entra ID
AZURE_TENANT_ID=   # ID du tenant Entra ID
AZURE_CLIENT_SECRET= # secret client de l'application
AZURE_REDIRECT_URI=  # URI de callback (ex: http://localhost/auth/callback)
```

### Permissions API requises (Entra ID)

L'application Entra ID doit avoir la permission déléguée **`GroupMember.Read.All`** avec consentement administrateur accordé.

### Lancement

```bash
docker compose up --build -d
```
