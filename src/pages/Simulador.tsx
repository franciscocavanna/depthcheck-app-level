import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";

const Simulador = () => {
  const [params, setParams] = useState({
    anticipoVerde: 10,
    anticipoAmarillo: 40,
    anticipoRojo: 100,
    umbralPD30: 0.25,
    umbralPD180: 0.08,
    descuentoProntoPago: 2,
    costoCapital: 45,
    lgd: 70
  });

  const [results, setResults] = useState<any>(null);

  const simulate = () => {
    // Simulación simplificada
    const dsoActual = 45;
    const deltaDSO = -5; // Mejora estimada
    const elEsperado = 0.15 * 0.7 * 1000000; // PD × LGD × EAD
    const margenEstimado = 0.85 * 1000000 - elEsperado;

    setResults({
      dsoActual,
      dsoProyectado: dsoActual + deltaDSO,
      deltaDSO,
      elEsperado,
      margenEstimado
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulador What-If</h1>
          <p className="text-muted-foreground">Proyección de impacto en DSO y EL</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Política</CardTitle>
              <CardDescription>Ajusta las condiciones de cobro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="anticipoVerde">Anticipo Verde (%)</Label>
                  <Input
                    id="anticipoVerde"
                    type="number"
                    value={params.anticipoVerde}
                    onChange={(e) => setParams({...params, anticipoVerde: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anticipoAmarillo">Anticipo Amarillo (%)</Label>
                  <Input
                    id="anticipoAmarillo"
                    type="number"
                    value={params.anticipoAmarillo}
                    onChange={(e) => setParams({...params, anticipoAmarillo: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anticipoRojo">Anticipo Rojo (%)</Label>
                  <Input
                    id="anticipoRojo"
                    type="number"
                    value={params.anticipoRojo}
                    onChange={(e) => setParams({...params, anticipoRojo: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="umbralPD30">Umbral PD30</Label>
                  <Input
                    id="umbralPD30"
                    type="number"
                    step="0.01"
                    value={params.umbralPD30}
                    onChange={(e) => setParams({...params, umbralPD30: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="umbralPD180">Umbral PD180</Label>
                  <Input
                    id="umbralPD180"
                    type="number"
                    step="0.01"
                    value={params.umbralPD180}
                    onChange={(e) => setParams({...params, umbralPD180: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descuentoProntoPago">Descuento Pronto Pago (%)</Label>
                  <Input
                    id="descuentoProntoPago"
                    type="number"
                    step="0.1"
                    value={params.descuentoProntoPago}
                    onChange={(e) => setParams({...params, descuentoProntoPago: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costoCapital">Costo Capital TNA (%)</Label>
                  <Input
                    id="costoCapital"
                    type="number"
                    value={params.costoCapital}
                    onChange={(e) => setParams({...params, costoCapital: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lgd">LGD - Loss Given Default (%)</Label>
                <Input
                  id="lgd"
                  type="number"
                  value={params.lgd}
                  onChange={(e) => setParams({...params, lgd: Number(e.target.value)})}
                />
              </div>

              <Button onClick={simulate} className="w-full">
                <Calculator className="mr-2 h-4 w-4" />
                Simular Impacto
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados de Simulación</CardTitle>
              <CardDescription>Proyección de métricas clave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!results ? (
                <p className="text-sm text-muted-foreground">
                  Configura los parámetros y presiona Simular
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">DSO Actual:</span>
                      <span className="text-2xl font-bold">{results.dsoActual} días</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">DSO Proyectado:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {results.dsoProyectado} días
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ΔDSO:</span>
                      <div className="flex items-center gap-2">
                        {results.deltaDSO < 0 ? (
                          <TrendingDown className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-xl font-bold ${results.deltaDSO < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {results.deltaDSO} días
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">EL Esperado:</span>
                      <span className="text-lg font-bold text-red-600">
                        ${(results.elEsperado / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Margen Estimado:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${(results.margenEstimado / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    Aplicar como Nueva Política
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Simulaciones</CardTitle>
            <CardDescription>Versiones probadas y resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Log de simulaciones próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Simulador;
