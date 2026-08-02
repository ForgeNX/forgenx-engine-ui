import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Boxes, Cpu, Home, PieChart, Power, Settings, Users } from "lucide-react";

const ITEMS = [
  { icon: Home, label: "Nexus", to: "/" },
  { icon: Activity, label: "Fleet", to: "/fleet" },
  { icon: Cpu, label: "ForgeDGB", to: "/forge" },
  { icon: Users, label: "Workers" },
  { icon: Activity, label: "Signal" },
  { icon: PieChart, label: "Distribution" },
  { icon: Boxes, label: "Blocks" },
  { icon: Settings, label: "Config" },
];

export function SideRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Dashboard sections"
      className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-3 border-r border-border/60 bg-sidebar/70 py-5 backdrop-blur-md md:flex"
    >
      {ITEMS.map(({ icon: Icon, label, to }, index) => {
        const active = to ? pathname === to : false;
        const style = {
          animation: `rise 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 70}ms both`,
          background: active
            ? "linear-gradient(150deg, color-mix(in oklab, var(--neon-violet) 55%, transparent), color-mix(in oklab, var(--neon-pink) 30%, transparent))"
            : "transparent",
          boxShadow: active ? "0 0 22px color-mix(in oklab, var(--neon-violet) 60%, transparent)" : undefined,
        };
        const className =
          "group relative flex size-11 items-center justify-center rounded-xl border border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-pink";
        const inner = (
          <>
            <Icon className="size-5 text-foreground/80 transition-colors duration-300 group-hover:text-neon-pink" />
            <span className="pointer-events-none absolute left-14 z-20 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs tracking-wide uppercase group-hover:block">
              {label}
            </span>
          </>
        );

        return to ? (
          <Link
            key={label}
            to={to}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={className}
            style={style}
          >
            {inner}
          </Link>
        ) : (
          <button key={label} type="button" aria-label={label} className={className} style={style}>
            {inner}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Standby"
        className="mt-auto flex size-11 items-center justify-center rounded-xl border border-border/70 transition-colors duration-300 hover:border-neon-gold hover:text-neon-gold"
      >
        <Power className="size-5" />
      </button>
    </nav>
  );
}