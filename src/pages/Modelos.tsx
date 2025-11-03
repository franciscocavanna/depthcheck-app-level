import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp } from "lucide-react";

const Modelos = () => {
  const { data: modelos } = useQuery({
    queryKey: ['modelos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const formatMetrics = (metrics: any) => {
    if (!metrics) return null;
    return (
      <div className="space-y-1 text-xs">
        {metrics.auc && <div>AUC: {metrics.auc.toFixed(3)}</div>}
        {metrics.ks && <div>KS: {metrics.ks.toFixed(3)}</div>}
        {metrics.brier && <div>Brier: {metrics.brier.toFixed(3)}</div>}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelos de Scoring</h1>
          <p className="text-muted-foreground">Motores ML, métricas y explicabilidad</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Modelos</CardTitle>
            <CardDescription>
              Versiones entrenadas con métricas y calibración
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!modelos || modelos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay modelos entrenados. Ve al Dashboard y entrena un modelo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motor</TableHead>
                    <TableHead>Versión</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Métricas</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.id}>
                      <TableCell>
                        <Badge variant={modelo.tipo_motor === 'ml' ? 'default' : 'outline'}>
                          {modelo.tipo_motor}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{modelo.version}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{modelo.objetivo}</Badge>
                      </TableCell>
                      <TableCell>{formatMetrics(modelo.metrics_json)}</TableCell>
                      <TableCell>{modelo.dataset_size || '-'} registros</TableCell>
                      <TableCell>
                        {modelo.champion && (
                          <Badge className="bg-blue-500">
                            <Trophy className="mr-1 h-3 w-3" />
                            Champion
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(modelo.created_at).toLocaleDateString('es-AR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Calibración</CardTitle>
              <CardDescription>Curva de calibración isotónica</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualización de calibración próximamente...
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explicabilidad (SHAP)</CardTitle>
              <CardDescription>Factores más importantes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Análisis de explicabilidad próximamente...
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>A/B Testing (Champion vs Challenger)</CardTitle>
            <CardDescription>
              Comparación de motores 80/20
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sistema de A/B testing próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Modelos;
