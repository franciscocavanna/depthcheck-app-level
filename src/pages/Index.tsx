import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-primary mb-4">CobraPro</h1>
        <p className="text-2xl text-muted-foreground mb-8">
          Cobranza inteligente para PyMEs
        </p>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Mejora tu cobranza sin links de pago. Prioriza facturas, orquesta recordatorios
          automáticos y concilia transferencias bancarias con inteligencia.
        </p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Comenzar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
