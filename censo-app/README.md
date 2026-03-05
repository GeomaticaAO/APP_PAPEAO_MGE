# Sistema de Censo Offline (40 celulares)

Este proyecto incluye:
- `backend/`: API con Node.js + PostgreSQL.
- `mobile/`: App móvil (Expo React Native) que funciona offline y sincroniza cuando hay internet/WiFi.

## 1) Flujo funcional

1. En la app, el capturista ingresa **Clave Vivienda**.
2. La app consulta al backend y trae datos del padrón base importado desde `TOTAL_JEFAS FAMILIA.xlsx`.
3. El capturista corrige datos incorrectos y/o completa campos nuevos:
   - Nombre
   - Edad
   - Teléfono
   - Calle
   - Número
   - Manzana
   - Lote
   - CURP
4. Guarda el registro en el celular (offline).
5. Cuando haya internet/WiFi, pulsa **Sincronizar** y se envían todos los pendientes.

## 2) Requisitos

- Node.js 20+
- Docker Desktop (para levantar PostgreSQL sin complicaciones)
- Expo Go (en Android/iOS)

## 3) Levantar base de datos (PostgreSQL)

Desde carpeta `censo-app/`:

```powershell
docker compose up -d
```

## 4) Backend (API)

Desde carpeta `censo-app/backend/`:

```powershell
npm install
npm run db:init
npm run import:excel
npm run dev
```

Notas:
- `npm run import:excel` toma por defecto `TOTAL_JEFAS FAMILIA.xlsx` ubicado dos niveles arriba (como en tu estructura actual).
- Si cambia la ruta, puedes pasarla manual:

```powershell
npm run import:excel -- "C:\ruta\a\TOTAL_JEFAS FAMILIA.xlsx"
```

## 5) App móvil

1. En `mobile/app.json`, editar:
- `expo.extra.apiUrl` con la IP de tu PC en la red local, por ejemplo: `http://192.168.1.50:4000`
- `expo.extra.apiKey` con la misma clave que `SYNC_API_KEY` del backend.

2. Desde carpeta `censo-app/mobile/`:

```powershell
npm install
npm run start
```

3. Abrir con Expo Go desde cada celular.

## 6) Operación con 40 celulares

- Todos los celulares usan la misma `apiUrl` (IP del servidor en la red WiFi de oficina).
- Cada celular puede consultar por clave vivienda, corregir datos y capturar offline en campo.
- Al regresar a zona con internet o WiFi, cada usuario presiona **Sincronizar**.
- El backend hace `upsert` por `local_id` y consolida en una sola base central los envíos de los 40 celulares.

## 6.1) Opción con GitHub (sin servidor propio)

Sí se puede usar GitHub como repositorio de archivos, pero para 40 celulares **no conviene** que todos escriban el mismo Excel al mismo tiempo.

Estrategia recomendada:
- Cada celular sube un archivo CSV independiente (por fecha/dispositivo) a una carpeta del repo, por ejemplo `capturas/device-xx/`.
- Un proceso de consolidación (manual o automatizado con GitHub Actions) une todos los CSV en un solo archivo maestro para Excel.

En este proyecto, la demo web quedó en modo automático:
- Carga base por defecto desde el repositorio `GeomaticaAO/APP_PAPEAO_MGE`.
- La fuente oficial puede seguir siendo `TOTAL_JEFAS FAMILIA.xlsx`.
- Un workflow de GitHub (`preparar-base-desde-xlsx.yml`) genera automáticamente `TOTAL_JEFAS_FAMILIA.csv` y `TOTAL_JEFAS_FAMILIA.json` para lectura en la app.
- Guarda una copia local de la base para trabajar offline.
- Al detectar internet/WiFi, intenta enviar pendientes automáticamente a `capturas/<device-id>/<fecha>.csv`.
- El workflow `consolidar-capturas.yml` se ejecuta automáticamente y genera `salidas/CONSOLIDADO_CSV.csv` y `salidas/CONSOLIDADO.xlsx`.

## 7) Exportar resultados a Excel

Desde `censo-app/backend/`:

```powershell
npm run export:excel
```

Genera `CENSO_CAMPO_EXPORT.xlsx` con los datos de campo sincronizados.

## 8) Endpoints principales

- `GET /api/viviendas/:clave` → busca clave vivienda en censo base.
- `POST /api/sync` → recibe lote de registros capturados offline.
- `GET /health` → estado de API + DB.

## 9) Siguiente mejora recomendada

- Agregar autenticación por usuario (capturista) y tablero web para monitorear cuántos registros ha enviado cada celular.
