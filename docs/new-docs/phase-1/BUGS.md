# BUGS.md — LingoFriends V2

Running tracker of bugs found during development. Cline adds entries here as bugs are discovered. Richard prioritises and assigns them.

**Format:** Newest at the top. One entry per bug. Reference the task where it was found.

---

## How to Use This File

### When Cline finds a bug:
Add an entry immediately. Don't try to fix it unless it blocks the current task.

### Entry format:
```markdown
### BUG-[number]: [Short description]
**Found during:** Phase X, Task X.X
**Severity:** 🔴 Critical / 🟠 Important / 🟡 Minor
**Status:** 🔲 Open / 🟡 In progress / ✅ Fixed in [task]
**Symptoms:** [What goes wrong]
**Reproduction:** [Steps to trigger it]
**Likely cause:** [Best guess]
**Fix complexity:** Quick (< 30min) / Medium (1-2h) / Hard (needs own task)
```

### When to fix inline vs. defer:
- **Fix inline** if: it blocks the current task, or it's a Quick fix and you're already in the file
- **Defer** if: it's in a different module, or it needs its own testing, or it's Medium/Hard complexity

---

## Bug Log

_No bugs yet — this file will grow as development progresses._

<!-- 
Example entry for reference:

### BUG-001: Login redirects to /garden even when onboarding incomplete
**Found during:** Phase 1, Task 1.2
**Severity:** 🟠 Important
**Status:** 🔲 Open
**Symptoms:** User logs in, lands on empty garden instead of onboarding flow
**Reproduction:** Register → complete only step 1 of onboarding → close browser → log back in
**Likely cause:** Auth guard checks `locals.user` but not `profile.onboardingComplete`
**Fix complexity:** Quick — add check in `(app)/+layout.server.ts`
-->
