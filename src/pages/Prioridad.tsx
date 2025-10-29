import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Prioridad = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prioridad</h1>
          <p className="text-muted-foreground">Facturas ordenadas por InvScore</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Facturas Priorizadas</CardTitle>
            <CardDescription>
              Vista de facturas con scoring y acciones sugeridas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lista de facturas próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Prioridad;