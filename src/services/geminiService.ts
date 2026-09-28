import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

// Client-side proxy to server-side AI routes
const callAI = async (messages: any[], response_format?: any) => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, response_format })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "AI Request Failed");
  }
  return response.json();
};

export const GeminiService = {
  async evaluateAndCorrectCV(cvProfile: any) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are a Senior Career Consultant specializing in international resume standards. Evaluate CV profiles and provide detailed critiques and optimized versions. Return ONLY a valid JSON object."
        },
        {
          role: "user",
          content: `Evaluate the following CV profile and provide a detailed critique and a "Corrected/Optimized" version of the professional summary and key achievements.
          
          INTERNATIONAL STANDARDS TO APPLY:
          1. US/Canada: Focus on achievements and metrics (quantifiable results).
          2. UK/EU: Clarity, professional tone, and concise formatting.
          3. Global Tech: Keyword optimization for ATS and clear tech stack representation.
          
          User Profile:
          ${JSON.stringify(cvProfile)}
          
          Return a JSON object:
          {
            "score": number (0-100),
            "critique": "string",
            "corrections": [
              {
                "section": "string",
                "original": "string",
                "optimized": "string",
                "reason": "string"
              }
            ],
            "optimizedSummary": "string",
            "suggestedSkills": ["string"]
          }`
        }
      ], { type: "json_object" });

      const content = response.choices[0].message.content;
      return JSON.parse(content || '{}');
    } catch (error) {
      console.error("Azure OpenAI Evaluation Error:", error);
      return {};
    }
  },

  async calculateMatchScore(cvProfile: any, job: any) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are a recruitment matching engine. Calculate compatibility scores between CVs and job listings. Return ONLY a valid JSON object."
        },
        {
          role: "user",
          content: `Calculate a compatibility score (0-100) between the user's CV profile and the job listing.
          
          User Profile:
          ${JSON.stringify(cvProfile)}
          
          Job Listing:
          ${JSON.stringify(job)}
          
          Return a JSON object:
          {
            "score": number,
            "reasoning": "string",
            "strengths": ["string"],
            "gaps": ["string"]
          }`
        }
      ], { type: "json_object" });

      const content = response.choices[0].message.content;
      return JSON.parse(content || '{"score": 0, "reasoning": "Error calculating score"}');
    } catch (error) {
      console.error("Azure OpenAI Match Score Error:", error);
      return { score: 0, reasoning: "Error calculating score", strengths: [], gaps: [] };
    }
  },

  async generateMasterCV(cvProfile: any) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are an elite Resume Architect. Create a high-impact, international standard Master CV based on the user's profile. Use professional formatting and powerful action verbs. CRITICAL: Do NOT use Markdown symbols like asterisks (*) or hashes (#) for bolding or headers. Use plain text with clear spacing and uppercase for section headers to create a clean, professional look."
        },
        {
          role: "user",
          content: `Generate a comprehensive Master CV.
          
          PROFILE DATA:
          ${JSON.stringify(cvProfile)}
          
          STRUCTURE:
          1. HEADER: Name, Title, Email, Phone, LinkedIn, Location.
          2. PROFESSIONAL SUMMARY: High-impact paragraph.
          3. CORE COMPETENCIES: Categorized lists.
          4. PROFESSIONAL EXPERIENCE: Detailed with metrics.
          5. EDUCATION & CERTIFICATIONS
          6. PROJECTS & AWARDS
          
          Ensure it follows international standards (US/UK/EU) and is highly optimized for ATS. Use standard text formatting only.`
        }
      ]);

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Master CV Generation Error:", error);
      return "Error generating Master CV.";
    }
  },

  async analyzeCV(cvText: string) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are an expert CV Analyst. Extract structured data from the provided CV text. Return a JSON object matching the user profile structure. Be extremely thorough and professional. If a field is not found, leave it empty. For work experience, ensure you capture the full detail of roles and achievements."
        },
        {
          role: "user",
          content: `Analyze this CV and extract details into the specified JSON format. 
          
          CV TEXT:
          ${cvText}
          
          RETURN JSON FORMAT (STRICT):
          {
            "fullName": "Full name of the person",
            "title": "Current professional title",
            "email": "Email address",
            "phone": "Phone number",
            "linkedin": "LinkedIn profile URL",
            "experienceYears": number (total years of experience),
            "skills": "comma separated list of technical and soft skills",
            "education": "comma separated list of degrees and institutions",
            "careerLevel": "Junior" | "Mid-level" | "Senior" | "Lead" | "Executive",
            "workExperience": "DETAILED work history. Format: Role | Company | Duration | Detailed achievements and responsibilities (one role per line)",
            "certifications": "comma separated list of certifications",
            "industries": "comma separated list of relevant industries",
            "careerGoal": "A brief summary of their career objectives based on the CV"
          }`
        }
      ], { type: "json_object" });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("CV Analysis Error:", error);
      return null;
    }
  },

  async extractJobContact(jobDescription: string, companyName: string) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are a recruitment data specialist. Your task is to find the contact email for job applications within a job description. If no email is found, try to derive a likely HR email based on the company name (e.g., careers@company.com or hr@company.com)."
        },
        {
          role: "user",
          content: `Find or derive the application email for this job:
          
          COMPANY: ${companyName}
          DESCRIPTION: ${jobDescription}
          
          RETURN ONLY THE EMAIL ADDRESS. NOTHING ELSE.`
        }
      ]);

      return response.choices[0].message.content?.trim() || `careers@${companyName.toLowerCase().replace(/\s/g, '')}.com`;
    } catch (error) {
      console.error("Email Extraction Error:", error);
      return `hr@${companyName.toLowerCase().replace(/\s/g, '')}.com`;
    }
  },

  async generateTailoredResume(cvProfile: any, jobDescription: string) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are an expert Executive Career Coach and Resume Writer. Generate professional, human-like, ATS-optimized resumes. CRITICAL: Do NOT use Markdown symbols like asterisks (*) or hashes (#) for bolding or headers. Use plain text with clear spacing and uppercase for section headers."
        },
        {
          role: "user",
          content: `Generate a tailored resume for this job description using the user's CV profile.
          
          CRITICAL GUIDELINES:
          1. CONTACT INFO: MUST include the user's name, email, phone, LinkedIn, and address at the top.
          2. TONE: Professional, confident, and results-oriented.
          3. STRUCTURE: Header, Summary, Experience, Skills, Education.
          4. CONTENT: Highlight matches. If 'masterCV' exists in the profile, use it as the primary source for tailoring.
          5. QUANTIFY: Include metrics.
          6. KEYWORDS: Integrate job keywords.
          
          User Profile:
          ${JSON.stringify(cvProfile)}
          
          Job Description:
          ${jobDescription}`
        }
      ]);

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Azure OpenAI Resume Generation Error:", error);
      return "Error generating resume.";
    }
  },

  async generateCoverLetter(cvProfile: any, jobDescription: string) {
    try {
      const response = await callAI([
        {
          role: "system",
          content: "You are an expert Career Strategist. Write professional, human-like, and highly persuasive cover letters. CRITICAL: Do NOT use Markdown symbols like asterisks (*) or hashes (#)."
        },
        {
          role: "user",
          content: `Write a tailored cover letter (approx. 300 words) for this job description using the user's CV profile.
          
          CRITICAL GUIDELINES:
          1. TONE: Enthusiastic, professional, and personalized.
          2. HOOK: Strong opening.
          3. VALUE PROP: Connect successes to needs.
          4. CALL TO ACTION: Request interview.
          
          User Profile:
          ${JSON.stringify(cvProfile)}
          
          Job Description:
          ${jobDescription}`
        }
      ]);

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Azure OpenAI Cover Letter Error:", error);
      return "Error generating cover letter.";
    }
  },

  async generateDocx(title: string, content: string, fileName: string) {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          ...content.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return new Paragraph({ spacing: { after: 120 } });
            
            // Detect headers: Starts with # or is all uppercase and relatively short
            const isMarkdownHeader = trimmedLine.startsWith('#');
            const isPlainHeader = trimmedLine.length > 3 && trimmedLine.length < 50 && trimmedLine === trimmedLine.toUpperCase();
            
            if (isMarkdownHeader || isPlainHeader) {
              return new Paragraph({
                children: [new TextRun({ 
                  text: trimmedLine.replace(/#/g, '').trim(), 
                  bold: true, 
                  size: 28,
                  color: "059669" // Emerald-600
                })],
                spacing: { before: 240, after: 120 }
              });
            }
            
            return new Paragraph({
              children: [new TextRun({ text: trimmedLine })],
              spacing: { after: 120 }
            });
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
  },

  async fetchRealJobs() {
    try {
      // Use Server-side proxy for Remotive to avoid CORS
      const response = await fetch('/api/jobs/external?limit=10');
      if (!response.ok) throw new Error("Failed to fetch external jobs");
      const data = await response.json();
      
      return data.jobs.map((job: any) => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        postedAt: new Date(job.publication_date).toLocaleDateString(),
        description: job.description.replace(/<[^>]*>?/gm, ''), // Strip HTML
        salary: {
          min: 0,
          max: 0,
          currency: 'USD'
        },
        url: job.url,
        skills: job.tags || []
      }));
    } catch (error) {
      console.error("Error fetching real jobs from Remotive:", error);
      return [];
    }
  },

  // Helper for fetch with timeout
  async fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  },

  async searchJobs(query: string = "latest tech jobs", page: number = 1, country?: string) {
    try {
      // 1. Fetch from external aggregator via server proxy (Primary source for variety)
      let aggregatorJobs: any[] = [];
      try {
        let url = `/api/jobs/external?q=${encodeURIComponent(query)}&limit=20&page=${page}`;
        if (country) {
          url += `&country=${encodeURIComponent(country)}`;
        }
        
        const response = await GeminiService.fetchWithTimeout(url);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.jobs)) {
            aggregatorJobs = data.jobs.map((job: any) => ({
              id: job.id?.toString() || Math.random().toString(),
              title: job.title || 'Untitled Role',
              company: job.company_name || 'Hidden Company',
              location: job.candidate_required_location || 'Remote',
              postedAt: job.publication_date ? new Date(job.publication_date).toLocaleDateString() : 'Recent',
              description: (job.description || '').replace(/<[^>]*>?/gm, ''), // Strip HTML
              salary: {
                min: job.salary_min || 0,
                max: job.salary_max || 0,
                currency: job.currency || 'USD'
              },
              url: job.url || '#',
              skills: Array.isArray(job.tags) ? job.tags : (job.skills || []),
              source: job.source || 'Aggregator',
              type: job.job_type || 'Full-time',
              level: 'Mid-Senior',
              isRemote: job.remote || true
            }));
          }
        }
      } catch (aggError) {
        console.warn("External aggregator failed or timed out:", aggError);
      }

      // 2. Supplement with Azure AI Search results (First page only)
      let finalJobs = aggregatorJobs;
      if (page === 1) {
        try {
          const searchResponse = await GeminiService.fetchWithTimeout(`/api/jobs/search?q=${encodeURIComponent(query)}`, { timeout: 5000 });
          if (searchResponse.ok) {
            const azureJobs = await searchResponse.json();
            if (Array.isArray(azureJobs) && azureJobs.length > 0) {
              const formattedAzure = azureJobs.map((job: any) => ({
                ...job,
                id: job.id || `az-${Math.random().toString(36).substr(2, 9)}`,
                source: job.source || 'Azure AI Search',
                postedAt: job.postedAt ? new Date(job.postedAt).toLocaleDateString() : new Date().toLocaleDateString(),
                salary: job.salary || { min: 0, max: 0, currency: 'USD' },
                isRemote: job.remote || true
              }));
              
              if (aggregatorJobs.length === 0) {
                finalJobs = formattedAzure;
              } else {
                // Interleave Azure jobs with aggregator jobs for maximum variety
                const interleaved = [];
                const maxLen = Math.max(aggregatorJobs.length, formattedAzure.length);
                for (let i = 0; i < maxLen; i++) {
                  if (i < aggregatorJobs.length) interleaved.push(aggregatorJobs[i]);
                  if (i < formattedAzure.length) interleaved.push(formattedAzure[i]);
                }
                finalJobs = interleaved;
              }
            }
          }
        } catch (e) {
          console.warn("Azure Search supplement failed or timed out:", e);
        }
      }

      // If absolutely everything failed, ensure we return something on page 1
      if (finalJobs.length === 0 && page === 1) {
        console.log("No jobs found from any source, providing fallback baseline.");
        return {
          jobs: [
            {
              id: 'fallback-1',
              title: 'Senior Software Engineer',
              company: 'TechFlow',
              location: 'Remote',
              postedAt: 'Just now',
              description: 'We are looking for a Senior Software Engineer to build scalable cloud solutions. Experience with React, Node.js, and TypeScript is required.',
              salary: { min: 90000, max: 150000, currency: 'USD' },
              skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
              source: 'System Fallback',
              type: 'Full-time',
              level: 'Senior',
              isRemote: true,
              url: '#'
            }
          ],
          hasMore: false
        };
      }

      return {
        jobs: finalJobs,
        hasMore: finalJobs.length >= 15
      };
    } catch (error) {
      console.error("Critical error in searchJobs:", error);
      return { jobs: [], hasMore: false };
    }
  }
};
