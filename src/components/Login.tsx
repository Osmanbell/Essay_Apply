import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { BriefcaseBusiness, ShieldCheck, Sparkles, Zap, ArrowRight, Building2, Users2, Globe2, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';

const SIGN_IN_DATA = [
  {
    title: "Monitor Your Autonomous Agent",
    description: "Access your dashboard to review real-time job matches, track automated applications, and manage your AI-tailored career growth."
  },
  {
    title: "Real-Time Application Tracking",
    description: "Stay updated with instant notifications as our AI agent submits your profile to top-tier global companies."
  },
  {
    title: "AI-Powered Career Insights",
    description: "Analyze your market value and receive personalized recommendations to optimize your professional trajectory."
  },
  {
    title: "Manage Your Global Presence",
    description: "Oversee your applications across multiple continents and industries from a single, unified command center."
  },
  {
    title: "Autonomous Interview Scheduling",
    description: "Let our agent coordinate with recruiters to find the perfect time for your next big career move."
  }
];

const SIGN_UP_DATA = [
  {
    title: "Automate Your Global Job Search",
    description: "Our AI agent scans global markets 24/7, analyzes job requirements, tailors your CV with precision, and handles applications autonomously."
  },
  {
    title: "International Standard CV Generation",
    description: "Transform your experience into a world-class resume that beats ATS filters and catches the eye of elite recruiters."
  },
  {
    title: "24/7 Global Market Scanning",
    description: "While you sleep, our agent is hunting for opportunities in tech hubs from Silicon Valley to Lagos and beyond."
  },
  {
    title: "Precision-Tailored Cover Letters",
    description: "Every application is unique. Our AI crafts personalized cover letters that highlight your exact fit for every role."
  },
  {
    title: "Zero-Effort Job Applications",
    description: "Stop filling out repetitive forms. Upload your CV once and let our autonomous agent handle the rest of your career journey."
  }
];

export function Login() {
  const { signIn, signInEmail, signUpEmail, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Typewriter state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState({ title: '', description: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  // Reset typewriter when switching between sign up and sign in
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayText({ title: '', description: '' });
    setIsDeleting(false);
    setTypingSpeed(100);
  }, [isSignUp]);

  useEffect(() => {
    const currentData = isSignUp ? SIGN_UP_DATA[currentIndex] : SIGN_IN_DATA[currentIndex];
    let timer: NodeJS.Timeout;

    const handleType = () => {
      const fullTitle = currentData.title;
      const fullDesc = currentData.description;

      if (!isDeleting) {
        // Typing
        if (displayText.title !== fullTitle) {
          setDisplayText(prev => ({
            ...prev,
            title: fullTitle.substring(0, prev.title.length + 1)
          }));
          setTypingSpeed(50);
        } else if (displayText.description !== fullDesc) {
          setDisplayText(prev => ({
            ...prev,
            description: fullDesc.substring(0, prev.description.length + 1)
          }));
          setTypingSpeed(30);
        } else {
          // Finished typing both - Stay still for 10 seconds
          setTypingSpeed(10000); 
          setIsDeleting(true);
        }
      } else {
        // Deleting
        if (displayText.description !== '') {
          setDisplayText(prev => ({
            ...prev,
            description: prev.description.substring(0, prev.description.length - 1)
          }));
          setTypingSpeed(20);
        } else if (displayText.title !== '') {
          setDisplayText(prev => ({
            ...prev,
            title: prev.title.substring(0, prev.title.length - 1)
          }));
          setTypingSpeed(40);
        } else {
          // Finished deleting
          setIsDeleting(false);
          const dataLength = isSignUp ? SIGN_UP_DATA.length : SIGN_IN_DATA.length;
          setCurrentIndex((prev) => (prev + 1) % dataLength);
          setTypingSpeed(500);
        }
      }
    };

    timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, typingSpeed, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);

    try {
      if (isSignUp) {
        if (!name) throw new Error('Please enter your name');
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        await signUpEmail(email, password, name);
      } else {
        await signInEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is disabled. Please enable it in your Firebase Console: https://console.firebase.google.com/project/gen-lang-client-0464812555/authentication/providers');
      } else {
        setError(err.message || 'An error occurred during authentication');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = authLoading || localLoading;

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Side: Content */}
      <div className="flex-1 flex flex-col justify-center px-12 lg:px-24 relative z-10 bg-white overflow-y-auto py-12">
        <div className="max-w-xl w-full space-y-12">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-4 rounded-3xl animate-in zoom-in duration-500">
              <BriefcaseBusiness className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">EasyApply</h1>
              <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest leading-tight">Your best Autonomous<br/>job Agent</p>
            </div>
          </div>

          <div className="space-y-6 min-h-[200px]">
            <h2 className="text-5xl font-black text-gray-900 leading-[1.1] tracking-tight">
              {displayText.title}
              <span className="inline-block w-1 h-12 bg-emerald-600 ml-2 animate-pulse align-middle" />
            </h2>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              {displayText.description}
            </p>
          </div>

          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-emerald-600 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-emerald-600 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-emerald-600 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-emerald-600 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100">
                  {error.includes('http') ? (
                    <>
                      {error.split('https://')[0]}
                      <a 
                        href={`https://${error.split('https://')[1]}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-red-700 break-all"
                      >
                        https://{error.split('https://')[1]}
                      </a>
                    </>
                  ) : error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
                <span className="bg-white px-4 text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={signIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 text-gray-900 px-8 py-5 rounded-2xl font-black text-lg hover:border-emerald-600 transition-all disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Google Account
            </button>

            <p className="text-center text-gray-500 font-bold">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-emerald-600 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>

            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-100">
              <Feature icon={Globe2} label="Global Reach" />
              <Feature icon={Sparkles} label="AI Tailoring" />
              <Feature icon={ShieldCheck} label="Auto Apply" />
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-50 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl opacity-50" />
      </div>

      {/* Right Side: Beautiful Corporate Imagery */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-900/10 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920" 
          alt="Modern Corporate Office" 
          className="absolute inset-0 w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-[10s] ease-out"
          referrerPolicy="no-referrer"
        />
        
        {/* Floating Stats/Cards */}
        <div className="absolute bottom-12 left-12 right-12 z-20 space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex items-center gap-6 animate-in slide-in-from-right-12 duration-1000 delay-300">
            <div className="bg-emerald-600 p-4 rounded-2xl">
              <Users2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900">12,400+</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Active Professionals</p>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex items-center gap-6 animate-in slide-in-from-right-12 duration-1000 delay-500">
            <div className="bg-emerald-600 p-4 rounded-2xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900">450+</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Global Partners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: any) {
  return (
    <div className="space-y-2">
      <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}
