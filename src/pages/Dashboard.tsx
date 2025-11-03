import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Play, RefreshCw } from "lucide-react";
import { useState } from "react";

const Dashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch KPIs y estado del sistema
  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const [clientes, facturas, promesas, modelos] = await Promise.all([
        supabase.from('clientes').select('pay_score_color, deuda_total, deuda_vencida'),
        supabase.from('facturas').select('monto, estado, monto_pagado, pd30, inv_score'),
        supabase.from('promesas').select('estado, monto_promesa'),
        supabase.from('modelos').select('*').order('created_at', { ascending: false }).limit(1)
      ]);

      const totalClientes = clientes.data?.length || 0;
      const verde = clientes.data?.filter(c => c.pay_score_color === 'Verde').length || 0;
      const amarillo = clientes.data?.filter(c => c.pay_score_color === 'Amarillo').length || 0;
      const rojo = clientes.data?.filter(c => c.pay_score_color === 'Rojo').length || 0;
      
      const totalFacturas = facturas.data?.length || 0;
      const totalMonto = facturas.data?.reduce((sum, f) => sum + Number(f.monto || 0), 0) || 0;
      const totalCobrado = facturas.data?.reduce((sum, f) => sum + Number(f.monto_pagado || 0), 0) || 0;
      const dso = totalMonto > 0 ? Math.round((totalMonto - totalCobrado) / totalMonto * 45) : 0;
      
      const promesasCumplidas = promesas.data?.filter(p => p.estado === 'cumplida').length || 0;
      const totalPromesas = promesas.data?.length || 0;
      const pctPromesas = totalPromesas > 0 ? Math.round((promesasCumplidas / totalPromesas) * 100) : 0;

      return {
        dso,
        recupero30d: totalMonto > 0 ? Math.round((totalCobrado / totalMonto) * 100) : 0,
        promesasCumplidas: pctPromesas,
        cashInSemanal: totalCobrado,
        totalClientes,
        verde,
        amarillo,
        rojo,
        totalFacturas,
        modeloActual: modelos.data?.[0] || null
      };
    }
  });

  const generateDataset = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-demo', {
        body: { seed: 42 }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Dataset generado",
        description: "50 clientes y 2,000 facturas con seed=42",
      });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  });

  const trainModel = useMutation({
    mutationFn: async (engine: 'heuristico' | 'ml') => {
      const { data, error } = await supabase.functions.invoke('train-model', {
        body: { engine }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Modelo entrenado",
        description: "El modelo se entrenó correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const recalculate = useMutation({
    mutationFn: async (engine: 'heuristico' | 'ml') => {
      const { data, error } = await supabase.functions.invoke('score-run', {
        body: { engine }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Scores recalculados",
        description: "Todos los scores se actualizaron",
      });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DepthCheck v3 – Demo Center</h1>
          <p className="text-muted-foreground">Semáforos de cobro con IA (sin crédito)</p>
        </div>

        {/* Controles principales */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dataset Demo</CardTitle>
              <CardDescription>Datos reproducibles (seed=42)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generateDataset.mutate()} 
                disabled={isGenerating}
                className="w-full"
              >
                <Database className="mr-2 h-4 w-4" />
                {isGenerating ? "Generando..." : "Generar Dataset"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entrenar Modelo</CardTitle>
              <CardDescription>ML (LightGBM) + calibración</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button 
                onClick={() => trainModel.mutate('heuristico')}
                variant="outline"
                className="flex-1"
              >
                Heurístico
              </Button>
              <Button 
                onClick={() => trainModel.mutate('ml')}
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                ML
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recalcular Scores</CardTitle>
              <CardDescription>PayScore e InvScore</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button 
                onClick={() => recalculate.mutate('heuristico')}
                variant="outline"
                className="flex-1"
              >
                Heurístico
              </Button>
              <Button 
                onClick={() => recalculate.mutate('ml')}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                ML
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* KPIs principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DSO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.dso || 0} días</div>
              <p className="text-xs text-muted-foreground">Days Sales Outstanding</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">% en Término</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.recupero30d || 0}%</div>
              <p className="text-xs text-muted-foreground">Recupero 30 días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Promesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.promesasCumplidas || 0}%</div>
              <p className="text-xs text-muted-foreground">Cumplimiento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cash-in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((kpis?.cashInSemanal || 0) / 1000).toFixed(0)}k
              </div>
              <p className="text-xs text-muted-foreground">Cobrado total</p>
            </CardContent>
          </Card>
        </div>

        {/* Estado del sistema */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Estado del Dataset</CardTitle>
              <CardDescription>Datos actuales en el sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Clientes:</span>
                <Badge variant="outline">{kpis?.totalClientes || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Facturas:</span>
                <Badge variant="outline">{kpis?.totalFacturas || 0}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Badge className="bg-green-500">Verde: {kpis?.verde || 0}</Badge>
                <Badge className="bg-yellow-500">Amarillo: {kpis?.amarillo || 0}</Badge>
                <Badge className="bg-red-500">Rojo: {kpis?.rojo || 0}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modelo Activo</CardTitle>
              <CardDescription>Configuración del scoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpis?.modeloActual ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm">Motor:</span>
                    <Badge>{kpis.modeloActual.tipo_motor}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Versión:</span>
                    <Badge variant="outline">{kpis.modeloActual.version}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dataset:</span>
                    <Badge variant="outline">{kpis.modeloActual.dataset_size || 0} registros</Badge>
                  </div>
                  {kpis.modeloActual.champion && (
                    <Badge className="bg-blue-500">Champion</Badge>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay modelo entrenado. Genera un dataset y entrena el modelo.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
