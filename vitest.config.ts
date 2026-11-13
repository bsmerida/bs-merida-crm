import { defineConfig } from "vitest/config";
import path from "path";

// Las pruebas corren con la hora de Mérida (como el navegador de los usuarios),
// para detectar fechas que se recorren de día por la zona horaria.
process.env.TZ = "America/Merida";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
