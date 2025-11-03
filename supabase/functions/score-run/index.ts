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

function calcularInvScore(factura: any, clienteScore: any): { pd30: number; pd90: number; inv_score: number; recomendacion: any } {
  let score = clienteScore.pd_180 * 0.6; // 60% del cliente
  
  // Monto (peso 15%)
  const montoNorm = Math.min((factura.monto || 0) / 50000, 1);
  score += montoNorm * 0.15;
  
  // Días al vencimiento (peso 15%)
  const hoy = new Date();
  const venc = new Date(factura.fecha_vencimiento);
  const diasVenc = Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const diasNorm = diasVenc < 0 ? 1 : Math.max(0, 1 - diasVenc / 60);
  score += diasNorm * 0.15;
  
  // Devoluciones (peso 10%)
  const devNorm = Math.min((factura.devoluciones || 0) / 5, 1);
  score += devNorm * 0.10;
  
  const pd30 = Math.min(score, 0.95);
  const pd90 = pd30 * 0.7;
  const inv_score = Math.round(pd30 * 100);
  
  // Recomendación de política
  const recomendacion = {
    modo: pd30 > 0.25 ? 'Prepago/Escrow' : 
          pd30 > 0.10 ? 'Anticipo+Contraentrega' : 
          'Normal/Contraentrega',
    anticipo: pd30 > 0.25 ? 100 : 
              pd30 > 0.10 ? Math.min(60, 30 + Math.round(factura.monto / 250000) * 5) : 
              Math.min(20, Math.round(factura.monto / 500000) * 5),
    escrow: pd30 > 0.25,
    stop: pd30 > 0.25 || clienteScore.color === 'Rojo'
  };
  
  return { pd30, pd90, inv_score, recomendacion };
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
      const { pd30, pd90, inv_score, recomendacion } = calcularInvScore(factura, clienteScore);
      
      await supabase
        .from('facturas')
        .update({
          pd30,
          pd90,
          inv_score,
          recomendacion_json: recomendacion
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
