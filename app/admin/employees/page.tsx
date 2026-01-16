'use client';

import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, Edit2, User,
    Mail, Phone, Briefcase, Clock,
    Save, Trash2, Loader2, ChevronDown, ChevronUp,
    CreditCard, DollarSign, Calendar, Coffee
} from 'lucide-react';
import { Card, Badge, SectionHeader, PrimaryButton, Modal, Input, Select } from '@/components/SharedUI';
import { toast } from 'react-toastify';

const Employees: React.FC = () => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const [usersRes, shiftsRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/shifts')
            ]);

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setProfiles(usersData || []);
            }
            if (shiftsRes.ok) {
                const shiftsData = await shiftsRes.json();
                setAvailableShifts(shiftsData || []);
            }
        } catch (error) {
            toast.error("Fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleAddNew = () => {
        setEditingProfile({
            full_name: '',
            employee_id: '', // Will be auto-generated on server
            email: '',
            password: 'Employee123!', // Default password
            role: 'employee',
            shift: 'Day Shift',
            department: 'Development', // Used as Job Title
            position: 'Associate',
            salary: '50000',
            entry_time: '09:00',
            exit_time: '18:00',
            annual_leaves: 12, // 1 leave per month = 12 per year
            casual_leaves: 12,
            phone: '', // Mobile (Optional)
        });
        setIsModalOpen(true);
    };

    const handleEdit = (profile: any) => {
        setEditingProfile({ ...profile });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this staff record?")) {
            try {
                const res = await fetch(`/api/users?userId=${id}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    toast.success("Staff record removed");
                    fetchProfiles();
                } else {
                    toast.error("Failed to delete");
                }
            } catch (error) {
                toast.error("Process error");
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mandatory field validation (employee_id not required for new employees - will be auto-generated)
        const isNew = !editingProfile._id;
        const mandatoryFields = isNew 
            ? ['full_name', 'salary', 'position', 'department', 'shift', 'entry_time', 'exit_time', 'annual_leaves']
            : ['full_name', 'employee_id', 'salary', 'position', 'department', 'shift', 'entry_time', 'exit_time', 'annual_leaves'];
        const missing = mandatoryFields.filter(f => !editingProfile[f]);
        if (missing.length > 0) {
            toast.error(`Required: ${missing.join(', ')}`);
            return;
        }

        setIsSaving(true);
        if (editingProfile) {
            const isNew = !editingProfile._id;
            try {
                // For new employees, don't send employee_id (will be auto-generated)
                const { employee_id, ...newEmployeeData } = editingProfile;
                const payload = isNew 
                    ? { ...newEmployeeData, annual_leaves: editingProfile.annual_leaves || 12, casual_leaves: editingProfile.casual_leaves || 12 }
                    : {
                        userId: editingProfile._id,
                        updates: {
                            full_name: editingProfile.full_name,
                            employee_id: editingProfile.employee_id,
                            email: editingProfile.email,
                            role: editingProfile.role,
                            shift: editingProfile.shift,
                            department: editingProfile.department,
                            phone: editingProfile.phone,
                            position: editingProfile.position,
                            salary: editingProfile.salary,
                            entry_time: editingProfile.entry_time,
                            exit_time: editingProfile.exit_time,
                            annual_leaves: editingProfile.annual_leaves,
                            casual_leaves: editingProfile.casual_leaves || 12,
                        }
                    };

                const res = await fetch('/api/users', {
                    method: isNew ? 'POST' : 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    toast.success(isNew ? "New agent created" : "Profile updated");
                    fetchProfiles();
                    setIsModalOpen(false);
                } else {
                    const err = await res.json();
                    toast.error(err.error || (isNew ? "Creation failed" : "Update failed"));
                }
            } catch (error) {
                toast.error("Process error");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleChange = (field: string, value: any) => {
        if (editingProfile) {
            let updates = { ...editingProfile, [field]: value };

            // Auto-populate timings if shift is changed
            if (field === "shift") {
                const selectedShift = availableShifts.find(s => s.name === value);
                if (selectedShift) {
                    updates = {
                        ...updates,
                        entry_time: selectedShift.entry_time,
                        exit_time: selectedShift.exit_time,
                        break_in: selectedShift.break_start, // Assuming break_in/off are used elsewhere
                        break_off: selectedShift.break_end
                    };
                }
            }
            setEditingProfile(updates);
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

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && profiles.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-black" size={48} />
                    <p className="text-zinc-400 font-black uppercase text-[10px] tracking-[0.4em]">Querying Workforce...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter leading-none mb-2">Staff Registry</h1>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Detailed Resource Intelligence</p>
                </div>
                <PrimaryButton icon={Plus} onClick={handleAddNew}>Add New Agent</PrimaryButton>
            </div>

            <Card className="!p-0 overflow-hidden shadow-2xl border border-zinc-100">
                <div className="p-8 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-zinc-50/20">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Name, ID, Dept..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black transition-all"
                        />
                    </div>
                    <button onClick={fetchProfiles} className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-zinc-500 border border-zinc-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-black transition-all shadow-sm">
                        <Filter size={16} /> Refresh
                    </button>
                </div>

                {/* Table View - Desktop Only */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent Info</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">ID</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Position / Job Title</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Shift / Timing</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Salary</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Annual Leaves</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Mobile</th>
                                <th className="px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filteredProfiles.map((emp) => (
                                <tr key={emp._id} className="hover:bg-zinc-50/30 transition-colors group text-xs text-black">
                                    <td className="px-6 py-6 min-w-[200px]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black">
                                                {emp.full_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-black tracking-tight leading-none mb-1 text-sm uppercase">{emp.full_name}</p>
                                                <p className="text-[9px] text-zinc-400 font-bold tracking-widest">{emp.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center font-black uppercase">
                                        {emp.employee_id || 'N/A'}
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <p className="font-black text-black uppercase">{emp.position}</p>
                                        <Badge variant="slate">{emp.department?.toUpperCase()}</Badge>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <p className="font-black text-black uppercase tracking-widest mb-1">{emp.shift}</p>
                                        <div className="flex flex-col gap-1 items-center">
                                            <p className="text-[10px] font-bold text-zinc-400">{formatTime(emp.entry_time)} - {formatTime(emp.exit_time)}</p>
                                            <Badge variant="rose" className="!text-[8px] !px-2 !py-0.5">BREAK: {formatTime(emp.break_in)} - {formatTime(emp.break_off)}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center font-black">
                                        Rs {emp.salary || '0'}
                                    </td>
                                    <td className="px-6 py-6 text-center font-black leading-none">
                                        <div className="bg-zinc-100 rounded-lg px-3 py-2 inline-block">
                                            {emp.annual_leaves || '0'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center text-zinc-400 font-black">
                                        {emp.phone || '-'}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(emp)} className="p-3 bg-zinc-50 text-black hover:bg-black hover:text-white rounded-xl transition-all shadow-sm"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(emp._id)} className="p-3 bg-zinc-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Card View - Mobile Only */}
                <div className="md:hidden divide-y divide-zinc-100">
                    {filteredProfiles.map((emp) => (
                        <div key={emp._id} className="p-6 space-y-5 bg-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-xl shadow-zinc-200">
                                        {emp.full_name?.[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-black text-[14px] uppercase tracking-tighter leading-none mb-1 truncate">{emp.full_name}</p>
                                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest truncate">{emp.employee_id || 'ID N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(emp)} className="p-3 bg-zinc-50 text-black rounded-2xl active:bg-black active:text-white transition-all"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(emp._id)} className="p-3 bg-zinc-50 text-rose-500 rounded-2xl active:bg-rose-500 active:text-white transition-all"><Trash2 size={18} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-zinc-50 rounded-2xl">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Position</p>
                                    <p className="text-[11px] font-black text-black uppercase truncate">{emp.position}</p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl text-right">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Department</p>
                                    <p className="text-[11px] font-black text-black uppercase truncate">{emp.department}</p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Shift Protocol</p>
                                    <p className="text-[11px] font-black text-black uppercase">{emp.shift}</p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl text-right">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Monthly Salary</p>
                                    <p className="text-[11px] font-black text-black uppercase">PKR {emp.salary}</p>
                                </div>
                            </div>

                            <div className="p-5 border border-zinc-100 rounded-[2rem] flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Timing Schedule</p>
                                    <p className="text-[11px] font-black text-black">{formatTime(emp.entry_time)} - {formatTime(emp.exit_time)}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Break Window</p>
                                    <p className="text-[11px] font-black text-zinc-500 italic">{formatTime(emp.break_in)} - {formatTime(emp.break_off)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProfile?._id ? "Edit Staff Agent" : "Add New Staff Agent"}>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                        <Input label="Employee Full Name" value={editingProfile?.full_name || ""} onChange={(e: any) => handleChange("full_name", e.target.value)} icon={User} required />
                        <Input 
                            label="Employee ID (Unique)" 
                            value={editingProfile?.employee_id || ""} 
                            onChange={(e: any) => handleChange("employee_id", e.target.value)} 
                            icon={CreditCard} 
                            required={!!editingProfile?._id}
                            disabled={!editingProfile?._id}
                            placeholder={!editingProfile?._id ? "Will be auto-generated" : ""}
                        />
                        <Input label="Email Address" type="email" value={editingProfile?.email || ""} onChange={(e: any) => handleChange("email", e.target.value)} icon={Mail} required />
                        {!editingProfile?._id && (
                            <Input label="System Password" type="password" value={editingProfile?.password || ""} onChange={(e: any) => handleChange("password", e.target.value)} icon={Clock} required />
                        )}
                    </div>

                    <div className="space-y-6">
                        <Input label="Official Position" value={editingProfile?.position || ""} onChange={(e: any) => handleChange("position", e.target.value)} icon={Briefcase} required />
                        <Input label="Job Title / Dept" value={editingProfile?.department || ""} onChange={(e: any) => handleChange("department", e.target.value)} icon={Briefcase} required />
                        <Input label="Monthly Salary (PKR)" value={editingProfile?.salary || ""} onChange={(e: any) => handleChange("salary", e.target.value)} icon={DollarSign} required />
                        <Input label="Annual Leave Balance" type="number" value={editingProfile?.annual_leaves || 12} onChange={(e: any) => handleChange("annual_leaves", parseInt(e.target.value))} icon={Calendar} required />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-100">
                        <div className="space-y-6">
                            <Select
                                label="Operational Shift"
                                value={editingProfile?.shift || "Day Shift"}
                                onChange={(e: any) => handleChange("shift", e.target.value)}
                                options={availableShifts.length > 0 ? availableShifts.map(s => s.name) : ["Day Shift", "Night Shift", "Evening Shift"]}
                            />
                            <Input label="Mobile Number (Optional)" value={editingProfile?.phone || ""} onChange={(e: any) => handleChange("phone", e.target.value)} icon={Phone} />
                        </div>

                        <div className="space-y-6 bg-zinc-50 p-6 sm:p-8 rounded-[2.5rem]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Protocol Fingerprint</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Entry Time" type="time" value={editingProfile?.entry_time || ""} onChange={(e: any) => handleChange("entry_time", e.target.value)} icon={Clock} required />
                                <Input label="Exit Time" type="time" value={editingProfile?.exit_time || ""} onChange={(e: any) => handleChange("exit_time", e.target.value)} icon={Clock} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Break Start" type="time" value={editingProfile?.break_in || ""} onChange={(e: any) => handleChange("break_in", e.target.value)} icon={Coffee} />
                                <Input label="Break End" type="time" value={editingProfile?.break_off || ""} onChange={(e: any) => handleChange("break_off", e.target.value)} icon={Coffee} />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end pt-8">
                        <PrimaryButton type="submit" icon={Save} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? 'Processing...' : editingProfile?._id ? 'Update Agent' : 'Save Agent'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Employees;
