import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  CheckCircle2,
  Link2,
  Loader2,
  Briefcase,
  GraduationCap,
  Code,
  Phone,
  Linkedin,
  MapPin,
  Target,
  Building,
  Sparkles,
  Zap,
  Crown,
  X
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

export function Settings() {
  const { user, profile, updateProfile, updateSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'language' | 'integrations' | 'subscription'>('profile');
  
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: user?.email || '',
    phone: profile?.cvProfile?.phone || '',
    linkedin: profile?.cvProfile?.linkedin || '',
    title: profile?.cvProfile?.title || '',
    experienceYears: profile?.cvProfile?.experienceYears || 0,
    skills: profile?.cvProfile?.skills || '',
    education: profile?.cvProfile?.education || '',
    careerLevel: profile?.cvProfile?.careerLevel || 'Mid-level',
    workExperience: JSON.stringify(profile?.cvProfile?.workExperience || []),
    certifications: profile?.cvProfile?.certifications || '',
    industries: profile?.cvProfile?.industries || '',
    dreamCompany: profile?.cvProfile?.dreamCompany || '',
    workEnvironment: profile?.cvProfile?.workEnvironment || 'Remote',
    careerGoal: profile?.cvProfile?.careerGoal || '',
    notifications: profile?.settings?.notifications ?? true,
    jobAlerts: profile?.settings?.jobAlerts ?? true,
    applicationUpdates: profile?.settings?.applicationUpdates ?? true,
    publicProfile: profile?.settings?.publicProfile ?? false,
    language: profile?.settings?.language ?? 'English',
    region: profile?.settings?.region ?? 'Global',
    twoFactor: profile?.settings?.twoFactor ?? false,
    marketingEmails: profile?.settings?.marketingEmails ?? false,
  });

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.refreshToken) {
        setLoading(true);
        try {
          await updateProfile({ 
            isEmailConnected: true,
            microsoftRefreshToken: event.data.refreshToken 
          });
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
          console.error('Error saving refresh token:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateProfile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedCvProfile = {
        ...profile?.cvProfile,
        fullName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        linkedin: formData.linkedin,
        title: formData.title,
        experienceYears: Number(formData.experienceYears),
        skills: formData.skills,
        education: formData.education,
        careerLevel: formData.careerLevel,
        workExperience: JSON.parse(formData.workExperience),
        certifications: formData.certifications,
        industries: formData.industries,
        dreamCompany: formData.dreamCompany,
        workEnvironment: formData.workEnvironment,
        careerGoal: formData.careerGoal,
      };

      await updateProfile({
        displayName: formData.displayName,
        cvProfile: updatedCvProfile,
        settings: {
          notifications: formData.notifications,
          jobAlerts: formData.jobAlerts,
          applicationUpdates: formData.applicationUpdates,
          publicProfile: formData.publicProfile,
          language: formData.language,
          region: formData.region,
          twoFactor: formData.twoFactor,
          marketingEmails: formData.marketingEmails,
        }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Update settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Account Settings</h2>
          <p className="text-gray-500 font-medium">Manage your profile, preferences, and security settings.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : success ? <><CheckCircle2 className="w-5 h-5" /> Saved</> : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          <SettingsTab 
            icon={User} 
            label="Profile Info" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
          <SettingsTab 
            icon={Bell} 
            label="Notifications" 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
          />
          <SettingsTab 
            icon={Shield} 
            label="Security" 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')} 
          />
          <SettingsTab 
            icon={Globe} 
            label="Language & Region" 
            active={activeTab === 'language'} 
            onClick={() => setActiveTab('language')} 
          />
          <SettingsTab 
            icon={Link2} 
            label="Integrations" 
            active={activeTab === 'integrations'} 
            onClick={() => setActiveTab('integrations')} 
          />
          <SettingsTab 
            icon={Sparkles} 
            label="Subscription" 
            active={activeTab === 'subscription'} 
            onClick={() => setActiveTab('subscription')} 
          />
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Basic Info */}
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-10 h-10 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Personal Details</h3>
                    <p className="text-gray-500 font-medium">Update your basic information and contact details.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Professional Title</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        value={formData.email}
                        disabled
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-xl text-gray-500 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">LinkedIn Profile</label>
                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="url" 
                        value={formData.linkedin}
                        onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Background */}
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Professional Background</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Years of Experience</label>
                    <input 
                      type="number" 
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({...formData, experienceYears: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Career Level</label>
                    <select 
                      value={formData.careerLevel}
                      onChange={(e) => setFormData({...formData, careerLevel: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                    >
                      <option>Junior</option>
                      <option>Mid-level</option>
                      <option>Senior</option>
                      <option>Lead</option>
                      <option>Executive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Technical Skills</label>
                    <div className="relative">
                      <Code className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea 
                        value={formData.skills}
                        onChange={(e) => setFormData({...formData, skills: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900 min-h-[100px]"
                        placeholder="React, TypeScript, Node.js, etc."
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Education</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea 
                        value={formData.education}
                        onChange={(e) => setFormData({...formData, education: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900 min-h-[100px]"
                        placeholder="B.Sc. Computer Science, University of Lagos"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Work Experience Details</label>
                    <textarea 
                      value={formData.workExperience}
                      onChange={(e) => setFormData({...formData, workExperience: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900 min-h-[150px]"
                      placeholder="Role | Company | Duration | Description"
                    />
                  </div>
                </div>
              </div>

              {/* Career Aspirations */}
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Career Aspirations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Dream Company</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.dreamCompany}
                        onChange={(e) => setFormData({...formData, dreamCompany: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                        placeholder="e.g. Google, Microsoft"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Work Environment</label>
                    <select 
                      value={formData.workEnvironment}
                      onChange={(e) => setFormData({...formData, workEnvironment: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900"
                    >
                      <option>Remote</option>
                      <option>Hybrid</option>
                      <option>On-site</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Ultimate Career Goal</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea 
                        value={formData.careerGoal}
                        onChange={(e) => setFormData({...formData, careerGoal: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-gray-900 min-h-[100px]"
                        placeholder="Where do you see yourself in 5 years?"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Privacy</h3>
                <div className="space-y-4">
                  <Toggle 
                    label="Public Profile" 
                    description="Allow verified recruiters to find your profile and CV."
                    enabled={formData.publicProfile}
                    onChange={() => setFormData({...formData, publicProfile: !formData.publicProfile})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900">Notification Preferences</h3>
              <div className="space-y-6">
                <Toggle 
                  label="Master Switch" 
                  description="Enable or disable all notifications."
                  enabled={formData.notifications}
                  onChange={() => setFormData({...formData, notifications: !formData.notifications})}
                />
                <div className={`space-y-6 pl-6 border-l-2 border-gray-50 transition-all ${formData.notifications ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <Toggle 
                    label="Job Alerts" 
                    description="Get notified when new high-match jobs are found."
                    enabled={formData.jobAlerts}
                    onChange={() => setFormData({...formData, jobAlerts: !formData.jobAlerts})}
                  />
                  <Toggle 
                    label="Application Updates" 
                    description="Receive status changes for your active applications."
                    enabled={formData.applicationUpdates}
                    onChange={() => setFormData({...formData, applicationUpdates: !formData.applicationUpdates})}
                  />
                  <Toggle 
                    label="Marketing Emails" 
                    description="Stay updated with career tips and platform news."
                    enabled={formData.marketingEmails}
                    onChange={() => setFormData({...formData, marketingEmails: !formData.marketingEmails})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900">Security Settings</h3>
              <div className="space-y-6">
                <Toggle 
                  label="Two-Factor Authentication" 
                  description="Add an extra layer of security to your account."
                  enabled={formData.twoFactor}
                  onChange={() => setFormData({...formData, twoFactor: !formData.twoFactor})}
                />
                <div className="pt-6 border-t border-gray-50">
                  <button className="flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-all">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900">Language & Region</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-700 uppercase tracking-widest">Preferred Language</label>
                  <select 
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    <option>English</option>
                    <option>French</option>
                    <option>Spanish</option>
                    <option>German</option>
                    <option>Chinese</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-700 uppercase tracking-widest">Target Region</label>
                  <select 
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    <option>Global</option>
                    <option>North America</option>
                    <option>Europe</option>
                    <option>Asia</option>
                    <option>Africa</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-900">Connected Services</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <Mail className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">Email Application Agent</p>
                      <p className="text-sm text-gray-500 font-medium">Allow AI to send applications from your email.</p>
                      <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                          <Shield className="w-3 h-3 inline mr-1" />
                          SECURITY NOTE: Real email integration requires OAuth 2.0 authentication via Google Cloud or Microsoft Azure. This ensures the AI only has permission to send specific application emails without accessing your private inbox.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (profile?.isEmailConnected) {
                        setLoading(true);
                        await updateProfile({ 
                          isEmailConnected: false, 
                          microsoftRefreshToken: null 
                        });
                        setLoading(false);
                        return;
                      }

                      setLoading(true);
                      try {
                        const response = await fetch('/api/auth/microsoft/url');
                        const { url } = await response.json();
                        
                        const width = 600;
                        const height = 700;
                        const left = window.screenX + (window.outerWidth - width) / 2;
                        const top = window.screenY + (window.outerHeight - height) / 2;
                        
                        window.open(
                          url,
                          'microsoft_oauth',
                          `width=${width},height=${height},left=${left},top=${top}`
                        );
                      } catch (error) {
                        console.error('OAuth URL fetch error:', error);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className={`px-6 py-2 rounded-xl font-black transition-all ${
                      profile?.isEmailConnected 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : profile?.isEmailConnected ? 'Disconnect' : 'Connect Email'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <Globe className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">LinkedIn Profile Sync</p>
                      <p className="text-sm text-gray-500 font-medium">Auto-sync your work experience and skills.</p>
                    </div>
                  </div>
                  <button disabled className="px-6 py-2 bg-gray-200 text-gray-400 rounded-xl font-black cursor-not-allowed">
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Your Plan</h3>
                    <p className="text-gray-500 font-medium">Currently on the <span className="text-emerald-600 font-black uppercase">{profile?.subscription || 'Free'}</span> tier.</p>
                  </div>
                  <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                    <span className="text-emerald-900 font-black uppercase text-sm">Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PlanCard 
                    name="Standard"
                    price="$19.99"
                    features={['50 AI Applications / mo', 'Resume Tailoring', 'Cover Letter Tailoring', 'Priority Support']}
                    active={profile?.subscription === 'standard'}
                    onUpgrade={() => updateSubscription('standard')}
                  />
                  <PlanCard 
                    name="Premium"
                    price="$39.99"
                    features={['Unlimited AI Applications', 'Full Career Coaching', 'LinkedIn Sync (Beta)', 'Advanced Analytics']}
                    active={profile?.subscription === 'premium'}
                    onUpgrade={() => updateSubscription('premium')}
                  />
                </div>
              </div>

              <div className="bg-blue-900 text-white rounded-3xl p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Zap className="w-10 h-10 text-emerald-400" />
                  <div>
                    <p className="font-black text-lg">Need Enterprise for Teams?</p>
                    <p className="text-blue-200 text-sm">Custom pricing for organizations with 10+ users.</p>
                  </div>
                </div>
                <button className="bg-white text-blue-900 px-6 py-2 rounded-xl font-black hover:bg-blue-50 transition-all">
                  Contact Sales
                </button>
              </div>
            </div>
          )}

          <div className="bg-red-50 rounded-3xl p-8 border border-red-100">
            <h3 className="text-xl font-bold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-red-700 mb-6 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
            <button className="bg-white text-red-600 px-6 py-3 rounded-2xl font-black border border-red-200 hover:bg-red-600 hover:text-white transition-all">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ name, price, features, active, onUpgrade }: any) {
  return (
    <div className={`p-8 rounded-[32px] border-2 transition-all ${active ? 'bg-emerald-600 border-emerald-400 shadow-xl shadow-emerald-200 text-white' : 'bg-gray-50 border-gray-100 text-gray-900 hover:border-emerald-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xl font-black">{name}</h4>
        {name === 'Premium' && <Crown className={`w-6 h-6 ${active ? 'text-white' : 'text-emerald-600'}`} />}
      </div>
      
      <div className="mb-8">
        <span className="text-4xl font-black">{price}</span>
        <span className={`text-sm font-bold ${active ? 'text-emerald-100' : 'text-gray-500'}`}>/mo</span>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((f: string) => (
          <li key={f} className="flex items-center gap-3 text-sm font-bold opacity-90">
            <CheckCircle2 className={`w-4 h-4 ${active ? 'text-white' : 'text-emerald-600'}`} />
            {f}
          </li>
        ))}
      </ul>

      <button 
        onClick={onUpgrade}
        disabled={active}
        className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${
          active 
            ? 'bg-emerald-500 text-white cursor-default' 
            : 'bg-white text-gray-900 hover:bg-emerald-600 hover:text-white border border-gray-100 shadow-sm'
        }`}
      >
        {active ? 'Current Plan' : `Upgrade to ${name}`}
      </button>
    </div>
  );
}

function SettingsTab({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${
        active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}

function Toggle({ label, description, enabled, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500 font-medium">{description}</p>
      </div>
      <button 
        onClick={onChange}
        className={`w-14 h-8 rounded-full relative p-1 transition-all ${enabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
      >
        <div className={`w-6 h-6 bg-white rounded-full transition-all ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
