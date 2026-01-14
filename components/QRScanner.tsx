
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader-modal");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        if (isMounted) {
                            onScanSuccess(decodedText);
                            stopScanner();
                        }
                    },
                    (errorMessage) => {
                        // Ignore errors for better UX
                    }
                );
            } catch (err) {
                console.error("Camera start error", err);
            }
        };

        // Small delay to ensure DOM is ready
        setTimeout(startScanner, 100);

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Scanner stop error", err);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl z-[210]">
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase">Scan QR Code</h3>
                    <button onClick={onClose} className="p-3 bg-zinc-100 rounded-2xl hover:bg-zinc-200 transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 bg-zinc-900 min-h-[350px] flex flex-col items-center justify-center relative">
                    <div id="reader-modal" className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/20"></div>
                    <p className="mt-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">
                        Align QR code within frame
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
