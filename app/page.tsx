import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AttendanceButton } from "@/components/attendance-button";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { Trophy, Calendar, User, LogOut, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 mesh-gradient opacity-20 dark:opacity-40 -z-10" />

      <nav className="w-full border-b border-primary/10 h-16 flex items-center justify-between px-6 glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl tracking-tight hidden sm:block">Adda</h1>
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <Link href={`/profile/${user.id}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </Button>
          </Link>
          <form action="/auth/signout" method="post">
            <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </form>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Trophy className="w-3 h-3" />
            <span>Join the daily streak</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Welcome back, <span className="text-gradient">{profile?.full_name?.split(' ')[0]}!</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            Don't break the chain. Show up, mark your presence, and climb the leaderboard.
          </p>
        </section>

        {/* Action & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Attendance Card */}
          <div className="glass rounded-3xl p-8 shadow-xl shadow-primary/5 space-y-8 animate-in fade-in slide-in-from-left-6 duration-1000">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-bold">Ready for Today?</h3>
              <p className="text-muted-foreground">Capture your vibe and claim your points.</p>
            </div>

            <div className="flex justify-center md:justify-start">
              <AttendanceButton userId={user.id} />
            </div>

            <div className="pt-4 border-t border-primary/10 flex items-center justify-between text-sm text-muted-foreground">
              <span>Points per check-in</span>
              <span className="font-bold text-primary font-mono">+10 XP</span>
            </div>
          </div>

          {/* Stats & Navigation */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-1000">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Your Score</p>
                <p className="text-4xl font-black text-primary">{profile?.points || 0}</p>
              </div>
              <Link href="/leaderboard" className="group">
                <div className="glass rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center group-hover:bg-primary/5 transition-colors border-dashed border-primary/20">
                  <Trophy className="w-8 h-8 text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold">Leaderboard</p>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                </div>
              </Link>
            </div>

            <div className="glass rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <h4 className="font-bold mb-2">Quote of the day</h4>
              <p className="text-muted-foreground italic">"Consistency is the playground of the dull, but the ladder of the successful."</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
