import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, RefreshCw, Briefcase, Sparkles, Zap, TrendingUp, Globe, Clock, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { JobCard } from './JobCard';
import { JobDetails } from './JobDetails';
import { Job, CVProfile } from '../types';
import { GeminiService } from '../services/geminiService';

interface JobFeedProps {
  cvProfile: CVProfile | null;
}

export function JobFeed({ cvProfile }: JobFeedProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchJobs = async (pageNum: number = 1, append: boolean = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    
    try {
      const result = await GeminiService.searchJobs(searchTerm || "latest tech jobs", pageNum, countryFilter);
      const realJobs = result.jobs;
      setHasMore(result.hasMore);
      
      if (realJobs && realJobs.length > 0) {
        const jobsWithScores = realJobs.map(job => ({
          ...job,
          matchScore: cvProfile ? calculateJobMatch(job, cvProfile) : 0
        }));
        
        if (append) {
          setJobs(prev => [...prev, ...jobsWithScores]);
        } else {
          setJobs(jobsWithScores);
        }
      } else if (!append) {
          // Fallback to mock data if fetch fails and it's the first page
          const jobTemplates = [
            {
              title: 'Senior Software Engineer',
              description: 'We are looking for a Senior Software Engineer to build scalable cloud solutions. Experience with React, Node.js, and TypeScript is required.',
              skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
              url: 'https://www.linkedin.com/jobs'
            },
            {
              title: 'AI/ML Specialist',
              description: 'Help us integrate cutting-edge AI models into our products. Knowledge of Python, PyTorch, and LLMs is essential.',
              skills: ['Python', 'LLMs', 'OpenAI', 'Gemini'],
              url: 'https://www.google.com/search?q=AI+jobs'
            },
            {
              title: 'Product Designer',
              description: 'Create beautiful and intuitive user experiences for our global user base. Requirements: Figma, design systems, and cross-functional collaboration.',
              skills: ['Figma', 'UI/UX', 'Research'],
              url: 'https://www.dribbble.com/jobs'
            }
          ];

          const mockJobs = Array.from({ length: 15 }).map((_, i) => {
            const template = jobTemplates[i % jobTemplates.length];
            const isRemote = true;
            const salaryMin = 90000 + (i * 2000);

            return {
              id: `mock-${i}-${Date.now()}`,
              title: template.title,
              company: ['TechFlow', 'Stellar AI', 'CloudPath', 'EcoWeb', 'Nexus'][i % 5],
              location: 'Remote',
              salary: { min: salaryMin, max: salaryMin + 40000, currency: 'USD' },
              description: template.description,
              skills: template.skills,
              source: 'Internal Database',
              postedAt: 'Just now',
              type: 'Full-time',
              level: 'Mid-Senior',
              isRemote: isRemote,
              url: template.url,
              matchScore: cvProfile ? 85 + (i % 10) : 0
            };
          }) as Job[];
          setJobs(mockJobs);
        }
    } catch (err) {
      console.error("Job fetch error:", err);
      setError('Failed to fetch jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateJobMatch = (job: Job, profile: CVProfile | null): number => {
    if (!profile || !job) return 0;

    let score = 0;
    try {
      // 1. Skill Match (up to 50 pts)
      const profileSkills = (profile.skills || []).map(s => String(s || '').toLowerCase());
      const jobSkills = (job.skills || []).map(s => String(s || '').toLowerCase());
      
      if (jobSkills.length > 0) {
        const matchingSkills = jobSkills.filter(skill => 
          profileSkills.some(pSkill => pSkill.includes(skill) || skill.includes(pSkill))
        );
        score += (matchingSkills.length / jobSkills.length) * 50;
      }
    } catch (e) { console.warn("Score: Skills failed", e); }

    try {
      // 2. Title Match (up to 30 pts)
      const profileTitle = String(profile.title || "").toLowerCase();
      const jobTitle = String(job.title || "").toLowerCase();
      if (profileTitle && jobTitle) {
        if (jobTitle.includes(profileTitle) || profileTitle.includes(jobTitle)) {
          score += 30;
        } else {
          const titleWords = profileTitle.split(' ').filter(w => w.length > 3);
          if (titleWords.length > 0) {
            const matchingWords = titleWords.filter(word => jobTitle.includes(word));
            score += (matchingWords.length / titleWords.length) * 20;
          }
        }
      }
    } catch (e) { console.warn("Score: Title failed", e); }

    try {
      // 3. Experience Match (up to 20 pts)
      const jobLevel = String(job.level || '').toLowerCase();
      const profileLevel = String(profile.careerLevel || '').toLowerCase();
      if (profileLevel && (profileLevel.includes(jobLevel) || jobLevel.includes(profileLevel))) {
        score += 20;
      } else if (profile.experienceYears >= 5 && (jobLevel.includes('senior') || jobLevel.includes('lead'))) {
        score += 20;
      } else if (profile.experienceYears >= 2 && jobLevel.includes('mid')) {
        score += 20;
      }
    } catch (e) { console.warn("Score: Experience failed", e); }

    try {
      // 4. Industry/Specialization (up to 10 bonus pts)
      const industries = (profile.industries || []).map(i => String(i || '').toLowerCase());
      const jobDesc = String(job.description || '').toLowerCase();
      if (industries.length > 0 && jobDesc) {
        const hasIndustryMatch = industries.some(ind => jobDesc.includes(ind));
        if (hasIndustryMatch) score += 10;
      }
    } catch (e) { console.warn("Score: Industry failed", e); }

    return Math.min(Math.round(score), 100);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (jobs.length > 0 && cvProfile) {
      const updatedJobs = jobs.map(job => ({
        ...job,
        matchScore: calculateJobMatch(job, cvProfile)
      }));
      setJobs(updatedJobs);
    }
  }, [cvProfile]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  };

  useEffect(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [countryFilter]);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredJobs = jobs.filter(job => {
    // If searchTerm is our default "latest tech jobs", don't filter by it locally
    const isDefaultSearch = searchTerm === '' || searchTerm === 'latest tech jobs';
    
    const matchesGeneral = isDefaultSearch || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCompany = companySearch === '' || 
      job.company.toLowerCase().includes(companySearch.toLowerCase());
    
    const matchesSearch = matchesGeneral && matchesCompany;
    
    if (activeFilters.length === 0) return matchesSearch;

    const matchesFilters = activeFilters.every(filter => {
      if (filter === 'Remote') return job.isRemote;
      if (filter === 'Full-time') return job.type === 'Full-time';
      if (filter === 'Contract') return job.type === 'Contract';
      if (filter === 'Senior Level') return job.level === 'Senior' || job.level === 'Lead';
      if (filter === '₦5M+ /yr') return (job.salary.min * 1500) >= 5000000;
      return true;
    });

    return matchesSearch && matchesFilters;
  }).sort((a, b) => {
    if (sortBy === 'match') return (b.matchScore || 0) - (a.matchScore || 0);
    return 0; // Default order for date (already sorted by API)
  });

  if (selectedJob) {
    return (
      <JobDetails 
        job={selectedJob} 
        onBack={() => setSelectedJob(null)} 
        cvProfile={cvProfile}
      />
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      {/* Search & Filters */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-[2] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by title or keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchJobs(1);
              }}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
          </div>
            <div className="flex-1 relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Country (e.g. Nigeria)..." 
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
            <div className="flex-1 relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by company..." 
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>
          <div className="flex gap-3">
            <div className="flex items-center bg-gray-50 px-4 rounded-2xl border border-transparent focus-within:border-emerald-500">
              <TrendingUp className="w-5 h-5 text-gray-400 mr-2" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none focus:ring-0 font-bold text-gray-600 py-4"
              >
                <option value="match">Sort by Match</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>
            <button className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-8 py-4 rounded-2xl font-black hover:bg-emerald-100 transition-all">
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button 
              onClick={() => fetchJobs(1)}
              className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-6 h-6 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterBadge label="Remote" active={activeFilters.includes('Remote')} onClick={() => toggleFilter('Remote')} />
          <FilterBadge label="Full-time" active={activeFilters.includes('Full-time')} onClick={() => toggleFilter('Full-time')} />
          <FilterBadge label="Contract" active={activeFilters.includes('Contract')} onClick={() => toggleFilter('Contract')} />
          <FilterBadge label="Senior Level" active={activeFilters.includes('Senior Level')} onClick={() => toggleFilter('Senior Level')} />
          <FilterBadge label="₦5M+ /yr" active={activeFilters.includes('₦5M+ /yr')} onClick={() => toggleFilter('₦5M+ /yr')} />
        </div>
      </div>

      {/* Job Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {error && (
          <div className="col-span-full bg-red-50 border border-red-100 p-6 rounded-3xl text-center mb-8">
            <p className="text-red-600 font-bold mb-2">Something went wrong</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button 
              onClick={() => fetchJobs(1)}
              className="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
            >
              Try again
            </button>
          </div>
        )}
        {loading && page === 1 ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-3xl" />
          ))
        ) : filteredJobs.length > 0 ? (
          <>
            {filteredJobs.map((job) => (
              <div key={job.id}>
                <JobCard job={job} onClick={() => setSelectedJob(job)} />
              </div>
            ))}
            {hasMore && (
              <div className="col-span-full flex justify-center pt-10">
                <button 
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {loadingMore ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-emerald-400" />}
                  Load More Real-Time Jobs
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold mb-4">No jobs found matching your search.</p>
            
            {(searchTerm || countryFilter || companySearch || activeFilters.length > 0) ? (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setCountryFilter('');
                  setCompanySearch('');
                  setActiveFilters([]);
                  fetchJobs(1);
                }}
                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all mb-8"
              >
                Clear all filters
              </button>
            ) : null}

            <div className="flex flex-col items-center gap-4 border-t border-gray-200 pt-8 mt-4 mx-8">
              <p className="text-sm text-gray-400 max-w-md">
                If the search engine is still indexing your new service, click below to force a synchronization.
              </p>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    // First setup the index
                    await fetch('/api/admin/setup-index', { method: 'POST' });
                    // Then ingest
                    const res = await fetch('/api/admin/ingest-jobs', { method: 'POST' });
                    if (res.ok) {
                      await fetchJobs();
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Sync Job Database
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBadge({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
      active ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
    }`}>
      {label}
    </button>
  );
}
