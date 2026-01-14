'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Filter, Loader2, RefreshCcw, Info, Camera, CheckCircle2 } from 'lucide-react';
import { Card, Badge, PrimaryButton } from '@/components/SharedUI';
import { toast } from 'react-toastify';

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateFilter, setDateFilter] = useState<'all' | 'today'>('today'); // Default to today

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, usersRes] = await Promise.all([
                fetch('/api/attendance'),
                fetch('/api/users')
            ]);

            const logsData = await logsRes.json();
            const usersData = await usersRes.json();

            if (logsRes.ok) setLogs(logsData || []);
            if (usersRes.ok) setUsers(usersData || []);
        } catch (error) {
            // console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

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

    // Filter logs for selected month/year OR today
    const monthlyLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        if (dateFilter === 'today') {
            const today = new Date();
            // Compare purely by local date string - strict equality might fail if timezones differ slightly
            // Let's use looser check or standard day comparison
            // Also check if checkIn exits
            return logDate.getDate() === today.getDate() &&
                logDate.getMonth() === today.getMonth() &&
                logDate.getFullYear() === today.getFullYear();
        }
        return logDate.getMonth() === selectedMonth && logDate.getFullYear() === selectedYear;
    });

    // Aggregate data per user
    const userSummary = users.map(user => {
        const userLogs = monthlyLogs.filter(log => log.user?._id === user._id || log.user === user._id);
        const present = userLogs.filter(l => l.status === 'present').length;
        const late = userLogs.filter(l => l.status === 'late').length;
        const leave = userLogs.filter(l => l.status === 'leave').length;
        // Absent logic: For 'today', if no log found, they are absent.
        const absent = dateFilter === 'today' ? (userLogs.length === 0 ? 1 : 0) : (26 - (present + late + leave));

        const todayLog = dateFilter === 'today' ? userLogs[0] : null;

        return {
            ...user,
            present,
            late,
            leave,
            absent: absent > 0 ? absent : 0,
            logs: userLogs,
            todayLog
        };
    }).filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

        // NEW REQUIREMENT: In 'today' view, ONLY show users who have a log (scanned).
        if (dateFilter === 'today') {
            return matchesSearch && u.logs.length > 0;
        }

        return matchesSearch;
    });

    // Sort: For today, show those with activity (logs) first
    if (dateFilter === 'today') {
        userSummary.sort((a, b) => {
            const aHasLog = a.logs.length > 0 ? 1 : 0;
            const bHasLog = b.logs.length > 0 ? 1 : 0;
            return bHasLog - aHasLog;
        });
    }

    if (loading && logs.length === 0) { // Only show full loader if no data yet (background refresh shouldn't hide UI)
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-black" size={48} />
                    <p className="text-zinc-400 font-black uppercase text-[10px] tracking-[0.4em]">Aggregating Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-50/50 p-8 rounded-[3rem] border border-zinc-100">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter leading-none mb-2">
                        {dateFilter === 'today' ? "Today's Attendance" : "Monthly Attendance"}
                    </h1>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Workforce Presence Intelligence</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="bg-white rounded-2xl border border-zinc-200 p-1 flex">
                        <button
                            onClick={() => setDateFilter('today')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${dateFilter === 'today' ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDateFilter('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${dateFilter === 'all' ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                        >
                            Monthly
                        </button>
                    </div>

                    {dateFilter === 'all' && (
                        <div className="flex bg-white rounded-2xl border border-zinc-200 p-1 overflow-x-auto max-w-[300px] md:max-w-none">
                            {months.map((m, i) => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMonth(i)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedMonth === i ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Card className="!p-0 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-6 bg-zinc-50/20">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                        <input
                            type="text"
                            placeholder="Query by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="black">Month: {months[selectedMonth]} {selectedYear}</Badge>
                        <button onClick={fetchData} className="p-4 bg-white border border-zinc-100 rounded-2xl hover:text-black transition-all"><RefreshCcw size={18} /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap mb-4">
                            <thead className="bg-zinc-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                                        {dateFilter === 'today' ? 'Current Status' : 'Summary (P|L|A|V)'}
                                    </th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                                        {dateFilter === 'today' ? 'Punch In / Out' : 'Protocol Timings'}
                                    </th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Expected Break</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {userSummary.map((user) => (
                                    <tr key={user._id} className="hover:bg-zinc-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm">
                                                    {user.full_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-black tracking-tight leading-none mb-1 text-sm uppercase">{user.full_name}</p>
                                                    <p className="text-[9px] text-zinc-400 font-black tracking-widest uppercase">{user.position || 'RESOURCE'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {dateFilter === 'today' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    {user.todayLog ? (
                                                        <Badge variant={user.todayLog.status === 'late' ? 'amber' : 'emerald'}>
                                                            {user.todayLog.status.toUpperCase()}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="rose">ABSENT</Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Badge variant="emerald">{user.present}P</Badge>
                                                    <Badge variant="amber">{user.late}L</Badge>
                                                    <Badge variant="rose">{user.absent}A</Badge>
                                                    <Badge variant="indigo">{user.leave}V</Badge>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {dateFilter === 'today' ? (
                                                <div className="flex flex-col items-center">
                                                    {user.todayLog ? (
                                                        <>
                                                            <span className="text-xs font-black text-black">IN: {formatTime(user.todayLog.checkIn)}</span>
                                                            <span className="text-[10px] font-bold text-zinc-400">OUT: {user.todayLog.checkOut ? formatTime(user.todayLog.checkOut) : 'ACTIVE'}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-zinc-300">-</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="font-black text-black text-xs uppercase tracking-tighter">
                                                        {formatTime(user.entry_time)} - {formatTime(user.exit_time)}
                                                    </p>
                                                    <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">{user.shift}</p>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tabular-nums tracking-widest">
                                                {formatTime(user.break_in)} - {formatTime(user.break_off)}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <Badge variant="black">Rs {user.salary}</Badge>
                                                <span className="text-[8px] font-black text-zinc-300 uppercase">{user.phone || 'NO PHONE'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="md:hidden divide-y divide-zinc-100">
                        {userSummary.map((user) => (
                            <div key={user._id} className="p-6 space-y-6 bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-xl shadow-zinc-200">
                                            {user.full_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-black text-[14px] uppercase tracking-tighter leading-none mb-1 truncate">{user.full_name}</p>
                                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest truncate">{user.position || 'RESOURCE'}</p>
                                        </div>
                                    </div>
                                    <Badge variant="black">Rs {user.salary}</Badge>
                                </div>

                                <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-[2rem] gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Present</p>
                                        <p className="text-xl font-black text-black">{user.present}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[8px] font-black text-amber-600 uppercase">Late</p>
                                        <p className="text-xl font-black text-black">{user.late}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[8px] font-black text-rose-600 uppercase">Absent</p>
                                        <p className="text-xl font-black text-black">{user.absent}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[8px] font-black text-indigo-600 uppercase">Leave</p>
                                        <p className="text-xl font-black text-black">{user.leave}</p>
                                    </div>
                                </div>

                                <div className="p-5 border border-zinc-100 rounded-[2rem] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Protocol Schedule</p>
                                            <p className="text-[11px] font-black text-black">{formatTime(user.entry_time)} - {formatTime(user.exit_time)}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="slate">{user.shift?.split(' ')[0]}</Badge>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Break Window</p>
                                        <p className="text-[11px] font-black text-zinc-500 italic uppercase">{formatTime(user.break_in)} - {formatTime(user.break_off)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {userSummary.length === 0 && (
                        <div className="p-20 text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No logs found for this period</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Logs;
