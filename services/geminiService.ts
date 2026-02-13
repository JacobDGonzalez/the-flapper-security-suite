
import { GoogleGenAI, Type } from "@google/genai";
import { EducationalContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSecurityExplanation = async (topic: string): Promise<EducationalContent> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Explain the security risks associated with "${topic}" for a desktop computer. 
      Specifically discuss how tools like Flipper Zero or BadUSB might exploit this. 
      Keep it educational but concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            technicalDetails: { type: Type.STRING },
            remediationSteps: { type: Type.STRING },
          },
          required: ["title", "summary", "technicalDetails", "remediationSteps"],
        },
      },
    });

    return JSON.parse(response.text || '{}') as EducationalContent;
  } catch (error) {
    console.error("Gemini Education Failed:", error);
    return {
      title: topic,
      summary: "Security explanation unavailable offline.",
      technicalDetails: "Error connecting to security intelligence database.",
      remediationSteps: "Manually review system security documentation."
    };
  }
};
