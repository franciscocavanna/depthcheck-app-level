import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Importar = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Datos</h1>
          <p className="text-muted-foreground">Carga masiva de clientes, facturas y extractos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Importación CSV/Excel</CardTitle>
            <CardDescription>
              Carga y validación de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sistema de importación próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Importar;