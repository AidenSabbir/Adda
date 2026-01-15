import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, User, Trophy, Share2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { ModeToggle } from "@/components/mode-toggle";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

    if (!profile) {
        redirect("/");
    }

    const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", id)
        .order("date", { ascending: false });

    const isOwnProfile = currentUser.id === id;

    return (
        <main className="min-h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Background mesh gradient */}
            <div className="absolute inset-0 mesh-gradient opacity-10 dark:opacity-30 -z-10" />

            <nav className="w-full border-b border-primary/10 h-16 flex items-center justify-between px-6 glass sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="hover:text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-xl tracking-tight">Profile</h1>
                </div>
                <div className="flex items-center gap-3">
                    <ModeToggle />
                    {isOwnProfile && (
                        <form action="/auth/signout" method="post">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                Logout
                            </Button>
                        </form>
                    )}
                </div>
            </nav>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
                {/* Profile Header Card */}
                <div className="glass rounded-3xl p-8 relative overflow-hidden animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="absolute right-[-5%] top-[-20%] w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        <div className="w-32 h-32 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 shrink-0">
                            <User className="h-16 w-16" />
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight flex items-center justify-center md:justify-start gap-3">
                                    {profile.full_name}
                                    {isOwnProfile && <Badge variant="secondary" className="text-[10px] uppercase tracking-widest px-2">Owner</Badge>}
                                </h2>
                                <p className="text-muted-foreground text-lg">Member since {new Date(profile.created_at).getFullYear()}</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                        <Trophy className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Total Points</p>
                                        <p className="text-xl font-black">{profile.points}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Attendance</p>
                                        <p className="text-xl font-black">{attendanceRecords?.length || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <CopyButton value={`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${id}`} />
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-primary" />
                            History
                        </h3>
                    </div>

                    {attendanceRecords && attendanceRecords.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                            {attendanceRecords.map((record) => (
                                <div key={record.id} className="glass rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 border-primary/5 shadow-lg hover:shadow-primary/10">
                                    <div className="aspect-[4/5] relative bg-muted overflow-hidden">
                                        <Image
                                            src={record.photo_url}
                                            alt={`Attendance on ${record.date}`}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            unoptimized
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                            <Badge className="bg-green-500 shadow-lg shadow-green-500/20 border-0 gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Present
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-1 bg-card/50">
                                        <p className="font-bold">
                                            {new Date(record.date).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <p className="text-xs text-muted-foreground italic">
                                            Check-in at {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass rounded-3xl py-20 text-center space-y-4 animate-in fade-in duration-1000">
                            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                                <Calendar className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-bold">No records yet</p>
                                <p className="text-muted-foreground max-w-xs mx-auto text-sm">When you mark yourself present, your daily vibes will show up here!</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
