'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    QrCode, Clock, Coffee, LogOut,
    Timer as TimerIcon, AlertCircle, CheckCircle2,
    Loader2, Camera, X, DollarSign, Briefcase, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PrimaryButton } from '@/components/SharedUI';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-toastify';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timer, setTimer] = useState("00:00:00");
    const [showScanner, setShowScanner] = useState(false);
    const [isCameraLoading, setIsCameraLoading] = useState(false);
    const [dressing, setDressing] = useState<'casual' | 'formal'>('formal');
    const qrScannerRef = useRef<Html5Qrcode | null>(null);

    // Real-time Clock
    useEffect(() => {
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // Fetch Today's Attendance
    const fetchTodayAttendance = async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/attendance');
            const data = await res.json();
            if (res.ok) {
                // Find today's record in history or use a specific endpoint if we had one
                // For now, let's assume /api/attendance returns history and we find today
                const todayStr = new Date().toLocaleDateString('en-CA');
                const todayRecord = data.find((r: any) => r.date.startsWith(todayStr));
                setAttendance(todayRecord);
            }
        } catch (err) {
            console.error("Attendance fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodayAttendance();
    }, [user]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (attendance?.check_in && !attendance?.check_out) {
            const today = new Date().toISOString().split('T')[0];
            const startTime = new Date(`${today}T${attendance.check_in}`);

            interval = setInterval(() => {
                const diff = new Date().getTime() - startTime.getTime();
                if (diff > 0) {
                    const hours = Math.floor(diff / 3600000);
                    const minutes = Math.floor((diff % 3600000) / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setTimer(
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    );
                }
            }, 1000);
        } else {
            setTimer("00:00:00");
        }
        return () => clearInterval(interval);
    }, [attendance]);

    const handleOpenScanner = async () => {
        setShowScanner(true);
        setIsCameraLoading(true);

        setTimeout(async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader");
                qrScannerRef.current = html5QrCode;
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 250, height: 250 } },
                    onScanSuccess,
                    () => { }
                );
                setIsCameraLoading(false);
            } catch (err: any) {
                toast.error("Camera Access Error");
                setShowScanner(false);
                setIsCameraLoading(false);
            }
        }, 500);
    };

    const stopCamera = async () => {
        if (qrScannerRef.current) {
            try {
                if (qrScannerRef.current.isScanning) {
                    await qrScannerRef.current.stop();
                }
                qrScannerRef.current = null;
            } catch (err) { }
        }
    };

    async function onScanSuccess(decodedText: string) {
        toast.success("QR Validated!");
        setShowScanner(false);
        stopCamera();
        markAttendance();
    }

    const formatTime = (timeStr: any) => {
        if (!timeStr || timeStr === '-' || timeStr === 'NONE') return '-';
        try {
            if (typeof timeStr === 'string' && timeStr.includes('T')) {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }
            if (typeof timeStr === 'string' && timeStr.includes(':')) {
                const [h, m] = timeStr.split(':');
                const date = new Date();
                date.setHours(parseInt(h), parseInt(m));
                return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        } catch (e) { }
        return timeStr;
    };

    const markAttendance = async () => {
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkin', dressing })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Attendance Logged");
                fetchTodayAttendance();
            } else {
                toast.error(data.error || "Failed to log attendance");
            }
        } catch (err) {
            toast.error("Process Error");
        }
    };

    const handleClockOut = async () => {
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-out' })
            });
            if (res.ok) {
                toast.success("Shift Terminated");
                fetchTodayAttendance();
            }
        } catch (err) {
            toast.error("Process Error");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Synchronizing Session...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">

            <div className="flex flex-col sm:flex-row justify-between items-center bg-black p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] text-white shadow-2xl gap-8">
                <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-2">Employee Records</p>
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-4">{user?.full_name}</h2>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">{user?.position || 'ASSOCIATE'}</span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">{user?.department?.toUpperCase() || 'OFFICE'}</span>
                    </div>
                </div>
                <div className="bg-white/5 p-6 rounded-[2.5rem] backdrop-blur-md border border-white/10 min-w-[200px] text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Protocol Clock (PKT)</p>
                    <div className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums mb-1">
                        {currentTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-8 min-h-[450px]">
                    {!attendance ? (
                        <>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center border-2 border-zinc-100 shadow-inner group hover:border-black transition-all">
                                <Camera size={48} className="text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-3">Sync Attendance</h3>
                                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed mb-6">
                                    Scan QR terminal to initiate active shift protocol.
                                </p>
                            </div>

                            <div className="w-full space-y-3 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Dressing Protocol</p>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setDressing('formal')}
                                        className={`flex-1 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${dressing === 'formal' ? 'border-black bg-black text-white' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}
                                    >
                                        Formal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDressing('casual')}
                                        className={`flex-1 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${dressing === 'casual' ? 'border-black bg-black text-white' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}
                                    >
                                        Casual
                                    </button>
                                </div>
                            </div>

                            <PrimaryButton onClick={handleOpenScanner} className="w-full py-6 text-sm tracking-[0.2em]">
                                OPEN SCANNER
                            </PrimaryButton>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200">
                                <CheckCircle2 size={56} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Shift Active</h3>
                                <p className={`text-[11px] font-black uppercase tracking-widest ${attendance.is_late ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {attendance.is_late ? 'LATE ENTRY LOGGED' : 'OPTIMAL ENTRY LOGGED'}
                                </p>
                                <p className="text-[10px] font-black text-zinc-400">AT {formatTime(attendance.check_in)}</p>
                            </div>
                            <div className="w-full p-8 bg-zinc-50 rounded-[3rem] border border-zinc-100">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">Time in Shift</p>
                                <p className="text-5xl sm:text-6xl font-black tracking-tighter text-black tabular-nums">{timer}</p>
                            </div>
                            {!attendance.check_out ? (
                                <PrimaryButton onClick={handleClockOut} className="w-full !bg-rose-600 hover:!bg-rose-700 shadow-rose-100 py-5">
                                    TERMINATE SHIFT
                                </PrimaryButton>
                            ) : (
                                <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Ended at {formatTime(attendance.check_out)}</div>
                            )}
                        </>
                    )}
                </Card>

                <Card className="p-8 sm:p-10 space-y-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-black text-white rounded-[1.5rem] flex items-center justify-center">
                            <TimerIcon size={28} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-2">My Profile</h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Confidential Employment Info</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DetailBox icon={DollarSign} label="MONTHLY SALARY" value={`Rs ${user?.salary || '0'}`} />
                        <DetailBox icon={Briefcase} label="DESIGNATION" value={user?.position?.toUpperCase() || 'ASSOCIATE'} />
                        <DetailBox icon={User} label="JOB TITLE" value={user?.department?.toUpperCase() || 'OPERATIONS'} />
                        <DetailBox icon={Clock} label="TIMING PROTOCOL" value={`${formatTime(user?.entry_time)} - ${formatTime(user?.exit_time)}`} />
                        <DetailBox icon={Coffee} label="BREAK WINDOW" value={`${formatTime(user?.break_in)} - ${formatTime(user?.break_off)}`} />
                        <DetailBox icon={Clock} label="ASSIGNED SHIFT" value={user?.shift?.toUpperCase() || 'DAY SHIFT'} />
                    </div>
                </Card>
            </div>

            {showScanner && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowScanner(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase">Terminal Scanner</h3>
                            <button onClick={() => setShowScanner(false)} className="p-3 bg-zinc-100 rounded-2xl hover:bg-zinc-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 bg-zinc-900 min-h-[300px] flex flex-col items-center justify-center relative">
                            <div id="reader" className="w-full h-full max-w-sm rounded-2xl overflow-hidden border-2 border-white/20"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailBox = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] border border-white hover:border-zinc-200 transition-all group">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Icon size={18} className="text-zinc-400 group-hover:text-black transition-colors" />
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-xs font-black text-black uppercase tracking-widest">{value}</span>
    </div>
);

export default EmployeeDashboard;
