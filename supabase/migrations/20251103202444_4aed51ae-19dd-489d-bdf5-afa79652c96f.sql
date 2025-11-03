-- Crear función update_updated_at si no existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Agregar parámetros financieros a la tabla config
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS inflacion_anual numeric DEFAULT 1.20;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS tasa_libre_anual numeric DEFAULT 0.05;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS lgd numeric DEFAULT 0.45;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS beta_plazo numeric DEFAULT 0.15;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS gamma_riesgo numeric DEFAULT 0.70;

-- Agregar columnas de plazo a facturas si no existen
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS dias_plazo integer DEFAULT 30;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS markup_plazo numeric DEFAULT 0;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS costo_plazo numeric DEFAULT 0;

-- Actualizar playbooks para soportar configuración completa de dunning
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS config_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS ventana_horaria_inicio time DEFAULT '09:00:00';
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS ventana_horaria_fin time DEFAULT '18:00:00';
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS rate_limit_diario integer DEFAULT 2;

-- Agregar tabla para tracking de mensajes enviados por dunning
CREATE TABLE IF NOT EXISTS public.dunning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES public.facturas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  tipo_mensaje text NOT NULL,
  offset_dias integer NOT NULL,
  canal text NOT NULL,
  estado text DEFAULT 'pendiente',
  fecha_programada timestamp with time zone NOT NULL,
  fecha_enviado timestamp with time zone,
  prioridad numeric DEFAULT 0,
  intentos integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para dunning_queue
CREATE INDEX IF NOT EXISTS idx_dunning_queue_estado ON public.dunning_queue(estado);
CREATE INDEX IF NOT EXISTS idx_dunning_queue_fecha_programada ON public.dunning_queue(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_dunning_queue_prioridad ON public.dunning_queue(prioridad DESC);
CREATE INDEX IF NOT EXISTS idx_dunning_queue_factura ON public.dunning_queue(factura_id);

-- RLS para dunning_queue
ALTER TABLE public.dunning_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dunning_queue"
ON public.dunning_queue FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage dunning_queue"
ON public.dunning_queue FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'cobranzas'::app_role));

-- Trigger para updated_at en dunning_queue
DROP TRIGGER IF EXISTS update_dunning_queue_updated_at ON public.dunning_queue;
CREATE TRIGGER update_dunning_queue_updated_at
BEFORE UPDATE ON public.dunning_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();