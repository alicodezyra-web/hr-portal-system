import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const token = await createToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        await setAuthCookie(token);

        const userResponse = {
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
            phone: user.phone,
        };

        return NextResponse.json({ user: userResponse });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
