// La llave de servicio nunca debe leer de la caché de datos de Next.
import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn((..._args: unknown[]) => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));

afterEach(() => vi.unstubAllGlobals());

describe("createAdminClient", () => {
  it("usa un fetch que pide cache: 'no-store'", async () => {
    const { createAdminClient } = await import("@/lib/supabase/server");
    createAdminClient();
    const opts = createClient.mock.calls[0][2] as { global?: { fetch?: typeof fetch } };
    const espia = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", espia);
    await opts.global!.fetch!("https://x.supabase.co/rest/v1/properties", { method: "GET", headers: { a: "b" } });
    expect(espia).toHaveBeenCalledWith("https://x.supabase.co/rest/v1/properties", { method: "GET", headers: { a: "b" }, cache: "no-store" });
  });
});
