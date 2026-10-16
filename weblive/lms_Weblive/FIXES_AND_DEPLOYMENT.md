# Student portal corrections

- Student submission appears on any chapter once all 16 chapters are completed, rather than only Chapter 16.
- Assessment requirement is visible; submission is disabled until the quiz is passed.
- Completed project submissions unlock the next selected project and the UI automatically opens it.
- A successful upload remains successful even when the optional tracking-stop call fails.
- File uploads no longer retry automatically, preventing duplicate 50 MB submissions.
- Excel generation is debounced/coalesced rather than spawning one workbook for every activity write.
- Hard-coded MongoDB URI removed from source; configure backend environment variables.
- ZIP extension validation tightened; server checks ZIP signature.

## Deploy

1. Run `cd backend && npm install && npm test && npm start`.
2. Set `MONGODB_URI` and `JWT_SECRET` securely on the backend host. The database credential previously embedded in source must be rotated.
3. Host frontend with backend at the same origin, or configure allowed CORS origins and API URL.
4. Store `backend/uploads` on persistent storage: ephemeral hosting may delete student ZIP files after redeploy/restart.
5. Back up `backend/data.json` and MongoDB before replacing live files.
6. Verify full login → select → 16 chapters → quiz ≥70% → upload ZIP → automatic next project with a test student.

**Limitations:** Tests here are static/local only; a live production MongoDB and real browser/camera/cloud storage are not available. Uploaded student data is left intact.
