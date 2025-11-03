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

    const { limit = 10 } = await req.json();

    // Obtener trabajos pendientes ordenados por prioridad
    const { data: trabajos, error: trabajosError } = await supabase
      .from('dunning_queue')
      .select('*, facturas(*), clientes(*)')
      .eq('estado', 'pendiente')
      .lte('fecha_programada', new Date().toISOString())
      .order('prioridad', { ascending: false })
      .limit(limit);

    if (trabajosError) throw trabajosError;

    // Plantillas por defecto
    const templates: Record<string, string> = {
      pre_due_t7: "Hola {nombre}, te recordamos que la factura {numero} por {monto} vence en 7 días. Podés pagarla desde nuestro portal.",
      pre_due_t3: "Hola {nombre}, ¿cómo estás? Te escribimos porque la factura {numero} por {monto} vence el {vencimiento}. Podés pagar desde {link_pago}. Si necesitás escrow o dividir en anticipo + contraentrega, avisanos. ¡Gracias!",
      due_t0: "Hola {nombre}. Hoy vence {numero} por {monto}. Para evitar recargos, podés abonarla acá: {link_pago}. Si preferís escrow, activamos en 1 clic.",
      overdue_t5: "Hola {nombre}. Vemos {numero} con 5 días de atraso. Podemos mantener precio sin recargo si confirmás pago/anticipo {anticipo}% hoy. ¿Te ayuda si lo coordinamos por acá?",
      overdue_t10_escalate: "Hola {nombre}. {numero} registra 10 días de atraso. Según política, debemos pausar entregas hasta confirmar anticipo {anticipo}% o escrow. ¿Cómo preferís proceder hoy?",
      promesa_confirmacion: "Perfecto, registramos tu promesa de pago por {monto} para {fecha}. Te recordamos 24h antes. Si necesitás modificar, respondé este mensaje.",
      pago_recibido: "Gracias {nombre}. Acreditamos {monto} de la factura {numero}. Si pagás la próxima dentro de 7 días, aplicamos 2% de pronto pago."
    };

    let mensajesEnviados = 0;

    for (const trabajo of trabajos || []) {
      const factura = trabajo.facturas;
      const cliente = trabajo.clientes;
      
      if (!factura || !cliente) continue;

      // Obtener template
      const template = templates[trabajo.tipo_mensaje] || "Mensaje no configurado";
      
      // Reemplazar variables
      const recomendacion = factura.recomendacion_json || {};
      const mensaje = template
        .replace(/{nombre}/g, cliente.razon_social || 'Cliente')
        .replace(/{numero}/g, factura.numero || '')
        .replace(/{monto}/g, `$${factura.monto?.toLocaleString('es-AR') || 0}`)
        .replace(/{vencimiento}/g, new Date(factura.fecha_vencimiento).toLocaleDateString('es-AR'))
        .replace(/{anticipo}/g, String(recomendacion.anticipo || 0))
        .replace(/{link_pago}/g, `https://pagos.empresa.com/${factura.id}`)
        .replace(/{fecha}/g, new Date().toLocaleDateString('es-AR'));

      // Simular envío (aquí integrarías Email/WhatsApp real)
      console.log(`[${trabajo.canal}] → ${cliente.email || cliente.telefono}`);
      console.log(`Mensaje: ${mensaje}`);

      // Registrar interacción
      await supabase.from('interacciones').insert({
        cliente_id: cliente.id,
        factura_id: factura.id,
        canal: trabajo.canal,
        plantilla: trabajo.tipo_mensaje,
        mensaje_enviado: mensaje,
        resultado: 'enviado'
      });

      // Marcar trabajo como enviado
      await supabase
        .from('dunning_queue')
        .update({
          estado: 'enviado',
          fecha_enviado: new Date().toISOString()
        })
        .eq('id', trabajo.id);

      mensajesEnviados++;
    }

    console.log(`Dispatch completado. ${mensajesEnviados} mensajes enviados.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        mensajes_enviados: mensajesEnviados,
        trabajos_procesados: trabajos?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en agents-dispatch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});