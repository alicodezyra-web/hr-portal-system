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
    const [updatingDressingId, setUpdatingDressingId] = useState<string | null>(null);
    const [markingAttendanceId, setMarkingAttendanceId] = useState<string | null>(null);
    const [manualTimeModal, setManualTimeModal] = useState<{ show: boolean; employee: any; type: 'checkin' | 'checkout' } | null>(null);
    const [manualTime, setManualTime] = useState({ hour: '09', minute: '00', ampm: 'AM' });

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

                // Determine attendance status: if no check-in, check if 1 hour has passed since entry_time
                let attendanceStatus = attToday?.status || 'A';
                if (!attToday) {
                    // No check-in yet - check if 1 hour has passed since entry time
                    const entryTimeStr = u.entry_time || '09:00';
                    const [entryHour, entryMinute] = entryTimeStr.split(':').map(Number);
                    const entryTimeDate = new Date();
                    entryTimeDate.setHours(entryHour, entryMinute, 0, 0);
                    
                    // Add 1 hour to entry time
                    const oneHourAfterEntry = new Date(entryTimeDate.getTime() + 60 * 60000);
                    const now = new Date();
                    
                    if (now < oneHourAfterEntry) {
                        attendanceStatus = 'pending';
                    } else {
                        attendanceStatus = 'absent';
                    }
                }

                return {
                    ...u,
                    check_in_raw: attToday?.checkIn,
                    check_in: attToday?.checkIn || '-',
                    check_out: attToday?.checkOut || '-',
                    dressing: attToday?.dressing || 'none',
                    attendance_status: attendanceStatus,
                    is_late_today: attToday?.status === 'late',
                    late_summary: `${lates} Late, ${absents} Absent`,
                    monthly_leaves: leaves,
                    attendance_id: attToday?._id || null
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

    const handleDressingChange = async (attendanceId: string | null, dressing: 'formal' | 'casual' | 'none') => {
        if (!attendanceId) {
            toast.error('No attendance record found for today');
            return;
        }
        try {
            setUpdatingDressingId(attendanceId);
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_dressing', attendanceId, dressing })
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to update dressing');
                return;
            }
            toast.success('Dressing updated');
            // Refresh data to reflect latest dressing
            fetchData();
        } catch (e) {
            toast.error('Network error while updating dressing');
        } finally {
            setUpdatingDressingId(null);
        }
    };

    const openManualTimeModal = (employee: any, type: 'checkin' | 'checkout') => {
        // Set current time as default or existing time
        const now = new Date();
        let hour = now.getHours();
        const minute = now.getMinutes();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        
        // If employee already has time, use that
        if (type === 'checkin' && employee.check_in_raw) {
            const checkInDate = new Date(employee.check_in_raw);
            hour = checkInDate.getHours() % 12 || 12;
            const checkInMinute = checkInDate.getMinutes();
            setManualTime({
                hour: hour.toString().padStart(2, '0'),
                minute: checkInMinute.toString().padStart(2, '0'),
                ampm: checkInDate.getHours() >= 12 ? 'PM' : 'AM'
            });
        } else if (type === 'checkout' && employee.check_out && employee.check_out !== '-') {
            const checkOutDate = new Date(employee.check_out);
            hour = checkOutDate.getHours() % 12 || 12;
            const checkOutMinute = checkOutDate.getMinutes();
            setManualTime({
                hour: hour.toString().padStart(2, '0'),
                minute: checkOutMinute.toString().padStart(2, '0'),
                ampm: checkOutDate.getHours() >= 12 ? 'PM' : 'AM'
            });
        } else {
            setManualTime({
                hour: hour.toString().padStart(2, '0'),
                minute: minute.toString().padStart(2, '0'),
                ampm
            });
        }
        
        setManualTimeModal({ show: true, employee, type });
    };

    const handleManualTimeSubmit = async () => {
        if (!manualTimeModal) return;
        
        const { employee, type } = manualTimeModal;
        try {
            setMarkingAttendanceId(employee._id);
            
            // Convert time to 24-hour format
            let hour24 = parseInt(manualTime.hour);
            if (manualTime.ampm === 'PM' && hour24 !== 12) {
                hour24 += 12;
            } else if (manualTime.ampm === 'AM' && hour24 === 12) {
                hour24 = 0;
            }
            
            const today = new Date();
            today.setHours(hour24, parseInt(manualTime.minute), 0, 0);
            
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: type === 'checkin' ? 'admin_checkin' : 'admin_checkout',
                    userId: employee._id,
                    manualTime: today.toISOString(),
                    note: `Manually marked by admin at ${manualTime.hour}:${manualTime.minute} ${manualTime.ampm}`
                })
            });
            
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to mark attendance');
                return;
            }
            
            toast.success(`${employee.full_name} ${type === 'checkin' ? 'checked in' : 'checked out'} at ${manualTime.hour}:${manualTime.minute} ${manualTime.ampm}`);
            setManualTimeModal(null);
            fetchData();
        } catch (e) {
            toast.error('Network error while marking attendance');
        } finally {
            setMarkingAttendanceId(null);
        }
    };

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
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Manual Action</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Dressing</th>
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
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                {!emp.attendance_id ? (
                                                    <button
                                                        onClick={() => openManualTimeModal(emp, 'checkin')}
                                                        disabled={markingAttendanceId === emp._id}
                                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Set Time In
                                                    </button>
                                                ) : !emp.check_out || emp.check_out === '-' ? (
                                                    <button
                                                        onClick={() => openManualTimeModal(emp, 'checkout')}
                                                        disabled={markingAttendanceId === emp._id}
                                                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Set Time Out
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Completed</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">DRESSING</div>
                                                <div className="flex items-center justify-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={emp.dressing === 'formal'}
                                                            onChange={() => handleDressingChange(emp.attendance_id, emp.dressing === 'formal' ? 'none' : 'formal')}
                                                            disabled={updatingDressingId === emp.attendance_id || !emp.attendance_id}
                                                            className="w-5 h-5 rounded border-2 border-zinc-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-0 cursor-pointer disabled:opacity-50 checked:bg-black checked:border-black transition-all"
                                                        />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${emp.dressing === 'formal' ? 'text-black' : 'text-zinc-500'}`}>FORMAL</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={emp.dressing === 'casual'}
                                                            onChange={() => handleDressingChange(emp.attendance_id, emp.dressing === 'casual' ? 'none' : 'casual')}
                                                            disabled={updatingDressingId === emp.attendance_id || !emp.attendance_id}
                                                            className="w-5 h-5 rounded border-2 border-zinc-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-0 cursor-pointer disabled:opacity-50 checked:bg-black checked:border-black transition-all"
                                                        />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${emp.dressing === 'casual' ? 'text-black' : 'text-zinc-500'}`}>CASUAL</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                                {emp.attendance_status === 'present' || emp.attendance_status === 'late' ? (
                                                    <>
                                                        <Badge variant="emerald">PRESENT</Badge>
                                                        {emp.attendance_status === 'late' && (
                                                            <Badge variant="amber">LATE</Badge>
                                                        )}
                                                    </>
                                                ) : emp.attendance_status === 'leave' ? (
                                                    <Badge variant="slate">LEAVE</Badge>
                                                ) : emp.attendance_status === 'pending' ? (
                                                    <Badge variant="amber">PENDING</Badge>
                                                ) : (
                                                    <Badge variant="rose">ABSENT</Badge>
                                                )}
                                            </div>
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
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {emp.attendance_status === 'present' || emp.attendance_status === 'late' ? (
                                            <>
                                                <Badge variant="emerald">PRESENT</Badge>
                                                {emp.attendance_status === 'late' && (
                                                    <Badge variant="amber">LATE</Badge>
                                                )}
                                            </>
                                        ) : emp.attendance_status === 'leave' ? (
                                            <Badge variant="slate">LEAVE</Badge>
                                        ) : emp.attendance_status === 'pending' ? (
                                            <Badge variant="amber">PENDING</Badge>
                                        ) : (
                                            <Badge variant="rose">ABSENT</Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-3">
                                    {!emp.attendance_id ? (
                                        <button
                                            onClick={() => openManualTimeModal(emp, 'checkin')}
                                            disabled={markingAttendanceId === emp._id}
                                            className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Set Time In
                                        </button>
                                    ) : !emp.check_out || emp.check_out === '-' ? (
                                        <button
                                            onClick={() => openManualTimeModal(emp, 'checkout')}
                                            disabled={markingAttendanceId === emp._id}
                                            className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Set Time Out
                                        </button>
                                    ) : (
                                        <div className="flex-1 px-4 py-2.5 bg-zinc-100 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-center">
                                            Completed
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border border-zinc-100 rounded-[1.5rem] space-y-3">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">DRESSING</p>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={emp.dressing === 'formal'}
                                                onChange={() => handleDressingChange(emp.attendance_id, emp.dressing === 'formal' ? 'none' : 'formal')}
                                                disabled={updatingDressingId === emp.attendance_id || !emp.attendance_id}
                                                className="w-5 h-5 rounded border-2 border-zinc-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-0 cursor-pointer disabled:opacity-50 checked:bg-black checked:border-black transition-all"
                                            />
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${emp.dressing === 'formal' ? 'text-black' : 'text-zinc-500'}`}>FORMAL</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={emp.dressing === 'casual'}
                                                onChange={() => handleDressingChange(emp.attendance_id, emp.dressing === 'casual' ? 'none' : 'casual')}
                                                disabled={updatingDressingId === emp.attendance_id || !emp.attendance_id}
                                                className="w-5 h-5 rounded border-2 border-zinc-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-0 cursor-pointer disabled:opacity-50 checked:bg-black checked:border-black transition-all"
                                            />
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${emp.dressing === 'casual' ? 'text-black' : 'text-zinc-500'}`}>CASUAL</span>
                                        </label>
                                    </div>
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

            {/* Manual Time Modal */}
            {manualTimeModal && (
                <Modal
                    isOpen={manualTimeModal.show}
                    onClose={() => setManualTimeModal(null)}
                    title={`Set ${manualTimeModal.type === 'checkin' ? 'Time In' : 'Time Out'} - ${manualTimeModal.employee.full_name}`}
                >
                    <div className="space-y-6 p-6">
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                                Enter the time when employee {manualTimeModal.type === 'checkin' ? 'arrived' : 'left'}
                            </p>
                            
                            <div className="flex items-center gap-3">
                                {/* Hour Input */}
                                <div className="flex flex-col items-center gap-2">
                                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Hour</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={manualTime.hour}
                                        onChange={(e) => {
                                            let val = parseInt(e.target.value) || 1;
                                            if (val < 1) val = 1;
                                            if (val > 12) val = 12;
                                            setManualTime({ ...manualTime, hour: val.toString().padStart(2, '0') });
                                        }}
                                        className="w-16 px-3 py-3 text-center text-2xl font-black border-2 border-zinc-200 rounded-xl focus:border-black outline-none"
                                    />
                                </div>
                                
                                <span className="text-3xl font-black text-black mt-6">:</span>
                                
                                {/* Minute Input */}
                                <div className="flex flex-col items-center gap-2">
                                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Minute</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={manualTime.minute}
                                        onChange={(e) => {
                                            let val = parseInt(e.target.value) || 0;
                                            if (val < 0) val = 0;
                                            if (val > 59) val = 59;
                                            setManualTime({ ...manualTime, minute: val.toString().padStart(2, '0') });
                                        }}
                                        className="w-16 px-3 py-3 text-center text-2xl font-black border-2 border-zinc-200 rounded-xl focus:border-black outline-none"
                                    />
                                </div>
                                
                                {/* AM/PM Toggle */}
                                <div className="flex flex-col items-center gap-2">
                                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Period</label>
                                    <div className="flex flex-col gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setManualTime({ ...manualTime, ampm: 'AM' })}
                                            className={`px-4 py-2 rounded-lg text-sm font-black uppercase transition-all ${
                                                manualTime.ampm === 'AM' 
                                                    ? 'bg-black text-white' 
                                                    : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                                            }`}
                                        >
                                            AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualTime({ ...manualTime, ampm: 'PM' })}
                                            className={`px-4 py-2 rounded-lg text-sm font-black uppercase transition-all ${
                                                manualTime.ampm === 'PM' 
                                                    ? 'bg-black text-white' 
                                                    : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                                            }`}
                                        >
                                            PM
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-4 bg-zinc-50 rounded-xl">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center mb-1">Selected Time</p>
                                <p className="text-2xl font-black text-black text-center">
                                    {manualTime.hour}:{manualTime.minute} {manualTime.ampm}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setManualTimeModal(null)}
                                className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleManualTimeSubmit}
                                disabled={markingAttendanceId === manualTimeModal.employee._id}
                                className="flex-1 px-4 py-3 bg-black hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {markingAttendanceId === manualTimeModal.employee._id ? 'Saving...' : 'Save Time'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminDashboard;
