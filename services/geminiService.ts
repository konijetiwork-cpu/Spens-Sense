
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Parses financial SMS alerts using Gemini AI.
 * Handles diverse formats like "Spent on", "Charged to", "Credited with", "Received from", etc.
 */
export const parseSmsWithGemini = async (smsText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  console.debug("[GeminiService] Processing SMS:", smsText);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a specialized financial data extractor. Analyze the following banking/SMS notification and extract transaction details.
      
      RULES:
      - 'amount' must be a clean number (remove commas and currency symbols).
      - 'type' must be 'DEBIT' (for spending/outgoing) or 'CREDIT' (for receiving/incoming).
      - 'date' should be in YYYY-MM-DD format. If year is missing, assume the current year (2025).
      - 'merchant' is the person, shop, or entity involved in the transaction.
      - 'bankName' is the financial institution (e.g., HDFC, SBI, ICICI, PayPal).
      - 'refNo' is the transaction ID, UPI ID, or reference code.
      - 'suggestedPurpose' is a short 2-3 word category for the spend (e.g., Food, Salary, Utilities).

      SMS Text: "${smsText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { 
              type: Type.NUMBER,
              description: "Numeric value of the transaction."
            },
            type: { 
              type: Type.STRING, 
              enum: ['DEBIT', 'CREDIT'],
              description: "Direction of the money flow."
            },
            date: { 
              type: Type.STRING,
              description: "ISO date format YYYY-MM-DD."
            },
            merchant: { 
              type: Type.STRING,
              description: "Entity where the transaction occurred."
            },
            bankName: { 
              type: Type.STRING,
              description: "Name of the bank or wallet provider."
            },
            refNo: { 
              type: Type.STRING,
              description: "Unique reference identifier found in the SMS."
            },
            suggestedPurpose: { 
              type: Type.STRING,
              description: "AI-suggested category for this transaction."
            }
          },
          required: ["amount", "type", "date", "merchant", "bankName", "refNo", "suggestedPurpose"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini AI");
    }

    const parsedData = JSON.parse(resultText.trim());
    console.debug("[GeminiService] Successfully parsed data:", parsedData);
    
    return parsedData;

  } catch (error) {
    console.error("[GeminiService] Critical error parsing SMS:", {
      message: error instanceof Error ? error.message : "Unknown error",
      sms: smsText,
      error
    });
    
    // Return null to allow the application to handle the failure gracefully
    return null;
  }
};
