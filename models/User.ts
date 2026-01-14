import mongoose from 'mongoose';

// Force delete the model from cache to ensure schema updates are applied in Next.js
if (mongoose.models.User) {
    delete mongoose.models.User;
}

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        select: false,
    },
    full_name: {
        type: String,
        required: [true, 'Please provide a full name'],
    },
    employee_id: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['admin', 'employee'],
        default: 'employee',
    },
    phone: { type: String, default: '' },
    cnic: { type: String, default: '', required: false },
    position: { type: String, default: 'Associate' },
    salary: { type: String, default: '0' },
    shift: { type: String, default: 'Day Shift' },
    department: { type: String, default: 'Operations' },
    entry_time: { type: String, default: '09:00' },
    exit_time: { type: String, default: '18:00' },
    break_in: { type: String, default: '13:00' },
    break_off: { type: String, default: '14:00' },
    annual_leaves: { type: Number, default: 20 },
    casual_leaves: { type: Number, default: 0 },
    half_day: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    strict: false, // Ensure any unexpected fields are still allowed if schema mismatch occurs
    timestamps: true
});

export default mongoose.model('User', UserSchema);
