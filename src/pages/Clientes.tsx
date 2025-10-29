import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Clientes = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de cartera de clientes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cartera de Clientes</CardTitle>
            <CardDescription>
              Vista con PayScore y estado de cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lista de clientes próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clientes;