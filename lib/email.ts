// lib/emails.ts
// Templates de email para el flujo de citas Duclaud

const FROM = process.env.RESEND_FROM_EMAIL || "citas@duclaud.mx";
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://duclaud.mx";

const NAVY  = "#0D1B2A";
const GOLD  = "#C4956A";
const CREAM = "#F8F6F2";

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>D.UCLAUD Bienes Raíces</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${NAVY};border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:'Georgia',serif;font-size:28px;letter-spacing:6px;color:#ffffff;font-weight:300;">
              D<span style="color:${GOLD};">·</span>UCLAUD
            </p>
            <p style="margin:6px 0 0;font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;">
              Bienes Raíces
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#999;font-family:sans-serif;">
              D.UCLAUD Bienes Raíces · Mérida, Yucatán · México<br/>
              <a href="${BASE}" style="color:${GOLD};text-decoration:none;">duclaud.mx</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function optionCard(opt: { date: string; time: string }, idx: number, actionUrl?: string) {
  const d = new Date(`${opt.date}T12:00:00-06:00`);
  const days   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const label  = `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;

  if (actionUrl) {
    return `
    <a href="${actionUrl}" style="display:block;text-decoration:none;margin-bottom:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${GOLD};border-radius:12px;overflow:hidden;cursor:pointer;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">Opción ${idx + 1}</p>
            <p style="margin:6px 0 0;font-size:17px;color:${NAVY};font-family:'Georgia',serif;">${label}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666;font-family:sans-serif;">a las ${opt.time} hrs</p>
          </td>
          <td style="padding:16px 20px;text-align:right;">
            <span style="background:${GOLD};color:#fff;font-family:sans-serif;font-size:12px;font-weight:600;padding:8px 16px;border-radius:20px;">
              Elegir →
            </span>
          </td>
        </tr>
      </table>
    </a>`;
  }

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e5e0;border-radius:12px;margin-bottom:12px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">Opción ${idx + 1}</p>
        <p style="margin:6px 0 0;font-size:17px;color:${NAVY};font-family:'Georgia',serif;">${label}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#666;font-family:sans-serif;">a las ${opt.time} hrs</p>
      </td>
    </tr>
  </table>`;
}

// ── 1. Email al asesor: nueva solicitud ────────────────────────────────────
export function emailAsesorNuevaSolicitud({
  requestId, agentName, clientName, clientPhone, clientEmail,
  propertyTitle, options, adminUrl,
}: {
  requestId: string; agentName: string; clientName: string;
  clientPhone: string; clientEmail?: string | null;
  propertyTitle: string; options: { date: string; time: string }[];
  adminUrl: string;
}) {
  const acceptUrl  = `${BASE}/api/citas/responder/${requestId}?action=accept&option=0&token=asesor`;
  const optionsHtml = options.map((o, i) => {
    const acceptOptionUrl = `${BASE}/api/citas/responder/${requestId}?action=accept&option=${i}&token=asesor`;
    return optionCard(o, i, acceptOptionUrl);
  }).join("");

  const html = baseTemplate(`
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">
      Nueva solicitud de visita
    </p>
    <h2 style="margin:0 0 24px;font-size:24px;color:${NAVY};font-family:'Georgia',serif;font-weight:normal;">
      Hola, ${agentName}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;font-family:sans-serif;">
      <strong style="color:${NAVY};">${clientName}</strong> quiere visitar
      <strong style="color:${NAVY};">${propertyTitle}</strong> y propone los siguientes horarios:
    </p>

    ${optionsHtml}

    <div style="background:${CREAM};border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:sans-serif;">Contacto del cliente</p>
      <p style="margin:0;font-size:15px;color:${NAVY};font-family:sans-serif;">
        📱 <a href="tel:${clientPhone}" style="color:${NAVY};text-decoration:none;">${clientPhone}</a><br/>
        ${clientEmail ? `✉️ <a href="mailto:${clientEmail}" style="color:${NAVY};text-decoration:none;">${clientEmail}</a>` : ""}
      </p>
    </div>

    <p style="margin:24px 0 8px;font-size:13px;color:#666;font-family:sans-serif;">
      Haz clic en la opción que mejor te funcione para confirmarla, o gestiona la solicitud desde el CRM:
    </p>

    <a href="${adminUrl}" style="display:inline-block;background:${NAVY};color:#fff;font-family:sans-serif;font-size:13px;font-weight:600;padding:14px 28px;border-radius:50px;text-decoration:none;letter-spacing:1px;">
      Ver en el CRM →
    </a>
  `);

  return { html, subject: `Nueva solicitud de visita — ${clientName}` };
}

// ── 2. Email al cliente: confirmación ──────────────────────────────────────
export function emailClienteConfirmado({
  clientName, agentName, agentPhone, propertyTitle, confirmed,
}: {
  clientName: string; agentName: string; agentPhone?: string | null;
  propertyTitle: string; confirmed: { date: string; time: string };
}) {
  const d = new Date(`${confirmed.date}T12:00:00-06:00`);
  const days   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const dateLabel = `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;

  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:64px;height:64px;background:#ecfdf5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">✓</span>
      </div>
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">
        Visita confirmada
      </p>
      <h2 style="margin:0;font-size:24px;color:${NAVY};font-family:'Georgia',serif;font-weight:normal;">
        ¡Nos vemos, ${clientName.split(" ")[0]}!
      </h2>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${GOLD};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">Tu visita</p>
          <p style="margin:0;font-size:20px;color:${NAVY};font-family:'Georgia',serif;">${dateLabel}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#666;font-family:sans-serif;">a las ${confirmed.time} hrs</p>
          <p style="margin:12px 0 0;font-size:14px;color:#444;font-family:sans-serif;">📍 ${propertyTitle}</p>
        </td>
      </tr>
    </table>

    <div style="background:${CREAM};border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:sans-serif;">Tu asesor</p>
      <p style="margin:0;font-size:15px;color:${NAVY};font-family:'Georgia',serif;">${agentName}</p>
      ${agentPhone ? `<p style="margin:6px 0 0;font-size:13px;font-family:sans-serif;"><a href="tel:${agentPhone}" style="color:${GOLD};text-decoration:none;">📱 ${agentPhone}</a></p>` : ""}
    </div>

    <p style="margin:0;font-size:13px;color:#888;font-family:sans-serif;line-height:1.6;text-align:center;">
      Si necesitas cancelar o reagendar, contáctanos por WhatsApp.
    </p>
  `);

  return { html, subject: `Tu visita está confirmada — ${dateLabel}` };
}

// ── 3. Email al cliente: el asesor propone nuevas opciones ────────────────
export function emailClienteNuevasOpciones({
  clientName, agentName, propertyTitle, agentOptions, clientToken, agentMessage,
}: {
  clientName: string; agentName: string; propertyTitle: string;
  agentOptions: { date: string; time: string }[];
  clientToken: string; agentMessage?: string | null;
}) {
  const optionsHtml = agentOptions.map((o, i) => {
    const url = `${BASE}/api/citas/confirmar-cliente?token=${clientToken}&option=${i}`;
    return optionCard(o, i, url);
  }).join("");

  const html = baseTemplate(`
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-family:sans-serif;">
      Nuevas opciones de horario
    </p>
    <h2 style="margin:0 0 16px;font-size:24px;color:${NAVY};font-family:'Georgia',serif;font-weight:normal;">
      Hola, ${clientName.split(" ")[0]}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;font-family:sans-serif;">
      <strong style="color:${NAVY};">${agentName}</strong> no tiene disponibilidad en los horarios que solicitaste para visitar
      <strong style="color:${NAVY};">${propertyTitle}</strong>, pero te propone estas alternativas:
    </p>

    ${agentMessage ? `
    <div style="background:${CREAM};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#555;font-family:sans-serif;font-style:italic;">"${agentMessage}"</p>
    </div>` : ""}

    ${optionsHtml}

    <p style="margin:16px 0 0;font-size:13px;color:#888;font-family:sans-serif;text-align:center;">
      Haz clic en la opción que prefieras para confirmar tu visita.
    </p>
  `);

  return { html, subject: `Nuevas opciones de horario — ${propertyTitle}` };
}

// ── Enviar email con Resend ────────────────────────────────────────────────
export async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM_EMAIL || "citas@duclaud.mx",
      to:      [to],
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error("[Resend] Error:", data);
  return data;
}
