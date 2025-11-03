import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para generar números pseudo-aleatorios con seed
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seed = 42 } = await req.json();
    const rng = new SeededRandom(seed);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando generación de dataset demo con seed:', seed);

    // 1. Generar 50 clientes en 3 clusters
    const sectores = ['Retail', 'Manufactura', 'Servicios', 'Tecnología', 'Construcción'];
    const clientes = [];
    
    for (let i = 0; i < 50; i++) {
      const cluster = i < 20 ? 'Verde' : (i < 40 ? 'Amarillo' : 'Rojo');
      const pctOnTime = cluster === 'Verde' ? rng.range(90, 100) : 
                       cluster === 'Amarillo' ? rng.range(70, 89) : 
                       rng.range(30, 69);
      
      const cliente = {
        cuit: `20-${30000000 + i * 100000}-${rng.range(0, 9)}`,
        razon_social: `Cliente ${i + 1} SA`,
        sector: rng.choice(sectores),
        antiguedad_meses: rng.range(12, 120),
        ventas_12m: rng.range(500000, 5000000),
        dso_180: rng.range(30, 90),
        pct_on_time_180: pctOnTime / 100,
        aging30: rng.range(0, 50000),
        aging60: rng.range(0, 30000),
        aging90: rng.range(0, 15000),
        concent_top3: rng.next() * 0.5 + 0.3,
        tendencia_pd: (rng.next() - 0.5) * 0.1,
        pd_180: cluster === 'Verde' ? rng.next() * 0.08 : 
                cluster === 'Amarillo' ? 0.08 + rng.next() * 0.12 : 
                0.20 + rng.next() * 0.30,
        pay_score_color: cluster,
        deuda_total: rng.range(50000, 500000),
        deuda_vencida: cluster === 'Rojo' ? rng.range(20000, 200000) : 
                      cluster === 'Amarillo' ? rng.range(5000, 50000) : 
                      rng.range(0, 10000)
      };
      clientes.push(cliente);
    }

    // Insertar clientes
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .insert(clientes)
      .select();

    if (clientesError) {
      console.error('Error insertando clientes:', clientesError);
      throw clientesError;
    }

    console.log(`Insertados ${clientesData.length} clientes`);

    console.log('Generando facturas...');
    
    // 2. Generar ~2000 facturas (40 por cliente en promedio)
    const facturas = [];
    const estados = ['pendiente', 'vencida', 'parcial', 'paga'];
    
    for (const cliente of clientesData) {
      const numFacturas = rng.range(30, 50);
      
      for (let i = 0; i < numFacturas; i++) {
        const monto = Math.exp(rng.next() * 3 + 8); // Log-normal
        const montoRedondeado = Math.round(monto * 100) / 100;
        const diasVenc = rng.range(-30, 90);
        const fechaEmision = new Date();
        fechaEmision.setDate(fechaEmision.getDate() - 90 + i * 2);
        
        const fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        const estado = diasVenc < -10 ? 'paga' : 
                      diasVenc < 0 ? rng.choice(['pendiente', 'parcial']) : 
                      diasVenc < 15 ? 'pendiente' : 
                      'vencida';
        
        const pd30 = cliente.pay_score_color === 'Verde' ? rng.next() * 0.10 : 
                    cliente.pay_score_color === 'Amarillo' ? 0.10 + rng.next() * 0.15 : 
                    0.25 + rng.next() * 0.40;
        
        const factura = {
          cliente_id: cliente.id,
          numero: `FAC-${(cliente.cuit || '0000').slice(-4)}-${(i + 1).toString().padStart(4, '0')}`,
          fecha_emision: fechaEmision.toISOString().split('T')[0],
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          monto: montoRedondeado,
          estado,
          moneda: 'ARS',
          devoluciones: rng.next() < 0.1 ? rng.range(1, 3) : 0,
          canal_entrega: rng.choice(['Email', 'Portal', 'Correo']),
          pd30,
          pd90: pd30 * 0.7,
          inv_score: Math.round(pd30 * 100),
          monto_pagado: estado === 'paga' ? montoRedondeado : (estado === 'parcial' ? Math.round(montoRedondeado * 0.5 * 100) / 100 : 0),
          recomendacion_json: {
            modo: pd30 > 0.25 ? 'Prepago/Escrow' : 
                  pd30 > 0.10 ? 'Anticipo+Contraentrega' : 
                  'Normal/Contraentrega',
            anticipo: pd30 > 0.25 ? 100 : (pd30 > 0.10 ? 40 : 10)
          }
        };
        facturas.push(factura);
      }
    }

    console.log(`Generadas ${facturas.length} facturas, insertando en lotes...`);

    // Insertar facturas en lotes de 100 (reducido para evitar timeouts)
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < facturas.length; i += batchSize) {
      const batch = facturas.slice(i, i + batchSize);
      
      try {
        const { error: facturasError } = await supabase
          .from('facturas')
          .insert(batch);
        
        if (facturasError) {
          console.error('Error insertando batch de facturas:', facturasError);
          console.error('Batch problemático:', JSON.stringify(batch.slice(0, 2)));
          throw facturasError;
        }
        
        totalInserted += batch.length;
        console.log(`Insertadas ${totalInserted}/${facturas.length} facturas`);
      } catch (batchError) {
        console.error('Error en batch:', batchError);
        throw batchError;
      }
    }

    // 3. Registrar evento
    await supabase.from('eventos').insert({
      entidad_tipo: 'dataset',
      tipo_evento: 'generacion',
      payload_json: {
        seed,
        clientes: clientesData.length,
        facturas: facturas.length
      }
    });

    console.log('Dataset generado exitosamente');

    return new Response(
      JSON.stringify({
        success: true,
        clientes: clientesData.length,
        facturas: facturas.length,
        seed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en generate-demo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
