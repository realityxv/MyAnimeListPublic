const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const ANILIST_URL = "https://graphql.anilist.co";
const PROVIDER_API = (process.env.ANIME_PROVIDER_API || "").replace(/\/$/, "");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function anilist(query, variables = {}) {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message || "Error de AniList");
  return payload.data;
}

const MEDIA_FIELDS = `
  id idMal title { romaji english native userPreferred }
  description(asHtml: false) coverImage { extraLarge large }
  bannerImage genres averageScore episodes status season seasonYear
  format isAdult siteUrl
`;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "AnimeStream Pro", providerConfigured: Boolean(PROVIDER_API) });
});

app.get("/api/trending", async (_req, res) => {
  try {
    const data = await anilist(`
      query {
        Page(page: 1, perPage: 24) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`);
    res.json({ results: data.Page.media });
  } catch (e) { res.status(502).json({ error: "No se pudo cargar tendencias", detail: e.message }); }
});

app.get("/api/recent", async (_req, res) => {
  try {
    const data = await anilist(`
      query {
        Page(page: 1, perPage: 24) {
          media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`);
    res.json({ results: data.Page.media });
  } catch (e) { res.status(502).json({ error: "No se pudieron cargar los estrenos", detail: e.message }); }
});

app.get("/api/search", async (req, res) => {
  const search = String(req.query.q || "").trim();
  if (!search) return res.json({ results: [] });
  try {
    const data = await anilist(`
      query ($search: String) {
        Page(page: 1, perPage: 30) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`, { search });
    res.json({ results: data.Page.media });
  } catch (e) { res.status(502).json({ error: "Falló la búsqueda", detail: e.message }); }
});

app.get("/api/anime/:id", async (req, res) => {
  try {
    const data = await anilist(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          relations { edges { relationType node { id type title { romaji english } coverImage { large } } } }
        }
      }`, { id: Number(req.params.id) });
    if (!data.Media) return res.status(404).json({ error: "Anime no encontrado" });
    res.json(data.Media);
  } catch (e) { res.status(502).json({ error: "No se pudieron cargar los detalles", detail: e.message }); }
});

/*
 * Adaptador opcional para un proveedor autorizado.
 * Configura ANIME_PROVIDER_API en Render con la URL base de una API que tengas
 * permiso de usar. Se espera GET {BASE}/search?q=... y una respuesta JSON
 * con { results: [{ id, title, url }] } o directamente un array.
 * Este proyecto no scrapea Zoro ni genera enlaces de streaming no autorizados.
 */
app.get("/api/provider/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ configured: Boolean(PROVIDER_API), results: [] });
  if (!PROVIDER_API) {
    return res.json({
      configured: false,
      results: [],
      message: "No hay proveedor de episodios configurado. El catálogo informativo sigue funcionando."
    });
  }
  try {
    const url = `${PROVIDER_API}/search?q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error(`Proveedor respondió ${response.status}`);
    const data = await response.json();
    const results = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
    res.json({ configured: true, results });
  } catch (e) {
    res.status(502).json({ configured: true, results: [], error: "No se pudo consultar el proveedor", detail: e.message });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AnimeStream Pro escuchando en puerto ${PORT}`);
});