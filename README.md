# teckio_status

Página de status pública de Teckio (`status.teckio.mx`). El monitoreo lo hace **UptimeRobot**;
esta página solo muestra su estado con el diseño de Teckio. Vive en **Vercel**, fuera del
servidor de Teckio, para que siga arriba aunque el servidor se caiga.

- `index.html`: la página (sin dependencias; se actualiza sola cada minuto).
- `api/estado.js`: función de Vercel que consulta UptimeRobot con la clave de la variable
  de entorno `UPTIMEROBOT_API_KEY` (la clave nunca llega al navegador). Vercel guarda la
  respuesta 60 s.

La página reconoce los servicios por el **nombre del monitor** en UptimeRobot y los muestra
en este orden, con su descripción e icono: `Frontend`, `ERP`, `SSO` y `Documentación` (en
`SERVICIOS` de `index.html`). Un monitor con otro nombre aparece al final, sin descripción.

## Publicar en Vercel

1. Subir este repo a GitHub e importarlo en Vercel (*Add New → Project*). No necesita build:
   Framework Preset **Other**.
2. En *Settings → Environment Variables*, agregar `UPTIMEROBOT_API_KEY` con la
   **Read-only API key** de UptimeRobot (*Integrations & API*). Volver a desplegar.
3. En *Settings → Domains*, agregar `status.teckio.mx` y crear en el DNS de `teckio.mx` el
   registro CNAME que indique Vercel.

## Monitores en UptimeRobot (el nombre debe ser exactamente este)

| Nombre del monitor | URL                                 |
|--------------------|-------------------------------------|
| `Frontend`         | `https://<dominio>/healthz`         |
| `ERP`              | `https://<dominio>/api/health`      |
| `SSO`              | `https://<dominio>/sso/health`      |
| `Documentación`    | `https://<dominio>/docs-api/health` |

Recomendado: marcar caída tras 2–3 fallas seguidas, para que los deploys no cuenten.
