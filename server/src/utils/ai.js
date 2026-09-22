const axios = require('axios');

async function analyzeLogsForAnomalies(logs) {
  if (!logs || logs.length === 0) return [];

  const apiKey = process.env.AI_JUDGE;
  if (!apiKey) {
    console.warn('AI_JUDGE API key not configured, skipping AI detection.');
    return [];
  }

  // Define standard working hours for context
  const systemPrompt = `You are a strict Cybersecurity Threat Detection AI for an enterprise blockchain document management system. 
Your job is to analyze a batch of 'DOCUMENT_VIEWED' logs and identify highly suspicious behavior.

RULES:
1. Normal business hours are 08:00 to 18:00 (8 AM to 6 PM) in the system's local timezone (assume logs are UTC, but users might be in various timezones. For simplicity, consider views between 00:00 UTC and 04:00 UTC, or views extremely late at night in local terms, as potentially suspicious). 
2. A single view out of hours is a LOW or MEDIUM severity anomaly.
3. Rapid succession of views (e.g. same user viewing 5+ different documents in 1 minute) is a HIGH or CRITICAL severity anomaly (indicates data scraping).
4. If no anomalies are found, return an empty JSON array [].
5. You must output ONLY valid JSON, with NO markdown formatting or explanation text. 

JSON FORMAT:
[
  {
    "wallet": "user_wallet_address",
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "reason": "Detailed explanation of why this was flagged"
  }
]
`;

  const userPrompt = `Here are the recent access logs (last 5 minutes):\n\n${JSON.stringify(logs, null, 2)}`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct:free', // Fast and free for background tasks
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'IdentiChain'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    let parsed = [];
    try {
      // In case the AI still wraps it in markdown despite instructions
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return [];
    }

    // Ensure it's an array
    if (!Array.isArray(parsed)) {
      if (parsed.anomalies && Array.isArray(parsed.anomalies)) return parsed.anomalies;
      return [parsed];
    }
    return parsed;
  } catch (error) {
    console.error('OpenRouter AI Error:', error.response?.data || error.message);
    return [];
  }
}

module.exports = { analyzeLogsForAnomalies };
