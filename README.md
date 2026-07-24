# SoloBBs

Plataforma premium para acompañantes: escrow P2P cripto (USDT/BTC/LTC), smart contract simulado, billetera y red de referidos.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Prisma + **PostgreSQL**
- Auth.js (NextAuth v5)
- Framer Motion + Recharts

## Arranque local

1. Copia variables de entorno:

```bash
cp .env.example .env
```

2. Levanta Postgres:

```bash
docker compose up -d
```

3. Instala, sincroniza schema y siembra:

```bash
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
| Modelo  | lucia@solobbs.com     | solobbs123 |
| Cliente | cliente@solobbs.com   | solobbs123 |

## Deploy en Render.com

1. Sube el repo a GitHub.
2. En [Render](https://dashboard.render.com) → **New** → **Blueprint**.
3. Conecta el repositorio (usa `render.yaml`).
4. Cuando cree el servicio web, define:
   - `AUTH_URL` = `https://TU-SERVICIO.onrender.com`
   - `NEXTAUTH_URL` = `https://TU-SERVICIO.onrender.com`
5. Deploy. En el primer arranque (`SEED_ON_BOOT=true`) se cargan las cuentas demo.
6. Luego puedes poner `SEED_ON_BOOT=false` para no reintentar el seed en cada restart.

### Variables

| Variable       | Origen                          |
|----------------|---------------------------------|
| `DATABASE_URL` | Postgres de Render (automático) |
| `AUTH_SECRET`  | Generado por Render             |
| `AUTH_URL`     | URL pública del servicio        |
| `NEXTAUTH_URL` | Igual que `AUTH_URL`            |

## Módulos

- Landing SoloBBs
- Galería pública `/m/[code]` + mensajes
- Billetera cripto (USDT/BTC/LTC) → pago P2P desde saldo
- Escrow con confirmación de llegada antes de liberar
- Fee plataforma 8% al liberar + comisiones de red
