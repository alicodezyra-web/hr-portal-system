import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, getAuthToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();
        const users = await User.find({ role: 'employee' }).sort({ full_name: 1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        const { email, password, full_name, role, ...rest } = body;

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const finalRole = role || 'employee';

        // Auto-generate employee ID for employees
        let generatedEmployeeId = '';
        if (finalRole === 'employee') {
            // Find the highest existing employee_id number
            const existingEmployees = await User.find({ 
                employee_id: { $regex: /^EMP\d+$/ } 
            }).sort({ employee_id: -1 }).limit(1);
            
            if (existingEmployees.length > 0 && existingEmployees[0].employee_id) {
                // Extract number from last employee_id (e.g., EMP01 -> 1)
                const lastId = existingEmployees[0].employee_id;
                const lastNumber = parseInt(lastId.replace('EMP', '')) || 0;
                const nextNumber = lastNumber + 1;
                generatedEmployeeId = `EMP${nextNumber.toString().padStart(2, '0')}`;
            } else {
                // First employee
                generatedEmployeeId = 'EMP01';
            }
        }

        const newUser = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name,
            role: finalRole,
            employee_id: finalRole === 'employee' ? (rest.employee_id || generatedEmployeeId) : '',
            annual_leaves: finalRole === 'employee' ? (rest.annual_leaves || 12) : (rest.annual_leaves || 0),
            casual_leaves: finalRole === 'employee' ? (rest.casual_leaves || 12) : (rest.casual_leaves || 0),
            ...rest
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        const { id, userId, updates, ...directData } = body;

        const finalId = id || userId;
        const finalUpdate = updates || directData;

        if (!finalId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const user = await User.findByIdAndUpdate(
            finalId,
            { ...finalUpdate, updatedAt: new Date() },
            { new: true }
        );

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    return PATCH(request);
}

export async function DELETE(request: Request) {
    try {
        const token = await getAuthToken();
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await dbConnect();
        await User.findByIdAndDelete(userId);

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
