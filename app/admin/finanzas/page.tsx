-- Tabla para cargar estados financieros históricos
CREATE TABLE IF NOT EXISTS financial_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year          INT NOT NULL,
  month         INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  -- Ingresos
  ingreso_venta     DECIMAL(15,2) DEFAULT 0,
  ingreso_renta     DECIMAL(15,2) DEFAULT 0,
  ingreso_otro      DECIMAL(15,2) DEFAULT 0,
  ingreso_total     DECIMAL(15,2) DEFAULT 0,
  -- Costos
  costo_comisiones  DECIMAL(15,2) DEFAULT 0,
  -- Gastos
  gasto_nomina      DECIMAL(15,2) DEFAULT 0,
  gasto_marketing   DECIMAL(15,2) DEFAULT 0,
  gasto_admin       DECIMAL(15,2) DEFAULT 0,
  gasto_otro        DECIMAL(15,2) DEFAULT 0,
  gasto_total       DECIMAL(15,2) DEFAULT 0,
  -- Resultados
  utilidad_bruta    DECIMAL(15,2) DEFAULT 0,
  utilidad_op       DECIMAL(15,2) DEFAULT 0,
  margen_neto       DECIMAL(7,4)  DEFAULT 0,
  -- Operaciones
  num_operaciones   INT DEFAULT 0,
  num_leads         INT DEFAULT 0,
  -- Notas
  notes             TEXT,
  source            TEXT DEFAULT 'manual', -- 'manual' | 'importado'
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month)
);

ALTER TABLE financial_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_admin_only" ON financial_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_financial_history_period ON financial_history(year, month);
