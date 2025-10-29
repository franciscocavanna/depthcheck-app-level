import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Pagos = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bandeja de Pagos</h1>
          <p className="text-muted-foreground">Conciliación de pagos recibidos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cobranzas Recibidas</CardTitle>
            <CardDescription>
              Conciliadas, sugeridas, sospechosas y sin match
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bandeja de pagos próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Pagos;