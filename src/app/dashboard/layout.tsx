import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect("/login");
    }

    const { user } = session;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* @ts-ignore - fixing types next */}
            <Sidebar user={user} />
            {/* @ts-ignore - fixing types next */}
            <MobileHeader user={user} />

            {/* Added pt-20 (80px) for mobile to account for fixed header (64px) + padding */}
            <main className="md:ml-64 min-h-screen p-4 pt-20 md:p-8 md:pt-8 pb-20 md:pb-8 relative">
                {/* Background Ambient Light */}
                <div className="fixed top-[20%] right-[10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="fixed bottom-[10%] left-[20%] w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                {children}
            </main>
            <MobileNav />
        </div>
    );
}
