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
        const { action, note, dressing } = body; // action: 'checkin' | 'checkout'

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await AttendanceModel.findOne({
            user: decoded.id,
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
        }

        return NextResponse.json(attendance);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
