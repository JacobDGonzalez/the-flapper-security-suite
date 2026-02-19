// import { GoogleGenAI, Type } from "@google/genai";
import { EducationalContent } from "../types";

// const ai = new GoogleGenAI({
//   apiKey: import.meta.env.VITE_GEMINI_API_KEY,
// });

// export const getSecurityExplanation = async (
//   topic: string
// ): Promise<EducationalContent> => {
//   try {
//     const response = await ai.models.generateContent({
//       model: "gemini-2.0-flash",
//       contents: [
//         {
//           role: "user",
//           parts: [
//             {
//               text: `Explain the security risks associated with "${topic}" for a desktop computer.
// Specifically discuss how tools like Flipper Zero or BadUSB might exploit this.
// Keep it educational but concise.`,
//             },
//           ],
//         },
//       ],
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: Type.OBJECT,
//           properties: {
//             title: { type: Type.STRING },
//             summary: { type: Type.STRING },
//             technicalDetails: { type: Type.STRING },
//             remediationSteps: { type: Type.STRING },
//           },
//           required: ["title", "summary", "technicalDetails", "remediationSteps"],
//         },
//       },
//     });

//     return JSON.parse(response.text || "{}") as EducationalContent;
//   } catch (error) {
//     console.error("Gemini Education Failed:", error);
//     return {
//       title: topic,
//       summary: "Security explanation unavailable offline.",
//       technicalDetails: "Error connecting to security intelligence database.",
//       remediationSteps: "Manually review system security documentation.",
//     };
//   }
// };

// all the above is using the actual API, but for demo purposes we can just return static content without making the API call. This way we can avoid issues with API keys and rate limits during development.

export const getSecurityExplanation = async (
  topic: string
): Promise<EducationalContent> => {
  return {
    title: topic,
    summary: `Demo summary about ${topic}.`,
    technicalDetails: `Demo technical details for ${topic}.`,
    remediationSteps: `Demo remediation steps for ${topic}.`,
  };
};
