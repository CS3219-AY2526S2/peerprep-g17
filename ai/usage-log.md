# AI Usage Log

## Date/Time

2026-03-18

### Tool

ChatGPT

### Prompt/Command

Generate boilerplate for a Google OAuth 2.0 implementation using Passport.js, ensuring the callback logic integrates with my pre-defined MongoDB user schema. Also, provide a React functional component for the login button.

### Output Summary

Generated implementation boilerplate for Google OAuth authentication flow and related frontend components.

### Action Taken

- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

### Author Notes

The user schema and authentication approach were pre-defined. I adapted the generated boilerplate to fit my existing backend structure and frontend setup. I also reused the same implementation pattern to add GitHub OAuth after the authentication approach had already been decided.

---

## Date/Time

2026-03-30

### Tool

ChatGPT

### Prompt/Command

Create the JSX and Tailwind CSS for a sidebar text chat and an exit button based on my existing website theme. The implementation should be a stateless UI component that I can later hook into my Yjs shared types for real-time syncing.

### Output Summary

Generated frontend boilerplate for UI components used in the collaboration service.

### Action Taken

- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

### Author Notes

The collaboration architecture and use of Yjs were already decided. I adapted the generated UI components to match the existing design and integrated them into the collaboration flow.

---

## Date/Time

2026-04-10 17:34

### Tool

ChatGPT

### Prompt/Command

Currently, the history page does not fit the website theme. Can you edit the HistoryPage.tsx so that it fits the current website theme?

### Output Summary

Generated frontend boilerplate and styling adjustments for `HistoryPage.tsx`.

### Action Taken

- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

### Author Notes

I adjusted the generated code to better match the existing UI and removed unnecessary elements to align with the expected functionality.

---

## Date/Time

2026-04-11 15:17

### Tool

ChatGPT

### Prompt/Command

Currently, the text chat is workable and works for both online/offline. However, I want users to be able to write Python code snippets, add emojis and allow users to copy the Python code for easier access.

### Output Summary

Generated implementation boilerplate for enhancing text chat features, including support for Python snippets, emoji usage and code-copy functionality.

### Action Taken

- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

### Author Notes

AI assistance was used to extend an already existing text chat feature. I modified the implementation to match the existing dark theme and verified that it worked correctly within the current system.

---

## Date/Time

2026-04-11 16:14

### Tool

ChatGPT

### Prompt/Command

Can you help to fix the collaboration-service test case that is currently failing for CI? It has been happening quite frequently.

### Output Summary

Identified and resolved a failing collaboration-service CI test case.

### Action Taken

- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

### Author Notes

The fix addressed an existing issue in the test suite. I verified that the CI pipeline passed successfully after applying the solution.

---

## Date/Time

2026-04-11 17:15

### Tool

ChatGPT

### Prompt/Command

Generate the implementation logic and React state management for a profile picture selection modal using a set of pre-defined image URLs from pixabay

### Output Summary

Generated implementation boilerplate for selectable preuploaded profile image support.

### Action Taken

- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

### Author Notes

The feature requirement was already defined. I modified the implementation and ensured that the selected images were appropriate for use.

---

## Date/Time

2026-04-12 14:30

### Tool

ChatGPT

### Prompt/Command

Review this specific Jest test file for the collaboration service. It is failing intermittently in CI due to a race condition between the WebSocket connection and the test teardown. Suggest a fix using done() or proper async/await handling.

### Output Summary

Identified the race condition in the test case and provided a fix using proper async handling.

### Action Taken

- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

### Author Notes

I applied the fix and verified that the issue was resolved in GitHub Actions and subsequent CI runs.
