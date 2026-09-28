import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { User, Briefcase, GraduationCap, Code, Save, Loader2, Upload, Camera, Sparkles, FileText, Wand2, CheckCircle2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function ProfileSetup() {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    title: '',
    email: profile?.email || '',
    phone: '',
    linkedin: '',
    experienceYears: 0,
    skills: '',
    education: '',
    careerLevel: 'Mid-level',
    workExperience: '',
    certifications: '',
    industries: '',
    dreamCompany: '',
    workEnvironment: 'Remote',
    careerGoal: '',
    photoURL: ''
  });

  const commonSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Project Management', 'UI/UX Design', 'Data Analysis', 'SQL', 'Docker', 'Kubernetes', 'Java', 'C++', 'Marketing', 'Sales'];
  const commonIndustries = ['FinTech', 'HealthTech', 'E-commerce', 'SaaS', 'Artificial Intelligence', 'Cybersecurity', 'Logistics', 'Education', 'Entertainment', 'Real Estate'];
  const commonTitles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'DevOps Engineer', 'Marketing Manager', 'Sales Representative', 'Business Analyst'];

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setUploadedFileName(file.name);
    
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
        }
        text = fullText;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("Could not extract text from file.");
      }

      const extractedData = await GeminiService.analyzeCV(text);
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...extractedData,
          email: prev.email || extractedData.email
        }));
        // Show success toast or similar if needed
      } else {
        throw new Error("AI could not extract meaningful data from this CV.");
      }
    } catch (err) {
      console.error("Error analyzing CV:", err);
      alert("Failed to analyze CV. Please try a different format or fill details manually.");
      setUploadedFileName(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelection = (field: 'skills' | 'industries', value: string) => {
    const currentValues = formData[field].split(',').map(s => s.trim()).filter(Boolean);
    if (currentValues.includes(value)) {
      setFormData({ ...formData, [field]: currentValues.filter(v => v !== value).join(', ') });
    } else {
      setFormData({ ...formData, [field]: [...currentValues, value].join(', ') });
    }
  };

  const avatars = {
    male: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver'
    ],
    female: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya'
    ]
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 storage
        alert("Image is too large. Please choose a smaller image (under 500KB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cvProfile = {
        ...formData,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        linkedin: formData.linkedin,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        education: formData.education.split(',').map(s => s.trim()).filter(Boolean),
        workExperience: formData.workExperience.split('\n').map(line => {
          const [role, company, duration, description] = line.split('|').map(s => s.trim());
          return { role: role || '', company: company || '', duration: duration || '', description: description || '' };
        }).filter(exp => exp.role),
        certifications: formData.certifications.split(',').map(s => s.trim()).filter(Boolean),
        industries: formData.industries.split(',').map(s => s.trim()).filter(Boolean),
        technologies: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        careerCategory: 'Engineering',
        relevantTitles: [formData.title]
      };

      // Generate Master CV using AI
      const masterCV = await GeminiService.generateMasterCV(cvProfile);

      await updateProfile({ 
        cvProfile: {
          ...cvProfile,
          masterCV
        }, 
        profileComplete: true,
        photoURL: formData.photoURL || profile?.photoURL,
        displayName: formData.fullName
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 py-12">
      <div className="max-w-3xl w-full bg-white rounded-[3rem] border border-gray-100 p-12 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Complete Your Profile</h2>
          <p className="text-gray-500 font-medium text-lg">Help our AI understand your career aspirations to find the perfect matches.</p>
        </div>

        {/* CV Upload for Auto-fill */}
        <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-32 -translate-y-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
              <Wand2 className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black">Magic Profile Fill</h3>
              <p className="text-emerald-100 font-medium">Upload your current CV and our AI will fill out your profile details automatically.</p>
              {uploadedFileName && !analyzing && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black w-fit mx-auto md:mx-0">
                  <CheckCircle2 className="w-3 h-3" />
                  UPLOADED: {uploadedFileName}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => cvInputRef.current?.click()}
              disabled={analyzing}
              className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {analyzing ? 'Analyzing CV...' : 'Upload CV'}
            </button>
            <input
              type="file"
              ref={cvInputRef}
              onChange={handleCVUpload}
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Profile Picture & Avatar Selection */}
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-6 pb-8 border-b border-gray-50">
              <div className="relative group">
                <div className="w-32 h-32 bg-emerald-50 rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-emerald-200" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all scale-90 group-hover:scale-100"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-gray-900">Upload Profile Picture</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Or choose an avatar below</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Choose Your Avatar</label>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Professional Avatars (Male)</p>
                <div className="flex flex-wrap gap-4">
                  {avatars.male.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setFormData({ ...formData, photoURL: url })}
                      className={`w-16 h-16 rounded-2xl border-4 transition-all overflow-hidden ${formData.photoURL === url ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent hover:border-emerald-200'}`}
                    >
                      <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Professional Avatars (Female)</p>
                <div className="flex flex-wrap gap-4">
                  {avatars.female.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setFormData({ ...formData, photoURL: url })}
                      className={`w-16 h-16 rounded-2xl border-4 transition-all overflow-hidden ${formData.photoURL === url ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent hover:border-emerald-200'}`}
                    >
                      <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Professional Title</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {commonTitles.map(title => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setFormData({ ...formData, title })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.title === title ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">LinkedIn Profile URL</label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          {/* Job Relevant Questions */}
          <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 space-y-8">
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Career Aspirations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Dream Company</label>
                <input
                  type="text"
                  value={formData.dreamCompany}
                  onChange={e => setFormData({ ...formData, dreamCompany: e.target.value })}
                  className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 shadow-sm"
                  placeholder="e.g. Google, Paystack"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Preferred Environment</label>
                <select
                  value={formData.workEnvironment}
                  onChange={e => setFormData({ ...formData, workEnvironment: e.target.value })}
                  className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 shadow-sm"
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ultimate Career Goal</label>
              <textarea
                value={formData.careerGoal}
                onChange={e => setFormData({ ...formData, careerGoal: e.target.value })}
                className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 shadow-sm min-h-[80px]"
                placeholder="Where do you see yourself in 5 years?"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Experience (Years)</label>
              <input
                type="number"
                value={formData.experienceYears}
                onChange={e => setFormData({ ...formData, experienceYears: parseInt(e.target.value) })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Career Level</label>
              <select
                value={formData.careerLevel}
                onChange={e => setFormData({ ...formData, careerLevel: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
              >
                <option>Junior</option>
                <option>Mid-level</option>
                <option>Senior</option>
                <option>Lead</option>
                <option>Executive</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Skills (comma separated)</label>
            <div className="relative">
              <Code className="absolute left-4 top-4 w-5 h-5 text-emerald-600" />
              <textarea
                value={formData.skills}
                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 min-h-[100px]"
                placeholder="React, TypeScript, Node.js, AWS, Python, SQL..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {commonSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSelection('skills', skill)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.skills.includes(skill) ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Work Experience (Role | Company | Duration | Description)</label>
            <p className="text-[10px] text-gray-400 font-bold italic">One entry per line. Use | to separate details.</p>
            <textarea
              value={formData.workExperience}
              onChange={e => setFormData({ ...formData, workExperience: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 min-h-[120px]"
              placeholder="Senior Engineer | Google | 2020 - Present | Led the development of AI-powered features..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Education (comma separated)</label>
              <input
                type="text"
                value={formData.education}
                onChange={e => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                placeholder="BS Computer Science, MS AI"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Certifications (comma separated)</label>
              <input
                type="text"
                value={formData.certifications}
                onChange={e => setFormData({ ...formData, certifications: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                placeholder="AWS Solutions Architect, PMP"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Target Industries (comma separated)</label>
            <input
              type="text"
              value={formData.industries}
              onChange={e => setFormData({ ...formData, industries: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
              placeholder="FinTech, HealthTech, E-commerce"
            />
            <div className="flex flex-wrap gap-2">
              {commonIndustries.map(industry => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => toggleSelection('industries', industry)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.industries.includes(industry) ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Complete Setup & Start Applying
          </button>
        </form>
      </div>
    </div>
  );
}
