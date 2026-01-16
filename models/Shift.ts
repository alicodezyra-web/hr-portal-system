import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Shift name is required'],
        unique: true,
    },
    entry_time: {
        type: String,
        required: true,
        default: '09:00',
    },
    exit_time: {
        type: String,
        required: true,
        default: '18:00',
    },
    break_start: {
        type: String,
        required: true,
        default: '13:00',
    },
    break_end: {
        type: String,
        required: true,
        default: '14:00',
    },
    break_duration: {
        type: Number,
        default: 60, // in minutes
    },
    working_days: {
        type: String,
        enum: ['monday-saturday', 'monday-friday'],
        default: 'monday-saturday',
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

export default mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
