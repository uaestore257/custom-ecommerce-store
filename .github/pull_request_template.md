## Summary

<!-- What changes and why. -->

## Checks

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Tests (`npm run test:unit`, plus `npm run test:setup` / integration where relevant)
- [ ] `npm run build`

## Database migrations

Vercel deploys `main` automatically after merge. A migration must be applied to
production **before** this PR merges (docs/operations.md → "Release order").

- [ ] This PR does **not** change `prisma/migrations/`
- [ ] This PR **does** change `prisma/migrations/`, and:
  - [ ] The production migration was applied with `npm run db:deploy:production`
  - [ ] `npx prisma migrate status` confirms production is up to date
  - Applied on (date): <!-- YYYY-MM-DD -->
  - Applied by (release operator): <!-- name -->
  - [ ] Production was not reset, pushed with `prisma db push` or otherwise destructively modified
  - [ ] The `db-migrated` label was added only after the steps above succeeded
