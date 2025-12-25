import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 text-center space-y-6 p-4">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-red-500 via-emerald-500 to-red-500 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent drop-shadow-lg">
          SENTINEL
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide max-w-2xl mx-auto">
          The Behavioral Risk Firewall for Professional Traders.
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.5)] transition-all hover:scale-105 cursor-pointer">
              Enter Terminal
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="text-lg px-8 border-primary/50 text-foreground hover:bg-primary/10 transition-all hover:scale-105 cursor-pointer">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
