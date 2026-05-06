export async function GET() {
  const headers = [
    "title", "type", "operation", "price", "description",
    "address", "zone", "city", "state",
    "bedrooms", "bathrooms", "m2_construction", "m2_land", "parking",
    "amenities", "is_published",
  ];
  const ejemplos = [
    [
      "Casa en Cholul",
      "Casa",
      "Venta",
      "5800000",
      "Casa moderna con alberca y jardín",
      "Privada Las Palmas, Cholul",
      "Cholul",
      "Mérida",
      "Yucatán",
      "3", "3", "220", "300", "2",
      "Alberca|Jardín|Seguridad 24/7",
      "TRUE",
    ],
    [
      "Departamento en Yucalpetén",
      "Departamento",
      "Venta",
      "4250000",
      "Frente al mar, vista panorámica",
      "Yucalpetén Marina Resort",
      "Progreso",
      "Progreso",
      "Yucatán",
      "2", "2", "110", "", "1",
      "Vista al mar|Alberca|Marina|Concierge",
      "TRUE",
    ],
  ];

  const csvLine = (arr: string[]) => arr.map(v => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(",");

  const csv = [csvLine(headers), ...ejemplos.map(csvLine)].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_propiedades.csv"',
    },
  });
}
