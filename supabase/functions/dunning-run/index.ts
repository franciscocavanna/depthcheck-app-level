import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { playbookId } = await req.json();

    // Obtener configuración del playbook
    const { data: playbook, error: playbookError } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbookId)
      .eq('activo', true)
      .single();

    if (playbookError || !playbook) {
      return new Response(
        JSON.stringify({ error: 'Playbook no encontrado o inactivo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = playbook.config_json || {};
    const sequence = config.sequence || [
      { name: "pre_due_t7", offset_days: -7, channel: "email" },
      { name: "pre_due_t3", offset_days: -3, channel: "whatsapp" },
      { name: "due_t0", offset_days: 0, channel: "email" },
      { name: "overdue_t5", offset_days: 5, channel: "whatsapp" },
      { name: "overdue_t10_escalate", offset_days: 10, channel: "email" }
    ];

    // Obtener facturas pendientes y vencidas
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('*, clientes(*)')
      .in('estado', ['pendiente', 'vencida', 'parcial'])
      .order('pd30', { ascending: false });

    if (facturasError) throw facturasError;

    const hoy = new Date();
    const horaInicio = playbook.ventana_horaria_inicio || '09:00:00';
    const horaFin = playbook.ventana_horaria_fin || '18:00:00';
    let trabajosCreados = 0;

    for (const factura of facturas || []) {
      const fechaVenc = new Date(factura.fecha_vencimiento);
      const diasDesdeVenc = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24));

      for (const step of sequence) {
        // Calcular fecha programada según offset
        const fechaProgramada = new Date(fechaVenc);
        fechaProgramada.setDate(fechaProgramada.getDate() + step.offset_days);
        
        // Si la fecha programada es hoy o pasada, programar
        if (fechaProgramada <= hoy) {
          // Verificar si ya existe un trabajo para esta factura + tipo
          const { data: existing } = await supabase
            .from('dunning_queue')
            .select('id')
            .eq('factura_id', factura.id)
            .eq('tipo_mensaje', step.name)
            .maybeSingle();

          if (!existing) {
            // Calcular prioridad: pd30 * saldo pendiente
            const saldoPendiente = (factura.monto || 0) - (factura.monto_pagado || 0);
            const prioridad = (factura.pd30 || 0) * saldoPendiente;

            // Programar dentro de ventana horaria
            const horaProgr = new Date(fechaProgramada);
            const [h, m] = horaInicio.split(':');
            horaProgr.setHours(parseInt(h), parseInt(m), 0, 0);

            const { error: insertError } = await supabase
              .from('dunning_queue')
              .insert({
                factura_id: factura.id,
                cliente_id: factura.cliente_id,
                tipo_mensaje: step.name,
                offset_dias: step.offset_days,
                canal: step.channel,
                fecha_programada: horaProgr.toISOString(),
                prioridad,
                estado: 'pendiente'
              });

            if (!insertError) trabajosCreados++;
          }
        }
      }
    }

    console.log(`Dunning run completado. ${trabajosCreados} trabajos creados.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        playbook: playbook.nombre,
        trabajos_creados: trabajosCreados,
        facturas_procesadas: facturas?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en dunning-run:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});