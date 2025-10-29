import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Vista general de cobranzas</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DSO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">62 días</div>
              <p className="text-xs text-muted-foreground">Meta: 45 días</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recupero 30d</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72%</div>
              <p className="text-xs text-muted-foreground">+5% vs mes anterior</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promesas cumplidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">50%</div>
              <p className="text-xs text-muted-foreground">6 de 12 promesas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash-in semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$450K</div>
              <p className="text-xs text-muted-foreground">Esta semana</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acciones de hoy</CardTitle>
            <CardDescription>
              Top facturas por InvScore que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Panel de acciones próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;