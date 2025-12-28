import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Wallet, LogIn, ArrowRight, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

const LoginPage = () => {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        setIsLoading(true);
        setError("");
        try {
            await signInWithGoogle();
        } catch (err) {
            setError("登入失敗，請檢查網路或稍後再試。"); // Login failed, please check network or try again later.
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-[#F9F9F7] overflow-hidden font-inter">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>

            <div className="relative w-full max-w-md p-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 flex flex-col items-center text-center animate-[slideUp_0.5s_ease-out]">

                    {/* Logo / Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 mb-8 rotate-3 transition-transform hover:rotate-6 duration-300">
                        <Wallet size={40} className="text-white" />
                    </div>

                    <h1 className="text-3xl font-serif-tc font-bold text-slate-800 mb-3">
                        CatLog
                    </h1>
                    <p className="text-slate-500 mb-8 font-medium">
                        您的個人智慧資產管家
                    </p>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-8">
                        <div className="bg-slate-50 p-3 rounded-xl flex flex-col items-center gap-2 border border-slate-100">
                            <Sparkles size={18} className="text-amber-400" />
                            <span className="text-xs font-bold text-slate-600">多幣別支援</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl flex flex-col items-center gap-2 border border-slate-100">
                            <TrendingUp size={18} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-600">資產趨勢</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full mb-4 p-3 bg-rose-50 text-rose-500 text-sm rounded-xl font-bold flex items-center justify-center gap-2 animate-shake">
                            <ShieldCheck size={16} />
                            {error}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full group relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>使用 Google 帳號登入</span>
                                </>
                            )}
                        </div>
                    </button>

                    <div className="mt-6 text-xs text-slate-400 flex items-center justify-center gap-1">
                        <ShieldCheck size={12} />
                        <span>資料安全加密保護</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
