import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Configuracion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [config, setConfig] = useState({
    inflacion_anual: 1.20,
    tasa_libre_anual: 0.05,
    lgd: 0.45,
    beta_plazo: 0.15,
    gamma_riesgo: 0.70,
  });

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('config').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (configData) {
      setConfig({
        inflacion_anual: configData.inflacion_anual || 1.20,
        tasa_libre_anual: configData.tasa_libre_anual || 0.05,
        lgd: configData.lgd || 0.45,
        beta_plazo: configData.beta_plazo || 0.15,
        gamma_riesgo: configData.gamma_riesgo || 0.70,
      });
    }
  }, [configData]);

  const updateMutation = useMutation({
    mutationFn: async (newConfig: typeof config) => {
      const { error } = await supabase.from('config').update(newConfig).eq('id', configData?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      toast({ title: "Configuración guardada" });
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Parámetros financieros del sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>VP Real & Anticipo</CardTitle>
            <CardDescription>Inflación, tasa libre, LGD y coeficientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inflación Anual (πₐ)</Label>
                <Input type="number" step="0.01" value={config.inflacion_anual} 
                  onChange={(e) => setConfig({...config, inflacion_anual: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Tasa Libre (r_f)</Label>
                <Input type="number" step="0.01" value={config.tasa_libre_anual}
                  onChange={(e) => setConfig({...config, tasa_libre_anual: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>LGD</Label>
                <Input type="number" step="0.01" value={config.lgd}
                  onChange={(e) => setConfig({...config, lgd: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Beta Plazo (β)</Label>
                <Input type="number" step="0.01" value={config.beta_plazo}
                  onChange={(e) => setConfig({...config, beta_plazo: parseFloat(e.target.value)})} />
              </div>
              <div>
                <Label>Gamma Riesgo (γ)</Label>
                <Input type="number" step="0.01" value={config.gamma_riesgo}
                  onChange={(e) => setConfig({...config, gamma_riesgo: parseFloat(e.target.value)})} />
              </div>
            </div>
            <Button onClick={() => updateMutation.mutate(config)}>Guardar</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Configuracion;