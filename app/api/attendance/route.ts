import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, getAuthToken } from '@/lib/auth';
import AttendanceModel from '@/models/Attendance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let query = {};
        if (userId) {
            // If userId is provided, check permissions
            if (userId !== decoded.id && decoded.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            query = { user: userId };
        } else if (decoded.role !== 'admin') {
            // If no userId and not admin, return only self
            query = { user: decoded.id };
        }
        // If no userId and is admin, query remains empty (fetch all)

        const attendance = await AttendanceModel.find(query)
            .populate('user', 'full_name email role position department shift entry_time exit_time break_in break_off salary phone')
            .sort({ date: -1 });
        return NextResponse.json(attendance);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await request.json();
        const { action, note, dressing, attendanceId, userId, manualTime } = body; // action: 'checkin' | 'checkout' | 'set_dressing' | 'admin_checkin' | 'admin_checkout'

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // For admin actions, use the provided userId, otherwise use decoded.id
        const targetUserId = (action === 'admin_checkin' || action === 'admin_checkout') ? userId : decoded.id;
        
        // Admin-only actions check
        if ((action === 'admin_checkin' || action === 'admin_checkout') && decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let attendance = await AttendanceModel.findOne({
            user: targetUserId,
            date: { $gte: today }
        });

        if (action === 'checkin') {
            if (attendance) {
                return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
            }

            // --- LATE LOGIC START ---
            let status: 'present' | 'late' | 'absent' | 'on_leave' | 'active' = 'present';
            const user = await import('@/models/User').then(m => m.default.findById(decoded.id));

            if (user) {
                const entryTimeStr = user.entry_time || '09:00';
                const [entryHour, entryMinute] = entryTimeStr.split(':').map(Number);

                const entryTimeDate = new Date();
                entryTimeDate.setHours(entryHour, entryMinute, 0, 0);

                // Add 5 minutes grace period
                const graceTime = new Date(entryTimeDate.getTime() + 5 * 60000);

                const now = new Date();

                if (now > graceTime) {
                    status = 'late';

                    // Penalty Logic: Check existing late records for this month
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                    const lateCount = await AttendanceModel.countDocuments({
                        user: decoded.id,
                        status: 'late',
                        date: { $gte: startOfMonth, $lte: endOfMonth }
                    });

                    // If this is the 3rd, 6th, 9th... late
                    if ((lateCount + 1) % 3 === 0) {
                        if (user.casual_leaves > 0) {
                            user.casual_leaves -= 1;
                        } else {
                            user.annual_leaves -= 1;
                        }
                        await user.save();
                    }
                }
            }
            // --- LATE LOGIC END ---

            attendance = await AttendanceModel.create({
                user: decoded.id,
                date: new Date(),
                checkIn: new Date(),
                status: status, // 'present' or 'late'
                notes: note,
                // Dressing will be assigned/updated by admin later; default to 'none' for now
                dressing: dressing || 'none'
            });

            // Sync with User Document (as requested)
            if (user) {
                user.current_check_in = new Date();
                user.current_check_out = null; // Reset for new day/shift
                user.attendance_status = status;
                await user.save();
            }

        } else if (action === 'checkout') {
            if (!attendance) {
                return NextResponse.json({ error: 'No check-in found for today' }, { status: 400 });
            }
            if (attendance.checkOut) {
                return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
            }
            attendance.checkOut = new Date();
            // If they are checking out, we can implicitly consider the shift "done".
            if (note) attendance.notes = note;
            await attendance.save();

            // Sync with User Document
            const user = await import('@/models/User').then(m => m.default.findById(decoded.id));
            if (user) {
                user.current_check_out = new Date();
                await user.save();
            }
        } else if (action === 'admin_checkin') {
            // Admin-only: manually check-in an employee
            if (decoded.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!userId) {
                return NextResponse.json({ error: 'userId is required' }, { status: 400 });
            }

            if (attendance) {
                return NextResponse.json({ error: 'Employee already checked in today' }, { status: 400 });
            }

            // Get the target user
            const targetUser = await import('@/models/User').then(m => m.default.findById(userId));
            if (!targetUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Use manualTime if provided, otherwise use current time
            const checkInTime = manualTime ? new Date(manualTime) : new Date();
            
            // Determine status based on entry time and check-in time
            let status: 'present' | 'late' = 'present';
            const entryTimeStr = targetUser.entry_time || '09:00';
            const [entryHour, entryMinute] = entryTimeStr.split(':').map(Number);
            
            // Create entry time on the same day as check-in
            const entryTimeDate = new Date(checkInTime);
            entryTimeDate.setHours(entryHour, entryMinute, 0, 0);
            const graceTime = new Date(entryTimeDate.getTime() + 5 * 60000);

            // Compare check-in time with grace time
            if (checkInTime.getTime() > graceTime.getTime()) {
                status = 'late';
            }

            attendance = await AttendanceModel.create({
                user: userId,
                date: new Date(),
                checkIn: checkInTime,
                status: status,
                notes: note || 'Manually marked by admin',
                dressing: 'none'
            });

            // Sync with User Document
            targetUser.current_check_in = new Date();
            targetUser.current_check_out = null;
            targetUser.attendance_status = status;
            await targetUser.save();

        } else if (action === 'admin_checkout') {
            // Admin-only: manually check-out an employee
            if (decoded.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!userId) {
                return NextResponse.json({ error: 'userId is required' }, { status: 400 });
            }

            if (!attendance) {
                return NextResponse.json({ error: 'No check-in found for today' }, { status: 400 });
            }

            if (attendance.checkOut) {
                return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
            }

            // Use manualTime if provided, otherwise use current time
            const checkOutTime = manualTime ? new Date(manualTime) : new Date();
            attendance.checkOut = checkOutTime;
            if (note) attendance.notes = note;
            await attendance.save();

            // Sync with User Document
            const targetUser = await import('@/models/User').then(m => m.default.findById(userId));
            if (targetUser) {
                targetUser.current_check_out = new Date();
                await targetUser.save();
            }

        } else if (action === 'set_dressing') {
            // Admin-only: set or update dressing for a specific attendance record
            if (decoded.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!attendanceId || !dressing) {
                return NextResponse.json({ error: 'attendanceId and dressing are required' }, { status: 400 });
            }

            const validDressings = ['casual', 'formal', 'none'];
            if (!validDressings.includes(dressing)) {
                return NextResponse.json({ error: 'Invalid dressing value' }, { status: 400 });
            }

            attendance = await AttendanceModel.findById(attendanceId);
            if (!attendance) {
                return NextResponse.json({ error: 'Attendance not found' }, { status: 404 });
            }

            attendance.dressing = dressing;
            await attendance.save();
        }

        return NextResponse.json(attendance);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
