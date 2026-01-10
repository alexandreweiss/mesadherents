# Association Bar Management App

Une application web moderne pour gérer les consommations et paiements du bar de votre association.

## Fonctionnalités

- 🍺 **Gestion des produits** - Boissons et nourriture avec prix
- 👥 **Comptes membres** - Suivi des soldes individuels
- 📱 **Interface mobile** - Optimisée pour smartphone et tablettes
- 💰 **Système de paiement** - Espèces, carte, virement
- 📊 **Historique** - Consultation des consommations et paiements
- 🔐 **Authentification** - Connexion sécurisée des membres
- 👨‍💼 **Interface admin** - Gestion des produits et membres

## Technologies

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes
- **Base de données**: PostgreSQL + Prisma ORM
- **Authentification**: NextAuth.js
- **UI Components**: Radix UI + shadcn/ui
- **Hébergement**: Vercel (recommandé)

## Installation

### Prérequis
- Node.js 18+
- PostgreSQL database
- npm ou yarn

### Configuration

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd mesadherents
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
```

Modifier `.env` avec vos paramètres :
```env
DATABASE_URL="postgresql://username:password@localhost:5432/mesadherents?schema=public"
NEXTAUTH_SECRET="votre-clé-secrète"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@association.com"
ADMIN_PASSWORD="motdepasse"
```

4. **Initialiser la base de données**
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. **Lancer en développement**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## Déploiement sur Vercel

1. **Push sur GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connecter à Vercel**
- Aller sur [vercel.com](https://vercel.com)
- Importer votre repo GitHub
- Ajouter les variables d'environnement dans les settings Vercel

3. **Base de données**
- Utiliser Neon, Supabase ou Vercel Postgres
- Mettre à jour `DATABASE_URL` dans Vercel
- Exécuter les migrations: `npx prisma migrate deploy`

## Utilisation

### Compte de test
- **Email**: admin@association.com
- **Mot de passe**: admin123

### Interface membre
- Sélectionner des produits dans la liste
- Consulter son solde et historique
- Effectuer des paiements

### Interface admin (à venir)
- Gérer les produits et prix
- Voir tous les membres et soldes
- Générer des rapports

## Structure du projet

```
src/
├── app/
│   ├── api/              # API Routes
│   ├── auth/             # Pages d'authentification  
│   ├── dashboard/        # Tableau de bord membre
│   └── layout.tsx        # Layout principal
├── components/           # Composants React
│   ├── ui/              # Composants UI de base
│   ├── ProductGrid.tsx  # Grille de produits
│   ├── UserBalance.tsx  # Affichage du solde
│   └── PaymentDialog.tsx # Dialog de paiement
└── lib/                 # Utilitaires
    ├── prisma.ts        # Client Prisma
    ├── auth.ts          # Configuration NextAuth
    └── utils.ts         # Fonctions utilitaires
```

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push (`git push origin feature/amelioration`)
5. Créer une Pull Request

## License

MIT