-- DepthCheck v3: Agregar tablas para ML, eventos y políticas avanzadas

-- Tabla de modelos ML (versiones, métricas, calibración)
CREATE TABLE IF NOT EXISTS public.modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_motor text NOT NULL CHECK (tipo_motor IN ('heuristico', 'ml')),
  version text NOT NULL,
  objetivo text NOT NULL CHECK (objetivo IN ('PD30', 'PD90', 'PD180')),
  metrics_json jsonb NOT NULL DEFAULT '{}',
  calibracion_json jsonb DEFAULT '{}',
  explicabilidad_json jsonb DEFAULT '{}',
  champion boolean DEFAULT false,
  dataset_size integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view modelos"
ON public.modelos FOR SELECT
USING (true);

CREATE POLICY "Owners can manage modelos"
ON public.modelos FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Tabla de eventos de auditoría
CREATE TABLE IF NOT EXISTS public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo text NOT NULL,
  entidad_id uuid,
  tipo_evento text NOT NULL,
  payload_json jsonb DEFAULT '{}',
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp timestamp with time zone DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view eventos"
ON public.eventos FOR SELECT
USING (true);

CREATE POLICY "System can insert eventos"
ON public.eventos FOR INSERT
WITH CHECK (true);

-- Modificar tabla politicas existente (si existe, si no crear)
DROP TABLE IF EXISTS public.politicas CASCADE;

CREATE TABLE public.politicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  matriz_json jsonb NOT NULL DEFAULT '{}',
  umbrales_json jsonb NOT NULL DEFAULT '{}',
  descuentos_json jsonb DEFAULT '{}',
  stop_supply_json jsonb DEFAULT '{}',
  activo boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.politicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view politicas"
ON public.politicas FOR SELECT
USING (true);

CREATE POLICY "Owners can manage politicas"
ON public.politicas FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Agregar campos necesarios a clientes para scoring
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS antiguedad_meses integer,
  ADD COLUMN IF NOT EXISTS ventas_12m numeric,
  ADD COLUMN IF NOT EXISTS dso_180 numeric,
  ADD COLUMN IF NOT EXISTS pct_on_time_180 numeric,
  ADD COLUMN IF NOT EXISTS aging30 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aging60 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aging90 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concent_top3 numeric,
  ADD COLUMN IF NOT EXISTS tendencia_pd numeric,
  ADD COLUMN IF NOT EXISTS pd_180 numeric,
  ADD COLUMN IF NOT EXISTS pay_score_color text CHECK (pay_score_color IN ('Verde', 'Amarillo', 'Rojo')),
  ADD COLUMN IF NOT EXISTS deuda_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deuda_vencida numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_update timestamp with time zone DEFAULT now();

-- Agregar campos necesarios a facturas para scoring
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS devoluciones integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canal_entrega text,
  ADD COLUMN IF NOT EXISTS inv_score integer,
  ADD COLUMN IF NOT EXISTS pd30 numeric,
  ADD COLUMN IF NOT EXISTS pd90 numeric,
  ADD COLUMN IF NOT EXISTS recomendacion_json jsonb DEFAULT '{}';

-- Agregar campo monto_pagado a facturas para cálculos
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS monto_pagado numeric DEFAULT 0;

-- Crear tabla de pagos (si no existe)
CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid REFERENCES public.facturas(id) ON DELETE CASCADE,
  fecha_pago date NOT NULL,
  monto_pago numeric NOT NULL,
  metodo text,
  nota text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pagos"
ON public.pagos FOR SELECT
USING (true);

CREATE POLICY "Owners and cobranzas can manage pagos"
ON public.pagos FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'cobranzas'::app_role));

-- Actualizar promesas para incluir estado y canal
ALTER TABLE public.promesas
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pactada' CHECK (estado IN ('pactada', 'confirmada', 'cumplida', 'incumplida')),
  ADD COLUMN IF NOT EXISTS canal_origen text;

-- Trigger para updated_at en modelos y politicas
CREATE TRIGGER update_modelos_updated_at
  BEFORE UPDATE ON public.modelos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_politicas_updated_at
  BEFORE UPDATE ON public.politicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insertar política inicial por defecto
INSERT INTO public.politicas (version, matriz_json, umbrales_json, descuentos_json, stop_supply_json, activo)
VALUES (
  'v1.0',
  '{"Verde": {"anticipo": 10, "escrow": false, "stop": false}, "Amarillo": {"anticipo": 40, "escrow": false, "stop": false}, "Rojo": {"anticipo": 100, "escrow": true, "stop": true}}',
  '{"pd30_alto": 0.25, "pd30_medio": 0.10, "deuda_vencida_max": 500000}',
  '{"pronto_pago_dias": 10, "descuento_pct": 2, "prob_min": 0.70}',
  '{"deuda_umbral": 100000, "color_rojo": true}',
  true
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_pay_score ON public.clientes(pay_score_color);
CREATE INDEX IF NOT EXISTS idx_facturas_inv_score ON public.facturas(inv_score DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_pd30 ON public.facturas(pd30 DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON public.eventos(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_entidad ON public.eventos(entidad_tipo, entidad_id);