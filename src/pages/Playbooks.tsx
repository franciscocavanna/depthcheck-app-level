import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Playbooks = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playbooks & Plantillas</h1>
          <p className="text-muted-foreground">Gestión de secuencias automáticas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Playbooks Configurados</CardTitle>
            <CardDescription>
              Editor de secuencias de cobranza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gestión de playbooks próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Playbooks;