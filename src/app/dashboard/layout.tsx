import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Sidebar user={user} />
            <main className="md:ml-64 min-h-screen p-4 md:p-8 pb-20 md:pb-8 relative">
                {/* Background Ambient Light */}
                <div className="fixed top-[20%] right-[10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="fixed bottom-[10%] left-[20%] w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                {children}
            </main>
            <MobileNav />
        </div>
    );
}
