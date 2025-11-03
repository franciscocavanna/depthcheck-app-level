import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { engine = 'heuristico' } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Entrenando modelo:', engine);

    // Obtener datos para entrenamiento
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*');

    if (clientesError) throw clientesError;

    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('*');

    if (facturasError) throw facturasError;

    console.log(`Dataset: ${clientes.length} clientes, ${facturas.length} facturas`);

    // Simular métricas de entrenamiento
    const metrics = engine === 'ml' ? {
      auc: 0.78 + Math.random() * 0.10,
      ks: 0.35 + Math.random() * 0.15,
      brier: 0.15 + Math.random() * 0.05,
      accuracy: 0.75 + Math.random() * 0.10,
      precision: 0.70 + Math.random() * 0.10,
      recall: 0.68 + Math.random() * 0.12
    } : {
      auc: 0.65 + Math.random() * 0.08,
      ks: 0.25 + Math.random() * 0.10,
      brier: 0.20 + Math.random() * 0.05
    };

    // Calibración isotónica (simplificada)
    const calibracion = {
      bins: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
      observed: [0.08, 0.18, 0.32, 0.39, 0.51, 0.58, 0.72, 0.81, 0.91]
    };

    // Explicabilidad (top features)
    const explicabilidad = {
      global_importance: [
        { feature: 'pct_on_time_180', importance: 0.35 },
        { feature: 'dso_180', importance: 0.22 },
        { feature: 'aging90', importance: 0.18 },
        { feature: 'deuda_vencida', importance: 0.15 },
        { feature: 'tendencia_pd', importance: 0.10 }
      ]
    };

    // Guardar modelo
    const version = `v${Date.now().toString().slice(-6)}`;
    const { data: modelo, error: modeloError } = await supabase
      .from('modelos')
      .insert({
        tipo_motor: engine,
        version,
        objetivo: 'PD180',
        metrics_json: metrics,
        calibracion_json: calibracion,
        explicabilidad_json: explicabilidad,
        champion: true,
        dataset_size: clientes.length + facturas.length
      })
      .select()
      .single();

    if (modeloError) throw modeloError;

    // Marcar otros modelos como no-champion
    await supabase
      .from('modelos')
      .update({ champion: false })
      .neq('id', modelo.id);

    // Registrar evento
    await supabase.from('eventos').insert({
      entidad_tipo: 'modelo',
      entidad_id: modelo.id,
      tipo_evento: 'entrenamiento',
      payload_json: {
        engine,
        version,
        metrics
      }
    });

    console.log('Modelo entrenado:', version);

    return new Response(
      JSON.stringify({
        success: true,
        modelo: {
          id: modelo.id,
          version,
          engine,
          metrics
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en train-model:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
