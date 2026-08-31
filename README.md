# BROT74

Sitio de e-commerce para [BROT74](https://brot74.com), panadería artesanal: catálogo por fecha de entrega, carrito con reserva de stock, checkout por transferencia bancaria, lista de espera cuando no hay entregas disponibles, y un panel de administración para gestionar productos, stock, pedidos y entregas.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19** + **TypeScript**
- **[Tailwind CSS 4](https://tailwindcss.com)**
- **[Prisma](https://www.prisma.io)** + **PostgreSQL** ([Neon](https://neon.tech), serverless)
- **[Vercel Blob](https://vercel.com/docs/storage/vercel-blob)** para imágenes de producto
- Autenticación de admin con JWT ([`jose`](https://github.com/panva/jose)) en cookie `httpOnly`
- **[Vitest](https://vitest.dev)** para tests de integración (API routes contra una base Postgres real)
- Deploy en **Vercel**, con un cron job (`/api/cron/cleanup`) para liberar reservas de carrito vencidas

## Funcionalidad

- Catálogo de productos agrupado por fecha de entrega (delivery slots), con stock por fecha
- Flujo de compra con navegación por URL (`useSearchParams`) para que "atrás" del navegador funcione en todo el checkout
- Reserva temporal de stock al agregar al carrito, liberada automáticamente si no se completa la compra
- Checkout por transferencia bancaria (sin pasarela de pago)
- Lista de espera (`/waitlist`) cuando no hay una fecha de entrega activa, con aviso manual por WhatsApp desde el admin
- Panel `/admin`: productos, stock por fecha, pedidos, fechas de entrega y waitlist

## Desarrollo local

### Requisitos

- Node 20+
- Una base PostgreSQL accesible (Neon, Docker local, o Postgres nativo)

### Setup

```bash
npm install
cp .env.example .env   # completar con tus propios valores, ver abajo
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### Cambios de schema

El proyecto usa [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) con migraciones versionadas (`prisma/migrations/`) — **no** `prisma db push` contra una base real. Para cambiar `schema.prisma`:

```bash
# 1. Editá prisma/schema.prisma
# 2. Generá y aplicá la migración contra tu base local:
npx prisma migrate dev --name descripcion-del-cambio
# 3. Commiteá la carpeta prisma/migrations/<timestamp>_descripcion-del-cambio/ generada
```

El build de producción corre `prisma migrate deploy` (ver [Scripts](#scripts)), que aplica cualquier migración pendiente de forma no interactiva en el próximo deploy — sin ejecutar `db push --accept-data-loss` contra la base real.

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL (pooled) |
| `DIRECT_URL` | Misma base sin pooler — la usan los comandos de Prisma Migrate |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin` |
| `JWT_SECRET` | Secreto para firmar la cookie de sesión del admin |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para subir imágenes de producto |
| `CRON_SECRET` | Protege el endpoint `/api/cron/cleanup` |
| `WHATSAPP_PHONE` / `WHATSAPP_APIKEY` | Envío de mensajes de WhatsApp (waitlist) |
| `NEXT_PUBLIC_ALIAS` / `NEXT_PUBLIC_CVU` / `NEXT_PUBLIC_CUIT` / `NEXT_PUBLIC_TITULAR` | Datos de la cuenta bancaria mostrados en el checkout por transferencia |
| `NEXT_PUBLIC_WHATSAPP` | Número de WhatsApp mostrado en el sitio |
| `NEXT_PUBLIC_BASE_URL` | URL base del sitio |

Ninguna de estas variables tiene un valor por defecto en el código: si falta alguna, la app falla explícitamente en vez de usar un fallback inseguro.

### Tests

Los tests de integración corren contra una base Postgres real (no mocks de Prisma).

```bash
cp .env.test.example .env.test   # completar con tus propios valores de test
npm run test:db:up               # levanta Postgres vía Docker
npm test
npm run test:db:down
```

### Seed

```bash
npm run db:seed
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + build de Next |
| `npm run lint` | ESLint |
| `npm test` | Tests de integración (Vitest) |
| `npm run db:seed` | Carga datos de ejemplo |

## Licencia

Todos los derechos reservados — ver [LICENSE](LICENSE). El código se publica como muestra de portfolio, no está disponible para reutilización.
