-- ============================================
-- COBRAPRO DATABASE SCHEMA
-- MVP para PyMEs de cobranza inteligente
-- ============================================

-- 1. SISTEMA DE ROLES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('owner', 'cobranzas', 'visor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles (SECURITY DEFINER para evitar recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- 2. PERFILES DE USUARIO
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. CONFIGURACIÓN GLOBAL
-- ============================================
CREATE TABLE public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbu_empresa TEXT,
  alias_empresa TEXT,
  cuit_empresa TEXT,
  formato_referencia_ej TEXT DEFAULT 'FAC-{numero}',
  tolerancia_monto_porcentual DECIMAL(5,2) DEFAULT 2.0,
  ventana_dias_match INT DEFAULT 7,
  horario_contacto_inicio TIME DEFAULT '09:00',
  horario_contacto_fin TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view config"
  ON public.config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can modify config"
  ON public.config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON public.config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. CLIENTES
-- ============================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social TEXT NOT NULL,
  cuit TEXT,
  email TEXT,
  telefono TEXT,
  alias_banco TEXT,
  cbu_banco TEXT,
  banco_preferido TEXT,
  hora_preferida_pago TIME,
  canal_preferido TEXT CHECK (canal_preferido IN ('wa', 'email', 'sms', 'llamada')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and cobranzas can manage clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

-- 5. FACTURAS
-- ============================================
CREATE TABLE public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  numero TEXT NOT NULL UNIQUE,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  moneda TEXT DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD', 'EUR')),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'paga', 'vencida')),
  referencia_pago TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view facturas"
  ON public.facturas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and cobranzas can manage facturas"
  ON public.facturas FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

-- Índices para búsqueda rápida
CREATE INDEX idx_facturas_cliente ON public.facturas(cliente_id);
CREATE INDEX idx_facturas_estado ON public.facturas(estado);
CREATE INDEX idx_facturas_vencimiento ON public.facturas(fecha_vencimiento);
CREATE INDEX idx_facturas_referencia ON public.facturas(referencia_pago);

-- 6. COBRANZAS
-- ============================================
CREATE TABLE public.cobranzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  fecha_pago DATE NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  moneda TEXT DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD', 'EUR')),
  metodo TEXT CHECK (metodo IN ('transferencia', 'cheque', 'efectivo', 'qr')),
  banco_origen TEXT,
  cbu_origen TEXT,
  concepto TEXT,
  referencia_detectada TEXT,
  conciliacion_estado TEXT DEFAULT 'no_match' CHECK (conciliacion_estado IN ('conciliada', 'sugerida', 'sospechosa', 'no_match')),
  fuente TEXT CHECK (fuente IN ('extracto_importado', 'manual')),
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cobranzas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cobranzas"
  ON public.cobranzas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and cobranzas can manage cobranzas"
  ON public.cobranzas FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

CREATE INDEX idx_cobranzas_cliente ON public.cobranzas(cliente_id);
CREATE INDEX idx_cobranzas_factura ON public.cobranzas(factura_id);
CREATE INDEX idx_cobranzas_conciliacion ON public.cobranzas(conciliacion_estado);
CREATE INDEX idx_cobranzas_referencia ON public.cobranzas(referencia_detectada);

-- 7. PROMESAS DE PAGO
-- ============================================
CREATE TABLE public.promesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  factura_id UUID REFERENCES public.facturas(id) ON DELETE CASCADE NOT NULL,
  fecha_promesa DATE NOT NULL,
  monto_promesa DECIMAL(12,2) NOT NULL,
  estado TEXT DEFAULT 'pactada' CHECK (estado IN ('pactada', 'cumplida', 'incumplida')),
  canal_origen TEXT CHECK (canal_origen IN ('wa', 'email', 'sms', 'llamada')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view promesas"
  ON public.promesas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and cobranzas can manage promesas"
  ON public.promesas FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

CREATE INDEX idx_promesas_cliente ON public.promesas(cliente_id);
CREATE INDEX idx_promesas_factura ON public.promesas(factura_id);
CREATE INDEX idx_promesas_fecha ON public.promesas(fecha_promesa);
CREATE INDEX idx_promesas_estado ON public.promesas(estado);

-- 8. INTERACCIONES
-- ============================================
CREATE TABLE public.interacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ DEFAULT now(),
  canal TEXT CHECK (canal IN ('wa', 'email', 'sms', 'llamada')),
  plantilla TEXT,
  mensaje_enviado TEXT,
  resultado TEXT CHECK (resultado IN ('sin_respuesta', 'respuesta', 'pago', 'promesa')),
  meta_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view interacciones"
  ON public.interacciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and cobranzas can manage interacciones"
  ON public.interacciones FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

CREATE INDEX idx_interacciones_cliente ON public.interacciones(cliente_id);
CREATE INDEX idx_interacciones_factura ON public.interacciones(factura_id);
CREATE INDEX idx_interacciones_fecha ON public.interacciones(fecha);

-- 9. PLAYBOOKS
-- ============================================
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  trigger TEXT CHECK (trigger IN ('preventivo', 'temprano', 'tardio', 'manual')),
  pasos_json JSONB NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view playbooks"
  ON public.playbooks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can manage playbooks"
  ON public.playbooks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 10. SCORES DE CLIENTES
-- ============================================
CREATE TABLE public.scores_clientes (
  cliente_id UUID PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
  pay_score INT CHECK (pay_score >= 0 AND pay_score <= 100),
  actualizado_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scores_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scores_clientes"
  ON public.scores_clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage scores_clientes"
  ON public.scores_clientes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

-- 11. SCORES DE FACTURAS
-- ============================================
CREATE TABLE public.scores_facturas (
  factura_id UUID PRIMARY KEY REFERENCES public.facturas(id) ON DELETE CASCADE,
  inv_score INT CHECK (inv_score >= 0 AND inv_score <= 100),
  actualizado_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scores_facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scores_facturas"
  ON public.scores_facturas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage scores_facturas"
  ON public.scores_facturas FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    public.has_role(auth.uid(), 'cobranzas')
  );

-- 12. REGLAS DE CONCILIACIÓN
-- ============================================
CREATE TABLE public.reglas_conciliacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridad INT NOT NULL,
  tipo TEXT CHECK (tipo IN ('referencia_exacta', 'monto_fecha', 'cbu_historico', 'ia')),
  parametros_json JSONB,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reglas_conciliacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reglas"
  ON public.reglas_conciliacion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can manage reglas"
  ON public.reglas_conciliacion FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- DATOS MOCK INICIALES
-- ============================================

-- Configuración inicial
INSERT INTO public.config (
  cbu_empresa,
  alias_empresa,
  cuit_empresa,
  formato_referencia_ej,
  tolerancia_monto_porcentual,
  ventana_dias_match
) VALUES (
  '0170123420000012345678',
  'COBRAPRO.MP',
  '30-71234567-8',
  'FAC-{numero}',
  2.5,
  7
);

-- Playbooks por defecto
INSERT INTO public.playbooks (nombre, descripcion, trigger, pasos_json) VALUES
('Preventivo', 'Recordatorio amigable antes del vencimiento', 'preventivo', 
  '[
    {"paso": 1, "canal": "wa", "delay_dias": -3, "plantilla": "preventivo_wa", "mensaje": "Hola {Nombre}, te recordamos que tu factura {NumeroFactura} por ${Monto} vence el {Vencimiento}. Puedes transferir a {Alias} o CBU {CBU}. Incluí como referencia: {Referencia}"},
    {"paso": 2, "canal": "email", "delay_dias": -1, "plantilla": "preventivo_email", "mensaje": "Estimado/a {Nombre}, tu factura {NumeroFactura} vence mañana. Monto: ${Monto}. Datos: {Alias} / {CBU} / Ref: {Referencia}"}
  ]'::jsonb),
('Temprano', 'Seguimiento primeros días de mora', 'temprano',
  '[
    {"paso": 1, "canal": "wa", "delay_dias": 5, "plantilla": "temprano_wa", "mensaje": "Hola {Nombre}, notamos que la factura {NumeroFactura} por ${Monto} venció hace unos días. ¿Necesitas ayuda? Transferí a {Alias} con referencia {Referencia}"},
    {"paso": 2, "canal": "email", "delay_dias": 10, "plantilla": "temprano_email", "mensaje": "Estimado/a {Nombre}, tu factura {NumeroFactura} tiene saldo pendiente de ${Monto}. Por favor, regulariza usando {Alias} o {CBU} con referencia {Referencia}"}
  ]'::jsonb),
('Tardío', 'Gestión de mora avanzada', 'tardio',
  '[
    {"paso": 1, "canal": "llamada", "delay_dias": 15, "plantilla": "tardio_llamada", "mensaje": "Contactar a {Nombre} por factura {NumeroFactura} vencida hace más de 15 días. Monto: ${Monto}"},
    {"paso": 2, "canal": "email", "delay_dias": 20, "plantilla": "tardio_formal", "mensaje": "Estimado/a {Nombre}, la factura {NumeroFactura} por ${Monto} tiene atraso significativo. Te solicitamos regularización urgente. Datos: {CBU}, Ref: {Referencia}"},
    {"paso": 3, "canal": "wa", "delay_dias": 25, "plantilla": "tardio_recordatorio", "mensaje": "{Nombre}, último recordatorio para factura {NumeroFactura}. Evita acciones legales regularizando ${Monto} en {Alias} / {CBU} con ref {Referencia}"}
  ]'::jsonb);

-- Reglas de conciliación por defecto
INSERT INTO public.reglas_conciliacion (prioridad, tipo, parametros_json, activa) VALUES
(1, 'referencia_exacta', '{"match_exacto": true}'::jsonb, true),
(2, 'monto_fecha', '{"tolerancia_monto_pct": 2.5, "ventana_dias": 7}'::jsonb, true),
(3, 'cbu_historico', '{"min_coincidencias": 2}'::jsonb, true);

-- 10 Clientes mock
INSERT INTO public.clientes (razon_social, cuit, email, telefono, alias_banco, cbu_banco, banco_preferido, hora_preferida_pago, canal_preferido) VALUES
('Clínica San Rafael S.A.', '30-65432109-8', 'pagos@sanrafael.com.ar', '+5491134567890', 'SANRAFAEL.CLIN', '0110123456000012345678', 'Galicia', '14:00', 'email'),
('Colegio Del Sol', '30-71234567-3', 'administracion@colegiosol.edu.ar', '+5491145678901', 'COLEGIOSOL.MP', '0170234567000023456789', 'Santander', '10:00', 'wa'),
('Laboratorios Biomed S.R.L.', '30-78912345-6', 'cuentas@biomed.com', '+5491156789012', 'BIOMED.LAB', '0720345678000034567890', 'BBVA', '16:00', 'email'),
('Supermercado La Esquina', '30-82345678-1', 'pagos@laesquina.com', '+5491167890123', 'LAESQUINA.SUP', '0340456789000045678901', 'ICBC', '11:00', 'wa'),
('Instituto Educativo Futuro', '30-89876543-9', 'tesoreria@institufuturo.edu.ar', '+5491178901234', 'INSTFUTURO.MP', '0150567890000056789012', 'Macro', '15:00', 'email'),
('Farmacia Central 24hs', '30-93456789-2', 'admin@farmaciacentral.com', '+5491189012345', 'FARMCENTRAL24', '0110678901000067890123', 'Galicia', '09:00', 'wa'),
('Distribuidora Textil Norte', '30-95678912-4', 'cobranzas@texnorte.com.ar', '+5491190123456', 'TEXNORTE.DIS', '0170789012000078901234', 'Santander', '13:00', 'sms'),
('Gimnasio FitZone', '30-97891234-7', 'info@fitzone.com.ar', '+5491101234567', 'FITZONE.GYM', '0720890123000089012345', 'BBVA', '18:00', 'wa'),
('Consultorio Médico Integrado', '30-99123456-0', 'pagos@consulmed.com', '+5491112345678', 'CONSULMED.INT', '0340901234000090123456', 'ICBC', '12:00', 'email'),
('Librería Universitaria ABC', '30-91234567-5', 'ventas@libreriaabc.com', '+5491123456789', 'LIBRERIAABC.MP', '0150012345000001234567', 'Macro', '17:00', 'wa');

-- 60 Facturas variadas (10 por día del mes, mezclando vencidas/pendientes)
DO $$
DECLARE
  cliente_record RECORD;
  i INT;
  fecha_base DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
  FOR cliente_record IN SELECT id FROM public.clientes LOOP
    FOR i IN 1..6 LOOP
      INSERT INTO public.facturas (
        cliente_id,
        numero,
        fecha_emision,
        fecha_vencimiento,
        monto,
        moneda,
        estado,
        referencia_pago
      ) VALUES (
        cliente_record.id,
        'FAC-' || LPAD((FLOOR(RANDOM() * 9000 + 1000))::TEXT, 4, '0'),
        fecha_base + (i * 15 || ' days')::INTERVAL,
        fecha_base + ((i * 15) + 30 || ' days')::INTERVAL,
        ROUND((RANDOM() * 50000 + 5000)::NUMERIC, 2),
        'ARS',
        CASE 
          WHEN i <= 2 THEN 'vencida'
          WHEN i = 3 THEN 'parcial'
          WHEN i = 4 THEN 'paga'
          ELSE 'pendiente'
        END,
        'FAC-' || LPAD((FLOOR(RANDOM() * 9000 + 1000))::TEXT, 4, '0') || '-AC'
      );
    END LOOP;
  END LOOP;
END $$;

-- 30 Cobranzas (algunas con referencia, otras sin, para simular conciliación)
DO $$
DECLARE
  cobranza_count INT := 0;
  factura_record RECORD;
  cliente_id_var UUID;
BEGIN
  FOR factura_record IN 
    SELECT id, cliente_id, monto, referencia_pago, fecha_vencimiento 
    FROM public.facturas 
    WHERE estado IN ('paga', 'parcial')
    LIMIT 30
  LOOP
    cobranza_count := cobranza_count + 1;
    INSERT INTO public.cobranzas (
      cliente_id,
      factura_id,
      fecha_pago,
      monto,
      moneda,
      metodo,
      banco_origen,
      cbu_origen,
      concepto,
      referencia_detectada,
      conciliacion_estado,
      fuente
    ) VALUES (
      factura_record.cliente_id,
      CASE WHEN cobranza_count % 3 = 0 THEN NULL ELSE factura_record.id END,
      factura_record.fecha_vencimiento + (FLOOR(RANDOM() * 10) || ' days')::INTERVAL,
      factura_record.monto * (CASE WHEN cobranza_count % 5 = 0 THEN 0.5 ELSE 1.0 END),
      'ARS',
      CASE (FLOOR(RANDOM() * 4))::INT
        WHEN 0 THEN 'transferencia'
        WHEN 1 THEN 'cheque'
        WHEN 2 THEN 'efectivo'
        ELSE 'qr'
      END,
      'Banco ' || (ARRAY['Galicia', 'Santander', 'BBVA', 'ICBC', 'Macro'])[FLOOR(RANDOM() * 5 + 1)::INT],
      '01701234' || LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 14, '0'),
      'Pago factura',
      CASE 
        WHEN cobranza_count % 4 = 0 THEN NULL
        WHEN cobranza_count % 4 = 1 THEN 'REF-ERRONEA-' || FLOOR(RANDOM() * 1000)::TEXT
        ELSE factura_record.referencia_pago
      END,
      CASE 
        WHEN cobranza_count % 4 = 0 THEN 'no_match'
        WHEN cobranza_count % 4 = 1 THEN 'sospechosa'
        WHEN cobranza_count % 4 = 2 THEN 'sugerida'
        ELSE 'conciliada'
      END,
      CASE WHEN cobranza_count % 3 = 0 THEN 'manual' ELSE 'extracto_importado' END
    );
  END LOOP;
END $$;

-- 12 Promesas (mitad cumplidas, mitad incumplidas)
DO $$
DECLARE
  promesa_count INT := 0;
  factura_record RECORD;
BEGIN
  FOR factura_record IN 
    SELECT id, cliente_id, monto, fecha_vencimiento
    FROM public.facturas 
    WHERE estado IN ('pendiente', 'vencida')
    LIMIT 12
  LOOP
    promesa_count := promesa_count + 1;
    INSERT INTO public.promesas (
      cliente_id,
      factura_id,
      fecha_promesa,
      monto_promesa,
      estado,
      canal_origen,
      notas
    ) VALUES (
      factura_record.cliente_id,
      factura_record.id,
      factura_record.fecha_vencimiento + ((promesa_count * 3) || ' days')::INTERVAL,
      factura_record.monto,
      CASE WHEN promesa_count % 2 = 0 THEN 'incumplida' ELSE 'cumplida' END,
      (ARRAY['wa', 'email', 'llamada'])[FLOOR(RANDOM() * 3 + 1)::INT],
      'Promesa pactada telefónicamente'
    );
  END LOOP;
END $$;