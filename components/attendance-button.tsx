"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Upload, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface AttendanceButtonProps {
    userId: string;
}

export function AttendanceButton({ userId }: AttendanceButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const [cameraAvailable, setCameraAvailable] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

    const checkCameraSupport = () => {
        const isHTTPS = window.location.protocol === "https:";
        const isLocalhost =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";
        const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;

        return {
            supported: hasGetUserMedia,
            httpsRequired: !isHTTPS && !isLocalhost,
            canUseCamera: hasGetUserMedia && (isHTTPS || isLocalhost),
        };
    };

    const startCamera = async () => {
        try {
            const support = checkCameraSupport();

            if (!support.supported) {
                setError("Camera is not supported on this browser. Please use file upload.");
                return;
            }

            if (support.httpsRequired) {
                setError(
                    "Camera requires HTTPS on mobile devices. Please use file upload instead."
                );
                return;
            }

            // Use current facingMode
            let constraints: MediaStreamConstraints = {
                video: { facingMode: facingMode },
            };

            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);
                setError(null);
            } catch (err: any) {
                // If user camera fails, try any available camera (fallback for some devices)
                console.warn("Front camera failed, trying fallback:", err);
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                setStream(mediaStream);
                setError(null);
            }
        } catch (err: any) {
            console.error("Camera error:", err);
            let errorMessage = "Failed to access camera. ";

            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMessage +=
                    "Please allow camera access in your browser settings and try again.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                errorMessage += "No camera found on this device.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                errorMessage += "Camera is already in use by another app.";
            } else if (err.name === "NotSupportedError" || err.name === "TypeError") {
                errorMessage +=
                    "Camera is not supported. Please use file upload or try HTTPS.";
            } else {
                errorMessage += "Please use file upload instead.";
            }

            setError(errorMessage);
            setIsCameraReady(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setIsCameraReady(false);
    };

    const switchCamera = async () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        stopCamera();
        setFacingMode(newMode);
        // Wait for state to update, then restart happens via useEffect if we had one, 
        // but here we call it manually after a small delay to ensure cleanup
        setTimeout(() => startCamera(), 100);
    };

    const capturePhoto = () => {
        if (!videoRef.current) {
            setError("Video not initialized");
            return;
        }

        if (!isCameraReady) {
            setError("Camera is still loading. Please wait a moment.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const file = new File([blob], `attendance-${Date.now()}.jpg`, {
                            type: "image/jpeg",
                        });
                        setSelectedFile(file);
                        setPreview(URL.createObjectURL(blob));
                        stopCamera();
                    } else {
                        setError("Failed to capture photo.");
                    }
                },
                "image/jpeg",
                0.95
            );
        } else {
            setError("Failed to initialize canvas");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            stopCamera();
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError("Please capture or select a photo");
            return;
        }

        setLoading(true);
        setError(null);

        const supabase = createClient();

        try {
            // Get today's date in BDT (Asia/Dhaka)
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Dhaka',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());

            const { data: existing } = await supabase
                .from("attendance")
                .select("id")
                .eq("user_id", userId)
                .eq("date", today)
                .single();

            if (existing) {
                setError("You have already marked attendance for today!");
                return;
            }

            const fileName = `${userId}/${Date.now()}-${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from("attendance-photos")
                .upload(fileName, selectedFile);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("attendance-photos").getPublicUrl(fileName);

            const { error: insertError } = await supabase.from("attendance").insert({
                user_id: userId,
                date: today,
                photo_url: publicUrl,
            });

            if (insertError) throw insertError;

            const { error: updateError } = await supabase.rpc("increment_points", {
                user_id: userId,
            });

            if (updateError) {
                const { data: userData } = await supabase
                    .from("users")
                    .select("points")
                    .eq("id", userId)
                    .single();

                if (userData) {
                    await supabase
                        .from("users")
                        .update({ points: userData.points + 1 })
                        .eq("id", userId);
                }
            }

            setOpen(false); // Moved this line as per instruction

            // Trigger confetti
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#6366f1", "#a855f7", "#ec4899"]
            });

            router.refresh();
        } catch (err: any) {
            setError(err.message || "Failed to mark attendance");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        stopCamera();
        setPreview(null);
        setSelectedFile(null);
        setError(null);
        setOpen(false);
    };

    useState(() => {
        if (typeof window !== "undefined") {
            const support = checkCameraSupport();
            setCameraAvailable(support.supported && (!support.httpsRequired));
        }
    });

    // Fix: Move srcObject assignment to useEffect to handle race condition
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
            <DialogTrigger asChild>
                <Button size="lg" className="text-lg px-10 py-8 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 font-bold tracking-tight">
                    🔥 Mark Present
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark Your Attendance</DialogTitle>
                    <DialogDescription>
                        Take a photo or upload one to mark yourself present for today
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {!preview && !stream && (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                type="button"
                                variant="default"
                                className="flex-1"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Photo
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={startCamera}
                                disabled={loading}
                                title={!cameraAvailable ? "Camera may require HTTPS or is not supported" : ""}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Use Camera
                                {!cameraAvailable && " (!)"}
                            </Button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {stream && !preview && (
                        <div className="space-y-2 relative group mt-2">
                            <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={() => setIsCameraReady(true)}
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
                                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-xs font-medium text-white/80 animate-pulse">Initializing Camera...</p>
                                    </div>
                                )}
                                {isCameraReady && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70 border-none text-white h-10 w-10 shadow-lg backdrop-blur-sm transition-all"
                                        onClick={switchCamera}
                                        title="Switch Camera"
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={capturePhoto}
                                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
                                disabled={!isCameraReady}
                            >
                                <Camera className="mr-2 h-5 w-5" />
                                Capture Photo
                            </Button>
                        </div>
                    )}


                    {preview && (
                        <div className="space-y-2">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full rounded-md max-h-[40vh] object-contain bg-black/5"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setPreview(null);
                                    setSelectedFile(null);
                                    setError(null);
                                }}
                                className="w-full"
                                disabled={loading}
                            >
                                Retake
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 sm:mt-0">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!selectedFile || loading}
                        className="w-full"
                    >
                        {loading ? "Submitting..." : "Submit Attendance"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
