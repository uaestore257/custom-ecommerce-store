#!/usr/bin/env bash
# Migration release gate (see .github/workflows/migration-gate.yml and
# docs/operations.md → "Release order").
#
# Fails when the pull request changes anything under prisma/migrations/
# unless it carries the `db-migrated` label. Vercel deploys `main`
# automatically after merge, so code that needs a new migration must not
# reach `main` before that migration has been applied to production with
# `npm run db:deploy:production`.
#
# Secret-free and read-only: it only compares two commits with git and reads
# the PR's labels. It never connects to a database or applies migrations.
#
# Inputs (environment):
#   BASE_SHA               the PR's base commit
#   HEAD_SHA               the PR's head commit
#   HAS_DB_MIGRATED_LABEL  "true" when the PR has the db-migrated label
set -euo pipefail

: "${BASE_SHA:?BASE_SHA is required}"
: "${HEAD_SHA:?HEAD_SHA is required}"
LABEL="db-migrated"

# Three-dot diff: only what this PR changes relative to where it branched.
changed="$(git diff --name-only "${BASE_SHA}...${HEAD_SHA}" -- prisma/migrations)"

if [ -z "${changed}" ]; then
  echo "No changes under prisma/migrations/. Migration gate passed."
  exit 0
fi

echo "This pull request changes Prisma migrations:"
printf '%s\n' "${changed}" | sed 's/^/  /'

if [ "${HAS_DB_MIGRATED_LABEL:-false}" = "true" ]; then
  echo
  echo "The '${LABEL}' label is present: the release operator has confirmed the"
  echo "production migration was applied with 'npm run db:deploy:production'."
  echo "Migration gate passed."
  exit 0
fi

cat <<MESSAGE

::error title=Production migration required before merge::This PR changes prisma/migrations/ but has no '${LABEL}' label.
Vercel deploys main automatically after merge, so the application would go live
before its database migration. Before merging:

  1. The authorized release operator applies the migration to production with
     the official procedure: npm run db:deploy:production
     (docs/operations.md → "Release order").
  2. They verify it read-only: npx prisma migrate status
  3. Only then they add the '${LABEL}' label to this PR (this check re-runs).

Never add '${LABEL}' before the production migration has succeeded.
MESSAGE
exit 1
