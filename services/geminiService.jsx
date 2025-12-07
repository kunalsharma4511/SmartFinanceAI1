
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get API key
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY not found in environment variables");
    return "";
  }
  return key;
};

// Define the schema for the analysis result
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD format" },
          description: { type: Type.STRING, description: "Description or merchant name" },
          amount: { type: Type.NUMBER, description: "Absolute amount of the transaction" },
          category: { type: Type.STRING, description: "Category like Food, Transport, Salary, Utilities, etc." },
          type: { type: Type.STRING, enum: ["income", "expense"] },
        },
        required: ["date", "description", "amount", "category", "type"],
      },
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        totalIncome: { type: Type.NUMBER },
        totalExpense: { type: Type.NUMBER },
        netSavings: { type: Type.NUMBER },
        topSpendingCategories: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              amount: { type: Type.NUMBER },
            },
          },
        },
        advice: { type: Type.STRING, description: "A brief paragraph of financial advice based on the data." },
      },
    },
  },
  required: ["transactions", "summary"],
};

export const analyzeBankStatement = async (fileBase64, mimeType) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  // Use Flash for document extraction efficiency
  const modelId = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: "Analyze this bank statement. Extract all transactions into a structured JSON format. Categorize each transaction intelligently. Provide a summary of income, expenses, and savings, along with top spending categories and a piece of brief financial advice.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export class FinanceChatService {
  constructor(transactions) {
    const apiKey = getApiKey();
    this.ai = new GoogleGenAI({ apiKey });
    
    // Prepare context from transactions
    const contextData = JSON.stringify(transactions.slice(0, 100)); // Limit context size slightly if huge
    const summary = transactions.length > 0 
      ? `User has ${transactions.length} transactions uploaded.` 
      : "User has not uploaded any statements yet.";

    // Use Gemini 3 Pro Preview for reasoning and chat
    this.chatSession = this.ai.chats.create({
      model: "gemini-2.5-preview",
      config: {
        systemInstruction: `You are an expert financial assistant. 
        You have access to the user's bank transaction data provided here as context: ${contextData}.
        ${summary}
        
        Your goals:
        1. Help the user understand their spending habits.
        2. Provide actionable advice on how to save money.
        3. Answer specific questions about dates, amounts, and merchants.
        4. Be encouraging but realistic about financial health.
        
        Format your responses nicely using Markdown. If asked about data you don't have, politely say so.`,
      },
    });
  }

  async sendMessage(message) {
    try {
      const response = await this.chatSession.sendMessage({ message });
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  }
}
