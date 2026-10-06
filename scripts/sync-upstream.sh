#!/usr/bin/env bash
# Merge colinhacks/zod (upstream) into this fork without losing fork metadata or the CVE-2023-54404 patch.
# Never reset or force-push: the @zklogic package metadata and publish workflow must survive.
set -euo pipefail

UPSTREAM_URL="https://github.com/colinhacks/zod.git"
UPSTREAM_BRANCH="${1:-main}"
PKG="packages/zod/package.json"
# Files whose conflicts are resolved by taking upstream and re-applying fork metadata/version.
META_FILES="packages/zod/package.json packages/zod/jsr.json packages/zod/src/v4/core/versions.ts"

if [ "$(git branch --show-current)" != "development" ]; then
  echo "Run this on the development branch (all fork work lives there)." >&2
  exit 1
fi

git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
# --no-tags: upstream release tags would clash with this fork's release tags.
git fetch upstream --no-tags

FORK_VERSION="$(node -p "require('./$PKG').version")"

if git merge "upstream/$UPSTREAM_BRANCH" --no-edit; then
  echo "Merged cleanly."
else
  CONFLICTS="$(git diff --name-only --diff-filter=U)"
  for f in $CONFLICTS; do
    case " $META_FILES " in
      *" $f "*) git checkout --theirs "$f" ;;
      *)
        echo "Conflict needs a manual resolve (e.g. the array issue cap in schemas.ts/core.ts): $f" >&2
        exit 1
        ;;
    esac
  done
fi

node scripts/apply-fork-metadata.cjs --version "$FORK_VERSION"
git add $META_FILES
git diff --cached --quiet || git commit -q -m "chore: re-apply @zklogic fork metadata after upstream sync"
echo "Done. Review 'git log', then rebuild and re-run the array tests before releasing."
