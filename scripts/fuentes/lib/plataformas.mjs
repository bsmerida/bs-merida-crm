// Conectores de SOLO LECTURA para las carpetas de los proveedores.
// Google Drive: Drive API v3 con GOOGLE_API_KEY (carpetas con enlace público).
// Dropbox: API oficial con el enlace compartido (shared_link).
// Ninguna función escribe, mueve ni borra nada en Drive o Dropbox.

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_FOLDER = "application/vnd.google-apps.folder";
const DRIVE_SHORTCUT = "application/vnd.google-apps.shortcut";

// "/" dentro del nombre de una carpeta ("ROSAMORA / CASAS / CONKAL") rompería las
// rutas; se cambia por una barra ancha que se ve igual.
export const segmento = (nombre) => String(nombre).replace(/\//g, "／").trim();
export const unirRuta = (...partes) => partes.filter(Boolean).join("/");

export function driveFolderId(url) {
  const m = String(url).match(/\/folders\/([A-Za-z0-9_-]{10,})/) || String(url).match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (!m) throw new Error("El enlace de Drive no es una carpeta");
  return m[1];
}

// Deja solo lo necesario del enlace de Dropbox (rlkey es obligatorio para abrirlo).
export function dropboxSharedUrl(url) {
  const u = new URL(url);
  if (!u.hostname.endsWith("dropbox.com")) throw new Error("El enlace no es de Dropbox");
  const rlkey = u.searchParams.get("rlkey");
  return `${u.origin}${u.pathname}${rlkey ? `?rlkey=${rlkey}` : ""}`;
}

const EXT_MIME = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  heic: "image/heic", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kmz: "application/vnd.google-earth.kmz",
};
export const mimePorNombre = (nombre) => EXT_MIME[String(nombre).split(".").pop()?.toLowerCase()] || "application/octet-stream";

async function conReintentos(fn, intentos = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= intentos || e.noReintentar) throw e;
      await new Promise(r => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

// ── Google Drive ────────────────────────────────────────────────────────────
async function driveGet(url, fetchImpl) {
  return conReintentos(async () => {
    const res = await fetchImpl(url);
    if (res.ok) return res;
    let detalle = "";
    try { detalle = (await res.json())?.error?.message || ""; } catch { /* sin cuerpo */ }
    const err = new Error(
      res.status === 404 ? "Carpeta no encontrada o sin acceso público (compártela con 'cualquier persona con el enlace')"
      : res.status === 403 ? `Drive negó el acceso: ${detalle || "revisa la API key"}`
      : `Drive respondió ${res.status} ${detalle}`.trim());
    err.noReintentar = res.status === 404 || res.status === 400 || (res.status === 403 && !/rate|quota/i.test(detalle));
    throw err;
  });
}

export async function listarDrive(folderId, apiKey, { fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("Falta GOOGLE_API_KEY");
  const archivos = [];
  const visitadas = new Set();
  const cola = [{ id: folderId, ruta: "" }];
  while (cola.length) {
    const { id, ruta } = cola.shift();
    if (visitadas.has(id)) continue;
    visitadas.add(id);
    let pageToken = "";
    do {
      const q = new URLSearchParams({
        q: `'${id}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,shortcutDetails)",
        pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true", key: apiKey,
      });
      if (pageToken) q.set("pageToken", pageToken);
      const data = await (await driveGet(`${DRIVE_API}?${q}`, fetchImpl)).json();
      for (const f of data.files || []) {
        const esAtajo = f.mimeType === DRIVE_SHORTCUT;
        const mime = esAtajo ? f.shortcutDetails?.targetMimeType : f.mimeType;
        const realId = esAtajo ? f.shortcutDetails?.targetId : f.id;
        if (!realId) continue;
        if (mime === DRIVE_FOLDER) { cola.push({ id: realId, ruta: unirRuta(ruta, segmento(f.name)) }); continue; }
        archivos.push({
          archivo_id: realId, nombre: f.name, ruta, mime,
          modificado: f.modifiedTime || null,
          tamano: f.size != null ? Number(f.size) : null,
          url: f.webViewLink || `https://drive.google.com/file/d/${realId}/view`,
        });
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken);
  }
  return archivos;
}

// PDF de un archivo. Los documentos de Google (Docs/Sheets/Slides) se exportan a PDF.
export async function descargarDrive(archivo, apiKey, { fetchImpl = fetch } = {}) {
  const nativo = String(archivo.mime || "").startsWith("application/vnd.google-apps.");
  const url = nativo
    ? `${DRIVE_API}/${archivo.archivo_id}/export?mimeType=application/pdf&key=${apiKey}`
    : `${DRIVE_API}/${archivo.archivo_id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
  const res = await driveGet(url, fetchImpl);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: nativo ? "application/pdf" : archivo.mime };
}

// Hoja de cálculo compartida con enlace (Excel subido o Google Sheets) como .xlsx.
export async function descargarHojaDrive(url, apiKey, { fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("Falta GOOGLE_API_KEY");
  const m = String(url).match(/\/d\/([A-Za-z0-9_-]{10,})/) || String(url).match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (!m) throw new Error("El enlace del Excel no es un archivo de Drive");
  const meta = await (await driveGet(`${DRIVE_API}/${m[1]}?fields=mimeType&supportsAllDrives=true&key=${apiKey}`, fetchImpl)).json();
  const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const res = await driveGet(meta.mimeType === "application/vnd.google-apps.spreadsheet"
    ? `${DRIVE_API}/${m[1]}/export?mimeType=${encodeURIComponent(xlsx)}&key=${apiKey}`
    : `${DRIVE_API}/${m[1]}?alt=media&supportsAllDrives=true&key=${apiKey}`, fetchImpl);
  return Buffer.from(await res.arrayBuffer());
}

// Imagen reducida (JPEG) generada por Drive; ancho en px.
export async function miniaturaDrive(archivo, ancho, { fetchImpl = fetch } = {}) {
  const res = await conReintentos(async () => {
    const r = await fetchImpl(`https://drive.google.com/thumbnail?id=${archivo.archivo_id}&sz=w${ancho}`);
    const tipo = r.headers.get("content-type") || "";
    if (!r.ok || !tipo.startsWith("image/")) {
      const e = new Error(`Drive no generó la miniatura (${r.status})`); e.noReintentar = r.status === 404; throw e;
    }
    return r;
  });
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: (res.headers.get("content-type") || "image/jpeg").split(";")[0] };
}

// ── Dropbox ─────────────────────────────────────────────────────────────────
// El encabezado Dropbox-API-Arg solo acepta ASCII: los acentos van escapados.
export const dropboxArg = (obj) => JSON.stringify(obj).replace(/[\u007f-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

// Con refresh token (recomendado) pide un access token nuevo; si no, usa el fijo.
export async function tokenDropbox(env = process.env, { fetchImpl = fetch } = {}) {
  if (env.DROPBOX_REFRESH_TOKEN && env.DROPBOX_APP_KEY && env.DROPBOX_APP_SECRET) {
    const res = await fetchImpl("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token", refresh_token: env.DROPBOX_REFRESH_TOKEN,
        client_id: env.DROPBOX_APP_KEY, client_secret: env.DROPBOX_APP_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`Dropbox no renovó el token (${res.status})`);
    return (await res.json()).access_token;
  }
  if (env.DROPBOX_ACCESS_TOKEN) return env.DROPBOX_ACCESS_TOKEN;
  throw new Error("Falta DROPBOX_REFRESH_TOKEN (+ APP_KEY/APP_SECRET) o DROPBOX_ACCESS_TOKEN");
}

async function dropboxRpc(endpoint, body, token, fetchImpl) {
  return conReintentos(async () => {
    const res = await fetchImpl(`https://api.dropboxapi.com/2/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const texto = await res.text().catch(() => "");
    const err = new Error(
      res.status === 401 ? "Token de Dropbox inválido o vencido"
      : res.status === 409 ? `Dropbox no pudo abrir la carpeta (${texto.slice(0, 120)}). ¿El enlace sigue activo?`
      : `Dropbox respondió ${res.status}`);
    err.noReintentar = res.status === 401 || res.status === 409 || res.status === 400;
    throw err;
  });
}

// Dropbox no acepta recursive:true con enlaces compartidos: se recorre carpeta por carpeta.
export async function listarDropbox(sharedUrl, token, { fetchImpl = fetch } = {}) {
  const archivos = [];
  const cola = [""];
  while (cola.length) {
    const ruta = cola.shift();
    let data = await dropboxRpc("files/list_folder", { path: ruta ? `/${ruta}` : "", shared_link: { url: sharedUrl } }, token, fetchImpl);
    for (;;) {
      for (const e of data.entries || []) {
        if (e[".tag"] === "folder") { cola.push(unirRuta(ruta, e.name)); continue; }
        if (e[".tag"] !== "file") continue;
        archivos.push({
          archivo_id: e.id, nombre: e.name, ruta, mime: mimePorNombre(e.name),
          modificado: e.server_modified || e.client_modified || null,
          tamano: e.size ?? null, url: sharedUrl,
        });
      }
      if (!data.has_more) break;
      data = await dropboxRpc("files/list_folder/continue", { cursor: data.cursor }, token, fetchImpl);
    }
  }
  return archivos;
}

async function dropboxContenido(endpoint, arg, token, fetchImpl) {
  return conReintentos(async () => {
    const res = await fetchImpl(`https://content.dropboxapi.com/2/${endpoint}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Dropbox-API-Arg": dropboxArg(arg) },
    });
    if (!res.ok) { const e = new Error(`Dropbox respondió ${res.status} al descargar`); e.noReintentar = res.status < 500 && res.status !== 429; throw e; }
    return Buffer.from(await res.arrayBuffer());
  });
}

const rutaDropbox = (archivo) => `/${unirRuta(archivo.ruta, archivo.nombre)}`;

export async function descargarDropbox(sharedUrl, archivo, token, { fetchImpl = fetch } = {}) {
  const buffer = await dropboxContenido("sharing/get_shared_link_file", { url: sharedUrl, path: rutaDropbox(archivo) }, token, fetchImpl);
  return { buffer, mime: archivo.mime };
}

// Tamaños válidos de Dropbox: w480h320, w640h480, w1024h768, w2048h1536…
export async function miniaturaDropbox(sharedUrl, archivo, size, token, { fetchImpl = fetch } = {}) {
  const buffer = await dropboxContenido("files/get_thumbnail_v2", {
    resource: { ".tag": "link", url: sharedUrl, path: rutaDropbox(archivo) },
    format: "jpeg", size, mode: "fitone_bestfit",
  }, token, fetchImpl);
  return { buffer, mime: "image/jpeg" };
}

// ── Fachada por fuente ──────────────────────────────────────────────────────
// Devuelve un objeto con listar(), descargar(archivo) y miniatura(archivo, ancho).
export async function conectarFuente(fuente, env = process.env, deps = {}) {
  if (fuente.plataforma === "Google Drive") {
    const folderId = driveFolderId(fuente.url);
    const key = env.GOOGLE_API_KEY;
    return {
      listar: () => listarDrive(folderId, key, deps),
      descargar: (a) => descargarDrive(a, key, deps),
      miniatura: (a, ancho) => miniaturaDrive(a, ancho, deps),
    };
  }
  if (fuente.plataforma === "Dropbox") {
    const sharedUrl = dropboxSharedUrl(fuente.url);
    let token;
    const tk = async () => (token ??= await tokenDropbox(env, deps));
    const tamano = (ancho) => ancho <= 480 ? "w480h320" : ancho <= 640 ? "w640h480" : ancho <= 1024 ? "w1024h768" : "w2048h1536";
    return {
      listar: async () => listarDropbox(sharedUrl, await tk(), deps),
      descargar: async (a) => descargarDropbox(sharedUrl, a, await tk(), deps),
      miniatura: async (a, ancho) => miniaturaDropbox(sharedUrl, a, tamano(ancho), await tk(), deps),
    };
  }
  throw new Error(`Plataforma desconocida: ${fuente.plataforma}`);
}
