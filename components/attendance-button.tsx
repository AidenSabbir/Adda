"use client";

import { useState, useRef } from "react";
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
import { Camera, Upload } from "lucide-react";
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

    const [cameraAvailable, setCameraAvailable] = useState(true);

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

            // Try user-facing camera first
            let constraints: MediaStreamConstraints = {
                video: { facingMode: "user" },
            };

            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);
                setError(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err: any) {
                // If user camera fails, try any available camera (fallback for some devices)
                console.warn("Front camera failed, trying fallback:", err);
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                setStream(mediaStream);
                setError(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
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
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) {
            setError("Video not initialized");
            return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
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
            const today = new Date().toISOString().split("T")[0];
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
                        <div className="space-y-2">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full rounded-md max-h-[40vh] object-contain bg-black"
                            />
                            <Button type="button" onClick={capturePhoto} className="w-full">
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
