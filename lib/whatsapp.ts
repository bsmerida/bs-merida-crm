// lib/whatsapp.ts
// Envío de WhatsApp vía Twilio. Mientras no haya número de Twilio dado de alta
// (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM en el entorno),
// enviarWhatsapp() simplemente no hace nada — igual que sendPush() cuando faltan
// las llaves VAPID. En cuanto se configuren, el seguimiento automático de Sofía
// empieza a mandar el mensaje real sin tocar código.
//
// Nota: Twilio solo permite texto libre dentro de las 24 hrs desde el último
// mensaje del cliente. Pasado ese plazo, WhatsApp exige una plantilla aprobada
// (Content Template). Por ahora enviarWhatsapp() manda texto libre — útil para
// el seguimiento a leads recientes de Sofía (horas, no días) — y quedará
// pendiente agregar soporte de plantilla cuando haga falta avisar después de
// 24 hrs.

function configure(): { sid: string; token: string; from: string } | null {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM; // ej. "+14155238886" (sin "whatsapp:")
  if (!sid || !token || !from) return null;
  return { sid, token, from };
}

export async function enviarWhatsapp(
  to: string, body: string,
): Promise<{ sent: boolean; reason?: string }> {
  const cfg = configure();
  if (!cfg) return { sent: false, reason: "twilio_no_configurado" };

  const digits = to.replace(/\D/g, "");
  if (digits.length < 10) return { sent: false, reason: "telefono_invalido" };
  const toE164 = digits.length === 10 ? `52${digits}` : digits; // México: asume MX si falta el código de país

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization:  `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:+${cfg.from.replace(/\D/g, "")}`,
        To:   `whatsapp:+${toE164}`,
        Body: body.slice(0, 1500),
      }),
    });
    if (!res.ok) {
      const detalle = await res.json().catch(() => null);
      console.error("[Twilio]", res.status, detalle?.message || detalle);
      return { sent: false, reason: `twilio_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[Twilio]", (e as Error)?.message);
    return { sent: false, reason: "error_red" };
  }
}
