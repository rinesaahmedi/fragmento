# Deploy in Netlify

Ky projekt deploy-ohet nga folderi `frontend`, sepse aty ndodhet aplikacioni `Next.js`.

## 1. Pergatit databazen

Ky projekt perdor `PostgreSQL` permes `Prisma`.

Per zhvillim lokal mund te perdoresh:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fragmento?schema=public"
```

Por nje faqe e hostuar ne `Netlify` nuk mund te lidhet me `localhost` ne kompjuterin tend. `localhost` ne Netlify i referohet servereve te Netlify, jo PC-se tende.

Opsionet reale jane:

1. Te perdoresh nje `PostgreSQL` te hostuar publikisht, p.sh. `Neon`, `Supabase`, `Railway` ose nje VPS.
2. Te hostosh databazen ne serverin tend me IP publike, SSL dhe port forwarding. Kjo eshte me e veshtire dhe jo ideale per prodhim nese nuk ke server te qendrueshem.

Per Netlify rekomandohet opsioni 1.

## 2. Variablat e mjedisit ne Netlify

Ne `Site configuration -> Environment variables`, shto:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `N8N_WEBHOOK_URL` (nese e perdor)

Mos ngarko `.env` ne Git.

## 3. Lidhu me GitHub/GitLab

1. Beje `push` projektin ne Git.
2. Hape `Netlify`.
3. `Add new site` -> `Import an existing project`.
4. Zgjidh repository-n.
5. Netlify do perdore automatikisht:
   - Base directory: `frontend`
   - Build command: `npm run build`

## 4. Domain falas

Pas deploy-it, Netlify jep automatikisht nje domain falas si:

```text
https://emri-yt.netlify.app
```

Mund ta ndryshosh te:

`Site configuration -> Domain management -> Options -> Edit site name`

## 5. Migrimet e databazes

Pasi databaza publike te jete krijuar, lokalishte ose ne server ekzekuto:

```bash
cd frontend
npx prisma migrate deploy
node prisma/seed.js
```

Per `seed` duhen edhe:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 6. Cfare nuk funksionon me DB lokale ne PC

Kjo nuk funksionon ne prodhim:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fragmento?schema=public"
```

kur faqja eshte ne `Netlify`, sepse `localhost` nuk eshte kompjuteri yt.

## 7. Rekomandimi praktik

Kombinimi me i thjeshte:

- `Netlify` per frontend + API routes te `Next.js`
- `Neon Postgres` ose `Supabase Postgres` per databazen

Pastaj vendos URL-ne e databazes se hostuar ne `DATABASE_URL` te Netlify.

## 8. Siguria

Nese ke futur kredenciale reale `SMTP` ne ndonje `.env`, rrotulloji ato menjehere para deploy-it.
