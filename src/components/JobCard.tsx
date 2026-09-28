import React, { useState } from 'react';
import { Job } from '../types';
import { MapPin, DollarSign, ExternalLink, Clock, Target, Briefcase, Zap, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function JobCard({ job, onClick }: { job: Job; onClick?: () => void }) {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const isSaved = profile?.savedJobs?.some((sj: any) => sj.id === job.id);

  const formatSalary = (salary: Job['salary']) => {
    if (!salary || (salary.min === 0 && salary.max === 0)) return 'Salary not specified';
    
    const currency = salary.currency || 'USD';
    let min = salary.min || 0;
    let max = salary.max || 0;

    // If currency is USD, show converted NGN as well
    if (currency === 'USD') {
      const minNGN = min * 1500;
      const maxNGN = max * 1500;
      return `₦${(minNGN/1000000).toFixed(1)}M - ${(maxNGN/1000000).toFixed(1)}M /yr`;
    }
    
    // If already NGN
    if (currency === 'NGN') {
      return `₦${(min/1000000).toFixed(1)}M - ${(max/1000000).toFixed(1)}M /yr`;
    }

    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} /yr`;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    
    setSaving(true);
    try {
      const currentSaved = profile.savedJobs || [];
      let updatedSaved;
      
      if (isSaved) {
        updatedSaved = currentSaved.filter((sj: any) => sj.id !== job.id);
      } else {
        updatedSaved = [job, ...currentSaved];
      }
      
      await updateProfile({ savedJobs: updatedSaved });
    } catch (error) {
      console.error('Error saving job:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-[2rem] border border-gray-100 p-8 hover:border-emerald-200 transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      {/* Match Score Badge */}
      <div className="absolute top-0 right-0 bg-emerald-600 text-white px-6 py-2 rounded-bl-3xl font-black text-sm flex items-center">
        <Target className="w-4 h-4 mr-2" />
        {job.matchScore}% Match
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {job.type}
          </span>
          <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {job.level}
          </span>
        </div>
        <h3 className="text-2xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight mb-1">
          {job.title}
        </h3>
        <p className="text-lg font-bold text-emerald-600">{job.company}</p>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-8">
        <div className="flex items-center text-gray-500 text-sm font-medium">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          {job.location}
        </div>
        <div className="flex items-center text-gray-900 text-sm font-black">
          <DollarSign className="w-4 h-4 mr-2 text-emerald-500" />
          {formatSalary(job.salary)}
        </div>
        <div className="flex items-center text-gray-500 text-sm font-medium">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          {job.postedAt}
        </div>
        <div className="flex items-center text-gray-500 text-sm font-medium">
          <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
          {job.source}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {job.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl text-xs font-bold border border-gray-100">
            {skill}
          </span>
        ))}
        {job.skills.length > 4 && (
          <span className="text-gray-400 text-xs font-bold flex items-center px-2">
            +{job.skills.length - 4} more
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all">
          <Zap className="w-5 h-5 text-emerald-400" />
          Apply with AI
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`p-4 rounded-2xl transition-all border ${
            isSaved 
              ? 'bg-emerald-600 text-white border-emerald-600' 
              : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200 hover:text-emerald-600'
          }`}
        >
          {isSaved ? <BookmarkCheck className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
        </button>
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100"
        >
          <ExternalLink className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}
