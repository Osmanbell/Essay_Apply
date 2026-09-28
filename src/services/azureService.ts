/**
 * Azure Service Integration
 * Handles communication with Azure AI Search and Azure Functions.
 */

export const AzureService = {
  /**
   * Search for jobs using Azure AI Search (Semantic/Vector Search)
   */
  async searchJobs(query: string, cvProfile?: any) {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.AZURE_SEARCH_KEY;
    const indexName = process.env.AZURE_SEARCH_INDEX;

    if (!endpoint || !apiKey) {
      console.warn('Azure Search credentials not configured. Falling back to mock search.');
      return null;
    }

    try {
      const response = await fetch(`${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          search: query,
          select: '*',
          top: 10,
          // If cvProfile is provided, we could use it for vector search or filtering
          filter: cvProfile ? `careerLevel eq '${cvProfile.careerLevel}'` : undefined,
        }),
      });

      if (!response.ok) throw new Error('Azure Search request failed');
      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Azure Search Error:', error);
      return null;
    }
  },

  /**
   * Trigger Azure Functions for backend microservices (e.g., job aggregation, auto-apply)
   */
  async triggerFunction(functionName: string, payload: any) {
    const baseUrl = process.env.AZURE_FUNCTIONS_BASE_URL;
    
    if (!baseUrl) {
      console.warn('Azure Functions Base URL not configured.');
      return null;
    }

    try {
      const response = await fetch(`${baseUrl}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Azure Function ${functionName} failed`);
      return await response.json();
    } catch (error) {
      console.error(`Azure Function Error (${functionName}):`, error);
      return null;
    }
  }
};
