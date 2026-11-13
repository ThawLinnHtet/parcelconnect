# ParcelConnect pull request merge order

The repository owner controls every merge. No automation merges PRs, and the implementation agent does not merge them.

The delivery-domain foundation was merged by the owner as [PR #1](https://github.com/ThawLinnHtet/parcelconnect/pull/1). The remaining review sequence is:

1. `feature/supabase-backend` → `main` (independent backend foundation).
2. `feature/mock-delivery-app` → `main` (domain is already present in main).
3. `feature/connected-client` → `feature/mock-delivery-app` (connected operation also requires the backend PR).
4. `feature/notifications-media` → `feature/connected-client` (push worker and private media need the backend schema).
5. `feature/portfolio-quality` → `feature/notifications-media`.

The app and backend PRs may be reviewed and merged independently. Merge the backend before testing connected Auth, Storage, or push. Then merge the app before its connected-client child, followed by notifications/media and portfolio quality.

After a parent PR merges, retarget its child to `main` when appropriate and rebase descendants if the parent was squashed. The original domain PR was squashed; the app branch was restacked onto the updated `main` so its PR will not repeat the domain diff. Check each PR's base and diff before merging.

An open PR does not indicate a deployed backend. Hosted Supabase configuration, EAS/platform push credentials, and native hardware checks remain separate setup and acceptance requirements. See each PR body for verified coverage.
