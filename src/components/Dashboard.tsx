import { 
  LayoutDashboard, 
  Briefcase, 
  Bookmark, 
  UserCheck, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  FileText, 
  Eye, 
  X, 
  Send, 
  Download,
  MapPin,
  DollarSign,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Save,
  Loader2,
  Search
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useState, useEffect } from 'react';
import { Application, Job } from '../types';
import { GeminiService } from '../services/geminiService';

export function Dashboard() {
  const { profile, applications, updateProfile } = useAuth();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<'applications' | 'saved'>('applications');
  const [appSearch, setAppSearch] = useState('');
  const [appSort, setAppSort] = useState<'date' | 'match'>('date');
  const [editableMasterCV, setEditableMasterCV] = useState('');
  const [isSavingCV, setIsSavingCV] = useState(false);
  const [isRegeneratingCV, setIsRegeneratingCV] = useState(false);

  useEffect(() => {
    if (profile?.cvProfile?.masterCV) {
      setEditableMasterCV(profile.cvProfile.masterCV);
    }
  }, [profile?.cvProfile?.masterCV]);

  const handleSaveMasterCV = async () => {
    if (!profile?.cvProfile) return;
    setIsSavingCV(true);
    try {
      await updateProfile({
        cvProfile: {
          ...profile.cvProfile,
          masterCV: editableMasterCV
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCV(false);
    }
  };

  const handleRegenerateMasterCV = async () => {
    if (!profile?.cvProfile) return;
    setIsRegeneratingCV(true);
    try {
      const newCV = await GeminiService.generateMasterCV(profile.cvProfile);
      setEditableMasterCV(newCV);
      await updateProfile({
        cvProfile: {
          ...profile.cvProfile,
          masterCV: newCV
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegeneratingCV(false);
    }
  };

  const handleDownload = async (type: 'resume' | 'coverLetter', app: Application) => {
    if (!profile?.cvProfile) return;
    
    const content = type === 'resume' ? app.tailoredResume : app.tailoredCoverLetter;
    if (!content) return;

    const title = type === 'resume' ? `Tailored Resume for ${app.jobTitle}` : `Cover Letter for ${app.jobTitle}`;
    const fileName = `${profile.cvProfile.fullName.replace(/\s+/g, '_')}_${type}_${app.company.replace(/\s+/g, '_')}`;
    
    await GeminiService.generateDocx(title, content, fileName);
  };

  const savedJobs = profile?.savedJobs || [];
  const avgMatch = applications.length > 0 
    ? Math.round(applications.reduce((acc, app) => acc + (app.matchScore || 0), 0) / applications.length)
    : 0;

  const stats = [
    { label: 'Total Applications', value: applications.length, icon: Briefcase, color: 'bg-emerald-500' },
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, color: 'bg-teal-500' },
    { label: 'Interview Invites', value: applications.filter(a => a.status === 'interviewing').length, icon: UserCheck, color: 'bg-green-500' },
    { label: 'Avg Match Score', value: `${avgMatch}%`, icon: TrendingUp, color: 'bg-emerald-400' },
  ];

  return (
    <div className="space-y-10 pb-24">
      {/* Hero Section with Corporate Imagery */}
      <div className="relative h-96 rounded-[3rem] overflow-hidden border border-gray-100 group">
        <img 
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1920" 
          alt="Modern Office" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/40 to-transparent flex flex-col justify-center px-16">
          <div className="max-w-xl space-y-6 animate-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/30">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">AI-Powered Career Growth</span>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight tracking-tight">
              Agent Activity: <br />
              <span className="text-emerald-400">Global Search Active</span>
            </h2>
            <p className="text-gray-300 text-lg font-medium leading-relaxed">
              Your autonomous agent is currently scanning global markets, analyzing {applications.length > 0 ? applications.length * 5 : 120}+ new roles, and tailoring your profile for high-match opportunities.
              {savedJobs.length > 0 ? `${savedJobs.length} roles are ready for automated application.` : 'New matches are being prepared for your review.'}
            </p>
          </div>
        </div>

        {/* Floating Badge */}
        <div className="absolute top-12 right-12 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-white animate-bounce duration-[3s]">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black">{avgMatch || 98}%</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Match Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-100 transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <p className="text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Master CV Section */}
          {profile?.cvProfile?.masterCV !== undefined && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 space-y-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-16 -translate-y-16 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600 p-3 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Your Master CV</h3>
                    <p className="text-gray-500 text-sm font-medium">AI-Generated International Standard</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleRegenerateMasterCV}
                    disabled={isRegeneratingCV}
                    className="flex items-center gap-2 bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    {isRegeneratingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                  </button>
                  <button 
                    onClick={handleSaveMasterCV}
                    disabled={isSavingCV}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSavingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                  <button 
                    onClick={async () => {
                      const fileName = `${profile.cvProfile.fullName.replace(/\s+/g, '_')}_Master_CV`;
                      await GeminiService.generateDocx("Master CV", editableMasterCV, fileName);
                    }}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-100 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 relative z-10">
                <textarea
                  value={editableMasterCV}
                  onChange={(e) => setEditableMasterCV(e.target.value)}
                  className="w-full h-96 bg-transparent border-none focus:ring-0 prose prose-emerald max-w-none prose-sm font-serif text-gray-700 leading-relaxed resize-none"
                  placeholder="Your Master CV content will appear here..."
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('applications')}
                className={`text-xl font-bold transition-all ${activeTab === 'applications' ? 'text-gray-900 border-b-4 border-emerald-500 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Applications
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`text-xl font-bold transition-all ${activeTab === 'saved' ? 'text-gray-900 border-b-4 border-emerald-500 pb-1' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Saved Jobs
              </button>
            </div>
            
            {activeTab === 'applications' && applications.length > 0 && (
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Filter apps..." 
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium w-40"
                  />
                </div>
                <select 
                  value={appSort}
                  onChange={(e) => setAppSort(e.target.value as any)}
                  className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-bold text-gray-600 py-2 px-4"
                >
                  <option value="date">Sort by Date</option>
                  <option value="match">Sort by Match %</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {activeTab === 'applications' ? (
              applications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No applications tracked yet.</p>
                </div>
              ) : (
                applications
                  .filter((app: any) => 
                    app.jobTitle.toLowerCase().includes(appSearch.toLowerCase()) || 
                    app.company.toLowerCase().includes(appSearch.toLowerCase())
                  )
                  .sort((a: any, b: any) => {
                    if (appSort === 'match') return (b.matchScore || 0) - (a.matchScore || 0);
                    const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt);
                    const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center">
                      <div className="bg-emerald-50 p-3 rounded-lg mr-4">
                        <Briefcase className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{app.jobTitle}</h4>
                        <p className="text-gray-500 text-sm">{app.company} • {app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : new Date(app.appliedAt).toLocaleDateString()}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                          app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'interviewing' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{app.matchScore}% Match</p>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${app.matchScore}%` }}></div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedApp(app)}
                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              savedJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No saved jobs yet.</p>
                </div>
              ) : (
                savedJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center">
                      <div className="bg-teal-50 p-3 rounded-lg mr-4">
                        <Bookmark className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{job.title}</h4>
                        <p className="text-gray-500 text-sm">{job.company} • {job.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-teal-100 rounded-lg text-teal-600 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Activity Feed</h3>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="relative">
                <div className="bg-emerald-100 p-2 rounded-full relative z-10">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="absolute top-8 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-100"></div>
              </div>
              <div>
                <p className="text-gray-900 font-medium">New job detected matching your profile</p>
                <p className="text-gray-500 text-xs mt-1">10 minutes ago</p>
              </div>
            </div>
            {applications.slice(0, 3).map((app: any) => (
              <div key={app.id} className="flex gap-4">
                <div className="relative">
                  <div className="bg-green-100 p-2 rounded-full relative z-10">
                    <Send className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="absolute top-8 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-100"></div>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Application tracked for {app.company}</p>
                  <p className="text-gray-500 text-xs mt-1">{app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleTimeString() : new Date(app.appliedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedApp.jobTitle}</h3>
                  <p className="text-emerald-600 font-bold">{selectedApp.company}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <section className="space-y-4">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Job Description</h4>
                <div className="bg-gray-50 p-6 rounded-3xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedApp.jobDetails || 'No details available.'}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Generated Tailored Resume</h4>
                  {selectedApp.tailoredResume && (
                    <button 
                      onClick={() => handleDownload('resume', selectedApp)}
                      className="flex items-center text-emerald-600 text-xs font-bold hover:text-emerald-700"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download .docx
                    </button>
                  )}
                </div>
                <div className="bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100 text-gray-800 font-serif leading-relaxed whitespace-pre-wrap">
                  {selectedApp.tailoredResume || 'No resume generated.'}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Generated Cover Letter</h4>
                  {selectedApp.tailoredCoverLetter && (
                    <button 
                      onClick={() => handleDownload('coverLetter', selectedApp)}
                      className="flex items-center text-teal-600 text-xs font-bold hover:text-teal-700"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download .docx
                    </button>
                  )}
                </div>
                <div className="bg-teal-50/30 p-8 rounded-3xl border border-teal-100 text-gray-800 font-serif leading-relaxed whitespace-pre-wrap">
                  {selectedApp.tailoredCoverLetter || 'No cover letter generated.'}
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button 
                onClick={() => setSelectedApp(null)}
                className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-600 hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button 
                onClick={async () => {
                  if (selectedApp.tailoredResume) await handleDownload('resume', selectedApp);
                  if (selectedApp.tailoredCoverLetter) await handleDownload('coverLetter', selectedApp);
                }}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all"
              >
                Download All (.docx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
