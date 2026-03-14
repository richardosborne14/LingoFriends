# Task 1.3: Logout

**Status:** 🔲 Not started
**Phase:** 1 (Auth & Profiles)
**Confidence Target:** 9/10
**Estimated Time:** 0.5h
**Dependencies:** Task 1.2 complete

---

## Objective

Create a logout API endpoint that invalidates the session, clears the cookie, and redirects to `/login`. Wire a "Log Out" button in the app layout or profile page.

---

## Subtasks

### 1.3.1 — API endpoint (`src/routes/api/logout/+server.ts`)

```typescript
export const POST: RequestHandler = async ({ locals, cookies }) => {
  if (locals.session) {
    await lucia.invalidateSession(locals.session.id);
    const cookie = lucia.createBlankSessionCookie();
    cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
  }
  throw redirect(302, '/login');
};
```

### 1.3.2 — Wire logout button
Add a "Log Out" button (ghost variant) in the app layout or profile page that POSTs to `/api/logout`.

---

## Tests

```typescript
describe('Logout', () => {
  it('invalidates session and clears cookie', async () => {});
  it('redirects to /login', async () => {});
  it('handles already-logged-out user gracefully', async () => {});
});
```

---

## Acceptance Criteria

- [ ] Session invalidated in DB
- [ ] Cookie cleared
- [ ] Redirect to `/login`
- [ ] Handles edge case of no session gracefully
- [ ] Tests: 3/3 passing

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
