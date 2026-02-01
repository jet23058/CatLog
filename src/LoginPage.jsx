import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Wallet, LogIn, ArrowRight, ShieldCheck, Sparkles, TrendingUp, PieChart, Lock, Upload, Smartphone, CheckCircle2 } from 'lucide-react';

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
            setError("登入失敗，請檢查網路或稍後再試。");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const FeatureCard = ({ icon: Icon, title, desc, colorClass }) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start gap-4">
            <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9F9F7] font-inter text-slate-800 selection:bg-teal-100 overflow-x-hidden">
            
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-[#F9F9F7]/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="font-serif-tc font-bold text-lg text-slate-800 tracking-wide">極簡貓資產</span>
                    </div>
                    <button 
                        onClick={handleLogin}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg hover:shadow-slate-800/20 active:scale-95 flex items-center gap-2"
                    >
                        <LogIn size={16} /> 
                        <span className="hidden sm:inline">立即登入</span>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-6 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-200/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20">
                    
                    {/* Left: Text Content */}
                    <div className="flex-1 text-center md:text-left space-y-8 z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-xs font-bold text-amber-600 animate-[fadeIn_0.5s]">
                            <Sparkles size={12} />
                            <span>v2.8.1 全新發布</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-serif-tc font-bold text-slate-900 leading-tight">
                            簡單，卻不簡單的<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">資產管理哲學</span>
                        </h1>
                        
                        <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-xl mx-auto md:mx-0">
                            專注於資產淨值成長，邁向 FIRE 財務自由。
                            支援多幣別自動匯率、隱私遮蔽與生物辨識鎖定。
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                            <button
                                onClick={handleLogin}
                                disabled={isLoading}
                                className="w-full sm:w-auto group relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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
                                            <span>使用 Google 登入</span>
                                        </>
                                    )}
                                </div>
                            </button>
                            {error && (
                                <div className="text-rose-500 text-sm font-bold flex items-center gap-2 bg-rose-50 px-3 py-2 rounded-lg animate-shake">
                                    <ShieldCheck size={14} />
                                    {error}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-slate-400 font-medium pt-2">
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500" /> 資料加密存儲</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500" /> 完全免費</span>
                        </div>
                    </div>

                    {/* Right: Visual Mockup */}
                    <div className="flex-1 relative w-full max-w-lg md:max-w-none perspective-1000">
                        {/* Decorative Elements */}
                        <div className="absolute top-10 -right-10 w-24 h-24 bg-amber-400 rounded-full blur-[40px] opacity-40 animate-bounce delay-700"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-400 rounded-full blur-[50px] opacity-30 animate-pulse"></div>

                        {/* Glass Card Container */}
                        <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-2xl transform rotate-y-[-5deg] hover:rotate-y-0 transition-transform duration-500">
                            {/* Mockup Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Assets</span>
                                    <span className="text-3xl font-serif-tc font-bold text-slate-800">$ 12,580,000</span>
                                </div>
                                <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <TrendingUp size={12} /> +15.4%
                                </div>
                            </div>

                            {/* Mockup Chart Area */}
                            <div className="h-40 bg-gradient-to-b from-white/50 to-white/10 rounded-xl border border-white/40 mb-4 flex items-end justify-between px-2 pb-2 gap-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                                    <div key={i} className="w-full bg-teal-500/80 rounded-t-sm hover:bg-teal-400 transition-colors" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>

                            {/* Mockup List Items */}
                            <div className="space-y-3">
                                {[
                                    { icon: Wallet, color: 'bg-blue-50 text-blue-600', name: '台新銀行', sub: 'TWD • 活存', amount: '$ 2,400,000' },
                                    { icon: PieChart, color: 'bg-purple-50 text-purple-600', name: 'Firstrade', sub: 'USD • 美股', amount: '$ 85,000' },
                                    { icon: Smartphone, color: 'bg-amber-50 text-amber-600', name: 'Binance', sub: 'USDT • 加密貨幣', amount: '₮ 12,000' },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-white/60 p-3 rounded-xl flex items-center justify-between border border-white/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.color}`}>
                                                <item.icon size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">{item.name}</div>
                                                <div className="text-[10px] text-slate-400">{item.sub}</div>
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-slate-700 text-sm">{item.amount}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="bg-white py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-serif-tc font-bold text-slate-800 mb-4">為什麼選擇極簡貓資產？</h2>
                        <p className="text-slate-500">不僅僅是記帳，更是全方位的資產戰略中心</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Feature 1: Dashboard */}
                        <div className="group relative bg-[#FAFAFA] rounded-3xl p-8 border border-slate-100 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-50/50 transition-all overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-[60px] -mr-10 -mt-10 transition-all group-hover:bg-emerald-200/50"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">全視角儀表板</h3>
                                <p className="text-slate-500 leading-relaxed mb-6">
                                    告別流水帳。我們專注於「資產淨值」的長期趨勢。自動計算年度資產增長率、被動收入佔比，並視覺化呈現您的財富累積曲線，讓您一眼掌握財務健康狀況。
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> 年度資產增長分析
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> 收入結構與佔比視覺化
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Feature 2: Privacy */}
                        <div className="group relative bg-[#FAFAFA] rounded-3xl p-8 border border-slate-100 hover:border-rose-100 hover:shadow-lg hover:shadow-rose-50/50 transition-all overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full blur-[60px] -mr-10 -mt-10 transition-all group-hover:bg-rose-200/50"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">金融級隱私防護</h3>
                                <p className="text-slate-500 leading-relaxed mb-6">
                                    您的財務數據僅屬於您。支援 Face ID / Touch ID 生物辨識鎖定，防止未經授權的存取。獨家的「隱私遮蔽模式」可一鍵隱藏所有敏感金額，在公共場合也能安心查看。
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> WebAuthn 生物辨識鎖定
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> 一鍵全域金額遮蔽
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Feature 3: Smart Import */}
                        <div className="group relative bg-[#FAFAFA] rounded-3xl p-8 border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-[60px] -mr-10 -mt-10 transition-all group-hover:bg-blue-200/50"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Upload size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">智慧匯入與多幣別</h3>
                                <p className="text-slate-500 leading-relaxed mb-6">
                                    無縫銜接您的記帳習慣。支援匯入記帳軟體 (如 Moze) 的 CSV 格式，智慧識別退款與消費。內建即時匯率轉換，無論是美股、日幣存款或加密貨幣，都能統一以本幣計算總資產。
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> 智慧 CSV 匯入與退款識別
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> 多幣別自動匯率換算
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Feature 4: FIRE Calculator */}
                        <div className="group relative bg-[#FAFAFA] rounded-3xl p-8 border border-slate-100 hover:border-amber-100 hover:shadow-lg hover:shadow-amber-50/50 transition-all overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-[60px] -mr-10 -mt-10 transition-all group-hover:bg-amber-200/50"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">FIRE 財務自由目標</h3>
                                <p className="text-slate-500 leading-relaxed mb-6">
                                    不僅是紀錄，更是規劃未來。內建 FIRE (Financial Independence, Retire Early) 計算機，根據 4% 法則與您的支出習慣，科學化預估退休目標金額與達成進度。
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> 4% 法則退休金試算
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> 視覺化目標達成進度條
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 py-12 px-6 border-t border-slate-200">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-sm text-slate-500 font-medium">
                        <a href="/privacy.html" target="_blank" className="hover:text-teal-600 transition-colors">隱私權政策</a>
                        <a href="/terms.html" target="_blank" className="hover:text-teal-600 transition-colors">服務條款</a>
                    </div>

                    <div className="text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} CatLog. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
