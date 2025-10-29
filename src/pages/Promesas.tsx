import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Promesas = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promesas de Pago</h1>
          <p className="text-muted-foreground">Seguimiento de compromisos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendario de Promesas</CardTitle>
            <CardDescription>
              Pactadas, cumplidas e incumplidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gestión de promesas próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Promesas;