# AnimeStream Pro — Render

Proyecto Node.js + Express para desplegar en Render. El catálogo utiliza AniList GraphQL para títulos, portadas, sinopsis, géneros y estado de emisión. No incluye ni scrapea enlaces de streaming de Zoro.

## Desplegar desde Android

1. Descarga y descomprime `AnimeStreamPro_Render.zip`.
2. Sube todos los archivos de la carpeta a un repositorio nuevo de GitHub.
3. En Render elige **New + → Web Service** y conecta ese repositorio.
4. Configura:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free
5. Pulsa **Deploy** y abre la URL `https://tu-servicio.onrender.com`.

También puedes usar el archivo `render.yaml` como configuración Blueprint.

## Rutas disponibles

- `GET /api/health`
- `GET /api/trending`
- `GET /api/recent`
- `GET /api/search?q=naruto`
- `GET /api/anime/1`
- `GET /api/provider/search?q=naruto`

## Proveedor de episodios

No se configura un proveedor de episodios por defecto. Si tienes una API de la que estés autorizado a usar el contenido, configura `ANIME_PROVIDER_API` en Environment de Render. La API debe aceptar `GET /search?q=...` y devolver `{ "results": [{ "id": "...", "title": "...", "url": "..." }] }` o un array equivalente.

Los datos de AniList sirven para el catálogo informativo; no prueban que una serie esté disponible en un proveedor externo. El frontend distingue el catálogo de información de las fuentes de episodios conectadas.
