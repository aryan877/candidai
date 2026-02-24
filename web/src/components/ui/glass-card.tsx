import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  glow = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6",
        glow && "hover-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
