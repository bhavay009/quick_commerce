import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';

function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signUp } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: authError } = await signUp(email, password, { data: { full_name: name } });
            if (authError) throw new Error(authError.message);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#08080F" }}>
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }} />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#7C3AED,#a78bfa)", boxShadow: "0 0 32px rgba(124,58,237,0.4)" }}>
                        <Zap size={24} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Atoms Intelligence</h1>
                    <p className="text-sm text-gray-500 mt-1">Create your account</p>
                </div>

                {/* Card */}
                <div className="rounded-2xl p-8 border border-white/10" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
                    {error && (
                        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.08)" }}>
                            <AlertCircle size={15} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Rahul Sharma"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
                                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
                                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="password"
                                    type={showPass ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
                                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all mt-2 flex items-center justify-center gap-2"
                            style={{
                                background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7C3AED,#6d28d9)",
                                boxShadow: loading ? "none" : "0 0 24px rgba(124,58,237,0.35)",
                            }}
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                            ) : "Create Account"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;
