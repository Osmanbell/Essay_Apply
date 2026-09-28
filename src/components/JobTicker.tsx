import React, { useState, useEffect, useRef } from 'react';
import { Job } from '../types';
import { GeminiService } from '../services/geminiService';
import { Clock } from 'lucide-react';

export function JobTicker() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadJobs = async () => {
      const realJobs = await GeminiService.fetchRealJobs();
      if (realJobs && realJobs.length > 0) {
        setJobs(realJobs);
      } else {
        // Fallback to mock jobs if fetch fails
        const jobTitles = ['Senior AI Engineer', 'Full-Stack Developer', 'Data Scientist', 'Product Manager', 'Cloud Architect', 'DevOps Engineer', 'UX Designer', 'Mobile Developer'];
        const companies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Apple', 'Tesla', 'SpaceX', 'Stripe', 'Airbnb'];
        
        const mockJobs = Array.from({ length: 20 }).map((_, i) => ({
          id: `ticker-job-${i}`,
          title: jobTitles[i % jobTitles.length],
          company: companies[i % companies.length],
          salary: { min: 80000 + (i * 2000), max: 150000, currency: 'USD' },
          postedAt: 'Just now'
        })) as Job[];
        setJobs(mockJobs);
      }
    };

    loadJobs();
    
    // Refresh every 10 minutes
    const interval = setInterval(loadJobs, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker || jobs.length === 0) return;

    let animationId: number;
    let scrollPos = 0;

    const step = () => {
      scrollPos += 0.5;
      if (scrollPos >= ticker.scrollWidth / 2) {
        scrollPos = 0;
      }
      ticker.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [jobs]);

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur-md py-3 border-t border-white/10">
      <div className="max-w-[100vw] overflow-hidden">
        <div className="flex items-center px-6 mb-1">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Global Job Feed
          </div>
        </div>
        <div 
          ref={tickerRef}
          className="flex gap-6 whitespace-nowrap overflow-hidden"
        >
          {[...jobs, ...jobs].map((job, i) => (
            <div key={`${job.id}-${i}`} className="flex items-center gap-4 text-white/70 text-xs font-bold bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">{job.company}</span>
                <span className="text-gray-500">•</span>
                <span>{job.title}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 border-l border-white/10 pl-4">
                <Clock className="w-3 h-3 text-emerald-500/50" />
                <span className="text-[10px] uppercase tracking-wider">{job.postedAt}</span>
              </div>
              {job.salary && job.salary.min > 0 && (
                <span className="text-emerald-500/40 font-black border-l border-white/10 pl-4">
                  ₦{(job.salary.min * (job.salary.currency === 'USD' ? 1500 : 1)).toLocaleString()}
                </span>
              )}
              {(!job.salary || job.salary.min === 0) && (
                <span className="text-gray-600 font-bold border-l border-white/10 pl-4">
                  Competitive
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
