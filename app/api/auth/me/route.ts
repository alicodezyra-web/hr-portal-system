import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, getAuthToken } from '@/lib/auth';

export async function GET() {
    try {
        const token = await getAuthToken();

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const decoded: any = await verifyToken(token);

        if (!decoded) {
            return NextResponse.json({ user: null });
        }

        await dbConnect();
        const user = await User.findById(decoded.id);

        if (!user) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                shift: user.shift,
                position: user.position,
                salary: user.salary,
                entry_time: user.entry_time,
                exit_time: user.exit_time,
                break_in: user.break_in,
                break_off: user.break_off,
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ user: null });
    }
}
