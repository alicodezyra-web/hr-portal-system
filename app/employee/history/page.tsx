'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, FileDown, TrendingUp, Loader2, RefreshCcw, ChevronRight } from 'lucide-react';
import { Card, Badge, SectionHeader } from '@/components/SharedUI';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

const History: React.FC = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch('/api/attendance');
            const data = await res.json();
            if (res.ok) {
                setRecords(data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            day: date.getDate(),
            full: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr || timeStr === '--:--' || timeStr === '-') return '--:--';
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minutes} ${ampm}`;
    };

    if (loading && records.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-black" size={48} />
                    <p className="text-zinc-400 font-black uppercase text-[10px] tracking-[0.4em]">Retrieving Chronicles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="text-5xl font-black text-black tracking-tighter uppercase leading-none mb-3">Presence Log</h1>
                    <p className="text-zinc-400 font-black uppercase text-[10px] tracking-[0.4em]">Historical performance audit trail</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchHistory} className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-zinc-100 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm">
                        <RefreshCcw size={18} /> Sync History
                    </button>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden shadow-2xl border border-zinc-100">
                <div className="p-10 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/20">
                    <SectionHeader title="Operational Timeline" subtitle="Verified Presence Entries" icon={CalendarIcon} />
                    <div className="flex items-center gap-3 text-[10px] font-black text-black uppercase tracking-[0.2em]">
                        <span className="text-zinc-400">Records Found:</span> {records.length}
                    </div>
                </div>

                <div className="divide-y divide-zinc-100">
                    {records.map((record) => {
                        const dateParts = formatDate(record.date);
                        const isLate = record.status === 'late';
                        const isPresent = record.status === 'present' || record.status === 'late';
                        const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                        const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                        return (
                            <div key={record._id} className="p-10 flex flex-col md:flex-row md:items-center justify-between hover:bg-zinc-50/50 transition-all cursor-pointer group gap-8">
                                <div className="flex items-center gap-8">
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center font-black transition-transform group-hover:scale-105 border-2 ${isLate ? 'bg-amber-50 text-amber-600 border-amber-100' : isPresent ? 'bg-black text-white border-black' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
                                        <span className="text-[10px] uppercase opacity-60 mb-1">{dateParts.month}</span>
                                        <span className="text-2xl leading-none">{dateParts.day}</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-black text-xl tracking-tighter uppercase leading-none mb-2">{dateParts.full}</p>
                                        <div className="flex items-center gap-6 flex-wrap">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                <TrendingUp size={12} className="text-black" /> In: <span className="text-black">{checkInTime}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                <TrendingUp size={12} className="text-zinc-400 rotate-180" /> Out: <span className="text-black">{checkOutTime}</span>
                                            </div>
                                            {record.dressing && record.dressing !== 'none' && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    <span className="text-black">Dressing: <span className="font-black">{record.dressing.toUpperCase()}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-zinc-50">
                                    <div className="text-left md:text-right">
                                        <Badge variant={isLate ? 'amber' : isPresent ? 'black' : 'rose'}>
                                            {isLate ? 'LATE ARRIVAL' : isPresent ? 'OPTIMAL' : 'ABSENCE'}
                                        </Badge>
                                    </div>
                                    <ChevronRight size={20} className="text-zinc-200 group-hover:text-black transition-all group-hover:translate-x-2" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default History;

