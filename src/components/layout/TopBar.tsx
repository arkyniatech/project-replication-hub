import { Search, HelpCircle, LogOut, User, Sun, Moon, Laptop, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LojaBadge } from "@/components/multiunidade/LojaBadge";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import { HeaderAvisos } from "./HeaderAvisos";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";

interface TopBarProps {
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onOpenMobileNav: () => void;
}

export function TopBar({ onOpenSearch, onOpenHelp, onOpenMobileNav }: TopBarProps) {
  const { user, signOut } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 md:gap-4">
        {/* #16.3: só existe abaixo de md — acima disso a NavRail já está
            visível e fixa, e este botão ficaria redundante. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMobileNav}
          className="p-2 md:hidden"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <HeaderAvisos />
      </div>

      {/* #16.3: gap-4 fixo somado a LojaBadge + busca + ajuda + avatar
          ultrapassava 390px e forçava scroll horizontal na página inteira.
          gap-1 em mobile recupera o espaço sem esconder nenhum controle. */}
      <div className="flex items-center gap-1 md:gap-4">
        <LojaBadge />

        {/* Dev Role Switcher - apenas em dev. Escondido abaixo de md: é uma
            ferramenta de debug de desktop, e em telas pequenas ela sozinha
            já bastava para forçar scroll horizontal (#16.3). */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="hidden md:block">
            <DevRoleSwitcher />
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
            className="p-2"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHelp}
            className="p-2"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Minha Conta</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tema</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Claro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Escuro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="mr-2 h-4 w-4" />
                <span>Sistema</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}