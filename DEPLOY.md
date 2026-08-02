# Deploy SoloBBs — GitHub + Render + Hostinger VPS + Cloudflare

Arquitectura recomendada:

```text
Usuario → Cloudflare (DNS/SSL/CDN) → Render (Next.js)
                                         ↓
                              Hostinger VPS (PostgreSQL)
```

> “CloudFlyer” = **Cloudflare**.

---

## 0. Requisitos

- Cuenta [GitHub](https://github.com)
- Cuenta [Render](https://dashboard.render.com)
- VPS Hostinger con acceso root/SSH
- Dominio en Cloudflare (o nameservers apuntando a Cloudflare)
- Docker (opcional, solo para Postgres local)

---

## 1. Base de datos en Hostinger VPS (PostgreSQL)

Conéctate por SSH al VPS y ejecuta:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Usuario y DB
sudo -u postgres psql <<'SQL'
CREATE USER solobbs WITH PASSWORD 'CAMBIA_ESTA_CLAVE_FUERTE';
CREATE DATABASE solobbs OWNER solobbs;
GRANT ALL PRIVILEGES ON DATABASE solobbs TO solobbs;
\c solobbs
GRANT ALL ON SCHEMA public TO solobbs;
SQL
```

### Escucha remota (para que Render pueda conectar)

Edita `postgresql.conf` (ruta típica `/etc/postgresql/*/main/postgresql.conf`):

```conf
listen_addresses = '*'
```

Edita `pg_hba.conf`:

```conf
# Solo IPs de Render (mejor) o, temporalmente, con SSL:
hostssl all all 0.0.0.0/0 scram-sha-256
```

Reinicia:

```bash
sudo systemctl restart postgresql
```

Abre el puerto **5432** en el firewall del VPS **solo** si es necesario. Ideal: restringir a rangos de salida de Render o usar un túnel. No dejes Postgres abierto al mundo sin contraseña fuerte + SSL.

### Connection string

```text
postgresql://solobbs:CAMBIA_ESTA_CLAVE_FUERTE@IP_O_HOSTNAME_VPS:5432/solobbs?sslmode=require
```

Si aún no tienes SSL en Postgres, usa `sslmode=prefer` o `disable` solo mientras pruebas (no recomendado en producción).

Prueba desde tu PC:

```bash
psql "postgresql://solobbs:...@TU_IP:5432/solobbs"
```

---

## 2. Subir código a GitHub

El remoto ya está configurado como `origin` → `https://github.com/oebenderbtc/solobbs-platform.git`.

```bash
git add -A
git status   # verifica que NO haya .env
git commit -m "Prepare deploy: Postgres, Render blueprint, Hostinger + Cloudflare docs"
git push -u origin master
```

---

## 3. Deploy en Render.com

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Conecta el repo `solobbs-platform`
3. Acepta el `render.yaml` (servicio web **sin** DB de Render)
4. En Environment define:

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string de Hostinger (arriba) |
| `AUTH_URL` | `https://TU-SERVICIO.onrender.com` (luego tu dominio) |
| `NEXTAUTH_URL` | Igual que `AUTH_URL` |
| `AUTH_SECRET` | (auto o genera uno largo) |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ON_BOOT` | `true` solo el **primer** deploy; luego `false` |
| `TRON_ESCROW_DEMO` | `false` |
| `TRON_AUTO_SPLIT_ONCHAIN` | `true` si quieres splits on-chain |
| `WALLET_ENC_KEY` | secreto largo (cifrado de wallets) |
| Wallets / TronGrid / Sumsub | según `.env.example` |

5. Deploy y espera el build (`prisma db push` crea tablas en el VPS).

URL temporal: `https://solobbs.onrender.com` (o el nombre que elijas).

---

## 4. Dominio con Cloudflare

1. En Cloudflare → tu dominio → **DNS** → Add record:
   - **Type:** `CNAME`
   - **Name:** `@` o `www`
   - **Target:** `TU-SERVICIO.onrender.com`
   - **Proxy:** ON (nube naranja) o OFF al principio para depurar

2. En Render → tu Web Service → **Settings** → **Custom Domains** → añade `tudominio.com` y `www.tudominio.com`.

3. SSL:
   - Cloudflare: **SSL/TLS** → modo **Full (strict)** cuando Render ya tenga certificado.
   - Si hay error de certificado al inicio, usa **Full** un rato y luego **Full (strict)**.

4. Actualiza en Render:
   - `AUTH_URL=https://tudominio.com`
   - `NEXTAUTH_URL=https://tudominio.com`
   - Webhook Sumsub: `https://tudominio.com/api/kyc/webhook`

5. Redeploy o reinicia el servicio.

---

## 5. Checklist post-deploy

- [ ] Abre el dominio y carga la landing
- [ ] Login admin / modelo / cliente (si hiciste seed)
- [ ] Admin → Ajustes: wallets de empresa y gas
- [ ] `SEED_ON_BOOT=false`
- [ ] Postgres del VPS no acepta conexiones anónimas
- [ ] Backups automáticos del VPS (Hostinger snapshots o `pg_dump` cron)

---

## Local con PostgreSQL (Docker)

```bash
docker compose up -d
# En .env:
# DATABASE_URL="postgresql://solobbs:solobbs@localhost:5432/solobbs"
npx prisma db push
npm run db:seed
npm run dev
```

---

## Problemas frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Build falla en `prisma db push` | VPS no acepta conexiones remotas / firewall / `DATABASE_URL` mal |
| Auth redirect raro | `AUTH_URL` / `NEXTAUTH_URL` no coinciden con el dominio |
| 525 Cloudflare | SSL mode incorrecto (usa Full / Full strict) |
| Estados/galería vacíos | Seed no corrió o assets no están en el repo |
