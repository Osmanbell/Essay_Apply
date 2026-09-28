import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  Star, 
  Info, 
  Check,
  History,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { CVProfile } from '../types';
import { useAuth } from '../AuthContext';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface CVEvaluation {
  score: number;
  critique: string;
  corrections: Array<{
    section: string;
    original: string;
    optimized: string;
    reason: string;
  }>;
  optimizedSummary: string;
  suggestedSkills: string[];
}

interface CVUploadProps {
  onProfileUpdate: (profile: CVProfile) => void;
}

export function CVUpload({ onProfileUpdate }: CVUploadProps) {
  const { profile: userProfile, updateProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [evaluation, setEvaluation] = useState<CVEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const history = userProfile?.cvAnalyses || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    try {
      let text = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
        }
        text = fullText;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        // Fallback to text reading for .txt or unknown types
        text = await file.text();
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract enough text from the file. Please ensure it is a text-based PDF or Word document.');
      }
      
      const result = await GeminiService.analyzeCV(text);
      
      // Perform international standard evaluation
      const evalResult = await GeminiService.evaluateAndCorrectCV(result);
      
      setProfile(result);
      setEvaluation(evalResult);
      
      onProfileUpdate(result);
      
      // Save to Firestore profile - Ensure we save the optimized version too
      const newAnalysis = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalText: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
        analysis: { profile: result, evaluation: evalResult }
      };

      const updatedHistory = [newAnalysis, ...history].slice(0, 5); // Keep last 5

      await updateProfile({ 
        cvProfile: result, 
        profileComplete: true,
        cvEvaluation: evalResult,
        cvAnalyses: updatedHistory,
        optimizedCV: {
          summary: evalResult.optimizedSummary,
          skills: [...result.skills, ...evalResult.suggestedSkills]
        }
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze CV. Please try a .txt file for best results.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadFromHistory = (item: any) => {
    setProfile(item.analysis.profile);
    setEvaluation(item.analysis.evaluation);
    onProfileUpdate(item.analysis.profile);
    setShowHistory(false);
  };

  const handleDownloadOptimized = async () => {
    if (!profile || !evaluation) return;

    const content = `
# PROFESSIONAL SUMMARY
${evaluation.optimizedSummary}

# KEY SKILLS
${profile.skills.join(', ')}
${evaluation.suggestedSkills.length > 0 ? `\n# SUGGESTED SKILLS TO ADD\n${evaluation.suggestedSkills.join(', ')}` : ''}

# WORK EXPERIENCE
${(Array.isArray(profile.workExperience) ? profile.workExperience : []).map(exp => `
## ${exp.role} | ${exp.company}
${exp.duration}
${exp.description}
`).join('\n')}

# EDUCATION
${profile.education.join('\n')}

# CERTIFICATIONS
${profile.certifications.join('\n')}
    `;

    await GeminiService.generateDocx(
      `${profile.fullName} - Optimized Resume`,
      content,
      `${profile.fullName.replace(/\s+/g, '_')}_Optimized_Resume`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* History Section */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-emerald-600" />
              <h4 className="font-black text-gray-900 uppercase tracking-widest text-sm">Past CV Analyses ({history.length})</h4>
            </div>
            {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          {showHistory && (
            <div className="p-6 border-t border-gray-50 space-y-4 animate-in slide-in-from-top-2 duration-300">
              {history.map((item: any) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors group cursor-pointer"
                  onClick={() => loadFromHistory(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.analysis.profile.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Score</p>
                      <p className="text-lg font-black text-gray-900">{item.analysis.evaluation.score}</p>
                    </div>
                    <button className="p-2 bg-white rounded-lg border border-gray-100 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="bg-emerald-50 p-4 rounded-full mb-6">
            <UploadCloud className="w-12 h-12 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload your CV</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Drag and drop your CV (PDF, DOCX, or TXT) or click to browse files. 
            Our AI will analyze your profile and match you with the best jobs.
          </p>
          
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".pdf,.docx,.txt" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <span className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all inline-block">
              Select File
            </span>
          </label>
          
          {file && (
            <div className="mt-6 flex items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
              <FileText className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-gray-700 font-medium">{file.name}</span>
              <button 
                onClick={handleAnalyze}
                disabled={analyzing}
                className="ml-4 text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </span>
                ) : 'Analyze Now'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {profile && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Analysis Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div>
                <h4 className="text-2xl font-bold text-gray-900">{profile.fullName}</h4>
                <p className="text-emerald-600 font-medium">{profile.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleDownloadOptimized}
                  className="flex items-center bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Optimized CV
                </button>
                <div className="flex items-center text-emerald-600 font-bold">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  AI Analysis Complete
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h5 className="font-bold text-gray-900 uppercase text-sm tracking-wider">Professional Profile</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Experience</p>
                    <p className="text-gray-900 font-bold">{profile.experienceYears} Years</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Career Level</p>
                    <p className="text-gray-900 font-bold">{profile.careerLevel}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Top Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(profile.skills) ? profile.skills : []).map(skill => (
                      <span key={skill} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-bold text-gray-900 uppercase text-sm tracking-wider">Work Experience</h5>
                <div className="space-y-4">
                  {(Array.isArray(profile.workExperience) ? profile.workExperience : []).map((exp, i) => (
                    <div key={i} className="border-l-2 border-emerald-100 pl-4 py-1">
                      <p className="text-gray-900 font-bold">{exp.role}</p>
                      <p className="text-emerald-600 text-sm font-medium">{exp.company} • {exp.duration}</p>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Evaluation & Corrections */}
          {evaluation && (
            <div className="bg-gray-900 rounded-2xl p-8 text-white space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-xl">
                    <Star className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold">International Standard Evaluation</h4>
                    <p className="text-gray-400">Based on US, UK, and Global Tech hiring benchmarks</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400">{evaluation.score}</div>
                  <div className="text-xs uppercase font-bold text-gray-500 tracking-widest">ATS Score</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h5 className="flex items-center font-bold text-emerald-400 mb-4">
                      <Info className="w-4 h-4 mr-2" />
                      Expert Critique
                    </h5>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {evaluation.critique}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h5 className="flex items-center font-bold text-emerald-400 mb-4">
                      <Check className="w-4 h-4 mr-2" />
                      Suggested Skills
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.suggestedSkills.map(skill => (
                        <span key={skill} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h5 className="font-bold text-emerald-400 mb-4">Optimized Summary</h5>
                    <p className="text-gray-200 italic leading-relaxed">
                      "{evaluation.optimizedSummary}"
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-emerald-400">Key Corrections</h5>
                    <div className="space-y-4">
                      {evaluation.corrections.map((corr, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-widest">{corr.section}</span>
                            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Improved</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <p className="text-gray-500 font-bold uppercase text-[10px]">Original</p>
                              <p className="text-gray-400 line-through decoration-red-500/50">{corr.original}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-emerald-500 font-bold uppercase text-[10px]">Optimized</p>
                              <p className="text-gray-200">{corr.optimized}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 italic border-t border-white/5 pt-2">
                            Reason: {corr.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
