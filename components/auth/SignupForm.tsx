import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const SignupForm: React.FC = () => {
    const router = useRouter();
    const { signUp } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill all fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error: signUpError } = await signUp({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName
            });

            if (signUpError) {
                const errorMsg = typeof signUpError === 'string' ? signUpError : signUpError.message;
                setError(errorMsg);
                toast.error(errorMsg);
                setLoading(false);
            } else {
                toast.success('Registration Successful! Please login.');
                setSuccess(true);
            }
        } catch (err: any) {
            const errorMsg = err.message || 'An unexpected error occurred';
            setError(errorMsg);
            toast.error(errorMsg);
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                router.push('/login');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, router]);

    if (success) {
        return (
            <div className="text-center py-10">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-black mb-2">Registration Complete!</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Your account has been created successfully.</p>
                <p className="mt-4 text-sm font-bold">Redirecting to login...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight">Create Account</h2>
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-1">Fill in your details to get started</p>
            </div>

            {/* Full Name */}
            <div className="form-group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-black outline-none transition-all font-bold text-sm"
                    />
                </div>
            </div>

            {/* Email */}
            <div className="form-group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@company.com"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-black outline-none transition-all font-bold text-sm"
                    />
                </div>
            </div>

            {/* Password */}
            <div className="form-group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-black outline-none transition-all font-bold text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Confirm Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-black outline-none transition-all font-bold text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                    >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {error && <p className="text-rose-500 text-[10px] font-bold uppercase mt-4 text-center">{error}</p>}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full px-10 py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
                {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Already have an account? <Link href="/login" className="text-black hover:underline">Login</Link>
                </p>
            </div>
        </form>
    );
};

export default SignupForm;
