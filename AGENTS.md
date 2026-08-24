<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing

- No unit tests in this project, and none planned — `tests/integration/**` (Vitest + Postgres real, sin mocks de Prisma) ya cubre la lógica pura de `lib/**` indirectamente a través de los endpoints que la usan. No agregar una capa de unit tests separada.
- Todo cambio de comportamiento en `app/api/**` lleva, como mínimo, un test de integración **positivo** (camino feliz) y uno **negativo** (rechazo/error/caso límite) en `tests/integration/`, en el mismo PR del fix o feature.
- La UI (componentes en `app/**`/`components/**`) se valida manualmente por ahora — no hay Playwright ni tests de UI todavía.
