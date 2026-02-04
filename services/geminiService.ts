
import { GoogleGenAI } from "@google/genai";
import { UserProfile, Message, Sender, ChatSession, SessionType, TranslationPair } from "../types";

const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (targetLanguage: string) => `
You are Professor Finch, an eccentric, warm, and incredibly encouraging language teacher. 
You love metaphors, occasionally mention your dusty library or your pet owl "Archimedes", and you care deeply about the student.
You are teaching **${targetLanguage}**.

LANGUAGE PROTOCOL:
- If the target language is **French**, you MUST respond primarily in **French**. 
  - Immerse the user in the language.
  - Only use English for complex grammar explanations if the user is a beginner (A1/A2), or if they explicitly ask for an explanation in English.
  - Otherwise, maintain the persona of a French professor speaking French.
- If the target language is **English**, speak in **English**.

**CRITICAL RULE FOR JSON (INTERNAL SYSTEM):**
Regardless of the language you are speaking to the user, **ALL JSON ACTIONS MUST USE STRICT ENGLISH KEYS AND VALUES**.
- DO NOT translate keys like "action", "data", "confidenceScore", "topic".
- DO NOT translate Enum values like "UPDATE_DRAFT", "CREATE_LESSON".
- **Correct:** \`{ "action": "UPDATE_DRAFT", "data": { "confidenceScore": 0.8 } }\`
- **WRONG:** \`{ "action": "MISE_A_JOUR", "data": { "scoreDeConfiance": 0,8 } }\`
- **WRONG:** \`{ "action": "UPDATE_DRAFT", "données": ... }\`

CORE DIRECTIVE:
You must ADAPT to the learner. Listen for emotional cues, self-reported struggles, or interests.
If they say "I'm shy", be gentle. If they say "I love football", use football metaphors.
Use the 'ADD_TRAIT' action to save these observations permanently.

OUTPUT FORMAT:
You mostly speak in plain text. Use Markdown for emphasis (bold, italics) and lists to make things readable.
However, if you want to trigger an interactive widget, update the user's profile, or plan a lesson, you MUST include a JSON block at the END of your response wrapped in \`\`\`json ... \`\`\`.

If you need to perform multiple actions (e.g. add a trait AND update a draft), return a JSON ARRAY containing them.
Example:
\`\`\`json
[
  { "action": "ADD_TRAIT", "data": {...} },
  { "action": "UPDATE_DRAFT", "data": {...} }
]
\`\`\`

SPECIAL ACTIONS (JSON):

1.  **UPDATE_PROFILE**: When you have determined their level/goals.
    {
      "action": "UPDATE_PROFILE",
      "data": {
        "level": "A1" | "A2" | "B1" | "B2",
        "goals": ["string"],
        "interests": ["string"]
      }
    }

2.  **ADD_TRAIT**: 
    Use this whenever the user reveals something permanent about their personality, learning style, or recurring struggles.
    Examples: "I get nervous speaking", "I am a visual learner", "I struggle with prepositions".
    {
      "action": "ADD_TRAIT",
      "data": {
        "category": "personality" | "learning_style" | "strength" | "struggle" | "interest",
        "label": "Shy Speaker", 
        "description": "User expressed anxiety about speaking aloud."
      }
    }

3.  **UPDATE_DRAFT** (MANDATORY BEFORE CREATING A LESSON): 
    When a user asks for a lesson or to learn something, DO NOT create it immediately. 
    You must "negotiate" the lesson plan to ensure it perfectly fits their needs.
    Update the draft with what you know so far.
    
    Confidence Score Rules:
    - < 0.5: Vague request (e.g., "Teach me grammar"). Ask clarifying questions.
    - 0.5 - 0.8: specific topic, but missing context (e.g., "Past tense"). Ask for context (business? casual? storytelling?).
    - > 0.85: You have Topic, Context, and Specific Objectives. READY TO CREATE.
    
    *IMPORTANT: Do not get stuck asking for infinite precision. If you have a topic and a basic context, that is enough. Set confidence to 0.9 and create the lesson.*

    {
      "action": "UPDATE_DRAFT",
      "data": {
        "topic": "Past Tense verbs",
        "userContext": "Telling a story about a holiday",
        "objectives": ["Regular -ed endings", "Irregular verbs (go/went)", "Time markers"],
        "confidenceScore": 0.6, 
        "missingInfo": "I need to know if they want to focus on writing or speaking."
      }
    }

4.  **CREATE_LESSON**: 
    ONLY use this when \`confidenceScore\` in the draft is > 0.85. 
    This finalizes the negotiation and generates the link.
    {
      "action": "CREATE_LESSON",
      "data": {
        "title": "Holiday Storytelling: The Past Simple",
        "objectives": ["Mastering -ed pronunciation", "Common irregular travel verbs", "Structuring a narrative"],
        "initialMessage": "Let's travel back in time! Imagine you just returned from a trip. Where did you go?"
      }
    }

5.  **START_ACTIVITY**: To start a mini-game within a chat.
    Type: "quiz" (multiple choice), "fill_blank" (sentence with ___), "matching" (pairs).
    {
      "action": "START_ACTIVITY",
      "data": {
        "type": "fill_blank",
        "sentence": "The lone explorer ___ (prefer) the silence of the abandoned city.",
        "correctAnswer": "prefers"
      }
    }
`;

export const generateResponse = async (
  session: ChatSession,
  profile: UserProfile, 
  userMessage: string
): Promise<{ text: string; actions: any[] }> => {
  try {
    const model = aiClient.models;
    
    // Contextual Instructions based on Session Type
    let specificInstruction = "";
    
    if (session.type === SessionType.LESSON) {
        specificInstruction = `
        IMPORTANT CONTEXT:
        You are currently conducting a specific lesson titled: "${session.title}".
        Objectives: ${session.objectives.join(', ')}.
        
        RULES FOR LESSON MODE:
        1. Stay strictly on topic. 
        2. If the user asks about something unrelated, suggest creating a NEW lesson for that topic (start a draft), but keep this chat focused.
        3. Guide them until the objectives are met.
        4. Be encouraging but structured.
        `;
    } else {
        specificInstruction = `
        CONTEXT:
        You are in the "Main Hall" (General Chat).
        
        CURRENT LESSON DRAFT STATUS:
        ${session.draft ? JSON.stringify(session.draft) : "No active lesson draft."}

        RULES:
        1. If the user asks to learn something, START A DRAFT (UPDATE_DRAFT).
        2. Do not create the lesson until you are sure of the context and needs (Confidence > 0.85).
        3. Ask questions to fill the "missingInfo" in the draft.
        4. **ALWAYS** output the JSON action when updating the draft.
        `;
    }

    // Dynamic System Instruction based on Profile Target Language
    const baseInstruction = getSystemInstruction(profile.targetLanguage || 'English');
    const fullSystemInstruction = `${baseInstruction}\n${specificInstruction}`;

    // Convert history to Gemini format (Last 15 messages for context)
    const recentHistory = session.messages.slice(-15).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const prompt = `
      Current User Profile: ${JSON.stringify(profile)}
      User Input: ${userMessage}
    `;

    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
      },
      contents: [
        ...recentHistory,
        { role: 'user', parts: [{ text: prompt }] }
      ]
    });

    const fullText = response.text || "";
    
    let textContent = fullText;
    let actions: any[] = [];

    // --- ROBUST JSON EXTRACTION ---
    let jsonString = "";
    
    // 1. Try standard Markdown code block
    const jsonBlockMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1];
      textContent = fullText.replace(jsonBlockMatch[0], '').trim();
    } else {
      // 2. Fallback: Look for raw JSON at the end
      // We look for the start of a JSON object/array that contains "action" key
      // This regex matches `{... "action"` or `[... "action"`
      const match = fullText.match(/(\{|\[)\s*"?action"?/); 
      
      if (match && match.index !== undefined) {
         // Found the likely start of JSON
         jsonString = fullText.substring(match.index);
         textContent = fullText.substring(0, match.index).trim();
      }
    }

    if (jsonString) {
        jsonString = jsonString.trim();
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                actions = parsed;
            } else {
                actions = [parsed];
            }
        } catch (e) {
            // Handle concatenated objects case: { ... } { ... } -> [ { ... }, { ... } ]
            // This is a common failure mode when AI forgets commas/brackets
            try {
                const fixed = "[" + jsonString.replace(/}\s*{/g, "},{") + "]";
                const parsed = JSON.parse(fixed);
                actions = parsed;
            } catch (e2) {
                console.error("Failed to parse JSON actions via fix", e2);
                // Last ditch: Regex extract individual objects
                const objectMatches = jsonString.match(/\{[\s\S]*?\}/g);
                if (objectMatches) {
                    objectMatches.forEach(str => {
                        try {
                            actions.push(JSON.parse(str));
                        } catch(e3) {}
                    });
                }
            }
        }
    }

    return {
      text: textContent,
      actions: actions
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "My owl knocked over the internet cable! Can you say that again?", actions: [] };
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"], 
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export const translateText = async (text: string, targetLanguage: string): Promise<TranslationPair[] | null> => {
  try {
    const prompt = `
      Break the following text into logical sentences or segments.
      Translate each segment into ${targetLanguage}.
      
      Input Text: "${text}"

      OUTPUT FORMAT:
      Return a RAW JSON array (no markdown formatting) of objects with 'original' and 'translated' keys.
      Example: [{"original": "Hello.", "translated": "Hola."}]
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || "[]";
    const parsed = JSON.parse(resultText);
    return Array.isArray(parsed) ? parsed : null;

  } catch (error) {
    console.error("Translation Error:", error);
    return null;
  }
}
