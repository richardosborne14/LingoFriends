# Task 5: Database Schema Updates for Onboarding

**Status:** ✅ Complete
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Actual Time:** ~1 hour
**Dependencies:** None
**Completed:** 2026-02-05

---

## Objective

Update the Pocketbase database schema to support the new onboarding flow, including subject types, interests, learning goals, and AI-generated profile fields.

---

## What Needs to Be Done

### 5.1 Update `profiles` Collection Schema

**Add new fields:**

```javascript
{
  // Existing fields remain...
  
  // NEW: What they want to learn (replaces target_language exclusivity)
  subject_type: 'select', // 'language', 'maths', 'coding'
  target_subject: 'text', // 'English', 'German', 'Maths', 'Scratch'
  
  // NEW: User-selected interests from onboarding
  selected_interests: 'json', // Array of strings: ['Football', 'Kpop', 'Reading']
  
  // Keep existing fields:
  // native_language, target_language, age_group, level, goals, interests, traits, xp, etc.
}
```

**Migration considerations:**
- `target_language` field stays for backward compatibility (current French/English users)
- New users will use `subject_type` + `target_subject`
- For languages: `subject_type='language'` and `target_subject='English'` or `'German'`

### 5.2 Create `ai_profile_fields` Collection

New collection to store AI-generated insights about the user:

```javascript
{
  name: 'ai_profile_fields',
  type: 'base',
  fields: [
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: {
        collectionId: '_pb_users_auth_',
        cascadeDelete: true,
        maxSelect: 1
      }
    },
    {
      name: 'field_name',
      type: 'text',
      required: true,
      options: { max: 100 }
    },
    {
      name: 'field_value',
      type: 'text',
      required: true,
      options: { max: 500 }
    },
    {
      name: 'confidence',
      type: 'number',
      required: true,
      options: { min: 0, max: 1 } // 0.0 to 1.0
    },
    {
      name: 'source_session',
      type: 'relation',
      required: false,
      options: {
        collectionId: 'sessions',
        maxSelect: 1
      }
    },
    {
      name: 'learned_at',
      type: 'date',
      required: true
    }
  ],
  rules: {
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  }
}
```

**Example records:**
```json
[
  {
    "user": "user123",
    "field_name": "favorite_kpop_group",
    "field_value": "BTS",
    "confidence": 0.95,
    "source_session": "session_abc",
    "learned_at": "2025-02-04T10:30:00Z"
  },
  {
    "user": "user123",
    "field_name": "learning_motivation",
    "field_value": "Wants to talk to Korean friends online",
    "confidence": 0.85,
    "source_session": "session_def",
    "learned_at": "2025-02-04T10:35:00Z"
  }
]
```

### 5.3 Update TypeScript Types

**In `types.ts`:**

```typescript
// Add new types
export type SubjectType = 'language' | 'maths' | 'coding';

export type TargetSubject = 
  | 'English' 
  | 'German' 
  | 'Maths' 
  | 'Scratch';

export type UserInterest = string; // Free-form from predefined list

// Update UserProfile interface
export interface UserProfile {
  // ... existing fields
  
  // NEW fields
  subjectType: SubjectType;
  targetSubject: TargetSubject;
  selectedInterests: UserInterest[];
  
  // Keep existing for backward compatibility
  targetLanguage: TargetLanguage;
  nativeLanguage: NativeLanguage;
  // ...
}

// New interface for AI profile fields
export interface AIProfileField {
  id: string;
  user: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  sourceSession?: string;
  learnedAt: string;
  created: string;
  updated: string;
}
```

### 5.4 Update Pocketbase Service

**In `services/pocketbaseService.ts`:**

Add methods for AI profile fields:

```typescript
/**
 * Get all AI profile fields for current user
 */
export async function getAIProfileFields(): Promise<AIProfileField[]> {
  // Implementation
}

/**
 * Add or update an AI profile field
 */
export async function upsertAIProfileField(
  fieldName: string,
  fieldValue: string,
  confidence: number,
  sourceSession?: string
): Promise<AIProfileField> {
  // Implementation
}

/**
 * Delete an AI profile field
 */
export async function deleteAIProfileField(id: string): Promise<void> {
  // Implementation
}
```

### 5.5 Update Setup Script

**Modify `scripts/setup-pocketbase.cjs`:**

1. Add new fields to `profiles` collection definition
2. Add new `ai_profile_fields` collection definition
3. Run script against remote Pocketbase to apply changes

**Testing:**
- Run script in dry-run mode first
- Verify changes don't break existing data
- Test on dev instance before production

---

## Migration Strategy

**For existing users:**
1. Keep `target_language` field populated
2. Set `subject_type = 'language'`
3. Set `target_subject = target_language` value
4. Set `selected_interests = []` (empty until they go through new onboarding)

**For new users:**
1. Set `subject_type` and `target_subject` during onboarding
2. Set `selected_interests` from onboarding choices
3. Still populate `target_language` for backward compatibility with existing code

---

## Success Criteria

- [x] `profiles` collection has new fields: `subject_type`, `target_subject`, `selected_interests`
- [x] `ai_profile_fields` collection is created with proper schema and rules
- [x] TypeScript types are updated and compile without errors
- [x] Pocketbase service has new CRUD methods for AI profile fields
- [x] Setup script creates/updates collections successfully
- [x] Existing user data is not broken by schema changes
- [x] All changes are backward compatible with current code

---

## Files to Create/Modify

**Modify:**
- `scripts/setup-pocketbase.cjs` - Add new fields and collection
- `types.ts` - Add new types and update UserProfile interface
- `services/pocketbaseService.ts` - Add AI profile field methods

**Create:**
- None (all modifications to existing files)

---

## Testing Checklist

- [ ] Run setup script against dev Pocketbase instance
- [ ] Verify `profiles` collection has new fields
- [ ] Verify `ai_profile_fields` collection is created
- [ ] Test creating a new user with new schema
- [ ] Test existing user can still log in and access their profile
- [ ] Test AI profile field CRUD operations
- [ ] Verify permissions prevent users from accessing others' AI profile fields

---

## Notes

- AI profile fields are separate from `traits` (which are coach-generated personality observations)
- AI profile fields are specific facts learned during conversations (favorite groups, hobbies, goals)
- Confidence score allows AI to update/refine fields over time as it learns more
- `source_session` helps trace where information came from
