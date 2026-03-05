# Sync Proxy (sin token en celulares)

Este proxy recibe capturas desde la app y escribe en GitHub usando un token guardado como secreto del servidor.

## Cloudflare Worker (rápido)

1. Crear Worker en Cloudflare y pegar `cloudflare-worker.js`.
2. Agregar secret `GITHUB_TOKEN` con permiso de escritura al repo.
3. Publicar Worker y copiar URL HTTPS.
4. En la app, abrir **Configuración técnica** y pegar la URL en **URL sincronización central**.

Desde ese momento, los celulares no usan token.
