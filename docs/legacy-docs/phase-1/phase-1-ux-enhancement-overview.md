# Phase 1 UX Enhancement - Tasks Overview

**Date:** 2025-02-04
**Status:** Planning Complete
**Estimated Time:** 20-30 hours total
**Priority:** HIGH

---

## Context

After completing Task 3 (AI Service Swap), user testing with kids revealed critical UX issues:
1. Current styling is not engaging or kid-friendly
2. Language picker is confusing - kids don't understand what to do
3. No clear entry point for starting a learning session
4. Missing personalization based on interests
5. No way to edit preferences after signup

---

## Goals

1. **Make it fun:** Gamified, Duolingo-inspired visual design
2. **Guide the user:** Clear onboarding flow that teaches the app
3. **Personalize:** Capture and use interests to drive conversations
4. **Simplify:** Remove confusing elements, add helpful structure
5. **Enable control:** Users can edit their profile/preferences anytime

---

## Task Breakdown

### Task 4: Design System & Style Overhaul
**Time:** 4-6 hours | **Dependencies:** None

Create comprehensive design system and apply it throughout the app.

**Deliverables:**
- `docs/design-system.md` - Complete design guidelines
- Updated `tailwind.config.js` with design tokens
- Reusable UI components in `components/ui/`
- All existing components restyled

**Key Focus:**
- Duolingo-inspired bright colors and rounded corners
- Playful, kid-friendly aesthetics
- Consistent spacing, typography, animations
- Accessible touch targets and contrast ratios

---

### Task 5: Database Schema Updates
**Time:** 2-3 hours | **Dependencies:** None

Update Pocketbase schema to support new features.

**Deliverables:**
- New fields in `profiles` collection: `subject_type`, `target_subject`, `selected_interests`
- New `ai_profile_fields` collection for AI-learned facts
- Updated TypeScript types
- Updated Pocketbase service methods

**Key Focus:**
- Support subjects beyond languages (maths, coding)
- Store user-selected interests
- Enable AI to learn and remember facts about users

---

### Task 6: Onboarding Screens
**Time:** 6-8 hours | **Dependencies:** Task 4, Task 5

Build multi-step onboarding flow for new users.

**Deliverables:**
- `OnboardingContainer.tsx` - Flow manager
- `Step1Language.tsx` - Native language selection
- `Step2Subject.tsx` - Learning subject selection
- `Step3Interests.tsx` - Interest selection
- `StepIndicator.tsx` - Progress visualization

**Key Focus:**
- Full-screen, step-by-step guidance
- French and English for native language
- English/German available, Maths/Scratch coming soon
- Multi-select interests across categories
- Data saves to profile on completion

---

### Task 7: Main Interface Updates
**Time:** 6-8 hours | **Dependencies:** Task 4, Task 5, Task 6

Replace language picker with guided learning launcher.

**Deliverables:**
- `LearningLauncher.tsx` - Subject/theme selector
- AI conversation starter service
- Updated main hall flow
- Profile-aware AI prompts

**Key Focus:**
- Remove confusing language picker
- "I want to learn [Subject]" + "Theme: [Interest]" → Start button
- AI generates personalized opening questions
- Conversation in native language
- AI extracts and saves profile information

---

### Task 8: Profile Management
**Time:** 3-4 hours | **Dependencies:** Task 6

Enable users to edit their profile settings.

**Deliverables:**
- `ProfileSettings.tsx` - Settings screen
- Reusable onboarding steps for editing
- Save changes flow
- Access from sidebar/header

**Key Focus:**
- Edit native language, subject, interests
- Edit display name
- View progress stats (read-only)
- Confirmation for major changes
- Reuse onboarding components

---

## Implementation Order

**Recommended sequence:**

```
Task 4 (Design System)
  ↓
Task 5 (Database Schema)
  ↓
Task 6 (Onboarding)
  ↓
Task 7 (Main Interface)
  ↓
Task 8 (Profile Management)
```

**Reasoning:**
- Design system first ensures consistency across all new components
- Database schema needed before onboarding can save data
- Onboarding components can be reused in profile management
- Main interface depends on onboarding completion state
- Profile management is polish that reuses earlier work

---

## Testing Strategy

**After each task:**
- Unit test new components/services
- Manual testing on mobile and desktop
- Verify database operations work
- Check TypeScript compilation

**After all tasks:**
- Full end-to-end flow testing
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing (iOS, Android)
- Performance check (load times, animations)
- **User testing with kids** (most important!)

---

## Success Metrics

**Quantitative:**
- [ ] All tasks completed and merged
- [ ] 0 TypeScript errors
- [ ] 100% of components use design system
- [ ] All touch targets ≥ 44x44px
- [ ] All text meets WCAG AA contrast

**Qualitative:**
- [ ] Kids understand how to start learning
- [ ] Kids enjoy the visual design
- [ ] Kids complete onboarding without help
- [ ] Parents report kids are more engaged
- [ ] No confusion about what to do next

---

## Risk Mitigation

**Potential issues:**

1. **Scope creep:** Design system could become too complex
   - **Mitigation:** Start with essentials, iterate later

2. **Kids don't engage with theme selector:**
   - **Mitigation:** Add "Surprise me!" option for random themes

3. **AI conversation starter feels scripted:**
   - **Mitigation:** Multiple prompt templates, LLM variation

4. **Performance issues with animations:**
   - **Mitigation:** Test on older devices, simplify if needed

5. **Database migration breaks existing users:**
   - **Mitigation:** Backward compatibility, migration scripts, testing

---

## Future Enhancements (Post-Phase 1)

**Ideas to consider later:**
- Profile pictures/avatars
- Achievement badges
- Animated character (Professor Finch)
- Lesson recommendations based on AI profile
- Social features (share with friends)
- Parental dashboard
- More subjects (expand beyond language)
- Voice-first onboarding option

---

## Questions & Clarifications

**Resolved:**
- ✅ Subject type should be flexible for non-language subjects
- ✅ AI profile fields in separate collection with confidence scores
- ✅ Single onboarding_complete boolean
- ✅ Complete design system before implementation
- ✅ Full-screen onboarding components
- ✅ Reuse onboarding for profile editing
- ✅ Main hall for conversations, LLM-generated starters
- ✅ Greyed out "Coming soon" buttons for unavailable subjects

**Open:**
- None currently

---

## Resources

**Design inspiration:**
- Duolingo (gamified learning UX)
- Khan Academy Kids (age-appropriate UI)
- Kahoot (playful colors and energy)

**Reference docs:**
- `docs/design-system.md` (created in Task 4)
- `docs/phase-1/task-2-1-pocketbase-integration.md` (existing database)
- `docs/phase-1/task-3-ai-service-swap.md` (AI architecture)

---

## Notes

- Keep kids at the center of all decisions
- Playful doesn't mean chaotic - maintain clarity
- Test early, test often, especially with actual kids
- Document learnings for future phases
- Celebrate wins - this is a major UX overhaul!
