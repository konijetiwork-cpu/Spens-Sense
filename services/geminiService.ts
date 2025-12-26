
import { GoogleGenAI, Type } from "@google/genai";

export const parseSmsWithGemini = async (smsText: string) => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract banking details from this SMS into JSON:
      1. amount (number)
      2. type (DEBIT or CREDIT)
      3. date (YYYY-MM-DD)
      4. merchant (source/destination)
      5. bankName (e.g. HDFC, SBI)
      6. refNo (Reference or Transaction ID)
      7. suggestedPurpose (brief category)
      
      SMS: "${smsText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['DEBIT', 'CREDIT'] },
            date: { type: Type.STRING },
            merchant: { type: Type.STRING },
            bankName: { type: Type.STRING },
            refNo: { type: Type.STRING },
            suggestedPurpose: { type: Type.STRING }
          },
          required: ["amount", "type", "date", "merchant", "bankName", "refNo", "suggestedPurpose"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
