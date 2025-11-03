import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowUp } from "lucide-react";

const Prioridad = () => {
  const { data: facturas, isLoading } = useQuery({
    queryKey: ['facturas-prioridad'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas')
        .select('*, clientes(razon_social)')
        .order('inv_score', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getRecomendacion = (recom: any) => {
    if (!recom || !recom.modo) return <Badge variant="outline">Normal</Badge>;
    
    const colorMap: Record<string, string> = {
      'Prepago/Escrow': 'bg-red-500',
      'Anticipo+Contraentrega': 'bg-yellow-500',
      'Normal/Contraentrega': 'bg-green-500'
    };

    return (
      <Badge className={colorMap[recom.modo] || ''}>
        {recom.modo}
      </Badge>
    );
  };

  const getRiesgoMonto = (pd30: number | null, monto: number) => {
    if (!pd30) return 0;
    return pd30 * monto;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas Priorizadas</h1>
          <p className="text-muted-foreground">Ordenadas por InvScore y riesgo×monto</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cola de Prioridad</CardTitle>
            <CardDescription>
              Facturas con mayor scoring y recomendaciones de política
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando facturas...</p>
            ) : !facturas || facturas.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay facturas. Ve al Dashboard y genera el Dataset Demo.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Emisión</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>InvScore</TableHead>
                    <TableHead>PD30</TableHead>
                    <TableHead>Recomendación</TableHead>
                    <TableHead>Riesgo×Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas.map((factura) => {
                    const riesgoMonto = getRiesgoMonto(factura.pd30, Number(factura.monto));
                    return (
                      <TableRow key={factura.id}>
                        <TableCell className="font-mono font-medium">{factura.numero}</TableCell>
                        <TableCell>{(factura.clientes as any)?.razon_social || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(factura.fecha_emision).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(factura.fecha_vencimiento).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${((Number(factura.monto) || 0) / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell>
                          {factura.inv_score ? (
                            <Badge variant="destructive" className="font-mono">
                              {factura.inv_score}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {factura.pd30 ? (
                            <span className="font-mono text-sm">
                              {(factura.pd30 * 100).toFixed(1)}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getRecomendacion(factura.recomendacion_json)}</TableCell>
                        <TableCell>
                          {riesgoMonto > 0 ? (
                            <div className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3 text-red-500" />
                              <span className="text-sm font-medium text-red-600">
                                ${(riesgoMonto / 1000).toFixed(0)}k
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Prioridad;