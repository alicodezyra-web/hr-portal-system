'use client';

import React, { useState, useEffect } from 'react';
import {
    Clock, Coffee,
    Timer as TimerIcon, CheckCircle2,
    Loader2, Camera, DollarSign, Briefcase, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PrimaryButton } from '@/components/SharedUI';
import QRScanner from '@/components/QRScanner';
import { toast } from 'react-toastify';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timer, setTimer] = useState("00:00:00");
    const [showScanner, setShowScanner] = useState(false);

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
                const todayKey = new Date().toISOString().slice(0, 10);
                // Filter out records that are already checked out to show QR scanner again
                const todayRecord = data.find((r: any) => {
                    const d = new Date(r.date);
                    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayKey && !r.checkOut;
                });
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
        if (attendance?.checkIn && !attendance?.checkOut) {
            const today = new Date().toISOString().split('T')[0];
            const startTime = new Date(attendance.checkIn);

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

    const handleOpenScanner = () => {
        setShowScanner(true);
    };

    async function onScanSuccess(decodedText: string) {
        toast.success("QR Validated!");
        setShowScanner(false);
        if (decodedText.includes('OFFICE_CHECKIN')) {
            markAttendance();
        } else {
            markAttendance();
        }
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
            setLoading(true);
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkin' })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Attendance Logged");
                setAttendance(data);
            } else {
                toast.error(data.error || "Failed to log attendance");
            }
        } catch (err) {
            toast.error("Process Error");
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkout' })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Shift Terminated");
                setAttendance(data);
            } else if (res.status === 400 && data.error === 'Already checked out today') {
                toast.info("Already checked out, refreshing...");
                fetchTodayAttendance();
            } else {
                toast.error(data.error || "Failed to terminate shift");
            }
        } catch (err) {
            toast.error("Process Error");
        } finally {
            setLoading(false);
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
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Shift Active</h3>
                                <p className={`text-[11px] font-black uppercase tracking-widest ${attendance.status === 'late' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {attendance.status === 'late' ? 'LATE ENTRY LOGGED' : 'OPTIMAL ENTRY LOGGED'}
                                </p>
                                <p className="text-[10px] font-black text-zinc-400">AT {formatTime(attendance.checkIn)}</p>
                            </div>
                            <div className="w-full p-8 bg-zinc-50 rounded-[3rem] border border-zinc-100">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">Time in Shift</p>
                                <p className="text-5xl sm:text-6xl font-black tracking-tighter text-black tabular-nums">{timer}</p>
                            </div>
                            {!attendance.checkOut ? (
                                <PrimaryButton onClick={handleClockOut} className="w-full !bg-rose-600 hover:!bg-rose-700 shadow-rose-100 py-5">
                                    TERMINATE SHIFT
                                </PrimaryButton>
                            ) : (
                                <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Ended at {formatTime(attendance.checkOut)}</div>
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
                <QRScanner
                    onScanSuccess={onScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
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
