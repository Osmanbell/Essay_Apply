import { Job, CVProfile, Application } from '../types';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Clock, 
  Target, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Download, 
  Copy,
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Info,
  ExternalLink,
  PlusCircle,
  Mail,
  ChevronDown,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
  cvProfile: CVProfile | null;
}

interface CompanyInfo {
  name: string;
  domain: string;
  size: string;
  industry: string;
  funding: string;
  description: string;
  logo: string;
}

export function JobDetails({ job, onBack, cvProfile }: JobDetailsProps) {
  const { user, profile, updateProfile, addApplication, applications, updateApplicationStatus } = useAuth();
  const [generating, setGenerating] = useState<'resume' | 'coverLetter' | 'autoApply' | 'tracking' | 'company' | null>(null);
  const [result, setResult] = useState<{ type: 'resume' | 'coverLetter', content: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState<number>(0);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [previewData, setPreviewData] = useState<{
    resume: string;
    coverLetter: string;
    recipientEmail: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentDetails, setSentDetails] = useState<{ email: string, date: string } | null>(null);
  const [cvSource, setCvSource] = useState<'analyzed' | 'master'>('master');
  const [applyMethod, setApplyMethod] = useState<'ai' | 'manual'>('ai');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentApp = applications.find(app => app.jobId === job.id);
  const isTracked = !!currentApp;

  useEffect(() => {
    // Try to load cached company info
    const loadCompanyInfo = async () => {
      const domain = job.url ? new URL(job.url).hostname.replace('www.', '') : null;
      if (!domain) return;

      try {
        const cacheRef = doc(db, 'companies', domain);
        const cacheSnap = await getDoc(cacheRef);
        
        if (cacheSnap.exists()) {
          setCompanyInfo(cacheSnap.data() as CompanyInfo);
        }
      } catch (err) {
        console.error("Error loading company cache:", err);
      }
    };
    loadCompanyInfo();
  }, [job.url]);

  const fetchCompanyInfo = async () => {
    setGenerating('company');
    const domain = job.url ? new URL(job.url).hostname.replace('www.', '') : job.company.toLowerCase().replace(/\s/g, '') + '.com';
    
    try {
      const response = await fetch(`/api/company/info?domain=${domain}&name=${encodeURIComponent(job.company)}`);
      if (!response.ok) throw new Error("Failed to fetch company info");
      
      const data = await response.json();
      setCompanyInfo(data);
      
      // Cache in Firestore if user is logged in
      if (user) {
        await setDoc(doc(db, 'companies', domain), {
          ...data,
          updatedAt: Timestamp.now()
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to fetch company insights.");
    } finally {
      setGenerating(null);
    }
  };

  const handleTrackApplication = async () => {
    if (!user) {
      setErrorMsg("⚠️ Please sign in to track your applications.");
      return;
    }
    setGenerating('tracking');
    try {
      const recipientEmail = await GeminiService.extractJobContact(job.description, job.company);
      await addApplication({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'applied',
        matchScore: job.matchScore || 0,
        source: job.source,
        url: job.url,
        recipientEmail
      });
      setSentDetails({ email: recipientEmail, date: new Date().toLocaleString() });
      setTrackingSuccess(true);
      setTimeout(() => setTrackingSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to track application.");
    } finally {
      setGenerating(null);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!currentApp) return;
    try {
      await updateApplicationStatus(currentApp.id, status);
      setShowStatusMenu(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update status.");
    }
  };

  const handleGenerate = async (type: 'resume' | 'coverLetter') => {
    if (!user) {
      setErrorMsg("⚠️ Please sign in to generate tailored documents.");
      return;
    }
    if (!cvProfile) {
      setErrorMsg("⚠️ Please upload your CV in the 'CV Analysis' tab first so the AI can tailor the content to your specific background.");
      return;
    }

    setGenerating(type);
    setResult(null);
    setErrorMsg(null);

    try {
      let content = '';
      const sourceProfile = cvSource === 'master' && cvProfile?.masterCV 
        ? { ...cvProfile, masterCV: cvProfile.masterCV } // The service already checks for masterCV
        : cvProfile;

      if (type === 'resume') {
        content = await GeminiService.generateTailoredResume(sourceProfile, job.description);
      } else {
        content = await GeminiService.generateCoverLetter(sourceProfile, job.description);
      }
      setResult({ type, content });
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Error generating content. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (!result || !cvProfile) return;
    
    const title = result.type === 'resume' ? `Tailored Resume for ${job.title}` : `Cover Letter for ${job.title}`;
    const fileName = `${cvProfile.fullName.replace(/\s+/g, '_')}_${result.type}_${job.company.replace(/\s+/g, '_')}`;
    
    await GeminiService.generateDocx(title, result.content, fileName);
  };

  const handleAutoApply = async () => {
    if (!user) {
      setErrorMsg("⚠️ Please sign in to use Auto-Apply.");
      return;
    }
    
    // Gating logic: Only Standard and Premium users can use Auto-Apply
    if (profile?.subscription === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    // Tier limits check
    if (profile?.subscription === 'standard') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const monthlyCount = applications.filter(app => {
        const appDate = app.appliedAt?.toDate() || new Date();
        return appDate >= startOfMonth;
      }).length;

      if (monthlyCount >= 50) {
        setErrorMsg("⚠️ Monthly limit reached. Standard users can send up to 50 applications per month. Upgrade to Premium for unlimited!");
        return;
      }
    }

    if (!cvProfile) {
      setErrorMsg("⚠️ Please upload your CV in the 'CV Analysis' tab first to enable Auto-Apply.");
      return;
    }
    if (!profile?.isEmailConnected) {
      setErrorMsg("⚠️ Please connect your email in Settings to allow the AI Agent to send applications on your behalf.");
      return;
    }

    setGenerating('autoApply');
    setApplyStep(1); // Analyzing
    
    try {
      const sourceProfile = cvSource === 'master' && cvProfile?.masterCV 
        ? { ...cvProfile, masterCV: cvProfile.masterCV }
        : cvProfile;

      // 1. Analyze & Tailor
      const resume = await GeminiService.generateTailoredResume(sourceProfile, job.description);
      setApplyStep(2); // Tailoring
      
      const coverLetter = await GeminiService.generateCoverLetter(sourceProfile, job.description);
      const recipientEmail = await GeminiService.extractJobContact(job.description, job.company);
      
      setPreviewData({
        resume,
        coverLetter,
        recipientEmail: recipientEmail || 'hr@company.com'
      });
      setApplyStep(0);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Preparation failed. Please try again.");
      setApplyStep(0);
    } finally {
      setGenerating(null);
    }
  };

  const handleConfirmAutoApply = async () => {
    if (!previewData || !user) return;
    
    setIsSending(true);
    setApplyStep(3); // Submitting
    
    try {
      const application: any = {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'applied',
        matchScore: job.matchScore || 0,
        tailoredResume: previewData.resume,
        tailoredCoverLetter: previewData.coverLetter,
        jobDetails: job.description,
        source: job.source,
        url: job.url,
        recipientEmail: previewData.recipientEmail
      };

      // 1. Send Real Email to Employer
      if (profile?.isEmailConnected && profile?.microsoftRefreshToken) {
        const response = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: previewData.recipientEmail,
            subject: `Application for ${job.title} - ${profile.displayName || 'Applicant'}`,
            content: `Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position at ${job.company}.\n\nPlease find my tailored resume and cover letter below.\n\n--- COVER LETTER ---\n${previewData.coverLetter}\n\n--- RESUME ---\n${previewData.resume}\n\nBest regards,\n${profile.displayName || 'Applicant'}`,
            refreshToken: profile.microsoftRefreshToken,
            replyTo: user.email // Ensure the employer replies to the candidate
          })
        });

        const data = await response.json();
        if (!response.ok) {
          if (data.error === "INVALID_REFRESH_TOKEN") {
            await updateProfile({ isEmailConnected: false, microsoftRefreshToken: null });
            throw new Error("Your email connection has expired. Please reconnect in Settings.");
          }
          throw new Error(data.error || "Failed to send email");
        }

        // Add tracking ID to application
        application.messageId = data.messageId;
        application.deliveryProvider = data.provider;
        application.deliveryStatus = 'sent';

        // 2. Send Confirmation Email to User via ACS (for high deliverability and tracking)
        await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            useAcs: true, // Use the system's professional Azure email service
            subject: `Application Sent: ${job.title} at ${job.company}`,
            content: `Hello ${profile.displayName || 'there'},\n\nYour application for ${job.title} at ${job.company} has been sent successfully via your AI Agent.\n\nApplication Details:\n- Company: ${job.company}\n- Role: ${job.title}\n- Recipient: ${previewData.recipientEmail}\n- Tracking ID: ${data.messageId || 'N/A'}\n- Date: ${new Date().toLocaleString()}\n\nYou can track the status of this application in your dashboard.\n\nBest regards,\nYour AI Career Agent`
          })
        });
      }
      
      await addApplication(application);
      setSentDetails({ email: previewData.recipientEmail, date: new Date().toLocaleString() });
      setApplyStep(4); // Success
      setPreviewData(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Sending failed. Please try again.");
    } finally {
      setIsSending(false);
      setTimeout(() => setApplyStep(0), 5000);
    }
  };

  const handleManualCompose = async () => {
    if (!cvProfile) return;
    
    setGenerating('manual');
    try {
      const sourceProfile = cvSource === 'master' && cvProfile?.masterCV 
        ? { ...cvProfile, masterCV: cvProfile.masterCV }
        : cvProfile;

      const resume = await GeminiService.generateTailoredResume(sourceProfile, job.description);
      const coverLetter = await GeminiService.generateCoverLetter(sourceProfile, job.description);
      const recipientEmail = await GeminiService.extractJobContact(job.description, job.company) || 'hr@company.com';

      const subject = encodeURIComponent(`Application for ${job.title} - ${profile?.displayName || 'Applicant'}`);
      const body = encodeURIComponent(`Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position at ${job.company}.\n\nPlease find my tailored resume and cover letter below.\n\n--- COVER LETTER ---\n${coverLetter}\n\n--- RESUME ---\n${resume}\n\nBest regards,\n${profile?.displayName || 'Applicant'}`);
      
      window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
      
      // Also track it
      await addApplication({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'applied',
        matchScore: job.matchScore || 0,
        tailoredResume: resume,
        tailoredCoverLetter: coverLetter,
        recipientEmail
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="relative h-48 bg-emerald-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#10b981,transparent_70%)]" />
              </div>
              <Sparkles className="w-24 h-24 text-emerald-400 animate-pulse" />
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-10 text-center space-y-6">
              <h2 className="text-3xl font-black text-gray-900">Unlock AI Auto-Apply</h2>
              <p className="text-gray-500 font-bold leading-relaxed px-4">
                Free users can generate documents, but our <span className="text-emerald-600">Standard and Premium</span> tiers let you apply to hundreds of jobs with one click.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between text-left group hover:border-emerald-500 transition-all cursor-pointer">
                  <div>
                    <h4 className="font-black text-emerald-900 text-lg">Standard Tier</h4>
                    <p className="text-emerald-600 text-sm font-bold">50 AI Applications / mo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-900 font-black text-xl">$19.99</p>
                    <p className="text-emerald-600 text-[10px] font-black uppercase">Per Month</p>
                  </div>
                </div>
                
                <div className="bg-emerald-600 p-6 rounded-3xl border-4 border-emerald-300 flex items-center justify-between text-left shadow-xl shadow-emerald-200 transform scale-105">
                  <div>
                    <h4 className="font-black text-white text-lg">Premium Tier</h4>
                    <p className="text-emerald-100 text-sm font-bold">Unlimited AI Applications</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-xl">$39.99</p>
                    <p className="text-emerald-100 text-[10px] font-black uppercase">Per Month</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  // In a real app, this would go to Stripe/Checkout
                  // For now, we'll suggest going to settings to simulate
                  setShowUpgradeModal(false);
                  alert("Redirecting to subscription management... (Simulated)");
                }}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
              >
                Upgrade Now
              </button>
              
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 font-bold hover:text-gray-900 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Review Application</h2>
                <p className="text-gray-500 font-bold">Verify the AI-generated content before sending</p>
              </div>
              <button 
                onClick={() => setPreviewData(null)}
                className="p-3 hover:bg-gray-200 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-900 font-black uppercase tracking-widest text-xs">Recipient</span>
                </div>
                <input 
                  type="email" 
                  value={previewData.recipientEmail}
                  onChange={(e) => setPreviewData({...previewData, recipientEmail: e.target.value})}
                  className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-6 py-3 font-mono text-sm focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-gray-900 font-black uppercase tracking-widest text-xs">Tailored Cover Letter</span>
                </div>
                <textarea 
                  value={previewData.coverLetter}
                  onChange={(e) => setPreviewData({...previewData, coverLetter: e.target.value})}
                  className="w-full h-64 bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 text-gray-700 leading-relaxed focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-gray-900 font-black uppercase tracking-widest text-xs">Tailored Resume</span>
                </div>
                <textarea 
                  value={previewData.resume}
                  onChange={(e) => setPreviewData({...previewData, resume: e.target.value})}
                  className="w-full h-64 bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 text-gray-700 leading-relaxed focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
              <button 
                onClick={() => setPreviewData(null)}
                className="flex-1 py-4 bg-white text-gray-900 rounded-2xl font-black border-2 border-gray-100 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAutoApply}
                disabled={isSending}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                Confirm & Send Application
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-24">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-500 hover:text-gray-900 font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>
        <div className="flex gap-4">
          {isTracked && (
            <div className="relative">
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-100"
              >
                Status: <span className="capitalize">{currentApp.status}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showStatusMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {['applied', 'interviewing', 'rejected', 'saved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className={`w-full text-left px-6 py-3 text-sm font-bold hover:bg-gray-50 transition-colors capitalize ${
                        currentApp.status === status ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button 
            onClick={handleTrackApplication}
            disabled={isTracked || generating === 'tracking'}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${
              isTracked 
                ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                : 'bg-white text-gray-900 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {generating === 'tracking' ? <Loader2 className="w-5 h-5 animate-spin" /> : isTracked ? <CheckCircle2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {isTracked ? 'Application Tracked' : 'Track Application'}
          </button>
          <a 
            href={job.url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-black hover:bg-emerald-100 transition-all flex items-center gap-2"
          >
            View Original Post
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-gray-100 p-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{job.title}</h2>
                <p className="text-xl text-emerald-600 font-bold">{job.company}</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl text-lg font-black flex items-center">
                <Target className="w-6 h-6 mr-2" />
                {job.matchScore}% Match
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mb-10 text-gray-500 font-medium">
              <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                {job.location}
              </div>
              <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                <DollarSign className="w-5 h-5 mr-2 text-gray-400" />
                {job.salary && (job.salary.min > 0 || job.salary.max > 0) 
                  ? `${job.salary.currency || 'USD'} ${(job.salary.min || 0).toLocaleString()} - ${(job.salary.max || 0).toLocaleString()}` 
                  : 'Salary not specified'}
              </div>
              <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                <Clock className="w-5 h-5 mr-2 text-gray-400" />
                {job.postedAt}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Job Description</h3>
              <div className="text-gray-600 leading-relaxed space-y-4">
                {job.description.split('\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Required Skills</h3>
              <div className="flex flex-wrap gap-3">
                {job.skills.map(skill => (
                  <span key={skill} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Company Insights Section */}
          <div className="bg-white rounded-3xl border border-gray-100 p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-600" />
                Company Insights
              </h3>
              {!companyInfo && (
                <button 
                  onClick={fetchCompanyInfo}
                  disabled={generating === 'company'}
                  className="text-emerald-600 font-black text-sm uppercase tracking-widest hover:text-emerald-700 flex items-center gap-2"
                >
                  {generating === 'company' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  Fetch Insights
                </button>
              )}
            </div>

            {companyInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <img src={companyInfo.logo} alt={companyInfo.name} className="w-16 h-16 rounded-2xl border border-gray-100" />
                    <div>
                      <h4 className="text-xl font-black text-gray-900">{companyInfo.name}</h4>
                      <p className="text-gray-500 text-sm">{companyInfo.domain}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed italic">
                    "{companyInfo.description}"
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-widest mb-1">
                      <Users className="w-3 h-3" />
                      Size
                    </div>
                    <p className="text-gray-900 font-black">{companyInfo.size}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-widest mb-1">
                      <Briefcase className="w-3 h-3" />
                      Industry
                    </div>
                    <p className="text-gray-900 font-black">{companyInfo.industry}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-widest mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Recent Funding
                    </div>
                    <p className="text-gray-900 font-black">{companyInfo.funding}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-medium">Click "Fetch Insights" to learn more about {job.company}.</p>
              </div>
            )}
          </div>

          {/* Application Sent Details */}
          {(sentDetails || (isTracked && currentApp.recipientEmail)) && (
            <div className="bg-emerald-900 text-white rounded-3xl p-10 border border-emerald-800 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-emerald-500/20 p-3 rounded-2xl">
                  <Mail className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Application Sent Successfully</h3>
                  <p className="text-emerald-400 font-bold">Confirmation Details</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-emerald-800">
                  <span className="text-emerald-300 font-bold">Recipient Email</span>
                  <span className="font-mono text-sm">{sentDetails?.email || currentApp.recipientEmail}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-emerald-800">
                  <span className="text-emerald-300 font-bold">Sent Date</span>
                  <span className="font-mono text-sm">
                    {sentDetails?.date || (currentApp?.appliedAt?.seconds ? new Date(currentApp.appliedAt.seconds * 1000).toLocaleString() : 'Just now')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-emerald-300 font-bold">Status</span>
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    {currentApp?.status || 'Applied'}
                  </span>
                </div>
              </div>
              
              <p className="mt-8 text-emerald-400 text-sm italic">
                "Our AI Agent has successfully delivered your tailored resume and cover letter to the company's recruitment team. You can track further updates here."
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 text-white rounded-3xl p-8 border border-gray-800">
            <h3 className="text-xl font-black mb-6 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-emerald-400" />
              AI Agent Actions
            </h3>

            {/* CV Source Selection */}
            <div className="mb-8 space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select CV Source</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-xl">
                <button 
                  onClick={() => setCvSource('master')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${cvSource === 'master' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Master CV
                </button>
                <button 
                  onClick={() => setCvSource('analyzed')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${cvSource === 'analyzed' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Analyzed CV
                </button>
              </div>
              <p className="text-[10px] text-gray-500 italic">
                {cvSource === 'master' ? 'Using your AI-optimized Master CV as source.' : 'Using your uploaded/analyzed CV as source.'}
              </p>
            </div>

            {/* Application Method Selection */}
            <div className="mb-8 space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Application Method</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-xl">
                <button 
                  onClick={() => setApplyMethod('ai')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${applyMethod === 'ai' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  AI Agent
                </button>
                <button 
                  onClick={() => setApplyMethod('manual')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${applyMethod === 'manual' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Manual
                </button>
              </div>
              <p className="text-[10px] text-gray-500 italic">
                {applyMethod === 'ai' ? 'AI will tailor and send the application for you.' : 'AI will tailor documents for you to send manually.'}
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => handleGenerate('resume')}
                disabled={!!generating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black flex items-center justify-center transition-all disabled:opacity-50"
              >
                {generating === 'resume' ? 'Generating...' : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Tailored Resume
                  </>
                )}
              </button>
              <button 
                onClick={() => handleGenerate('coverLetter')}
                disabled={!!generating}
                className="w-full bg-white text-gray-900 hover:bg-gray-100 py-4 rounded-2xl font-black flex items-center justify-center transition-all disabled:opacity-50"
              >
                {generating === 'coverLetter' ? 'Generating...' : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Generate Cover Letter
                  </>
                )}
              </button>
              
              {applyMethod === 'ai' ? (
                <button 
                  onClick={handleAutoApply}
                  disabled={!!generating || applyStep === 4 || isSending}
                  className={`w-full py-4 rounded-2xl font-black flex items-center justify-center transition-all ${
                    applyStep === 4 ? 'bg-emerald-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {applyStep === 0 && <><ShieldCheck className="w-5 h-5 mr-2 text-green-400" /> Auto Apply with AI</>}
                  {applyStep === 1 && <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Job...</>}
                  {applyStep === 2 && <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Tailoring Profile...</>}
                  {applyStep === 3 && <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>}
                  {applyStep === 4 && <><CheckCircle2 className="w-5 h-5 mr-2" /> Application Sent!</>}
                </button>
              ) : (
                <button 
                  onClick={handleManualCompose}
                  disabled={!!generating}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-2xl font-black flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {generating === 'manual' ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing...</> : (
                    <>
                      <Mail className="w-5 h-5 mr-2 text-emerald-400" />
                      Compose & Send Manually
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-6 text-center font-medium">
              {applyMethod === 'ai' 
                ? "Our AI Agent will tailor your application and submit it directly to the employer."
                : "Generate your tailored documents above, then send them to the employer's email."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center text-sm">
              <ShieldCheck className="w-5 h-5 mr-2" />
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="bg-white rounded-3xl border border-emerald-100 p-8 animate-in zoom-in-95 duration-300">
              <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-emerald-600" />
                AI Generated {result.type === 'resume' ? 'Resume' : 'Cover Letter'}
              </h4>
              <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-600 font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
                {result.content}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result.content);
                  }}
                  className="flex items-center justify-center py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </button>
                <button 
                  onClick={handleDownloadDocx}
                  className="flex items-center justify-center py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download .docx
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
  );
}
