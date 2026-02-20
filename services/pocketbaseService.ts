/**
 * LingoFriends - Pocketbase Service
 * 
 * Handles all Pocketbase operations:
 * - Authentication (signup, login, logout, session persistence)
 * - Profile CRUD
 * - Session (chat) CRUD
 * - Real-time subscriptions
 * 
 * @module pocketbaseService
 */

import PocketBase, { RecordModel } from 'pocketbase';
import type { 
  UserProfile, 
  ChatSession, 
  Message, 
  UserTrait, 
  CEFRLevel, 
  TargetLanguage, 
  NativeLanguage,
  AgeGroup,
  SessionType,
  SessionStatus,
  LessonDraft,
  SubjectType,
  TargetSubject,
  UserInterest,
  AIProfileField
} from '../types';

// ============================================
// CONFIGURATION
// ============================================

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';

/**
 * Singleton Pocketbase client instance
 * Initialized once and reused throughout the app
 */
export const pb = new PocketBase(PB_URL);

// Enable auto-cancellation for duplicate requests (performance optimization)
pb.autoCancellation(false);

// ============================================
// TYPE DEFINITIONS (Pocketbase Records)
// ============================================

/** Pocketbase profile record structure */
interface PBProfile extends RecordModel {
  user: string;
  display_name: string;
  native_language: NativeLanguage;
  target_language: TargetLanguage;
  age_group: AgeGroup;
  level: CEFRLevel;
  goals: string[];
  interests: string[];
  traits: UserTrait[];
  xp: number;
  streak: number;
  last_activity: string;
  daily_xp_today: number;
  daily_cap: number;
  onboarding_complete: boolean;
  // NEW: Subject-based learning fields (Phase 1 Task 5)
  subject_type?: SubjectType;
  target_subject?: TargetSubject;
  selected_interests?: UserInterest[];
}

/** Pocketbase AI profile field record structure */
interface PBAIProfileField extends RecordModel {
  user: string;
  field_name: string;
  field_value: string;
  confidence: number;
  source_session?: string;
  learned_at: string;
}

/** Pocketbase session record structure */
interface PBSession extends RecordModel {
  user: string;
  session_type: 'MAIN' | 'LESSON';
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  title: string;
  objectives: string[];
  messages: Message[];
  draft: LessonDraft | null;
  parent_session: string | null;
  target_language: TargetLanguage;
}

// ============================================
// AUTH SERVICE
// ============================================

/**
 * Check if user is currently authenticated
 * Uses Pocketbase's built-in auth store
 */
export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export function getCurrentUser() {
  return pb.authStore.record;
}

/**
 * Get the current user's ID
 * Returns null if not authenticated
 */
export function getCurrentUserId(): string | null {
  return pb.authStore.record?.id || null;
}

/**
 * Sign up a new user with email and password
 * Creates both the auth user and their profile
 * 
 * @param email - User's email (for account recovery, managed by parent)
 * @param password - Password (min 8 chars)
 * @param displayName - Display name shown in app (the "username" kids see)
 * @param nativeLanguage - User's native language
 * @returns The created profile
 */
export async function signup(
  email: string,
  password: string,
  displayName: string,
  nativeLanguage: NativeLanguage = 'English'
): Promise<UserProfile> {
  try {
    // Create the auth user with email
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      emailVisibility: true,
    });

    // Log them in immediately
    await pb.collection('users').authWithPassword(email, password);

    // Create their profile with defaults.
    // display_name is the "username" kids see throughout the app.
    // Profile creation is a best-effort step — if it fails (e.g. schema mismatch),
    // the onboarding flow's updateProfile() auto-create will repair it.
    // We NEVER let a profile create failure block the user from signing up.
    let profile: PBProfile | null = null;
    try {
      profile = await pb.collection('profiles').create<PBProfile>({
        user: user.id,
        display_name: displayName,
        native_language: nativeLanguage,
        target_language: 'English',
        age_group: '11-14',
        level: 'A1',
        goals: [],
        interests: [],
        traits: [],
        xp: 0,
        streak: 0,
        daily_xp_today: 0,
        daily_cap: 100,
        // onboarding_complete is intentionally omitted here.
        // PocketBase treats boolean `false` as "blank" when the field has
        // "Required" enabled, causing a 400 validation error.
        // The real value (true) is set by updateProfile() at onboarding end.
        sunDrops: 0,
        giftsReceived: 0,
      });
    } catch (profileErr: unknown) {
      // Log details so we can diagnose remaining required fields
      const pErr = profileErr as { data?: { data?: Record<string, unknown> } };
      if (pErr.data?.data) {
        console.error('[PB] signup() profile create validation errors:', JSON.stringify(pErr.data.data, null, 2));
      } else {
        console.error('[PB] signup() profile create failed (non-fatal):', profileErr);
      }
      // Non-fatal: user IS authenticated. updateProfile() during onboarding
      // will auto-create the profile with full data. Return a stub so the
      // auth hook can proceed and render the onboarding flow.
    }

    if (profile) {
      return pbProfileToUserProfile(profile);
    }

    // Return stub profile — full data will be written by updateProfile() in onboarding
    return {
      name: displayName,
      targetLanguage: 'English' as TargetLanguage,
      level: 'A1' as CEFRLevel,
      nativeLanguage,
      ageGroup: '11-14' as AgeGroup,
      goals: [],
      interests: [],
      traits: [],
      streak: 0,
      lastLessonDate: new Date().toISOString(),
      completedLessons: 0,
      xp: 0,
      onboardingComplete: false,
      selectedInterests: [],
    };

  } catch (error: unknown) {
    const err = error as { data?: { data?: Record<string, { message: string }> }; message?: string; status?: number };
    // Handle specific Pocketbase auth errors with kid-friendly messages
    if (err.data?.data?.email) {
      throw new Error('That email is already registered. Try logging in instead!');
    }
    if (err.data?.data?.password) {
      throw new Error('Password needs to be at least 8 characters.');
    }
    console.error('Signup error:', error);
    throw new Error('Oops! Something went wrong. Let\'s try again!');
  }
}

/**
 * Log in an existing user with email
 * 
 * @param email - User's email
 * @param password - User's password
 * @returns The user's profile
 */
export async function login(email: string, password: string): Promise<UserProfile> {
  try {
    await pb.collection('users').authWithPassword(email, password);
    
    // Fetch their profile
    const profile = await getProfile();
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 400) {
      throw new Error('Wrong email or password. Try again!');
    }
    throw new Error('Oops! Something went wrong. Let\'s try again!');
  }
}

/**
 * Request password reset email
 * 
 * @param email - User's email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await pb.collection('users').requestPasswordReset(email);
  } catch {
    // Don't reveal if email exists or not for security
    // Always show success message to user
  }
}

/**
 * Log out the current user
 * Clears auth store and cached data
 */
export function logout(): void {
  pb.authStore.clear();
}

/**
 * Refresh the auth token if expired
 * Call this on app startup to restore session
 */
export async function refreshAuth(): Promise<boolean> {
  if (!pb.authStore.isValid) {
    return false;
  }
  
  try {
    await pb.collection('users').authRefresh();
    return true;
  } catch {
    // Token expired or invalid, clear it
    pb.authStore.clear();
    return false;
  }
}

// ============================================
// PROFILE SERVICE
// ============================================

/**
 * Convert Pocketbase profile to app UserProfile type
 */
function pbProfileToUserProfile(pb: PBProfile): UserProfile {
  return {
    name: pb.display_name,
    targetLanguage: pb.target_language as TargetLanguage,
    level: pb.level as CEFRLevel,
    nativeLanguage: pb.native_language as NativeLanguage,
    ageGroup: (pb.age_group || '11-14') as AgeGroup, // Default to middle age group if not set
    goals: pb.goals || [],
    interests: pb.interests || [],
    traits: pb.traits || [],
    streak: pb.streak,
    lastLessonDate: pb.last_activity || new Date().toISOString(),
    completedLessons: 0, // Computed from sessions
    xp: pb.xp,
    onboardingComplete: pb.onboarding_complete,
    // NEW: Subject-based learning fields (Phase 1 Task 5)
    subjectType: pb.subject_type as SubjectType | undefined,
    targetSubject: pb.target_subject as TargetSubject | undefined,
    selectedInterests: pb.selected_interests || [],
  };
}

/**
 * Convert Pocketbase AI profile field to app AIProfileField type
 */
function pbAIFieldToAIProfileField(pb: PBAIProfileField): AIProfileField {
  return {
    id: pb.id,
    user: pb.user,
    fieldName: pb.field_name,
    fieldValue: pb.field_value,
    confidence: pb.confidence,
    sourceSession: pb.source_session,
    learnedAt: pb.learned_at,
    created: pb.created,
    updated: pb.updated,
  };
}

/**
 * Get the current user's profile
 * Returns null if not authenticated or profile not found
 */
export async function getProfile(): Promise<UserProfile | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const records = await pb.collection('profiles').getList<PBProfile>(1, 1, {
      filter: `user = "${userId}"`,
    });

    if (records.items.length === 0) return null;
    return pbProfileToUserProfile(records.items[0]);
  } catch {
    return null;
  }
}

/**
 * Update the current user's profile
 * Only updates the fields provided
 * Auto-creates profile if it doesn't exist (repair mode)
 * 
 * @param updates - Partial profile updates
 * @returns Updated profile
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Get current profile record
  const records = await pb.collection('profiles').getList<PBProfile>(1, 1, {
    filter: `user = "${userId}"`,
  });

  // Auto-create profile if missing (repair mode for edge cases)
  if (records.items.length === 0) {
    console.warn('[PB] Profile not found for user, attempting to create default profile');
    
    // Build profile data with all fields including new subject-based fields
    // Explicitly ensure numeric values are numbers (not undefined/null)
    const xpValue = Number(updates.xp ?? 0);
    const streakValue = Number(updates.streak ?? 0);
    
    const profileData: Record<string, unknown> = {
      user: userId,
      display_name: updates.name || 'Learner',
      native_language: updates.nativeLanguage || 'English',
      target_language: updates.targetLanguage || 'English',
      age_group: updates.ageGroup || '11-14',
      level: updates.level || 'A1',
      goals: updates.goals ?? [],
      interests: updates.interests ?? [],
      traits: updates.traits ?? [],
      xp: xpValue,
      streak: streakValue,
      daily_xp_today: 0,
      daily_cap: 100,
      onboarding_complete: updates.onboardingComplete ?? false,
      // NEW: Subject-based learning fields (Phase 1 Task 5)
      subject_type: updates.subjectType ?? null,
      target_subject: updates.targetSubject ?? null,
      selected_interests: updates.selectedInterests ?? [],
      // Both are number fields (camelCase). PB required+min:0 treats 0 as "blank"
      // → run scripts/migrate-fix-profile-required-fields.cjs to make them optional.
      sunDrops: 0,
      giftsReceived: 0,
    };
    
    console.log('[PB] Creating profile with data:', JSON.stringify(profileData, null, 2));
    console.log('[PB] xp value:', xpValue, 'type:', typeof xpValue);
    console.log('[PB] streak value:', streakValue, 'type:', typeof streakValue);
    
    try {
      const newProfile = await pb.collection('profiles').create<PBProfile>(profileData);
      return pbProfileToUserProfile(newProfile);
    } catch (createError) {
      console.error('[PB] Auto-create profile failed:', createError);
      // Log the error details for debugging
      if ((createError as { data?: unknown })?.data) {
        console.error('[PB] Error details:', JSON.stringify((createError as { data?: unknown }).data, null, 2));
      }
      // Return a fake in-memory profile so the app doesn't crash
      // Updates won't persist but UX continues
      return {
        name: updates.name || 'Learner',
        targetLanguage: (updates.targetLanguage || 'English') as TargetLanguage,
        level: (updates.level || 'A1') as CEFRLevel,
        nativeLanguage: (updates.nativeLanguage || 'English') as NativeLanguage,
        ageGroup: (updates.ageGroup || '11-14') as AgeGroup,
        goals: updates.goals || [],
        interests: updates.interests || [],
        traits: updates.traits || [],
        streak: 0,
        lastLessonDate: new Date().toISOString(),
        completedLessons: 0,
        xp: updates.xp || 0,
        onboardingComplete: updates.onboardingComplete || false,
        subjectType: updates.subjectType,
        targetSubject: updates.targetSubject,
        selectedInterests: updates.selectedInterests || [],
      };
    }
  }

  const profileId = records.items[0].id;

  // Map UserProfile fields to Pocketbase fields
  const pbUpdates: Partial<PBProfile> = {};
  
  if (updates.name !== undefined) pbUpdates.display_name = updates.name;
  if (updates.targetLanguage !== undefined) pbUpdates.target_language = updates.targetLanguage;
  if (updates.level !== undefined) pbUpdates.level = updates.level;
  if (updates.nativeLanguage !== undefined) pbUpdates.native_language = updates.nativeLanguage;
  if (updates.ageGroup !== undefined) pbUpdates.age_group = updates.ageGroup;
  if (updates.goals !== undefined) pbUpdates.goals = updates.goals;
  if (updates.interests !== undefined) pbUpdates.interests = updates.interests;
  if (updates.traits !== undefined) pbUpdates.traits = updates.traits;
  if (updates.xp !== undefined) pbUpdates.xp = updates.xp;
  if (updates.streak !== undefined) pbUpdates.streak = updates.streak;
  if (updates.onboardingComplete !== undefined) pbUpdates.onboarding_complete = updates.onboardingComplete;
  // NEW: Subject-based learning fields (Phase 1 Task 5)
  if (updates.subjectType !== undefined) pbUpdates.subject_type = updates.subjectType;
  if (updates.targetSubject !== undefined) pbUpdates.target_subject = updates.targetSubject;
  if (updates.selectedInterests !== undefined) pbUpdates.selected_interests = updates.selectedInterests;

  // Always update last_activity when profile is updated
  pbUpdates.last_activity = new Date().toISOString();

  const updated = await pb.collection('profiles').update<PBProfile>(profileId, pbUpdates);
  return pbProfileToUserProfile(updated);
}

/**
 * Add XP to user profile with daily cap enforcement
 * 
 * @param amount - Amount of XP to add
 * @returns Updated XP values
 */
export async function addXP(amount: number): Promise<{ xp: number; dailyXP: number; capped: boolean }> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const records = await pb.collection('profiles').getList<PBProfile>(1, 1, {
    filter: `user = "${userId}"`,
  });

  if (records.items.length === 0) {
    throw new Error('Profile not found');
  }

  const profile = records.items[0];
  const cap = profile.daily_cap;
  const currentDaily = profile.daily_xp_today;
  
  // Check if we've hit the daily cap
  const remaining = Math.max(0, cap - currentDaily);
  const actualXP = Math.min(amount, remaining);
  const capped = actualXP < amount;

  if (actualXP > 0) {
    await pb.collection('profiles').update(profile.id, {
      xp: profile.xp + actualXP,
      daily_xp_today: currentDaily + actualXP,
      last_activity: new Date().toISOString(),
    });
  }

  return {
    xp: profile.xp + actualXP,
    dailyXP: currentDaily + actualXP,
    capped,
  };
}

// ============================================
// AI PROFILE FIELDS SERVICE
// ============================================

/**
 * Get all AI profile fields for the current user.
 * These are facts the AI has learned during conversations.
 * 
 * @returns Array of AI profile fields
 */
export async function getAIProfileFields(): Promise<AIProfileField[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const records = await pb.collection('ai_profile_fields').getList<PBAIProfileField>(1, 100, {
      filter: `user = "${userId}"`,
      sort: '-learned_at',
    });

    return records.items.map(pbAIFieldToAIProfileField);
  } catch (error) {
    console.error('[PB] Error fetching AI profile fields:', error);
    return [];
  }
}

/**
 * Add or update an AI profile field.
 * If a field with the same name exists, it will be updated if new confidence is higher.
 * 
 * @param fieldName - Name of the field (e.g. "favorite_kpop_group")
 * @param fieldValue - Value of the field (e.g. "BTS")
 * @param confidence - Confidence score 0.0 to 1.0
 * @param sourceSession - Optional session ID where this was learned
 * @returns The created or updated AI profile field
 */
export async function upsertAIProfileField(
  fieldName: string,
  fieldValue: string,
  confidence: number,
  sourceSession?: string
): Promise<AIProfileField> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Clamp confidence to valid range
  const clampedConfidence = Math.max(0, Math.min(1, confidence));

  try {
    // Check if field already exists
    const existing = await pb.collection('ai_profile_fields').getList<PBAIProfileField>(1, 1, {
      filter: `user = "${userId}" && field_name = "${fieldName}"`,
    });

    if (existing.items.length > 0) {
      const existingField = existing.items[0];
      
      // Only update if new confidence is higher or value changed
      if (clampedConfidence >= existingField.confidence || fieldValue !== existingField.field_value) {
        const updated = await pb.collection('ai_profile_fields').update<PBAIProfileField>(
          existingField.id,
          {
            field_value: fieldValue,
            confidence: clampedConfidence,
            source_session: sourceSession || existingField.source_session,
            learned_at: new Date().toISOString(),
          }
        );
        return pbAIFieldToAIProfileField(updated);
      }
      
      // Return existing if no update needed
      return pbAIFieldToAIProfileField(existingField);
    }

    // Create new field
    const created = await pb.collection('ai_profile_fields').create<PBAIProfileField>({
      user: userId,
      field_name: fieldName,
      field_value: fieldValue,
      confidence: clampedConfidence,
      source_session: sourceSession || null,
      learned_at: new Date().toISOString(),
    });

    return pbAIFieldToAIProfileField(created);
  } catch (error) {
    console.error('[PB] Error upserting AI profile field:', error);
    throw new Error('Failed to save AI profile field');
  }
}

/**
 * Delete an AI profile field by ID.
 * 
 * @param id - The ID of the field to delete
 */
export async function deleteAIProfileField(id: string): Promise<void> {
  try {
    await pb.collection('ai_profile_fields').delete(id);
  } catch (error) {
    console.error('[PB] Error deleting AI profile field:', error);
    throw new Error('Failed to delete AI profile field');
  }
}

/**
 * Get a specific AI profile field by name.
 * Useful for checking if we already know something about the user.
 * 
 * @param fieldName - Name of the field to find
 * @returns The field if found, null otherwise
 */
export async function getAIProfileFieldByName(fieldName: string): Promise<AIProfileField | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const records = await pb.collection('ai_profile_fields').getList<PBAIProfileField>(1, 1, {
      filter: `user = "${userId}" && field_name = "${fieldName}"`,
    });

    if (records.items.length === 0) return null;
    return pbAIFieldToAIProfileField(records.items[0]);
  } catch {
    return null;
  }
}

// ============================================
// SESSION SERVICE
// ============================================

/**
 * Convert Pocketbase session to app ChatSession type
 */
function pbSessionToChatSession(pb: PBSession): ChatSession {
  return {
    id: pb.id,
    type: pb.session_type as SessionType,
    status: pb.status as SessionStatus,
    title: pb.title,
    objectives: pb.objectives || [],
    messages: pb.messages || [],
    createdAt: new Date(pb.created).getTime(),
    parentId: pb.parent_session || undefined,
    draft: pb.draft || undefined,
  };
}

/**
 * Get all sessions for the current user
 * 
 * @param type - Optional filter by session type
 * @returns Array of chat sessions
 */
export async function getSessions(type?: SessionType): Promise<ChatSession[]> {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    let filter = `user = "${userId}"`;
    if (type) {
      filter += ` && session_type = "${type}"`;
    }

    const records = await pb.collection('sessions').getList<PBSession>(1, 100, {
      filter,
      sort: '-created',
    });

    return records.items.map(pbSessionToChatSession);
  } catch {
    return [];
  }
}

/**
 * Get a single session by ID
 * 
 * @param sessionId - Session ID
 * @returns Chat session or null
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const record = await pb.collection('sessions').getOne<PBSession>(sessionId);
    return pbSessionToChatSession(record);
  } catch {
    return null;
  }
}

/**
 * Create a new chat session
 * 
 * @param session - Session data
 * @returns Created session
 */
export async function createSession(session: Omit<ChatSession, 'id' | 'createdAt'>): Promise<ChatSession> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  try {
    const record = await pb.collection('sessions').create<PBSession>({
      user: userId,
      session_type: session.type,
      status: session.status,
      title: session.title,
      objectives: session.objectives,
      messages: session.messages,
      draft: session.draft || null,
      // parent_session can cause relation validation errors if the ID is invalid
      // So we validate it carefully — pass null if it looks wrong
      parent_session: (session.parentId && session.parentId.length > 5) ? session.parentId : null,
      // Use targetLanguage from session data, fallback to 'English'
      target_language: session.targetLanguage || 'English',
    });

    console.log('[PB] Session created successfully:', record.id, record.session_type, record.title);
    return pbSessionToChatSession(record);
  } catch (error) {
    console.error('[PB] Failed to create session:', error);
    if ((error as { data?: unknown })?.data) {
      console.error('[PB] Error details:', JSON.stringify((error as { data?: unknown }).data, null, 2));
    }
    throw error;
  }
}

/**
 * Update a session
 * 
 * @param sessionId - Session ID
 * @param updates - Partial session updates
 * @returns Updated session
 */
export async function updateSession(
  sessionId: string, 
  updates: Partial<ChatSession>
): Promise<ChatSession> {
  const pbUpdates: Partial<PBSession> = {};

  if (updates.status !== undefined) pbUpdates.status = updates.status;
  if (updates.title !== undefined) pbUpdates.title = updates.title;
  if (updates.objectives !== undefined) pbUpdates.objectives = updates.objectives;
  if (updates.messages !== undefined) pbUpdates.messages = updates.messages;
  if (updates.draft !== undefined) pbUpdates.draft = updates.draft || null;

  const record = await pb.collection('sessions').update<PBSession>(sessionId, pbUpdates);
  return pbSessionToChatSession(record);
}

/**
 * Delete a session
 * 
 * @param sessionId - Session ID
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await pb.collection('sessions').delete(sessionId);
}

/**
 * Get or create the main hall session for a language
 * 
 * @param targetLanguage - Target language
 * @returns Main hall session
 */
export async function getOrCreateMainSession(targetLanguage: TargetLanguage): Promise<ChatSession> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Try to find existing main session for this language
  const records = await pb.collection('sessions').getList<PBSession>(1, 1, {
    filter: `user = "${userId}" && session_type = "MAIN" && target_language = "${targetLanguage}"`,
  });

  if (records.items.length > 0) {
    return pbSessionToChatSession(records.items[0]);
  }

  // Create new main session
  const record = await pb.collection('sessions').create<PBSession>({
    user: userId,
    session_type: 'MAIN',
    status: 'ACTIVE',
    title: targetLanguage === 'French' ? 'Main Hall (French)' : 'Main Hall',
    objectives: [],
    messages: [],
    draft: null,
    parent_session: null,
    target_language: targetLanguage,
  });

  return pbSessionToChatSession(record);
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to profile changes
 * Useful for multi-device sync
 * 
 * @param callback - Called when profile changes
 * @returns Unsubscribe function
 */
export function subscribeToProfile(callback: (profile: UserProfile) => void): () => void {
  const userId = getCurrentUserId();
  if (!userId) return () => {};

  pb.collection('profiles').subscribe<PBProfile>('*', (e) => {
    if (e.record.user === userId) {
      callback(pbProfileToUserProfile(e.record));
    }
  });

  return () => {
    pb.collection('profiles').unsubscribe();
  };
}

/**
 * Subscribe to session changes
 * 
 * @param sessionId - Session ID to watch
 * @param callback - Called when session changes
 * @returns Unsubscribe function
 */
export function subscribeToSession(
  sessionId: string,
  callback: (session: ChatSession) => void
): () => void {
  pb.collection('sessions').subscribe<PBSession>(sessionId, (e) => {
    callback(pbSessionToChatSession(e.record));
  });

  return () => {
    pb.collection('sessions').unsubscribe(sessionId);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Pocketbase server is reachable
 * Useful for offline detection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset daily XP (should be called at midnight in user's timezone)
 * This would typically be done server-side, but included for reference
 */
export async function resetDailyXP(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  const records = await pb.collection('profiles').getList<PBProfile>(1, 1, {
    filter: `user = "${userId}"`,
  });

  if (records.items.length > 0) {
    await pb.collection('profiles').update(records.items[0].id, {
      daily_xp_today: 0,
    });
  }
}

// Export types for external use
export type { PBProfile, PBSession };
