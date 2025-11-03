import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";

const Playbooks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: queueStats } = useQuery({
    queryKey: ['dunning-queue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dunning_queue')
        .select('estado')
        .eq('estado', 'pendiente');
      
      if (error) throw error;
      return { pendiente: data?.length || 0 };
    },
    refetchInterval: 30000, // refresh cada 30s
  });

  const runDunningMutation = useMutation({
    mutationFn: async (playbookId: string) => {
      const { data, error } = await supabase.functions.invoke('dunning-run', {
        body: { playbookId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dunning-queue-stats'] });
      toast({
        title: "Dunning ejecutado",
        description: `${data.trabajos_creados} trabajos creados para ${data.facturas_procesadas} facturas`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dispatchAgentsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agents-dispatch', {
        body: { limit: 20 }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dunning-queue-stats'] });
      toast({
        title: "Mensajes enviados",
        description: `${data.mensajes_enviados} mensajes despachados`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Playbooks & Dunning</h1>
            <p className="text-muted-foreground">Gestión de secuencias automáticas de cobranza</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => dispatchAgentsMutation.mutate()}
              disabled={dispatchAgentsMutation.isPending || (queueStats?.pendiente || 0) === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Enviar Mensajes ({queueStats?.pendiente || 0})
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Playbooks Configurados</CardTitle>
            <CardDescription>
              Secuencias de recordatorios y acciones automáticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando playbooks...</p>
            ) : playbooks && playbooks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ventana Horaria</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playbooks.map((playbook) => (
                    <TableRow key={playbook.id}>
                      <TableCell className="font-medium">{playbook.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {playbook.descripcion || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{playbook.trigger || 'Manual'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={playbook.activo ? "default" : "secondary"}>
                          {playbook.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {playbook.ventana_horaria_inicio} - {playbook.ventana_horaria_fin}
                      </TableCell>
                      <TableCell className="text-sm">
                        {playbook.rate_limit_diario}/día
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => runDunningMutation.mutate(playbook.id)}
                          disabled={runDunningMutation.isPending || !playbook.activo}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Ejecutar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No hay playbooks configurados aún.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Los playbooks se crean automáticamente al generar datos demo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secuencia de Dunning por Defecto</CardTitle>
            <CardDescription>
              Template automático aplicado a facturas pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <Badge>T-7</Badge>
                <div className="flex-1">
                  <p className="font-medium">Recordatorio Pre-Vencimiento</p>
                  <p className="text-sm text-muted-foreground">Email cordial informando sobre vencimiento próximo</p>
                </div>
                <Badge variant="outline">Email</Badge>
              </div>

              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <Badge>T-3</Badge>
                <div className="flex-1">
                  <p className="font-medium">Recordatorio Cercano</p>
                  <p className="text-sm text-muted-foreground">WhatsApp ofreciendo opciones de pago (escrow, anticipo)</p>
                </div>
                <Badge variant="outline">WhatsApp</Badge>
              </div>

              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <Badge>T0</Badge>
                <div className="flex-1">
                  <p className="font-medium">Día de Vencimiento</p>
                  <p className="text-sm text-muted-foreground">Email recordando vencimiento y evitar recargos</p>
                </div>
                <Badge variant="outline">Email</Badge>
              </div>

              <div className="flex items-center gap-4 p-3 border rounded-lg bg-orange-50 dark:bg-orange-950">
                <Badge variant="destructive">T+5</Badge>
                <div className="flex-1">
                  <p className="font-medium">Atraso Leve</p>
                  <p className="text-sm text-muted-foreground">WhatsApp firme proponiendo anticipo para evitar recargos</p>
                </div>
                <Badge variant="outline">WhatsApp</Badge>
              </div>

              <div className="flex items-center gap-4 p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                <Badge variant="destructive">T+10</Badge>
                <div className="flex-1">
                  <p className="font-medium">Escalación</p>
                  <p className="text-sm text-muted-foreground">Email notificando pausa de entregas hasta confirmar anticipo/escrow</p>
                </div>
                <Badge variant="outline">Email + Tarea</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Playbooks;