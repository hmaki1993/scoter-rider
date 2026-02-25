import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Mic,
    Users,
    CreditCard,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Smartphone,
    BarChart3,
    Bot,
    ChevronDown
} from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/app');
            }
        };
        checkSession();
    }, [navigate]);

    const features = [
        {
            title: "Hoki Toki Protocol",
            description: "Military-grade encrypted instant voice communication. Zero latency for elite synchronization.",
            icon: <Mic className="w-6 h-6 text-black" />,
            color: "from-[#D4AF37] via-[#F9E29C] to-[#AA841E]",
            span: "md:col-span-6 lg:col-span-4"
        },
        {
            title: "Royal Attendance",
            description: "Biometric and occupancy analytics for students and master coaches. Precision tracking reimagined.",
            icon: <Users className="w-6 h-6 text-black" />,
            color: "from-[#F9E29C] via-[#D4AF37] to-[#8B6E23]",
            span: "md:col-span-6 lg:col-span-8"
        },
        {
            title: "Elite Financials",
            description: "Sophisticated revenue forecasting, payroll automation, and automated institutional reporting.",
            icon: <CreditCard className="w-6 h-6 text-black" />,
            color: "from-[#D4AF37] via-[#AA841E] to-[#5C4D1C]",
            span: "md:col-span-12 lg:col-span-8"
        },
        {
            title: "Epic AI Oracle",
            description: "Neural-assisted academy optimization. AI that anticipates staff needs and athlete progression.",
            icon: <Bot className="w-6 h-6 text-black" />,
            color: "from-[#AA841E] via-[#D4AF37] to-[#F9E29C]",
            span: "md:col-span-6 lg:col-span-4"
        },
        {
            title: "Unified Logistics",
            description: "Dynamic schedule orchestration across multiple batches, levels, and training arenas.",
            icon: <Calendar className="w-6 h-6 text-black" />,
            color: "from-[#D4AF37] via-[#F9E29C] to-[#AA841E]",
            span: "md:col-span-6 lg:col-span-4"
        },
        {
            title: "Master Dashboards",
            description: "Cinematic data visualization providing 360-degree visibility into academy operations.",
            icon: <BarChart3 className="w-6 h-6 text-black" />,
            color: "from-[#C5A028] via-[#D4AF37] to-[#8B6E23]",
            span: "md:col-span-12 lg:col-span-8"
        }
    ];

    return (
        <div
            className="min-h-screen bg-[#020202] text-white selection:bg-[#D4AF37]/30 overflow-x-hidden font-inter border-t-2 border-[#D4AF37]/20 origin-top scroll-smooth"
            style={{ zoom: '0.9' }}
        >
            {/* Ultra-Premium Noise Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.04] mix-blend-overlay">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                </svg>
            </div>

            {/* Cinematic Layered Lighting System */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#D4AF37]/10 blur-[180px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#AA841E]/8 blur-[180px] rounded-full animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
                <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-[#F9E29C]/5 blur-[150px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[60%] right-[20%] w-[30%] h-[30%] bg-[#D4AF37]/3 blur-[120px] rounded-full opacity-50"></div>
            </div>

            {/* Navigation - Ultra-Refined Floating Glass */}
            <nav className="sticky top-6 z-[100] px-6" style={{ perspective: '1200px' }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between px-10 py-5 bg-black/40 backdrop-blur-3xl border border-white/[0.08] rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] sidebar-3d-item translate-z-[40px]">
                    <div className="flex items-center gap-6 group cursor-pointer sidebar-3d-item hover:translate-x-1 transition-all duration-500">
                        <div className="relative w-12 h-12 flex items-center justify-center p-1.5 overflow-hidden transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 rounded-full bg-white/5 border border-white/10 group-hover:border-[#D4AF37]/50 shadow-2xl">
                            <div className="absolute inset-0 bg-[#D4AF37]/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md"></div>
                            <img src="/logo.png" alt="Epic Logo" className="relative z-10 w-full h-full object-contain mix-blend-screen" style={{ clipPath: 'circle(50%)' }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black tracking-[0.35em] leading-tight text-white/90 group-hover:text-white transition-colors">ACADEMY <span className="text-[#D4AF37] italic">SYSTEM</span></span>
                            <span className="text-[8px] font-extrabold text-[#D4AF37]/40 uppercase tracking-[0.6em] mt-0.5">Excellence Preferred</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.45em] text-white/30">
                        {["Infrastructure", "Royal Solutions", "Our Legacy"].map((item, i) => (
                            <a
                                key={i}
                                href={`#${item.toLowerCase().split(' ')[item.toLowerCase().split(' ').length - 1]}`}
                                className="hover:text-[#D4AF37] transition-all relative group py-2 sidebar-3d-item hover:translate-z-[10px]"
                            >
                                {item}
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent transition-all group-hover:w-full shadow-[0_0_10px_#D4AF37]"></span>
                            </a>
                        ))}
                    </div>

                    <div className="w-[100px] flex justify-end">
                        <div className="relative group/access" onClick={() => navigate('/login')}>
                            <div className="absolute -inset-2 bg-[#D4AF37]/20 blur-lg rounded-full opacity-0 group-hover/access:opacity-100 transition-opacity duration-700"></div>
                            <div className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_15px_#D4AF37] cursor-pointer"></div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section - The Apex */}
            <section className="relative pt-40 pb-32 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
                <div className="relative inline-flex items-center gap-4 px-8 py-3 rounded-full bg-white/[0.02] border border-[#D4AF37]/20 mb-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="absolute inset-0 bg-[#D4AF37]/5 blur-xl rounded-full opacity-50"></div>
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]/80 relative z-10">THE STANDARD OF GLOBAL EXCELLENCE • EST. 1886</span>
                </div>

                <h1 className="text-5xl md:text-[6rem] font-black tracking-[-0.04em] mb-10 leading-[0.9] max-w-5xl animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-200">
                    <span className="block opacity-90">THE ELITE</span>
                    <span className="bg-gradient-to-b from-[#D4AF37] via-[#F9E29C] to-[#AA841E] bg-clip-text text-fill-transparent italic">ACADEMY</span>
                    <br /> <span className="opacity-90">PLATFORM</span>
                </h1>

                <p className="text-lg md:text-xl text-white/30 max-w-3xl mb-12 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 tracking-wide">
                    Beyond digital management. A handcrafted institutional infrastructure for the globally distinguished <span className="text-white/60 font-semibold tracking-normal px-1">Elite Academy.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-8 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
                    <button
                        onClick={() => navigate('/login')}
                        className="group relative px-16 py-6 overflow-hidden rounded-[2.5rem] transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_30px_70px_rgba(212,175,55,0.3)] bg-[#D4AF37]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-center gap-5 text-black font-black uppercase tracking-[0.3em] text-[13px]">
                            Master Access
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
                        </div>
                        {/* Shimmer effect */}
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[25deg] group-hover:left-[100%] transition-all duration-1000 ease-in-out"></div>
                    </button>
                    <button className="px-16 py-6 rounded-[2.5rem] border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black text-[13px] uppercase tracking-[0.3em] text-white/40 hover:text-white/70 backdrop-blur-xl">
                        Institutional Profile
                    </button>
                </div>

                {/* Animated Scroll Indicator */}
                <div className="mt-20 animate-bounce opacity-20">
                    <ChevronDown className="w-8 h-8" />
                </div>
            </section>

            {/* Features Section - Bento Masterpiece */}
            <section id="features" className="py-32 px-6 max-w-7xl mx-auto relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-48 bg-gradient-to-b from-[#D4AF37]/80 to-transparent"></div>

                <div className="text-center mb-32 relative group">
                    {/* Cinematic Brand Logo - Maximum Detail Focus */}
                    <div className="flex justify-center mb-12 opacity-40 transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-100">
                        <div className="relative">
                            {/* Central Logo - High Detail Focus */}
                            <img
                                src="/logo.png"
                                className="w-56 h-56 object-contain relative z-10 transition-all duration-300"
                                alt="Logo"
                            />

                            {/* Focus Glow Aura */}
                            <div className="absolute inset-[-40px] bg-[#D4AF37]/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        </div>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-[-0.04em] opacity-90 leading-tight uppercase">ROYAL <br /><span className="text-[#D4AF37] italic">INFRASTRUCTURE</span></h2>
                    <div className="flex flex-wrap items-center justify-center gap-6 opacity-40 italic font-black tracking-[0.3em] text-[10px] uppercase grayscale group hover:grayscale-0 transition-all duration-1000">
                        <span>Work To Shine</span>
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
                        <span>Shine To Inspire</span>
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
                        <span>Manifest</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.07] hover:border-[#D4AF37]/40 transition-all duration-1000 hover:-translate-y-6 hover:shadow-[0_60px_120px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-16 ${f.span}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                            <div className={`w-16 h-16 rounded-[2rem] bg-gradient-to-br ${f.color} flex items-center justify-center mb-12 shadow-[0_20px_40px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
                                {f.icon}
                            </div>

                            <h3 className="text-2xl font-black mb-6 tracking-tighter text-white/90 group-hover:text-[#D4AF37] transition-all duration-700">{f.title}</h3>
                            <p className="text-white/30 text-lg leading-relaxed font-medium group-hover:text-white/60 transition-all duration-700 max-w-lg">
                                {f.description}
                            </p>

                            {/* Corner Accent */}
                            <div className="absolute top-10 right-10 w-4 h-4 rounded-full border border-[#D4AF37]/20 group-hover:border-[#D4AF37] transition-colors duration-1000"></div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Legacy Section - Dynasty Reimagined */}
            <section id="solutions" className="py-60 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#020202]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square bg-[#D4AF37]/2 blur-[250px] rounded-full"></div>

                <div className="max-w-7xl mx-auto px-10 relative z-10 flex flex-col lg:flex-row items-center gap-40">
                    <div className="flex-1 w-full text-center lg:text-left">
                        <div className="w-20 h-[2px] bg-gradient-to-r from-[#D4AF37] to-transparent mb-16 mx-auto lg:mx-0"></div>
                        <h2 className="text-5xl md:text-8xl font-black tracking-tight mb-16 leading-[0.85] opacity-90">
                            A DYNASTY <br />
                            <span className="text-[#D4AF37] italic uppercase">EVOLVED</span>.
                        </h2>
                        <div className="space-y-12 inline-block text-left w-full max-w-2xl">
                            {[
                                "Native Synchronization across Institutional Nodes",
                                "End-to-End Cryptographic Communication Architecture",
                                "Predictive Athlete Growth & Performance Modeling",
                                "Algorithmic Logistics & Arena Coordination",
                                "Royal Institutional Financial Forensic Reporting"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-10 group cursor-default">
                                    <div className="relative w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37] transition-all duration-700 group-hover:scale-110">
                                        <CheckCircle2 className="w-6 h-6 text-white/20 group-hover:text-black transition-colors" />
                                    </div>
                                    <span className="font-bold text-2xl text-white/30 group-hover:text-white transition-all duration-700 tracking-tight leading-tight"> {item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full flex justify-center">
                        <div className="relative w-full max-w-xl aspect-square">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/15 to-transparent blur-3xl opacity-60"></div>
                            <div className="relative z-10 bg-[#050505]/60 backdrop-blur-3xl border border-white/10 p-24 rounded-[5rem] flex flex-col items-center justify-center text-center shadow-[0_80px_160px_rgba(0,0,0,0.9)] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"></div>
                                <div className="p-10 bg-[#D4AF37]/5 rounded-[3rem] mb-16 border border-[#D4AF37]/10 group hover:border-[#D4AF37]/30 transition-all duration-700">
                                    <Smartphone className="w-20 h-20 text-[#D4AF37] transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="text-9xl font-black mb-6 tracking-tighter text-white group-hover:text-[#D4AF37] transition-colors duration-700"> 138+</div>
                                <p className="text-[#D4AF37]/40 font-black uppercase tracking-[0.6em] text-[11px] mb-20 whitespace-nowrap">Years of Unrivaled Excellence</p>

                                <div className="w-full grid grid-cols-2 gap-10">
                                    <div className="text-left">
                                        <div className="text-5xl font-black mb-2 tracking-tighter text-white/80 italic">100%</div>
                                        <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[8px]"> Sovereignty</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-black mb-2 tracking-tighter text-white/80 italic">GLOBAL</div>
                                        <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[8px]"> Reach</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA - The Grand Finale (Cinematic High) */}
            <section id="about" className="py-64 px-10 max-w-7xl mx-auto text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"></div>

                <div className="group relative bg-[#050505]/40 backdrop-blur-3xl border border-white/[0.05] p-24 md:p-32 rounded-[5rem] overflow-hidden shadow-[0_120px_250px_rgba(0,0,0,0.9)] transition-all duration-1000 hover:border-[#D4AF37]/20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-[#D4AF37]/10 blur-[180px] rounded-full group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-[#AA841E]/10 blur-[180px] rounded-full group-hover:opacity-100 transition-opacity"></div>

                    <h2 className="text-5xl md:text-8xl font-black mb-12 relative z-10 tracking-[-0.06em] leading-[0.85] italic opacity-90 group-hover:scale-[1.02] transition-transform duration-1000 uppercase">
                        THE FUTURE <br />
                        <span className="text-[#D4AF37] not-italic">OF GYMNASTICS.</span>
                    </h2>

                    <p className="text-white/30 mb-20 text-2xl max-w-2xl mx-auto relative z-10 leading-relaxed italic font-light tracking-tight group-hover:text-white/50 transition-colors duration-1000">
                        "Work to Shine • Shine to Inspire • Manifest"
                    </p>

                    <div className="flex justify-center">
                        <div className="h-[2px] w-64 bg-gradient-to-r from-transparent via-white/10 to-transparent mb-16"></div>
                    </div>

                    <div className="text-[11px] font-black uppercase tracking-[0.8em] text-white/10 relative z-10 hover:text-[#D4AF37]/40 transition-colors duration-500 cursor-default">
                        Institutional Grade Infrastructure // Ahmed Hmaki
                    </div>
                </div>
            </section>

            {/* Footer - Final Elegance */}
            <footer className="py-32 border-t border-white/[0.03] bg-black">
                <div className="max-w-7xl mx-auto px-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-16 mb-24">
                        <div className="flex items-center gap-6 group cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                            <div className="relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-[#D4AF37]/50 transition-all duration-700">
                                <img src="/logo.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" style={{ clipPath: 'circle(50%)' }} />
                                <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-opacity blur-md"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-[0.4em] uppercase text-white/80 group-hover:text-white transition-colors">ACADEMY <span className="text-[#D4AF37]">SYSTEM</span></span>
                                <span className="text-[8px] font-bold text-white/20 tracking-[0.5em] uppercase">Ecosystem Standard</span>
                            </div>
                        </div>

                        <div className="flex gap-16 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
                            {["Transparency", "Sovereignty", "Excellence"].map((t, i) => (
                                <span key={i} className="cursor-default hover:text-white/50 transition-colors">{t}</span>
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-white/10 text-[10px] font-black tracking-[0.6em] uppercase flex flex-col items-center gap-6">
                            <span>© 2026 Academy Ecosystem • Designed for Absolute Distinction</span>
                            <span className="text-[#D4AF37]/80 tracking-[0.4em] font-black uppercase text-[8px] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] cursor-default">
                                Articulated by Ahmed Hmaki
                            </span>
                            <div className="flex gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="w-[1.5px] h-4 bg-white/5"></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 10s infinite ease-in-out;
                }
                .text-fill-transparent {
                    -webkit-text-fill-color: transparent;
                }
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: #020202;
                }
                ::-webkit-scrollbar-thumb {
                    background: #202020;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #303030;
                }
            `}</style>
        </div>
    );
}
