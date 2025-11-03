import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const Clientes = () => {
  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('pay_score_color', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getColorBadge = (color: string | null) => {
    if (!color) return <Badge variant="outline">Sin score</Badge>;
    
    const colorMap: Record<string, string> = {
      'Verde': 'bg-green-500',
      'Amarillo': 'bg-yellow-500',
      'Rojo': 'bg-red-500'
    };

    return (
      <Badge className={colorMap[color] || ''}>
        {color}
      </Badge>
    );
  };

  const getTendencia = (tendencia: number | null) => {
    if (!tendencia) return null;
    
    return tendencia > 0 ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <TrendingUp className="h-4 w-4 text-green-500" />
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Cartera con PayScore y análisis de riesgo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cartera de Clientes</CardTitle>
            <CardDescription>
              PayScore, PD180, deuda vencida y condiciones activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando clientes...</p>
            ) : !clientes || clientes.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay clientes. Ve al Dashboard y genera el Dataset Demo.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>PayScore</TableHead>
                    <TableHead>PD180</TableHead>
                    <TableHead>Tendencia 30d</TableHead>
                    <TableHead>Deuda Total</TableHead>
                    <TableHead>Deuda Vencida</TableHead>
                    <TableHead>DSO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.razon_social}</TableCell>
                      <TableCell className="font-mono text-sm">{cliente.cuit}</TableCell>
                      <TableCell>{cliente.sector || '-'}</TableCell>
                      <TableCell>{getColorBadge(cliente.pay_score_color)}</TableCell>
                      <TableCell>
                        {cliente.pd_180 ? (
                          <span className="font-mono text-sm">
                            {(cliente.pd_180 * 100).toFixed(1)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        {getTendencia(cliente.tendencia_pd)}
                        {cliente.tendencia_pd ? (
                          <span className="text-xs">{Math.abs(cliente.tendencia_pd).toFixed(1)}%</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        ${((cliente.deuda_total || 0) / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell>
                        {cliente.deuda_vencida && cliente.deuda_vencida > 0 ? (
                          <span className="text-red-600 font-medium">
                            ${((cliente.deuda_vencida || 0) / 1000).toFixed(0)}k
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.dso_180 ? Math.round(cliente.dso_180) + ' días' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clientes;