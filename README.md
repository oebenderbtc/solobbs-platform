# SoloBBs

Plataforma premium para acompañantes: escrow P2P cripto (USDT TRC20), billetera, red de referidos y KYC (Sumsub).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Prisma + **PostgreSQL**
- Auth.js (NextAuth v5)
- TronWeb (depósitos / retiros / splits)

## Arranque local

```bash
cp .env.example .env
docker compose up -d          # Postgres local
# DATABASE_URL=postgresql://solobbs:solobbs@localhost:5432/solobbs
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cuentas demo

| Rol     | Email                 | Password   |
|---------|-----------------------|------------|
| Admin   | admin@solobbs.com     | solobbs123 |
| Modelo  | sofia@solobbs.com     | solobbs123 |
| Cliente | cliente@solobbs.com   | solobbs123 |

## Producción (GitHub → Render → Hostinger → Cloudflare)

Guía completa: **[DEPLOY.md](./DEPLOY.md)**

Resumen:

1. PostgreSQL en tu **VPS Hostinger**
2. Push a **GitHub**
3. **Render** Blueprint (`render.yaml`) con `DATABASE_URL` del VPS
4. Dominio en **Cloudflare** (CNAME → Render) + Custom Domain en Render

## Variables importantes

Ver `.env.example`. En producción no subas `.env` al repo.
