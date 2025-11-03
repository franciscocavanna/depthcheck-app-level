import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Motor heurístico de scoring
function calcularPayScore(cliente: any): { pd_180: number; color: string } {
  let score = 0;
  
  // % on-time (peso 35%)
  const pctOnTime = cliente.pct_on_time_180 || 0.5;
  score += (1 - pctOnTime) * 0.35;
  
  // DSO (peso 25%)
  const dsoNorm = Math.min((cliente.dso_180 || 45) / 90, 1);
  score += dsoNorm * 0.25;
  
  // Aging (peso 20%)
  const aging = (cliente.aging30 || 0) + (cliente.aging60 || 0) + (cliente.aging90 || 0);
  const agingNorm = Math.min(aging / 100000, 1);
  score += agingNorm * 0.20;
  
  // Deuda vencida (peso 15%)
  const deudaVencidaNorm = Math.min((cliente.deuda_vencida || 0) / (cliente.deuda_total || 1), 1);
  score += deudaVencidaNorm * 0.15;
  
  // Tendencia (peso 5%)
  const tendencia = cliente.tendencia_pd || 0;
  score += Math.max(tendencia, 0) * 0.05;
  
  const pd_180 = Math.min(score, 0.95);
  const color = pd_180 < 0.08 ? 'Verde' : (pd_180 < 0.20 ? 'Amarillo' : 'Rojo');
  
  return { pd_180, color };
}

function calcularInvScore(factura: any, clienteScore: any, config: any): any {
  const monto = factura.monto || 0;
  const fechaVenc = new Date(factura.fecha_vencimiento);
  const fechaEmision = new Date(factura.fecha_emision);
  const hoy = new Date();
  
  // Calcular días de plazo (desde emisión hasta vencimiento)
  const diasPlazo = Math.floor((fechaVenc.getTime() - fechaEmision.getTime()) / (1000 * 60 * 60 * 24));
  const diasVencimiento = Math.floor((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  const devoluciones = factura.devoluciones || 0;
  const pdBase = clienteScore.pd_180 || 0.05;

  // Parámetros de config (con defaults)
  const piAnual = config.inflacion_anual || 1.20;
  const rfAnual = config.tasa_libre_anual || 0.05;
  const lgd = config.lgd || 0.45;
  const beta = config.beta_plazo || 0.15;
  const gamma = config.gamma_riesgo || 0.70;

  // Costo real diario del plazo
  const piDiaria = Math.pow(1 + piAnual, 1/365) - 1;
  const rfDiaria = Math.pow(1 + rfAnual, 1/365) - 1;
  const kDiaria = (1 + piDiaria) * (1 + rfDiaria) - 1;

  // Markup y costo de plazo
  const markupPlazo = Math.pow(1 + kDiaria, diasPlazo) - 1;
  const costoPlazo = monto * markupPlazo;

  // PD30: penalizar si vence pronto o tiene devoluciones
  let pd30 = pdBase * (1 + Math.max(0, -diasVencimiento / 30) * 0.3);
  if (devoluciones > 0) pd30 += 0.05;
  pd30 = Math.min(1, pd30);

  const pd90 = pd30 * 0.7;
  const inv_score = Math.round(pd30 * 100);

  // Cálculo de anticipo según VP Real
  const color = clienteScore.pay_score_color || 'Verde';
  const baseColor = color === 'Rojo' ? 1.0 : (color === 'Amarillo' ? 0.40 : 0.10);
  const upliftPlazo = Math.min(0.50, beta * (diasPlazo / 30));
  const upliftRiesgo = gamma * pd30;
  
  let anticipo = Math.max(0, Math.min(1, baseColor + upliftPlazo + upliftRiesgo));
  
  // Política final
  let modo = 'Normal/Contraentrega';
  let escrow = false;
  let stop = false;

  if (anticipo >= 1) {
    modo = 'Prepago/Escrow';
    anticipo = 100;
    escrow = true;
  } else if (anticipo >= 0.30) {
    modo = 'Anticipo+Contraentrega';
    anticipo = Math.round(anticipo * 100);
  } else {
    modo = 'Normal/Contraentrega';
    anticipo = Math.round(anticipo * 100);
  }

  // Stop supply si alto riesgo
  if (pd30 > 0.40 || (color === 'Rojo' && factura.estado === 'vencida')) {
    stop = true;
  }

  const EL = pd30 * lgd * monto;

  return {
    pd30: Math.round(pd30 * 10000) / 10000,
    pd90: Math.round(pd90 * 10000) / 10000,
    inv_score,
    dias_plazo: diasPlazo,
    markup_plazo: Math.round(markupPlazo * 10000) / 10000,
    costo_plazo: Math.round(costoPlazo * 100) / 100,
    recomendacion_json: { 
      modo, 
      anticipo, 
      escrow, 
      stop,
      markup_plazo: Math.round(markupPlazo * 10000) / 10000,
      costo_plazo: Math.round(costoPlazo * 100) / 100,
      EL: Math.round(EL * 100) / 100
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { engine = 'heuristico' } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Recalculando scores con motor:', engine);

    // 0. Obtener configuración
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('*')
      .single();

    if (configError) {
      console.warn('No se pudo obtener config, usando valores por defecto');
    }
    
    const config = configData || {
      inflacion_anual: 1.20,
      tasa_libre_anual: 0.05,
      lgd: 0.45,
      beta_plazo: 0.15,
      gamma_riesgo: 0.70
    };

    // 1. Recalcular PayScore de clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*');

    if (clientesError) throw clientesError;

    const clientesScores = new Map();
    
    for (const cliente of clientes) {
      const { pd_180, color } = calcularPayScore(cliente);
      
      await supabase
        .from('clientes')
        .update({
          pd_180,
          pay_score_color: color,
          fecha_update: new Date().toISOString()
        })
        .eq('id', cliente.id);
      
      clientesScores.set(cliente.id, { pd_180, color });
    }

    console.log(`Actualizados ${clientes.length} clientes`);

    // 2. Recalcular InvScore de facturas
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('*');

    if (facturasError) throw facturasError;

    for (const factura of facturas) {
      const clienteScore = clientesScores.get(factura.cliente_id) || { pd_180: 0.15, color: 'Amarillo' };
      const scores = calcularInvScore(factura, clienteScore, config);
      
      await supabase
        .from('facturas')
        .update({
          pd30: scores.pd30,
          pd90: scores.pd90,
          inv_score: scores.inv_score,
          dias_plazo: scores.dias_plazo,
          markup_plazo: scores.markup_plazo,
          costo_plazo: scores.costo_plazo,
          recomendacion_json: scores.recomendacion_json
        })
        .eq('id', factura.id);
    }

    console.log(`Actualizadas ${facturas.length} facturas`);

    // 3. Registrar evento
    await supabase.from('eventos').insert({
      entidad_tipo: 'scoring',
      tipo_evento: 'recalculo',
      payload_json: {
        engine,
        clientes: clientes.length,
        facturas: facturas.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        clientes_actualizados: clientes.length,
        facturas_actualizadas: facturas.length,
        engine
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en score-run:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
