import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, ScanBarcode, Save, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFrameProps {
  children: ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  // Ensure dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black sm:p-6 overflow-hidden">
      {/* Device wrapper */}
      <div className="relative w-full max-w-[420px] h-[100dvh] sm:h-[800px] sm:max-h-[100dvh] bg-background sm:rounded-[40px] sm:border-[8px] border-border sm:shadow-2xl overflow-hidden flex flex-col mx-auto ring-1 ring-white/10">
        
        {/* Device inner glow/noise overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50"></div>
        
        {/* Top bar (faux device status) */}
        <div className="h-8 w-full bg-black/40 flex items-center justify-center px-4 shrink-0 z-10 border-b border-border/50">
          <div className="w-16 h-1 rounded-full bg-white/20"></div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto relative z-0 flex flex-col pb-[68px]">
          {children}
        </div>

        {/* Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
}

function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/slots", icon: Save, label: "Slots" },
    { path: "/pokedex", icon: BookOpen, label: "Dex" },
    { path: "/nfc", icon: ScanBarcode, label: "NFC" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[68px] bg-card border-t border-card-border/50 flex items-center justify-around px-2 z-40 backdrop-blur-md">
      {navItems.map((item) => {
        const isActive = location === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 active:scale-95",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <Icon className={cn("w-6 h-6 mb-1", isActive && "drop-shadow-[0_0_8px_rgba(33,214,142,0.8)]")} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide uppercase">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
