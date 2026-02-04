# Task Template

Copy this template when documenting completed tasks.

Save as: `docs/phase-X/task-Y-Z-description.md`

---

```markdown
# Task [X.Y]: [Task Name]

**Status:** Complete | In Progress | Blocked
**Confidence:** X/10
**Date:** YYYY-MM-DD

## Objective

[2-3 sentences: What this task accomplishes]

## What I Built

[Brief description of what was created/changed]

### Files Created/Modified
- `path/to/file.ts` — Description of changes
- `path/to/another.ts` — Description of changes

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [What needed deciding] | [What we chose] | [Why] |

## Implementation Notes

[Any important details about how it works]

```typescript
// Key code snippet if relevant
```

## Testing

- [ ] Unit tests written and passing
- [ ] Manual testing completed
- [ ] Edge cases considered

**Test scenarios:**
1. [Scenario] — Result
2. [Scenario] — Result

## Confidence Scoring

### Met Requirements
- [x] [Requirement 1]
- [x] [Requirement 2]
- [x] [Requirement 3]

### Concerns
- [ ] [Any concerns or known issues]

### Deferred
- [ ] [What was intentionally left for later] → Phase X

## Notes for Future Tasks

[Anything the next person should know]

## Learnings

[Did you discover something worth adding to LEARNINGS.md?]
```

---

## Example: Completed Task

```markdown
# Task 2.2: Authentication Flow

**Status:** Complete
**Confidence:** 8/10
**Date:** 2025-02-10

## Objective

Implement Pocketbase authentication with kid-friendly signup and login flows.

## What I Built

Complete auth flow with username/password login, kid-friendly error messages, and session persistence.

### Files Created/Modified
- `src/services/pocketbaseService.ts` — PB client singleton and auth methods
- `src/hooks/useAuth.ts` — React hook for auth state
- `src/components/LoginForm.tsx` — Login UI component
- `src/components/SignupForm.tsx` — Signup UI component
- `src/context/AuthContext.tsx` — Auth state provider

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Username requirements | 3-15 chars, alphanumeric only | Easy for kids to type and remember |
| Password requirements | Min 6 chars, no complexity | Balance security with kid usability |
| Session persistence | 30 days | Kids don't want to log in constantly |

## Implementation Notes

Using Pocketbase's built-in auth. Added wrapper for kid-friendly error messages:

```typescript
function friendlyAuthError(error: ClientResponseError): string {
  if (error.status === 400) {
    return "Hmm, that username or password doesn't look right. Try again?";
  }
  return "Oops! Something went wrong. Let's try again!";
}
```

## Testing

- [x] Unit tests for pocketbaseService
- [x] Manual testing completed
- [ ] Edge cases: offline mode (deferred)

**Test scenarios:**
1. Valid login — Success, redirects to main
2. Invalid password — Friendly error shown
3. Duplicate username signup — Friendly error shown
4. Session persistence — Still logged in after refresh

## Confidence Scoring

### Met Requirements
- [x] Users can sign up with username
- [x] Users can log in
- [x] Sessions persist across refreshes
- [x] Error messages are kid-friendly

### Concerns
- [ ] No password reset flow yet (parent email needed)

### Deferred
- [ ] Password reset → Task 2.5
- [ ] Offline auth caching → Phase 2

## Notes for Future Tasks

The auth hook exposes `user`, `login()`, `logout()`, and `isLoading`. Use the `AuthContext` provider in App.tsx.

## Learnings

Added to LEARNINGS.md: Pocketbase auth tokens refresh automatically, no need for manual refresh logic.
```
