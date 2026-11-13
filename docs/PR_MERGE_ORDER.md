# Implementation PR merge order

All implementation work is proposed through feature branches. The repository owner performs every PR merge; no merge automation is enabled.

Two starting branches target main independently:

1. `feature/delivery-domain`: domain contracts, mock gateway, and tests.
2. `feature/supabase-backend`: database schema, permissions, transactional server commands, and backend tests.

The app work is stacked to keep each review focused:

3. `feature/mock-delivery-app` targets `feature/delivery-domain`.
4. `feature/connected-client` targets `feature/mock-delivery-app`; its connected behavior also requires the backend PR.
5. `feature/notifications-media` targets `feature/connected-client`; its worker also requires the backend schema.
6. `feature/portfolio-quality` targets `feature/notifications-media`.

Merge the domain and backend foundations first, then the app stack in order. Review the PR's base before merging. After a parent merges, retarget its child to main if GitHub has not done so automatically. Rebase when needed to resolve changes from the newly merged main and rerun checks.

Use a merge strategy that preserves the shared commits in the stacked history, or restack the descendants after squashing/rebasing a parent. Do not force-push rewritten shared history without coordinating the dependent PRs.

An open PR is not evidence of a deployed backend. Hosted Supabase configuration, platform signing/push credentials, and native hardware validation remain separate setup and acceptance requirements. Consult each PR's validation report for what actually ran.
