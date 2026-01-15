import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Trophy, Medal, Award, ArrowLeft, Flame, TrendingUp } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: users } = await supabase
        .from("users")
        .select("*")
        .order("points", { ascending: false });

    const totalUsers = users?.length || 0;
    const topThree = users?.slice(0, 3) || [];
    const others = users?.slice(3) || [];

    return (
        <main className="min-h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Background mesh gradient */}
            <div className="absolute inset-0 mesh-gradient opacity-10 dark:opacity-30 -z-10" />

            <nav className="w-full border-b border-primary/10 h-16 flex items-center justify-between px-6 glass sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="hover:text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-xl tracking-tight">Leaderboard</h1>
                </div>
                <div className="flex items-center gap-3">
                    <ModeToggle />
                    <form action="/auth/signout" method="post" className="hidden sm:block">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive transition-colors">
                            Logout
                        </Button>
                    </form>
                </div>
            </nav>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-semibold mb-2 animate-in fade-in slide-in-from-bottom-3 duration-700">
                        <TrendingUp className="w-3 h-3" />
                        <span>Real-time Rankings</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        Adda <span className="text-gradient">Toper</span>
                    </h2>
                </header>

                {/* Podium Section */}
                {topThree.length > 0 && (
                    <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-2 pt-10 pb-4 animate-in fade-in zoom-in-95 duration-1000">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="order-2 md:order-1 flex-1 w-full max-w-[200px]">
                                <PodiumCard
                                    user={topThree[1]}
                                    rank={2}
                                    isCurrentUser={topThree[1].id === user.id}
                                    isMagiPara={totalUsers >= 2 && 2 > totalUsers - 2}
                                />
                            </div>
                        )}
                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="order-1 md:order-2 flex-1 w-full max-w-[240px]">
                                <PodiumCard
                                    user={topThree[0]}
                                    rank={1}
                                    isCurrentUser={topThree[0].id === user.id}
                                    isMagiPara={totalUsers >= 2 && 1 > totalUsers - 2}
                                />
                            </div>
                        )}
                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="order-3 md:order-3 flex-1 w-full max-w-[200px]">
                                <PodiumCard
                                    user={topThree[2]}
                                    rank={3}
                                    isCurrentUser={topThree[2].id === user.id}
                                    isMagiPara={totalUsers >= 2 && 3 > totalUsers - 2}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Others List */}
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                    <div className="flex items-center justify-between px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <span>The Rest</span>
                        <span>Points</span>
                    </div>

                    {others.map((u, index) => {
                        const rank = index + 4;
                        const isMagiPara = totalUsers >= 2 && rank > totalUsers - 2;
                        const isCurrentUser = u.id === user.id;

                        return (
                            <Link key={u.id} href={`/profile/${u.id}`}>
                                <div className={`group flex items-center justify-between p-4 rounded-2xl glass mb-3 transition-all duration-300 hover:scale-[1.01] hover:bg-primary/5 ${isCurrentUser ? "border-primary border-2 shadow-lg shadow-primary/5" : "border-primary/5"
                                    } ${isMagiPara ? "bg-destructive/5 hover:bg-destructive/10" : ""}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="font-mono text-muted-foreground w-6 text-center">{rank}</div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                                {u.full_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold flex items-center gap-2">
                                                    {u.full_name}
                                                    {isCurrentUser && <Badge variant="secondary" className="text-[8px] h-4">YOU</Badge>}
                                                </p>
                                                {isMagiPara && (
                                                    <Badge variant="destructive" className="h-4 text-[8px] gap-1 px-1">
                                                        <Flame className="w-2 h-2" /> MAGI PARA
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-primary">{u.points}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {!users || users.length === 0 && (
                        <div className="text-center py-20 glass rounded-3xl border-dashed">
                            <p className="text-muted-foreground italic">No heroes have emerged yet.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Alert */}
                {totalUsers >= 2 && (
                    <div className="glass rounded-2xl p-6 border-destructive/20 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <div className="absolute right-0 top-0 w-32 h-full bg-destructive/5 -skew-x-12 translate-x-12" />
                        <div className="flex items-center gap-4 relative">
                            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                                <Flame className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                                <h4 className="font-black text-destructive tracking-tight">MAGI PARA ALERT!</h4>
                                <p className="text-sm text-muted-foreground">The bottom 2 users are getting dangerously close to magic territory. Fix up!</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function PodiumCard({ user, rank, isCurrentUser, isMagiPara }: { user: any; rank: number; isCurrentUser: boolean; isMagiPara: boolean }) {
    const configs = {
        1: { color: "bg-yellow-500", icon: Trophy, height: "h-48 md:h-56", text: "text-yellow-500" },
        2: { color: "bg-gray-400", icon: Medal, height: "h-40 md:h-48", text: "text-gray-400" },
        3: { color: "bg-amber-600", icon: Award, height: "h-36 md:h-40", text: "text-amber-600" },
    }[rank as 1 | 2 | 3];

    const Icon = configs.icon;

    return (
        <Link href={`/profile/${user.id}`} className="block w-full group">
            <div className={`flex flex-col items-center gap-3 transition-transform group-hover:translate-y-[-8px] duration-500`}>
                <div className="relative">
                    <div className={`w-20 h-20 rounded-2xl ${configs.color} flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-500`}>
                        <Icon className="w-10 h-10" />
                    </div>
                    {isCurrentUser && (
                        <div className="absolute -top-2 -right-2 bg-primary text-[8px] font-black text-primary-foreground px-2 py-0.5 rounded-full shadow-lg h-4 flex items-center">YOU</div>
                    )}
                </div>

                <div className={`w-full ${configs.height} glass rounded-t-3xl border-b-0 p-4 text-center flex flex-col justify-between shadow-2xl shadow-primary/5 transition-all group-hover:bg-primary/5 ${isMagiPara ? 'bg-destructive/5 border-destructive/20' : ''}`}>
                    <div className="space-y-1">
                        <p className={`font-black uppercase tracking-tighter text-2xl ${configs.text}`}>{rank}{rank === 1 ? 'ST' : rank === 2 ? 'ND' : 'RD'}</p>
                        <p className="font-bold truncate text-sm px-2">{user.full_name}</p>
                        {isMagiPara && (
                            <Badge variant="destructive" className="h-4 text-[8px] gap-1 px-1">
                                <Flame className="w-2 h-2" /> MAGI PARA
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-3xl font-black tracking-tight">{user.points}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Pts</p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
