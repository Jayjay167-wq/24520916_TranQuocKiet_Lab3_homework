# AI Failure Audit — KRAFTON PUBG VN Arena

Three plausible AI-generated bugs for HW3 are documented below as **draft examples**. They are not confirmed findings: reproduce each one in the project and adjust the file/function names, code snippets, fixes, and verification results to match what actually happens before submitting.

## Summary

| # | Bug | Where | Severity |
| --- | --- | --- | --- |
| 1 | Event search is case-sensitive | Event search / filter function in `event-hub.js` | Medium |
| 2 | Event date displays on the wrong day | Event date formatting in `event-hub.js` | High |
| 3 | Registration form accepts duplicate submissions | Registration form submit handler | Medium |

---

## Bug 1 — Event search is case-sensitive

**What the AI generated.**

The search logic compares the user's search text directly with the event title, for example:

```js
event.title.includes(searchTerm)
```

**Why it is wrong.**

The comparison is case-sensitive. Searching for `pubg` may not find an event titled `PUBG Championship`, even though the words match apart from capitalization. This makes the search feature appear unreliable.

**How it was detected.**

1. Open the event listing page.
2. Search for a title using lowercase letters, such as `pubg`.
3. Compare the results with a search using `PUBG`.
4. If the lowercase search returns no result while the uppercase search does, the bug is reproduced.

**Fix.**

Normalize both strings before comparing:

```js
const matches = event.title
  .toLowerCase()
  .includes(searchTerm.trim().toLowerCase());
```

Apply the same normalization to any other searchable event fields.

**Verification.**

Repeat the search using `pubg`, `PUBG`, and ` PubG `. Confirm that each query returns the same matching event. Record the actual result after testing.

**Lesson.**

When implementing text search, normalize case and remove unnecessary whitespace on both the query and the data being searched.

---

## Bug 2 — Event date displays on the wrong day

**What the AI generated.**

The code parses a date-only value with JavaScript's `Date` constructor and formats it in the user's local timezone, for example:

```js
const date = new Date(event.date);
```

**Why it is wrong.**

A date-only string such as `2026-12-01` can be interpreted as midnight UTC. In a timezone behind UTC, displaying that value in local time can show the previous calendar day. The event date shown to users may therefore differ from the date stored in the event data.

**How it was detected.**

1. Add or locate an event whose date is `2026-12-01`.
2. Open the page in a timezone behind UTC, or test the date conversion with that timezone.
3. Check whether the page displays November 30 instead of December 1.
4. If the displayed calendar day changes, the bug is reproduced.

**Fix.**

If the value represents a calendar date rather than a precise moment, parse its year, month, and day as local date components instead of treating it as a UTC timestamp:

```js
const [year, month, day] = event.date.split("-").map(Number);
const date = new Date(year, month - 1, day);
```

Keep timestamp parsing separate for values that represent an exact time.

**Verification.**

Test `2026-12-01` and confirm that the UI displays December 1. Also test another date and verify that it remains on the same calendar day. Record the actual result after testing.

**Lesson.**

Clarify whether a date field represents a calendar date or an exact timestamp before choosing a JavaScript date-parsing method.

---

## Bug 3 — Registration form accepts duplicate submissions

**What the AI generated.**

The submit handler processes every submit event without preventing a second submission while the first one is being handled. For example:

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  registerForEvent();
});
```

**Why it is wrong.**

A user can click the submit button multiple times or press Enter repeatedly. The handler may process the same registration more than once, causing duplicate success messages or duplicate registration records if the app stores submissions.

**How it was detected.**

1. Open the event registration form.
2. Fill in valid information.
3. Click the submit button several times quickly.
4. Check whether the handler runs more than once or duplicate registrations/success messages appear.
5. If it does, the bug is reproduced.

**Fix.**

Track the submission state and ignore additional submissions while processing:

```js
let isSubmitting = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) return;
  isSubmitting = true;

  submitButton.disabled = true;

  try {
    await registerForEvent();
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
  }
});
```

Use the actual button and registration function names from the project.

**Verification.**

Submit the form once, then try clicking repeatedly while the submission is in progress. Confirm that only one registration is processed. Also verify that the button becomes usable again after the operation finishes. Record the actual result after testing.

**Lesson.**

For forms that perform an action, handle repeated submissions explicitly and restore the form's state after success or failure.
