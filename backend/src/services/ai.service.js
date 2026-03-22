const Groq = require('groq-sdk');
const config = require('../config/env');

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient && config.groq.apiKey) {
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClient;
};

/**
 * AI Retry Helper with Timeout (Task 4)
 */
const withRetry = async (fn, retries = 2, timeoutMs = 5000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs)
      );
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      if (i === retries) throw error;
      console.warn(`AI Retry ${i+1}/${retries} failed: ${error.message}`);
      await new Promise(r => setTimeout(r, 1000)); // wait before retry
    }
  }
};

/**
 * Summarize a notification for push messages
 */
const summarizeNotification = async (content) => {
  try {
    const client = getGroqClient();
    if (!client) {
      console.warn('⚠️ GROQ API key not configured, skipping summarization');
      return content.substring(0, 100) + '...';
    }

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes campus announcements. Provide clear, concise summaries under 50 words for mobile push notifications. Be direct and actionable.',
        },
        {
          role: 'user',
          content: `Summarize this campus announcement for a mobile push notification (under 50 words):\n\n${content}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content || content.substring(0, 100);
  } catch (error) {
    console.error('AI summarization error:', error.message);
    return content.substring(0, 100) + '...';
  }
};

/**
 * Classify a complaint using AI
 * Returns: { category, priority, department, sentiment }
 */
const classifyComplaint = async (title, description) => {
  try {
    const client = getGroqClient();
    if (!client) {
      console.warn('⚠️ GROQ API key not configured, skipping classification');
      return {
        category: 'other',
        priority: 'medium',
        department: 'general',
        sentiment: 'neutral',
      };
    }

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a campus complaint analysis AI. Analyze the complaint and return ONLY a JSON object with these fields:
{
  "category": "infrastructure|academic|hostel|transport|canteen|it_services|library|other",
  "priority": "low|medium|high|critical",
  "department": "suggested department name",
  "sentiment": "positive|neutral|negative"
}
Return ONLY the JSON, no other text.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      category: 'other',
      priority: 'medium',
      department: 'general',
      sentiment: 'neutral',
    };
  } catch (error) {
    console.error('AI classification error:', error.message);
    return {
      category: 'other',
      priority: 'medium',
      department: 'general',
      sentiment: 'neutral',
    };
  }
};

/**
 * Analyze text sentiment
 */
const analyzeSentiment = async (text) => {
  try {
    const client = getGroqClient();
    if (!client) return 'neutral';

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the following text. Return ONLY one word: positive, neutral, or negative.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const result = completion.choices[0]?.message?.content?.toLowerCase().trim();
    return ['positive', 'neutral', 'negative'].includes(result) ? result : 'neutral';
  } catch (error) {
    console.error('Sentiment analysis error:', error.message);
    return 'neutral';
  }
};

/**
 * Assess similarity between two lost/found items
 * Returns: score (0.0 to 1.0)
 */
const assessItemSimilarity = async (item1, item2) => {
  try {
    const client = getGroqClient();
    if (!client) return 0.5;

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert at matching lost and found items. Compare two items and return a similarity score between 0.0 and 1.0. 
1.0 means it is definitely the same item. 
0.0 means they are completely different.
Return ONLY a JSON object: {"score": 0.XX}`,
        },
        {
          role: 'user',
          content: `Item 1: ${item1.title} - ${item1.description}\nItem 2: ${item2.title} - ${item2.description}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return parseFloat(data.score) || 0;
    }

    return 0;
  } catch (error) {
    console.error('AI similarity assessment error:', error.message);
    return 0;
  }
};

/**
 * Verify ID card image using AI
 * Extracts name, department, and roll number
 */
const verifyIDCard = async (imageUrl) => {
  try {
    const client = getGroqClient();
    if (!client) return null;

    return await withRetry(async () => {
      const completion = await client.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI specialized in extracting information from ID cards. 
Look at the text in the image and extract the following fields in JSON format:
{
  "name": "full name of the person",
  "department": "department name",
  "rollNumber": "roll number or ID number",
  "confidenceScore": 0.XX (estimate how clear the data is from 0 to 1)
}
If a field is not found, use null. Return ONLY the JSON object.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract information from this ID card image:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    });
  } catch (error) {
    console.error('AI ID Verification error:', error.message);
    return null;
  }
};

module.exports = {
  summarizeNotification,
  classifyComplaint,
  analyzeSentiment,
  assessItemSimilarity,
  verifyIDCard,
};
