// Redimensiona/comprime las fotos que se suben al storage del CRM. No se usa
// la miniatura que genera el proveedor (Drive/Dropbox): en nov-2026 Drive
// empezó a devolver miniaturas más chicas y comprimidas sin avisar (mismo
// parámetro de ancho, resultado peor), dejando las fotos del sitio borrosas.
// Bajando el archivo original y procesándolo aquí, la calidad final no
// depende de un servicio externo que puede cambiar de comportamiento.
import sharp from "sharp";

export const ANCHO_MAX_FOTO = 2000;
const CALIDAD_JPEG = 85;
export const MAX_ORIGINAL = 25 * 1024 * 1024; // originales de cámara/celular caben bien ahí

export async function procesarImagen(buffer) {
  const jpeg = await sharp(buffer)
    .rotate() // orienta según EXIF (fotos de celular) y lo descarta del resultado
    .resize({ width: ANCHO_MAX_FOTO, withoutEnlargement: true })
    .jpeg({ quality: CALIDAD_JPEG })
    .toBuffer();
  return { buffer: jpeg, mime: "image/jpeg" };
}
