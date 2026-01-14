'use client';

import React, { useState, useEffect } from 'react';
import {
    Users, UserCheck, Clock,
    Search, Table as TableIcon, Edit3, Trash2,
    RefreshCcw, Loader2, QrCode, UserMinus
} from 'lucide-react';
import { Card, Badge, PrimaryButton, Modal, Input } from '@/components/SharedUI';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        // Only set loading on initial fetch
        if (data.length === 0) setLoading(true);
        try {
            const [usersRes, attendanceRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/attendance')
            ]);

            if (!usersRes.ok || !attendanceRes.ok) throw new Error("Sync failed");

            const allUsers = await usersRes.json();
            const attendance = await attendanceRes.json();

            const today = new Date();
            // Compare using YYYY-MM-DD to avoid timezone/string-format mismatches
            const todayKey = today.toISOString().slice(0, 10);
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const combined = allUsers.map((u: any) => {
                // Attendance API returns `user` (populated) and `checkIn` / `checkOut`
                const userAtt = attendance.filter((a: any) => a.user?._id === u._id);
                const attToday = userAtt.find((a: any) => {
                    const d = new Date(a.date);
                    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayKey;
                });

                // Monthly stats
                const monthlyAtt = userAtt.filter((a: any) => {
                    const d = new Date(a.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const lates = monthlyAtt.filter((a: any) => a.status === 'late').length;
                const absents = monthlyAtt.filter((a: any) => a.status === 'absent').length;
                const leaves = monthlyAtt.filter((a: any) => a.status === 'leave').length;

                return {
                    ...u,
                    check_in_raw: attToday?.checkIn,
                    check_in: attToday?.checkIn || '-',
                    check_out: attToday?.checkOut || '-',
                    dressing: attToday?.dressing || 'NONE',
                    attendance_status: attToday?.status || 'A',
                    is_late_today: attToday?.status === 'late',
                    late_summary: `${lates} Late, ${absents} Absent`,
                    monthly_leaves: leaves
                };
            });

            setData(combined);
            setLastUpdated(new Date());
        } catch (error) {
            toast.error("Network connection unstable");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Live polling every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

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

    const filteredData = data.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cnic?.includes(searchTerm)
    );

    const stats = [
        { label: "Today Strength", value: data.length.toString(), icon: <Users size={24} />, color: 'bg-black' },
        { label: 'Today Present', value: data.filter(p => p.attendance_status === 'present' || p.attendance_status === 'late').length.toString(), icon: <UserCheck size={24} />, color: 'bg-emerald-500' },
        { label: 'Today Absent', value: data.filter(p => p.attendance_status === 'absent' || p.attendance_status === 'A').length.toString(), icon: <UserMinus size={24} />, color: 'bg-rose-500' },
        { label: 'On Leave Today', value: data.filter(p => p.attendance_status === 'leave').length.toString(), icon: <Clock size={24} />, color: 'bg-zinc-400' },
    ];

    // Recent Check-Ins for Live Feed
    const recentCheckIns = data
        .filter(p => p.check_in_raw)
        .sort((a, b) => new Date(b.check_in_raw).getTime() - new Date(a.check_in_raw).getTime())
        .slice(0, 10);

    if (loading && data.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-black" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing Intelligence...</p>
        </div>
    );

    return (
        <div className="space-y-12">

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 bg-zinc-50/50 p-8 rounded-[3rem] border border-zinc-100">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Attendance Overview</p>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black text-black tracking-tighter uppercase leading-[0.85]">
                        Today's <br /> Attendance
                    </h1>
                    <div className="flex items-center gap-6 pt-2">
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-black uppercase">PK Time Zone</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">{lastUpdated.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                        <div className="h-8 w-px bg-zinc-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-black uppercase">Active Shift</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">General: 09:00 - 18:00</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <PrimaryButton
                        icon={QrCode}
                        onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.protocol + '//' + window.location.host + '/employee')}`, '_blank')}
                        className="bg-black text-white hover:bg-zinc-800 transition-all shadow-xl"
                    >
                        Terminal QR
                    </PrimaryButton>
                    <PrimaryButton icon={RefreshCcw} onClick={fetchData} className="bg-white !text-black border border-zinc-200 hover:border-black shadow-none transition-all">
                        Refresh List
                    </PrimaryButton>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-8 group border-zinc-100 shadow-sm relative overflow-hidden">
                        <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-6`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-black tracking-tighter">{stat.value}</h3>
                                <span className="text-[10px] font-black text-zinc-300 uppercase">Agents</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="w-full">
                {/* Master Registry Table */}
                <Card className="!p-0 border-zinc-100 shadow-2xl rounded-[2rem] overflow-hidden">
                    <div className="p-6 sm:p-10 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-50/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black text-white rounded-xl flex items-center justify-center">
                                <TableIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-black tracking-tight leading-none mb-1">Attendance Log</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Real-time stats for all employees</p>
                            </div>
                        </div>
                        <div className="relative w-full lg:max-w-xs">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-5 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black transition-all"
                            />
                        </div>
                    </div>

                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-y border-zinc-100">
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Employee Name</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Time In</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Time Out</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Active Shift</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Department</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredData.map((emp) => (
                                    <tr key={emp._id} className="hover:bg-zinc-50/50 transition-colors text-[11px] font-bold">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-[10px]">
                                                    {emp.full_name?.[0]}
                                                </div>
                                                <span className="uppercase text-black font-black">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <Badge variant={emp.attendance_status === 'present' ? 'emerald' : emp.attendance_status === 'late' ? 'amber' : emp.attendance_status === 'leave' ? 'slate' : 'rose'}>
                                                {emp.attendance_status?.toUpperCase() || 'ABSENT'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-6 text-center tabular-nums text-emerald-600 font-black">{formatTime(emp.check_in)}</td>
                                        <td className="px-6 py-6 text-center tabular-nums text-rose-600 font-black">{formatTime(emp.check_out)}</td>
                                        <td className="px-6 py-6 text-center">
                                            <p className="uppercase text-black">{emp.shift}</p>
                                            <p className="text-[9px] text-zinc-400">{formatTime(emp.entry_time)} - {formatTime(emp.exit_time)}</p>
                                        </td>
                                        <td className="px-6 py-6 text-center italic text-zinc-400 uppercase tracking-widest text-[9px]">{emp.department}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="md:hidden divide-y divide-zinc-100">
                        {filteredData.map((emp) => (
                            <div key={emp._id} className="p-6 space-y-4 bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs">
                                            {emp.full_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-black text-[13px] uppercase tracking-tight leading-none mb-1">{emp.full_name}</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{emp.department}</p>
                                        </div>
                                    </div>
                                    <Badge variant={emp.attendance_status === 'present' ? 'emerald' : emp.attendance_status === 'late' ? 'amber' : emp.attendance_status === 'leave' ? 'slate' : 'rose'}>
                                        {emp.attendance_status?.toUpperCase() || 'ABSENT'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-zinc-50 rounded-2xl flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Checked In</p>
                                        <p className="font-black text-emerald-600 text-[11px] tabular-nums">{formatTime(emp.check_in)}</p>
                                    </div>
                                    <div className="p-3 bg-zinc-50 rounded-2xl flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Checked Out</p>
                                        <p className="font-black text-rose-600 text-[11px] tabular-nums">{formatTime(emp.check_out)}</p>
                                    </div>
                                </div>

                                <div className="p-4 border border-zinc-100 rounded-[1.5rem] flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Assigned Protocol</p>
                                        <p className="text-[10px] font-black text-black uppercase">{emp.shift}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Protocol Hours</p>
                                        <p className="text-[10px] font-black text-zinc-500">{formatTime(emp.entry_time)} - {formatTime(emp.exit_time)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredData.length === 0 && (
                        <div className="p-20 text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No attendance records found for today</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
