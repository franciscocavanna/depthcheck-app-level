import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BookOpen,
  Calendar,
  Upload,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Demo Center", path: "/dashboard" },
    { icon: FileText, label: "Facturas", path: "/prioridad" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: LayoutDashboard, label: "Modelos", path: "/modelos" },
    { icon: LayoutDashboard, label: "Simulador", path: "/simulador" },
    { icon: CreditCard, label: "Pagos", path: "/pagos" },
    { icon: BookOpen, label: "Dunning", path: "/playbooks" },
    { icon: Calendar, label: "Promesas", path: "/promesas" },
    { icon: Upload, label: "Data Hub", path: "/importar" },
  ];

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              mobile && "text-lg"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r bg-card overflow-y-auto">
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-2xl font-bold text-primary">DepthCheck v3</h1>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-4">
            <NavLinks />
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 border-b bg-card">
        <h1 className="text-xl font-bold text-primary">DepthCheck v3</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-16 px-6 border-b">
                <h1 className="text-2xl font-bold text-primary">DepthCheck v3</h1>
              </div>
              <nav className="flex-1 space-y-1 px-4 py-4">
                <NavLinks mobile />
              </nav>
              <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;