import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import OpenAI from "openai";
import { SearchClient, AzureKeyCredential, SearchIndexClient } from "@azure/search-documents";
import { EmailClient } from "@azure/communication-email";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// In Newer admin SDKs, specifying databaseId is done via getFirestore or as a parameter
const dbAdmin = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize OpenAI client for Azure (Server-side)
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview";

  let client: OpenAI | null = null;
  if (azureApiKey && azureEndpoint && azureDeployment) {
    client = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey },
    });
  }

  // Initialize Azure AI Search (Server-side)
  // Prioritize AZURE_AI_SEARCH_API_KEY from secrets/environment variables
  const providedKey = "mYX4zGISmkrficRsAPMOIvyXbW9wth85ThNMTjCTnMAzSeC0uhl2";
  const searchApiKey = process.env.AZURE_AI_SEARCH_API_KEY || providedKey;
  
  // Force the correct endpoint
  let searchEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT || "https://auto-job-new.search.windows.net";
  if (searchEndpoint.includes("job-ai-agent") || searchEndpoint.includes("job-new.search.windows.net")) {
    searchEndpoint = "https://auto-job-new.search.windows.net";
  }
  
  let searchIndexName = process.env.AZURE_AI_SEARCH_INDEX_NAME || "jobs";
  // Force the correct index name
  if (searchIndexName === "your-index-name" || searchIndexName === "ai-agent-job" || searchIndexName === "job-new-index") {
    searchIndexName = "jobs";
  }

  // Masked logging for debugging
  const maskedKey = searchApiKey ? `${searchApiKey.substring(0, 4)}...${searchApiKey.substring(searchApiKey.length - 4)}` : 'MISSING';
  console.log(`[Search Config] Endpoint: ${searchEndpoint}`);
  console.log(`[Search Config] Index: ${searchIndexName}`);
  console.log(`[Search Config] API Key (Masked): ${maskedKey}`);
  if (searchApiKey !== providedKey && process.env.AZURE_AI_SEARCH_API_KEY) {
    console.log("[Search Config] Using API Key from environment variables.");
  } else if (searchApiKey === providedKey) {
    console.log("[Search Config] Using hardcoded fallback key.");
  }

  let searchClient: SearchClient<any> | null = null;
  let indexClient: SearchIndexClient | null = null;
  let searchServiceReady = true;

  if (searchApiKey && searchEndpoint && searchIndexName) {
    try {
      searchClient = new SearchClient(
        searchEndpoint,
        searchIndexName,
        new AzureKeyCredential(searchApiKey)
      );
      indexClient = new SearchIndexClient(
        searchEndpoint,
        new AzureKeyCredential(searchApiKey)
      );
      console.log("[Search Config] SearchClient and IndexClient initialized.");
    } catch (e) {
      console.error("[Search Config] Initialization failed:", e);
      searchServiceReady = false;
    }
  }

  // Initialize Azure Communication Services Email Client
  let acsEmailClient: EmailClient | null = null;
  const acsConnectionString = process.env.ACS_CONNECTION_STRING;
  if (acsConnectionString) {
    acsEmailClient = new EmailClient(acsConnectionString);
    console.log("ACS Email Client initialized.");
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/chat", async (req, res) => {
    if (!client) {
      return res.status(500).json({ error: "Azure OpenAI not configured on server." });
    }
    try {
      const { messages, response_format } = req.body;
      const response = await client.chat.completions.create({
        model: azureDeployment!,
        messages,
        response_format
      });
      res.json(response);
    } catch (error: any) {
      console.error("Server AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/company/info", async (req, res) => {
    const domain = req.query.domain as string;
    const name = req.query.name as string;
    
    if (!domain && !name) {
      return res.status(400).json({ error: "Domain or name is required" });
    }

    try {
      // In a real app, you'd use Clearbit or similar. 
      // For this demo, we'll use a simulated response if no API key is provided,
      // but we'll try to fetch from a public source if possible.
      
      // Simulated company data based on the name/domain
      const companyData = {
        name: name || domain.split('.')[0].toUpperCase(),
        domain: domain || `${name?.toLowerCase().replace(/\s/g, '')}.com`,
        size: ["10-50", "51-200", "201-500", "501-1000", "1000+"][Math.floor(Math.random() * 5)],
        industry: ["Technology", "Finance", "Healthcare", "Education", "Manufacturing"][Math.floor(Math.random() * 5)],
        funding: `$${Math.floor(Math.random() * 100) + 1}M Series ${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`,
        description: `Leading company in the ${name || domain} space, focused on innovation and growth.`,
        logo: `https://logo.clearbit.com/${domain || 'google.com'}`,
        updatedAt: new Date().toISOString()
      };

      res.json(companyData);
    } catch (error: any) {
      console.error("Company Info Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/jobs/external", async (req, res) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string || "20");
    const page = parseInt(req.query.page as string || "1");
    const country = req.query.country as string;
    
    console.log(`[Jobs API] Inbound request: q="${query}", country="${country}", page=${page}`);
    
    try {
      // 1. Fetch from Remotive as a base
      let remotiveData = { jobs: [] };
      try {
        let remotiveUrl = `https://remotive.com/api/remote-jobs?limit=${limit}`;
        if (query && query !== 'latest tech jobs') {
          remotiveUrl += `&search=${encodeURIComponent(query)}`;
        }
        
        console.log(`[Jobs API] Fetching from Remotive: ${remotiveUrl}`);
        const remotiveRes = await fetch(remotiveUrl);
        if (remotiveRes.ok) {
          remotiveData = await remotiveRes.json();
          console.log(`[Jobs API] Remotive returned ${remotiveData.jobs?.length || 0} jobs`);
        } else {
          console.error(`[Jobs API] Remotive failed: ${remotiveRes.status}`);
        }
      } catch (remError: any) {
        console.warn("[Jobs API] Remotive API unreachable:", remError.message);
      }
      
      // 2. Generate Simulated Jobs (Baseline for all sectors + Nigeria)
      const sources = ['LinkedIn', 'Indeed', 'Glassdoor', 'RemoteOK'];
      const sectors = ['Software Engineering', 'Data Science', 'Product Management', 'Marketing', 'Sales', 'Customer Success', 'Finance', 'Healthcare', 'Banking', 'Logistics'];
      const nigerianCompanies = ['Paystack', 'Flutterwave', 'Andela', 'Interswitch', 'Kuda Bank', 'PiggyVest', 'Moniepoint', 'Reliance Health', 'Helium Health', 'GTBank', 'Zenith Bank', 'Globacom'];
      
      const simulatedJobs = [];
      const countPerSource = Math.ceil(limit / 4);

      // Add Nigerian specific jobs
      for (let i = 0; i < 15; i++) {
        const company = nigerianCompanies[i % nigerianCompanies.length];
        const sector = sectors[i % sectors.length];
        simulatedJobs.push({
          id: `sim-ng-${i}-${Date.now()}`,
          title: `${sector}${sector === 'Software Engineering' ? ' Specialist' : ' Professional'}`,
          company_name: company,
          candidate_required_location: 'Lagos, Nigeria',
          publication_date: new Date(Date.now() - (i * 3600000 * 24)).toISOString(),
          description: `Join ${company} in Lagos to help build the future of ${sector.toLowerCase()} in Africa. We are looking for talented individuals to join our growing team.`,
          tags: [sector, 'Nigeria', 'Fintech', 'Africa'],
          url: `https://www.linkedin.com/company/${company.toLowerCase()}/jobs`,
          job_type: 'Full-time',
          salary_min: 5000000 + (i * 300000), // In NGN
          salary_max: 8000000 + (i * 300000),
          currency: 'NGN',
          source: 'LinkedIn'
        });
      }

      // Add general simulated jobs from other sources
      for (const source of sources) {
        for (let i = 0; i < countPerSource; i++) {
          const sector = sectors[(i + sources.indexOf(source)) % sectors.length];
          simulatedJobs.push({
            id: `sim-${source}-${i}-${Date.now()}`,
            title: `${sector} Lead`,
            company_name: `${source} Partner ${i + 1}`,
            candidate_required_location: ['USA', 'UK', 'Canada', 'Germany', 'Remote'][i % 5],
            publication_date: new Date(Date.now() - (i * 3600000 * 12)).toISOString(),
            description: `Exciting opportunity at a top-tier company via ${source}. We are looking for a ${sector} professional with 5+ years of experience.`,
            tags: [sector, 'Remote', 'High Growth'],
            url: `https://www.${source.toLowerCase()}.com/jobs`,
            job_type: 'Full-time',
            salary_min: 100000 + (i * 5000),
            salary_max: 150000 + (i * 5000),
            currency: 'USD',
            source: source
          });
        }
      }

      // Combine and interleave for variety
      const remotiveJobs = remotiveData.jobs?.map((j: any) => ({ ...j, source: 'Remotive' })) || [];
      
      // Shuffle simulated jobs to avoid same companies always appearing first
      const shuffledSimulated = simulatedJobs.sort(() => Math.random() - 0.5);
      
      const allJobs = [];
      const maxLen = Math.max(remotiveJobs.length, shuffledSimulated.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (i < shuffledSimulated.length) allJobs.push(shuffledSimulated[i]);
        if (i < remotiveJobs.length) allJobs.push(remotiveJobs[i]);
      }

      // Ensure we have at least SOME jobs even if everything failed
      if (allJobs.length === 0) {
        allJobs.push({
          id: 'emergency-fallback-1',
          title: 'Senior Software Engineer',
          company_name: 'Tech Innovators',
          candidate_required_location: 'Remote',
          publication_date: new Date().toISOString(),
          description: 'Apply now for this exciting role at a top tech company.',
          tags: ['Tech', 'Remote'],
          url: 'https://remotive.com',
          job_type: 'Full-time',
          salary_min: 120000,
          salary_max: 180000,
          currency: 'USD',
          source: 'System'
        });
      }

      // Simple filtering if country is specified
      let filtered = allJobs;
      if (country) {
        filtered = allJobs.filter(j => 
          j.candidate_required_location?.toLowerCase().includes(country.toLowerCase())
        );
      }

      // Pagination
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      res.json({ 
        jobs: paginated,
        total: filtered.length,
        page,
        hasMore: filtered.length > start + limit
      });
    } catch (error: any) {
      console.error("External Jobs Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/jobs/search", async (req, res) => {
    const query = (req.query.q as string) || "*";
    console.log(`[Job Search API] Query: "${query}"`);
    
    if (!searchClient || !searchServiceReady) {
      console.warn("[Search] searchClient missing or service not ready.");
      return res.json([]);
    }

    try {
      let searchResults: any;
      try {
        searchResults = await searchClient.search(query, { top: 20 });
      } catch (searchError: any) {
        console.warn(`[Search] Primary search failed: ${searchError.message}`);
        
        // 1. Circuit breaker: if service is disabled, mark it so we don't spam errors
        if (searchError.message?.toLowerCase().includes("disabled") || searchError.statusCode === 403) {
          searchServiceReady = false;
          console.warn("[Search] Azure Search service is disabled/unauthorized. Entering fallback mode.");
          return res.json([]);
        }

        // 2. Self-healing: If index is misconfigured OR not found
        const isMisconfigured = searchError.message?.includes("searchable string fields");
        const isNotFound = 
          searchError.message?.toLowerCase().includes("not found") || 
          searchError.code === "ResourceNotFound" || 
          searchError.statusCode === 404 ||
          searchError.message?.includes("404");
        
        if ((isMisconfigured || isNotFound) && indexClient) {
          console.log(`[Search] Index ${isNotFound ? 'missing (404)' : 'misconfigured'}. Attempting auto-setup...`);
          try {
            const indexName = "jobs";
            const indexDefinition = {
              name: indexName,
              fields: [
                { name: "id", type: "Edm.String" as const, key: true, filterable: true },
                { name: "title", type: "Edm.String" as const, searchable: true, filterable: true, sortable: true },
                { name: "company", type: "Edm.String" as const, searchable: true, filterable: true, sortable: true },
                { name: "location", type: "Edm.String" as const, searchable: true, filterable: true },
                { name: "description", type: "Edm.String" as const, searchable: true },
                { name: "skills", type: "Collection(Edm.String)" as const, searchable: true, filterable: true },
                { name: "url", type: "Edm.String" as const, filterable: true },
                { name: "source", type: "Edm.String" as const, filterable: true },
                { name: "postedAt", type: "Edm.DateTimeOffset" as const, filterable: true, sortable: true },
                { name: "remote", type: "Edm.Boolean" as const, filterable: true },
                {
                  name: "salary",
                  type: "Edm.ComplexType" as const,
                  fields: [
                    { name: "min", type: "Edm.Int64" as const, filterable: true, sortable: true },
                    { name: "max", type: "Edm.Int64" as const, filterable: true, sortable: true },
                    { name: "currency", type: "Edm.String" as const, filterable: true },
                    { name: "type", type: "Edm.String" as const, filterable: true }
                  ]
                }
              ]
            };
            
            await indexClient.createOrUpdateIndex(indexDefinition);
            console.log("[Search] Auto-setup successful. Retrying search...");
            const retryResults = await searchClient.search(query, { top: 20 });
            const docs = [];
            for await (const result of retryResults.results) {
              docs.push(result.document);
            }
            return res.json(docs);
          } catch (setupError: any) {
            console.error("[Search] Auto-setup failed:", setupError);
            return res.json([]);
          }
        }
        
        return res.json([]);
      }
      
      const jobs = [];
      if (searchResults && searchResults.results) {
        for await (const result of searchResults.results) {
          jobs.push(result.document);
        }
      }
      
      console.log(`[Search] Returning ${jobs.length} jobs.`);
      res.json(jobs);
    } catch (error: any) {
      console.error("Critical Azure Search Route Error:", error);
      return res.json([]);
    }
  });

  app.get("/api/admin/search-status", async (req, res) => {
    if (!searchClient || !searchServiceReady) {
      return res.json({ status: 'unready', count: 0 });
    }

    try {
      const results = await searchClient.search("*", { top: 1, includeTotalCount: true });
      res.json({
        status: 'ready',
        count: results.count || 0,
        indexName: searchIndexName
      });
    } catch (error: any) {
      res.json({ status: 'error', error: error.message, count: 0 });
    }
  });

  app.post("/api/admin/setup-index", async (req, res) => {
    if (!indexClient) {
      return res.status(500).json({ error: "Azure AI Search index client not configured." });
    }

    const indexName = searchIndexName!;
    const indexDefinition = {
      name: indexName,
      fields: [
        { name: "id", type: "Edm.String" as const, key: true, filterable: true },
        { name: "title", type: "Edm.String" as const, searchable: true, filterable: true, sortable: true },
        { name: "company", type: "Edm.String" as const, searchable: true, filterable: true, sortable: true },
        { name: "location", type: "Edm.String" as const, searchable: true, filterable: true },
        { name: "description", type: "Edm.String" as const, searchable: true },
        { name: "skills", type: "Collection(Edm.String)" as const, searchable: true, filterable: true },
        { name: "url", type: "Edm.String" as const, filterable: true },
        { name: "source", type: "Edm.String" as const, filterable: true },
        { name: "postedAt", type: "Edm.DateTimeOffset" as const, filterable: true, sortable: true },
        { name: "remote", type: "Edm.Boolean" as const, filterable: true },
        {
          name: "salary",
          type: "Edm.ComplexType" as const,
          fields: [
            { name: "min", type: "Edm.Int64" as const, filterable: true, sortable: true },
            { name: "max", type: "Edm.Int64" as const, filterable: true, sortable: true },
            { name: "currency", type: "Edm.String" as const, filterable: true },
            { name: "type", type: "Edm.String" as const, filterable: true }
          ]
        }
      ]
    };

    try {
      console.log(`[Setup Index] Attempting to create or update index: ${indexName}`);
      await indexClient.createOrUpdateIndex(indexDefinition);
      res.json({ success: true, message: `Index ${indexName} setup successfully.` });
    } catch (error: any) {
      console.error("Setup Index Error:", error);
      
      // If the error is about immutable fields, try deleting and recreating
      if (error.message.includes("cannot be changed") || error.message.includes("immutable")) {
        console.log(`[Setup Index] Immutable field error detected. Attempting to recreate index: ${indexName}`);
        try {
          await indexClient.deleteIndex(indexName);
          await indexClient.createIndex(indexDefinition);
          return res.json({ success: true, message: `Index ${indexName} recreated successfully.` });
        } catch (recreateError: any) {
          console.error("Recreate Index Error:", recreateError);
          return res.status(500).json({ error: `Failed to recreate index: ${recreateError.message}` });
        }
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/ingest-jobs", async (req, res) => {
    if (!searchClient || !searchServiceReady) {
      return res.status(503).json({ 
        error: "Azure AI Search is currently unavailable or disabled.",
        code: "SEARCH_SERVICE_DISABLED"
      });
    }

    try {
      // Fetch jobs from Remotive to seed the Azure Index
      const response = await fetch('https://remotive.com/api/remote-jobs?limit=50');
      const data = await response.json();
      
      const remotiveJobs = data.jobs.map((job: any) => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        description: job.description.replace(/<[^>]*>?/gm, ''),
        skills: job.tags || [],
        url: job.url,
        source: 'Remotive',
        postedAt: new Date(job.publication_date).toISOString(),
        remote: true,
        salary: { min: 0, max: 0, currency: 'USD', type: 'annual' }
      }));

      // Add some Nigerian specific jobs
      const nigerianCompanies = ['Paystack', 'Flutterwave', 'Andela', 'Interswitch', 'Kuda Bank'];
      const ngJobs = nigerianCompanies.map((company, i) => ({
        id: `ng-seed-${i}`,
        title: 'Senior Software Engineer',
        company: company,
        location: 'Lagos, Nigeria',
        description: `Join ${company} in Lagos to help build the future of fintech in Africa.`,
        skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL'],
        url: `https://www.linkedin.com/company/${company.toLowerCase()}/jobs`,
        source: 'LinkedIn',
        postedAt: new Date().toISOString(),
        remote: false,
        salary: { min: 6000000, max: 12000000, currency: 'NGN', type: 'annual' }
      }));

      const allJobs = [...remotiveJobs, ...ngJobs];

      await searchClient.uploadDocuments(allJobs);
      res.json({ success: true, count: allJobs.length });
    } catch (error: any) {
      console.error("Ingestion Error:", error);
      if (error.message.includes("disabled")) {
        return res.status(503).json({ 
          error: "The Azure Search service is currently disabled. Please check your Azure Subscription or provide a new Search Endpoint in environment variables.",
          code: "SEARCH_SERVICE_DISABLED"
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook for Azure Event Grid (Email Status Updates)
  app.post("/api/webhooks/azure-email", async (req, res) => {
    // 1. Azure Event Grid validation handshake
    const events = req.body;
    if (Array.isArray(events) && events[0]?.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      return res.json({ validationResponse: events[0].data.validationCode });
    }

    try {
      // 2. Process real email events
      // Azure Event Grid sends ACS email status updates:
      // Microsoft.Communication.EmailDeliveryStatusUpdated
      for (const event of events || []) {
        if (event.eventType === "Microsoft.Communication.EmailDeliveryStatusUpdated") {
          const { messageId, status, recipient } = event.data;
          console.log(`[Email Webhook] Status for ${messageId} to ${recipient}: ${status}`);
          
          // Find the application by messageId in global applications collection
          const appsRef = dbAdmin.collection('applications');
          const qSnapshot = await appsRef.where('messageId', '==', messageId).limit(1).get();
          
          if (!qSnapshot.empty) {
            const appDoc = qSnapshot.docs[0];
            const appData = appDoc.data();
            
            // Update global record
            await appDoc.ref.update({
              deliveryStatus: status.toLowerCase(), // 'delivered', 'failed', etc.
              updatedAt: admin.firestore.Timestamp.now()
            });

            // Also update the user-specific record
            if (appData.userId) {
              await dbAdmin
                .collection('users')
                .doc(appData.userId)
                .collection('applications')
                .doc(appDoc.id)
                .update({
                  deliveryStatus: status.toLowerCase(),
                  updatedAt: admin.firestore.Timestamp.now()
                });
            }
          }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Mock Job Data
  app.get("/api/jobs", (req, res) => {
    res.json([
      {
        id: "1",
        title: "Senior AI Software Architect",
        company: "TechNexus AI",
        location: "San Francisco, CA",
        country: "USA",
        city: "San Francisco",
        remote: true,
        salary: { min: 180000, max: 250000, currency: "USD", type: "annual" },
        description: "Lead the design and implementation of production-grade AI platforms.",
        skills: ["Python", "PyTorch", "Azure OpenAI", "Next.js"],
        source: "LinkedIn",
        url: "https://linkedin.com/jobs/1",
        postedAt: "2026-04-06T10:00:00Z",
        detectedAt: "2026-04-06T10:15:00Z",
        matchScore: 95
      },
      {
        id: "2",
        title: "Full-Stack Cloud Engineer",
        company: "CloudScale Solutions",
        location: "London, UK",
        country: "UK",
        city: "London",
        remote: false,
        salary: { min: 90000, max: 130000, currency: "GBP", type: "annual" },
        description: "Build scalable microservices on Azure and Google Cloud.",
        skills: ["TypeScript", "Node.js", "Azure Functions", "PostgreSQL"],
        source: "Indeed",
        url: "https://indeed.com/jobs/2",
        postedAt: "2026-04-06T09:30:00Z",
        detectedAt: "2026-04-06T09:45:00Z",
        matchScore: 82
      },
      {
        id: "3",
        title: "Machine Learning Specialist",
        company: "DataMind Corp",
        location: "Remote",
        country: "Global",
        city: "Remote",
        remote: true,
        salary: { min: 150000, max: 220000, currency: "USD", type: "annual" },
        description: "Develop advanced ML models for predictive analytics.",
        skills: ["TensorFlow", "Scikit-learn", "Python", "MLOps"],
        source: "Glassdoor",
        url: "https://glassdoor.com/jobs/3",
        postedAt: "2026-04-06T08:00:00Z",
        detectedAt: "2026-04-06T08:15:00Z",
        matchScore: 78
      }
    ]);
  });

  // Microsoft OAuth Routes
  app.get("/api/auth/microsoft/url", (req, res) => {
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.APP_URL}/api/auth/microsoft/callback`;

    if (!clientId) {
      return res.status(400).json({ error: "MICROSOFT_CLIENT_ID is not configured in environment variables." });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "https://graph.microsoft.com/Mail.Send offline_access",
    });

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ url });
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("No authorization code received");
    }

    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.APP_URL}/api/auth/microsoft/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).send("Microsoft OAuth is not fully configured (missing Client ID or Secret).");
    }

    try {
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const data: any = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(data.error_description || "Failed to exchange code for tokens");
      }

      const { refresh_token } = data;

      // In a real app, we'd save this to Firestore for the user.
      // Since we don't have the userId here easily (unless passed in state),
      // we'll return it to the client to be saved via the frontend updateProfile.
      // However, for security, it's better to handle it server-side.
      // For now, we'll send a success page that posts the refresh_token back to the opener.
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  refreshToken: '${refresh_token}' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful! This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Microsoft OAuth Callback Error:", error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  app.post("/api/mail/send", async (req, res) => {
    const { email, content, subject, refreshToken, useAcs = false, replyTo } = req.body;
    
    // Preference: Use ACS if requested and available
    if ((useAcs || !refreshToken) && acsEmailClient) {
      try {
        const senderAddress = process.env.ACS_SENDER_ADDRESS || "DoNotReply@yourverifieddomain.com";
        const emailMessage = {
          senderAddress: senderAddress,
          content: {
            subject: subject || "AI Job Application",
            plainText: content,
          },
          recipients: {
            to: [{ address: email }],
          },
          replyTo: replyTo ? [{ address: replyTo }] : []
        };

        const poller = await acsEmailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        
        return res.json({ 
          success: true, 
          messageId: result.id,
          provider: "ACS",
          status: result.status 
        });
      } catch (error: any) {
        console.error("ACS Mail Error:", error);
        return res.status(500).json({ error: error.message });
      }
    }

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Microsoft OAuth is not fully configured." });
    }

    try {
      // 1. Get Access Token from Refresh Token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "https://graph.microsoft.com/.default",
        }),
      });

      const tokenData: any = await tokenResponse.json();
      if (!tokenResponse.ok) {
        if (tokenData.error === "invalid_grant") {
          throw new Error("INVALID_REFRESH_TOKEN");
        }
        throw new Error(tokenData.error_description || "Failed to refresh token");
      }

      const accessToken = tokenData.access_token;

      // 2. Send Email via Microsoft Graph
      const mailResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: subject || "AI Job Application",
            body: {
              contentType: "Text",
              content: content,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: email,
                },
              },
            ],
          },
        }),
      });

      if (!mailResponse.ok) {
        const errorData = await mailResponse.json();
        throw new Error(errorData.error?.message || "Failed to send email");
      }

      res.json({ 
        success: true, 
        message: "Email sent successfully",
        provider: "MicrosoftGraph",
        messageId: mailResponse.headers.get("client-request-id")
      });
    } catch (error: any) {
      console.error("Send Mail Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
