import React, { useEffect, useRef, useState } from 'react';
import './ReflectiveCard.css';
import { Fingerprint, User, Activity, Lock, AlertCircle, RefreshCw } from 'lucide-react';

interface ReflectiveCardProps {
    blurStrength?: number;
    color?: string;
    metalness?: number;
    roughness?: number;
    overlayColor?: string;
    displacementStrength?: number;
    noiseScale?: number;
    specularConstant?: number;
    grayscale?: number;
    glassDistortion?: number;
    className?: string;
    style?: React.CSSProperties;
}

const ReflectiveCard: React.FC<ReflectiveCardProps> = ({
    blurStrength = 12,
    color = 'white',
    metalness = 1,
    roughness = 0.4,
    overlayColor = 'rgba(255, 255, 255, 0.1)',
    displacementStrength = 20,
    noiseScale = 1,
    specularConstant = 1.2,
    grayscale = 1,
    glassDistortion = 0,
    className = '',
    style = {}
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamActive, setStreamActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const startWebcam = async () => {
        setIsLoading(true);
        setError(null);
        setPermissionDenied(false);

        let stream: MediaStream | null = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // setStreamActive(true) will be handled by onLoadedMetadata
            }
        } catch (err: any) {
            console.error('Error accessing webcam:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                setError('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera device found. Please connect a camera.');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is already in use by another application.');
            } else {
                setError('Unable to access camera. Please check your browser settings.');
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        startWebcam();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
    const saturation = 1 - Math.max(0, Math.min(1, grayscale));

    const cssVariables = {
        '--blur-strength': `${blurStrength}px`,
        '--metalness': metalness,
        '--roughness': roughness,
        '--overlay-color': overlayColor,
        '--text-color': color,
        '--saturation': saturation
    } as React.CSSProperties;

    return (
        <div className={`reflective-card-container ${className}`} style={{ ...style, ...cssVariables }}>
            <svg className="reflective-svg-filters" aria-hidden="true">
                <defs>
                    <filter id="metallic-displacement" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="turbulence" baseFrequency={baseFrequency} numOctaves="2" result="noise" />
                        <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale={displacementStrength}
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="rippled"
                        />
                        <feSpecularLighting
                            in="noiseAlpha"
                            surfaceScale={displacementStrength}
                            specularConstant={specularConstant}
                            specularExponent="20"
                            lightingColor="#ffffff"
                            result="light"
                        >
                            <fePointLight x="0" y="0" z="300" />
                        </feSpecularLighting>
                        <feComposite in="light" in2="rippled" operator="in" result="light-effect" />
                        <feBlend in="light-effect" in2="rippled" mode="screen" result="metallic-result" />
                        <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                            result="solidAlpha"
                        />
                        <feMorphology in="solidAlpha" operator="erode" radius="45" result="erodedAlpha" />
                        <feGaussianBlur in="erodedAlpha" stdDeviation="10" result="blurredMap" />
                        <feComponentTransfer in="blurredMap" result="glassMap">
                            <feFuncA type="linear" slope="0.5" intercept="0" />
                        </feComponentTransfer>
                        <feDisplacementMap
                            in="metallic-result"
                            in2="glassMap"
                            scale={glassDistortion}
                            xChannelSelector="A"
                            yChannelSelector="A"
                            result="final"
                        />
                    </filter>
                </defs>
            </svg>

            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`reflective-video ${streamActive ? 'active' : ''}`}
                    onLoadedMetadata={() => {
                        setIsLoading(false);
                        setStreamActive(true);
                    }}
                />

                {isLoading && (
                    <div className="reflective-loading-overlay">
                        <div className="loading-spinner" />
                        <p>Scanning Area...</p>
                    </div>
                )}

                {error && (
                    <div className="reflective-error-overlay">
                        <AlertCircle className="error-icon" size={48} />
                        <p className="error-message">{error}</p>
                        {permissionDenied && (
                            <button onClick={startWebcam} className="retry-button">
                                <RefreshCw size={16} className="mr-2" />
                                Retry Access
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="reflective-noise" />
            <div className="reflective-sheen" />
            <div className="reflective-border" />

            <div className="reflective-content">
                <div className="card-header">
                    <div className="security-badge">
                        <Lock size={14} className="security-icon" />
                        <span>SECURE ACCESS</span>
                    </div>
                    <Activity className={`status-icon ${streamActive ? 'pulse' : ''}`} size={20} />
                </div>

                <div className="card-body">
                    <div className="user-info">
                        <h2 className="user-name">ALEXANDER DOE</h2>
                        <p className="user-role">SENIOR DEVELOPER</p>
                    </div>
                </div>

                <div className="card-footer">
                    <div className="id-section">
                        <span className="label">ID NUMBER</span>
                        <span className="value">8901-2345-6789</span>
                    </div>
                    <div className="fingerprint-section">
                        <Fingerprint size={32} className={`fingerprint-icon ${streamActive ? 'active' : ''}`} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReflectiveCard;
