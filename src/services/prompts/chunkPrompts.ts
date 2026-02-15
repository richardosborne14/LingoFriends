/**
 * LingoFriends - Chunk Generation Prompts
 * 
 * AI prompt templates for generating lexical chunks on-demand.
 * These prompts follow the pedagogical framework in chunk-generation-framework.md
 * and implement the Lexical Approach principles from PEDAGOGY.md.
 * 
 * @module chunkPrompts
 * @see docs/phase-1.2/chunk-generation-framework.md
 */

import { ChunkType } from '../../types/pedagogy';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Request for chunk generation.
 * Contains all context needed to generate personalized chunks.
 */
export interface ChunkGenerationRequest {
  /** Target language: 'en' | 'de' */
  targetLanguage: string;
  
  /** Native language (UI language): 'fr' */
  nativeLanguage: string;
  
  /** Age group: '7-10' | '11-14' | '15-18' */
  ageGroup: string;
  
  /** Current CEFR level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' */
  cefrLevel: string;
  
  /** Internal level 0-100 */
  internalLevel: number;
  
  /** Difficulty level 1-5 */
  difficulty: number;
  
  /** Topic/theme derived from interests */
  topic: string;
  
  /** User interests from onboarding */
  interests: string[];
  
  /** User-provided context (e.g., "My dog is Max") */
  userContext?: string;
  
  /** Chunk types needed */
  chunkTypes: ChunkType[];
  
  /** Number of chunks to generate */
  count: number;
  
  /** Chunks already seen by user (to avoid duplicates) */
  excludeChunkTexts?: string[];
  
  /** Force new generation (skip cache) */
  forceNew?: boolean;
}

/**
 * Generated chunk from AI.
 * The raw output from Groq that needs to be validated and stored.
 */
export interface GeneratedChunk {
  /** The chunk text in the target language */
  text: string;
  
  /** Translation in the native language */
  translation: string;
  
  /** Type of chunk */
  chunkType: ChunkType | string;
  
  /** Difficulty level 1-5 */
  difficulty: number;
  
  /** Usage notes or tips */
  notes?: string;
  
  /** Cultural context notes */
  culturalContext?: string;
  
  /** For frames: variable slots */
  slots?: Array<{
    position: number;
    placeholder: string;
    type: string;
    examples: string[];
  }>;
  
  /** Age-appropriate ranges */
  ageAppropriate: string[];
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * System prompt for chunk generation.
 * 
 * This prompt establishes the AI as an expert language teacher following
 * the Lexical Approach methodology. It sets the fundamental rules for
 * generating high-quality, natural chunks.
 */
export const CHUNK_GENERATION_SYSTEM_PROMPT = `You are an expert language teacher creating learning content for children. You follow the Lexical Approach: teaching whole phrases (chunks) that native speakers use naturally, not isolated words or grammar rules.

Your task is to generate language learning chunks for French-speaking children learning the target language.

CORE PRINCIPLES:
1. Chunks must be NATURAL - what native speakers actually say in casual conversation
2. Chunks must be USEFUL - learners can use them in real life immediately
3. Chunks must be AGE-APPROPRIATE - suitable for the specified age group
4. Difficulty must MATCH the specified level exactly
5. Connect chunks to the learner's INTERESTS when possible
6. For sentence frames, provide 5-10 example slot fillers

WHAT TO AVOID:
- Textbook phrases that sound unnatural
- Overly formal language for young learners
- Long, complex chunks for beginners
- Abstract concepts for younger children
- Literal translations that don't capture natural expression

OUTPUT FORMAT: Return a JSON object with a "chunks" array. Each chunk has:
- text: The chunk in the target language
- translation: French translation (natural, not literal)
- chunkType: "polyword" | "collocation" | "utterance" | "frame"
- difficulty: 1-5 (must match the requested level)
- notes: Usage notes, when to use, tips (1-2 sentences)
- culturalContext: Optional cultural notes if relevant
- slots: (only for "frame" type) array of {position, placeholder, type, examples}
- ageAppropriate: array of age groups this is suitable for ["7-10", "11-14", "15-18"]`;

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build the user prompt for chunk generation.
 * 
 * This creates a detailed prompt incorporating:
 * - Learner profile (age, level, interests)
 * - Topic context
 * - Difficulty criteria
 * - Chunk type requirements
 * - Exclusions (already seen chunks)
 * 
 * @param request - The chunk generation request
 * @returns Formatted prompt string
 */
export function buildChunkPrompt(request: ChunkGenerationRequest): string {
  const difficultyCriteria = getDifficultyCriteria(request.difficulty);
  const ageCriteria = getAgeCriteria(request.ageGroup);
  const chunkTypeDesc = request.chunkTypes.map(describeChunkType).join('\n');
  
  // Build the prompt sections
  const sections: string[] = [];
  
  sections.push(`Generate ${request.count} language learning chunks for:`);
  sections.push('');
  sections.push(`TARGET LANGUAGE: ${request.targetLanguage.toUpperCase()}`);
  sections.push(`NATIVE LANGUAGE: ${request.nativeLanguage.toUpperCase()} (for translations)`);
  sections.push(`TOPIC: ${request.topic}`);
  sections.push(`DIFFICULTY: ${request.difficulty} (${difficultyCriteria.title})`);
  sections.push('');
  
  // Learner profile section
  sections.push('LEARNER PROFILE:');
  sections.push(`- Age group: ${request.ageGroup}`);
  sections.push(`- Current level: ${request.cefrLevel} (internal: ${request.internalLevel}/100)`);
  sections.push(`- Interests: ${request.interests.join(', ')}`);
  if (request.userContext) {
    sections.push(`- Personal context: ${request.userContext}`);
  }
  sections.push('');
  
  // Chunk types needed
  sections.push('CHUNK TYPES NEEDED:');
  sections.push(chunkTypeDesc);
  sections.push('');
  
  // Difficulty criteria
  sections.push(`DIFFICULTY CRITERIA FOR LEVEL ${request.difficulty}:`);
  sections.push(difficultyCriteria.description);
  sections.push('');
  
  // Age appropriateness
  sections.push(`AGE APPROPRIATENESS FOR ${request.ageGroup}:`);
  sections.push(ageCriteria);
  sections.push('');
  
  // Exclude already seen
  if (request.excludeChunkTexts && request.excludeChunkTexts.length > 0) {
    sections.push('ALREADY SEEN (avoid these exact phrases):');
    // Limit to avoid overwhelming the prompt
    const exclusions = request.excludeChunkTexts.slice(0, 15);
    sections.push(exclusions.map(t => `- "${t}"`).join('\n'));
    sections.push('');
  }
  
  // Final instruction
  sections.push('Return a JSON object with a "chunks" array. Make the chunks natural, useful, and engaging for this specific learner!');
  
  return sections.join('\n');
}

/**
 * Get difficulty criteria for a given level.
 * These criteria define what makes a chunk appropriate for each level.
 * 
 * @param level - Difficulty level 1-5
 * @returns Criteria with title and description
 */
export function getDifficultyCriteria(level: number): { title: string; description: string } {
  const criteria: Record<number, { title: string; description: string }> = {
    1: {
      title: 'Beginner (A1)',
      description: `- Length: 2-4 words
- Grammar: Present tense only, no subjunctive, simple structures
- Vocabulary: High-frequency, concrete, everyday essentials
- Pragmatics: Survival phrases, greetings, basic needs
- Examples: "Guten Tag", "Ich heiße...", "Wie viel kostet das?"`,
    },
    2: {
      title: 'Elementary (A2)',
      description: `- Length: 3-6 words
- Grammar: Present tense, simple past (Perfekt), modal verbs
- Vocabulary: Common daily situations, social interactions
- Pragmatics: Making requests, expressing preferences, asking questions
- Examples: "Ich möchte gerne...", "Wo ist die Toilette?", "Kannst du mir helfen?"`,
    },
    3: {
      title: 'Intermediate (B1)',
      description: `- Length: 4-8 words
- Grammar: All tenses, some subordinate clauses, conditional basics
- Vocabulary: Abstract concepts, opinions, explanations
- Pragmatics: Discussion, expressing opinions, narrating experiences
- Examples: "Ich denke, dass...", "Das liegt daran, dass...", "Würdest du mir sagen, ob...?"`,
    },
    4: {
      title: 'Upper-Intermediate (B2)',
      description: `- Length: 6-10 words
- Grammar: Subjunctive, complex structures, passive voice
- Vocabulary: Idiomatic expressions, nuanced communication
- Pragmatics: Persuasion, nuanced agreement/disagreement, formal register
- Examples: "Wenn ich an deiner Stelle wäre...", "Es wäre schön, wenn...", "Ich komme damit nicht zurecht."`,
    },
    5: {
      title: 'Advanced (C1-C2)',
      description: `- Length: 8+ words or short idiomatic phrases
- Grammar: All structures flexibly used
- Vocabulary: Cultural references, metaphorical language, subtle distinctions
- Pragmatics: Sophisticated discussion, humor, register switching
- Examples: "Je nachdem, wie man es betrachtet...", "Nicht dass du mich falsch verstehst, aber..."`,
    },
  };
  
  return criteria[level] || criteria[1];
}

/**
 * Get age-appropriateness criteria.
 * Defines what content is suitable for each age group.
 * 
 * @param ageGroup - Age group string
 * @returns Description of appropriate content
 */
export function getAgeCriteria(ageGroup: string): string {
  const criteria: Record<string, string> = {
    '7-10': `Focus on:
- Concrete, immediate contexts (home, school, play, family)
- Short chunks (max 6 words)
- Playful, fun language
- Basic needs and wants
- No formal register, no abstract concepts
- Examples: "Ich habe Hunger", "Kann ich spielen?", "Das ist mein/e..."`,
    
    '11-14': `Focus on:
- Social interactions with peers
- Expressing opinions and preferences
- School, hobbies, technology, media
- Casual register (informal "du" forms)
- Some humor and slang
- Examples: "Das ist total cool!", "Willst du mitkommen?", "Keine Ahnung."`,
    
    '15-18': `Focus on:
- Future plans and aspirations
- Complex opinions and debates
- Relationships and social dynamics
- All registers (formal and informal)
- Cultural and current events
- Mature themes appropriate for teens
- Examples: "Ich habe vor, zu...", "Was hältst du von...?", "Ich stimme dir zu, aber..."`,
  };
  
  return criteria[ageGroup] || criteria['11-14'];
}

/**
 * Describe a chunk type for the prompt.
 * 
 * @param type - Chunk type enum value
 * @returns Human-readable description
 */
export function describeChunkType(type: ChunkType | string): string {
  const descriptions: Record<string, string> = {
    polyword: `POLYWORD: Fixed expressions that function as single units.
The learner cannot change any word in these phrases.
Examples: "by the way", "of course", "zum Beispiel"`,
    
    collocation: `COLLOCATION: Words that naturally go together.
Focus on combinations where learners might make mistakes translating word-for-word.
Examples: "make a decision" (not "do a decision"), "eine Entscheidung treffen"`,
    
    utterance: `UTTERANCE: Complete phrases for specific situations.
Think: When would a native speaker SAY this?
Include casual/spoken forms that textbooks often miss.
Examples: "No thanks, I'm fine", "Das macht nichts", "Keine Ahnung"`,
    
    frame: `FRAME: Sentence patterns with a blank the learner can fill.
Define what type of word/phrase goes in the blank.
Give 5-10 natural examples for the slot.
One frame teaches dozens of expressions.
Example: "I would like ___, please" with examples: "a coffee", "the menu", "to order"`,
  };
  
  return descriptions[type] || type;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a generated chunk.
 * Ensures the chunk has all required fields and proper format.
 * 
 * @param chunk - The generated chunk to validate
 * @returns True if valid, false otherwise
 */
export function validateGeneratedChunk(chunk: GeneratedChunk): boolean {
  // Required fields
  if (!chunk.text || typeof chunk.text !== 'string') return false;
  if (!chunk.translation || typeof chunk.translation !== 'string') return false;
  if (!chunk.chunkType) return false;
  if (typeof chunk.difficulty !== 'number') return false;
  
  // Validate chunk type (enum values are lowercase strings)
  const validTypes: string[] = [
    ChunkType.POLYWORD,
    ChunkType.COLLOCATION,
    ChunkType.UTTERANCE,
    ChunkType.FRAME,
  ];
  if (!validTypes.includes(chunk.chunkType as string)) return false;
  
  // Validate difficulty range
  if (chunk.difficulty < 1 || chunk.difficulty > 5) return false;
  
  // Frames must have slots
  if (chunk.chunkType === ChunkType.FRAME) {
    if (!chunk.slots || !Array.isArray(chunk.slots) || chunk.slots.length === 0) {
      return false;
    }
  }
  
  // Text should not be too long (sanity check)
  if (chunk.text.length > 200) return false;
  
  return true;
}

/**
 * Normalize a chunk type string to the enum value.
 * Handles variations in AI output.
 * 
 * @param type - The chunk type string from AI
 * @returns Normalized ChunkType
 */
export function normalizeChunkType(type: string): ChunkType {
  const normalized = type.toLowerCase().trim();
  
  const mappings: Record<string, ChunkType> = {
    'polyword': ChunkType.POLYWORD,
    'collocation': ChunkType.COLLOCATION,
    'utterance': ChunkType.UTTERANCE,
    'frame': ChunkType.FRAME,
    'sentence frame': ChunkType.FRAME,
    'sentence-frame': ChunkType.FRAME,
    'fixed expression': ChunkType.POLYWORD,
    'word partnership': ChunkType.COLLOCATION,
  };
  
  return mappings[normalized] || ChunkType.UTTERANCE; // Default to utterance
}
