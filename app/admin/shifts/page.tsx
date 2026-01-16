'use client';

import React, { useState, useEffect } from 'react';
import {
    Clock, Plus, Save, Trash2, Edit2, Loader2,
    Coffee, Timer, CheckCircle2, XCircle, Search, Calendar
} from 'lucide-react';
import { Card, Badge, PrimaryButton, Modal, Input, Select } from '@/components/SharedUI';
import { toast } from 'react-toastify';

const ShiftManagement: React.FC = () => {
    const [shifts, setShifts] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingShift, setEditingShift] = useState<any>(null);
    const [deploymentData, setDeploymentData] = useState({ agentIds: [] as string[], shiftName: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingAgentId, setUpdatingAgentId] = useState<string | null>(null);
    const [isAssigningMultiple, setIsAssigningMultiple] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [shiftsRes, usersRes] = await Promise.all([
                fetch('/api/shifts'),
                fetch('/api/users')
            ]);
            const shiftsData = await shiftsRes.json();
            const usersData = await usersRes.json();

            if (shiftsRes.ok) setShifts(shiftsData || []);
            if (usersRes.ok) setAgents(usersData || []);
        } catch (error) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddNew = () => {
        setEditingShift({
            name: 'Morning Shift',
            entry_time: '09:00',
            exit_time: '18:00',
            break_start: '13:00',
            break_end: '14:00',
            break_duration: 60,
            working_days: 'monday-saturday',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (shift: any) => {
        setEditingShift({ 
            ...shift, 
            working_days: shift.working_days || 'monday-saturday' 
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this shift policy?")) return;
        try {
            const res = await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Shift deleted");
                fetchData();
            }
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const isNew = !editingShift._id;
        try {
            // Ensure working_days is included in the payload
            const workingDaysValue = editingShift.working_days || 'monday-saturday';
            
            const payload = isNew 
                ? { ...editingShift, working_days: workingDaysValue }
                : { id: editingShift._id, ...editingShift, working_days: workingDaysValue };
            
            // Debug: log the payload to verify working_days is included
            console.log('Saving shift with working_days:', workingDaysValue, 'Full payload:', payload);
            
            const res = await fetch('/api/shifts', {
                method: isNew ? 'POST' : 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedShift = await res.json();
                console.log('Saved shift response:', savedShift);
                toast.success(isNew ? "Shift Policy Created" : "Shift Policy Updated");
                // Force refresh the data
                await fetchData();
                setIsModalOpen(false);
            } else {
                const err = await res.json();
                toast.error(err.error || "Save failed");
            }
        } catch (error) {
            toast.error("Process error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignShift = async (agentId: string, shiftName: string) => {
        const selectedShift = shifts.find(s => s.name === shiftName);
        if (!selectedShift) return;

        setUpdatingAgentId(agentId);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: agentId,
                    updates: {
                        shift: shiftName,
                        entry_time: selectedShift.entry_time,
                        exit_time: selectedShift.exit_time,
                        break_in: selectedShift.break_start,
                        break_off: selectedShift.break_end
                    }
                })
            });

            if (res.ok) {
                toast.success("Assignment updated successfully");
                fetchData();
                setIsDeployModalOpen(false);
            } else {
                toast.error("Process failed");
            }
        } catch (error) {
            toast.error("System error");
        } finally {
            setUpdatingAgentId(null);
        }
    };

    const handleAssignMultipleShifts = async () => {
        if (deploymentData.agentIds.length === 0 || !deploymentData.shiftName) {
            toast.error("Please select shift and at least one employee");
            return;
        }

        const selectedShift = shifts.find(s => s.name === deploymentData.shiftName);
        if (!selectedShift) {
            toast.error("Selected shift not found");
            return;
        }

        setIsAssigningMultiple(true);
        try {
            // Assign shift to all selected employees
            const promises = deploymentData.agentIds.map(agentId =>
                fetch('/api/users', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: agentId,
                        updates: {
                            shift: deploymentData.shiftName,
                            entry_time: selectedShift.entry_time,
                            exit_time: selectedShift.exit_time,
                            break_in: selectedShift.break_start,
                            break_off: selectedShift.break_end
                        }
                    })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                toast.success(`${deploymentData.agentIds.length} employees assigned to ${deploymentData.shiftName}`);
                fetchData();
                setIsDeployModalOpen(false);
                setDeploymentData({ agentIds: [], shiftName: '' });
            } else {
                toast.error("Some assignments failed");
            }
        } catch (error) {
            toast.error("System error");
        } finally {
            setIsAssigningMultiple(false);
        }
    };

    const handleOpenDeploy = () => {
        setDeploymentData({ agentIds: [], shiftName: shifts[0]?.name || '' });
        setSearchQuery('');
        setIsDeployModalOpen(true);
    };

    const toggleEmployeeSelection = (agentId: string) => {
        setDeploymentData(prev => {
            if (prev.agentIds.includes(agentId)) {
                return { ...prev, agentIds: prev.agentIds.filter(id => id !== agentId) };
            } else {
                return { ...prev, agentIds: [...prev.agentIds, agentId] };
            }
        });
    };

    const formatTime = (time: string) => {
        if (!time) return '-';
        try {
            const [h, m] = time.split(':');
            const d = new Date();
            d.setHours(parseInt(h), parseInt(m));
            return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) { return time; }
    };

    if (loading && shifts.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-black" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Loading Policies...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter leading-none mb-2">Shift Policies</h1>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Organizational Timing Configuration</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <PrimaryButton icon={Plus} onClick={handleOpenDeploy} className="!bg-white !text-black border border-zinc-200 shadow-none">Assignment Form</PrimaryButton>
                    <PrimaryButton icon={Plus} onClick={handleAddNew}>Defined New Shift</PrimaryButton>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {shifts.map((shift) => (
                    <Card key={shift._id} className="relative group overflow-hidden border-zinc-100 hover:border-black transition-all !p-6 sm:!p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <Clock size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(shift)} className="p-2.5 bg-zinc-50 rounded-xl hover:bg-black hover:text-white transition-all"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(shift._id)} className="p-2.5 bg-zinc-50 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight mb-4">{shift.name}</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duty Timings</span>
                                <span className="text-[11px] font-black text-black">{formatTime(shift.entry_time)} - {formatTime(shift.exit_time)}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <Coffee size={14} className="text-zinc-400" />
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Break Window</span>
                                </div>
                                <span className="text-[11px] font-black text-black">{formatTime(shift.break_start)} - {formatTime(shift.break_end)}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-zinc-100 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <Timer size={14} className="text-zinc-400" />
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Break</span>
                                </div>
                                <Badge variant="black">{shift.break_duration} MINS</Badge>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-zinc-400" />
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Working Days</span>
                                </div>
                                <Badge variant="emerald">
                                    {(() => {
                                        // Get the working_days value
                                        const workingDays = shift.working_days;
                                        
                                        // Debug: log the value to see what we're getting
                                        // console.log('Shift:', shift.name, 'working_days:', workingDays);
                                        
                                        if (!workingDays) {
                                            return 'MON-SAT'; // Default
                                        }
                                        
                                        // Normalize the value - handle both string and any case variations
                                        const normalized = String(workingDays).toLowerCase().trim();
                                        
                                        // Check for monday-friday first
                                        if (normalized === 'monday-friday' || normalized === 'mon-fri') {
                                            return 'MON-FRI';
                                        }
                                        
                                        // Check for monday-saturday
                                        if (normalized === 'monday-saturday' || normalized === 'mon-sat') {
                                            return 'MON-SAT';
                                        }
                                        
                                        // Default to MON-SAT
                                        return 'MON-SAT';
                                    })()}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingShift?._id ? "Edit Policy" : "New Shift Policy"}>
                <form onSubmit={handleSave} className="space-y-6">
                    <Select
                        label="Shift Designation (Select Type)"
                        value={editingShift?.name || "Morning Shift"}
                        onChange={(e: any) => setEditingShift({ ...editingShift, name: e.target.value })}
                        options={["Morning Shift", "Evening Shift", "Night Shift", "General Shift", "Afternoon Shift"]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Entry Time"
                            type="time"
                            value={editingShift?.entry_time || ""}
                            onChange={(e: any) => setEditingShift({ ...editingShift, entry_time: e.target.value })}
                            required
                        />
                        <Input
                            label="Exit Time"
                            type="time"
                            value={editingShift?.exit_time || ""}
                            onChange={(e: any) => setEditingShift({ ...editingShift, exit_time: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Break Start"
                            type="time"
                            value={editingShift?.break_start || ""}
                            onChange={(e: any) => setEditingShift({ ...editingShift, break_start: e.target.value })}
                            required
                        />
                        <Input
                            label="Break End"
                            type="time"
                            value={editingShift?.break_end || ""}
                            onChange={(e: any) => setEditingShift({ ...editingShift, break_end: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Break Duration (Minutes)"
                        type="number"
                        value={editingShift?.break_duration || 60}
                        onChange={(e: any) => setEditingShift({ ...editingShift, break_duration: parseInt(e.target.value) })}
                        required
                    />

                    <Select
                        label="Working Days"
                        value={editingShift?.working_days || 'monday-saturday'}
                        onChange={(e: any) => {
                            const newValue = e.target.value;
                            setEditingShift({ ...editingShift, working_days: newValue });
                        }}
                        options={['monday-saturday', 'monday-friday']}
                    />

                    <div className="flex justify-end pt-4">
                        <PrimaryButton type="submit" icon={Save} disabled={isSaving} className="w-full sm:w-auto">
                            {isSaving ? 'Saving...' : 'Save Policy'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeployModalOpen} onClose={() => setIsDeployModalOpen(false)} title="Shift Deployment Form">
                <div className="space-y-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 1: Select Shift Policy</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {shifts.map(s => (
                                    <button
                                        key={s._id}
                                        onClick={() => setDeploymentData({ ...deploymentData, shiftName: s.name })}
                                        className={`w-full text-left p-6 rounded-3xl border-2 transition-all group ${deploymentData.shiftName === s.name ? 'border-black bg-black text-white shadow-2xl' : 'border-zinc-100 bg-zinc-50 hover:border-zinc-300'}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-black text-sm uppercase tracking-tight">{s.name}</span>
                                            {deploymentData.shiftName === s.name && <CheckCircle2 size={18} />}
                                        </div>
                                        <p className={`text-[10px] font-bold ${deploymentData.shiftName === s.name ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                            {formatTime(s.entry_time)} - {formatTime(s.exit_time)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 2: Select Employees</h4>
                                {deploymentData.agentIds.length > 0 && (
                                    <Badge variant="black">{deploymentData.agentIds.length} Selected</Badge>
                                )}
                            </div>
                            <div className="relative group mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                                <input
                                    type="text"
                                    placeholder="Find agent..."
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-black transition-all"
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    value={searchQuery}
                                />
                            </div>
                            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {agents.filter(a => a.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                                    <button
                                        key={a._id}
                                        type="button"
                                        onClick={() => toggleEmployeeSelection(a._id)}
                                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${deploymentData.agentIds.includes(a._id) ? 'border-black bg-black text-white shadow-xl' : 'border-zinc-100 bg-white hover:border-zinc-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${deploymentData.agentIds.includes(a._id) ? 'border-white bg-white' : 'border-zinc-300 bg-transparent'}`}>
                                                {deploymentData.agentIds.includes(a._id) && <CheckCircle2 size={14} className={deploymentData.agentIds.includes(a._id) ? 'text-black' : 'text-zinc-400'} />}
                                            </div>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${deploymentData.agentIds.includes(a._id) ? 'bg-white text-black' : 'bg-zinc-100 text-black'}`}>
                                                {a.full_name?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-[11px] uppercase tracking-tight leading-none truncate">{a.full_name}</p>
                                                <p className={`text-[9px] font-bold mt-1 uppercase italic tracking-widest truncate ${deploymentData.agentIds.includes(a._id) ? 'text-zinc-300' : 'text-zinc-400'}`}>Currently: {a.shift || 'None'}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-8 border-t border-zinc-100">
                        <PrimaryButton
                            icon={Save}
                            disabled={deploymentData.agentIds.length === 0 || !deploymentData.shiftName || isAssigningMultiple}
                            onClick={handleAssignMultipleShifts}
                            className="w-full sm:w-auto"
                        >
                            {isAssigningMultiple ? `Assigning ${deploymentData.agentIds.length} Employees...` : `Complete Assignment (${deploymentData.agentIds.length} Selected)`}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            <div className="pt-12 space-y-6">
                <div>
                    <h2 className="text-3xl font-black text-black tracking-tighter leading-none mb-2 uppercase">Agent Assignment</h2>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Deploy workforce to active policies</p>
                </div>

                <Card className="!p-0 border-zinc-100 shadow-2xl overflow-hidden rounded-[2.5rem]">
                    <div className="p-6 sm:p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-50/20">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search Agents by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-black transition-all"
                            />
                        </div>
                        <Badge variant="black">{agents.length} Total Agents</Badge>
                    </div>

                    {/* Table View - Desktop Only */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-zinc-50/50">
                                <tr className="border-b border-zinc-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Current Protocol</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Timing Signature</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Reassignment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {agents.filter(a => a.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((agent) => (
                                    <tr key={agent._id} className="hover:bg-zinc-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs">
                                                    {agent.full_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-black tracking-tight leading-none mb-1 text-sm uppercase">{agent.full_name}</p>
                                                    <p className="text-[9px] text-zinc-400 font-black tracking-widest uppercase italic">{agent.employee_id || 'ID N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <Badge variant={agent.shift === 'Night Shift' ? 'black' : 'emerald'}>
                                                {agent.shift?.toUpperCase() || 'NO SHIFT'}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <p className="font-black text-black text-xs">{formatTime(agent.entry_time)} - {formatTime(agent.exit_time)}</p>
                                            <p className="text-[8px] font-black text-zinc-400 uppercase mt-1">Break: {formatTime(agent.break_in)} - {formatTime(agent.break_off)}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <select
                                                    value={agent.shift}
                                                    onChange={(e) => handleAssignShift(agent._id, e.target.value)}
                                                    disabled={updatingAgentId === agent._id}
                                                    className="bg-zinc-50 border border-zinc-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none focus:border-black transition-all disabled:opacity-50 cursor-pointer"
                                                >
                                                    <option disabled value="">Select Protocol</option>
                                                    {shifts.map(s => (
                                                        <option key={s._id} value={s.name}>{s.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                                {updatingAgentId === agent._id && <Loader2 className="animate-spin ml-2 text-black" size={16} />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Card View - Mobile Only */}
                    <div className="md:hidden divide-y divide-zinc-100">
                        {agents.filter(a => a.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((agent) => (
                            <div key={agent._id} className="p-6 space-y-4 bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs">
                                            {agent.full_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-black text-[13px] uppercase tracking-tight">{agent.full_name}</p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{agent.employee_id || 'ID N/A'}</p>
                                        </div>
                                    </div>
                                    <Badge variant={agent.shift === 'Night Shift' ? 'black' : 'emerald'}>
                                        {agent.shift?.toUpperCase() || 'NO SHIFT'}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Protocol Timing</p>
                                        <p className="font-black text-black text-[11px]">{formatTime(agent.entry_time)} - {formatTime(agent.exit_time)}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Break Window</p>
                                        <p className="font-black text-zinc-500 text-[11px]">{formatTime(agent.break_in)} - {formatTime(agent.break_off)}</p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={agent.shift}
                                        onChange={(e) => handleAssignShift(agent._id, e.target.value)}
                                        disabled={updatingAgentId === agent._id}
                                        className="w-full bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl px-6 py-4 outline-none appearance-none disabled:opacity-50"
                                    >
                                        <option disabled value="">Reassign Protocol</option>
                                        {shifts.map(s => (
                                            <option key={s._id} value={s.name}>{s.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {updatingAgentId === agent._id ? <Loader2 className="animate-spin text-white" size={16} /> : <Plus className="text-white" size={16} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ShiftManagement;
