---
name: commit-feature
description: >-
  Use this skill when a feature, bugfix, or refactor is complete and the user
  asks to commit the changes to git. Covers pre-commit verification, selective
  staging, splitting changes into logical commits, commit message formatting,
  and post-commit checks.
---

# Commit Feature Workflow

Follow these steps whenever a feature or refactor is finished and ready to be committed.

## Steps

1. **Inspect Working Tree**
   Run `git status -s` and `git diff --stat` to review all modified and untracked files.
   - Ensure no `.env` files, credentials, or unintended temporary files are included.

2. **Run Pre-Commit Checks**
   Verify the codebase compiles and passes lint before committing:
   - Run `npx tsc --noEmit`
   - Run `npx eslint <changed-files>` (or `npx expo lint`)
   Fix any errors before proceeding.

3. **Plan Commit Grouping (Single vs. Multiple Commits)**
   Decide whether all changes belong in one commit or should be split into multiple commits for separation of concerns and clarity.
   - Use **multiple commits** when changes span distinct concerns (e.g., preparatory refactors, types/schema updates, core logic, UI components, tests, or docs/config).
   - Order commits logically so earlier commits do not depend on later ones (e.g., refactor or types first, feature implementation next, tests/docs after).

4. **Stage and Commit Each Logical Group**
   For a single commit, or once per logical group when making multiple commits:
   - Stage only the files belonging to that group using explicit paths:
     `git add <file1> <file2> ...`
     (Use `git add -p <file>` if a single file contains changes for different concerns.)
     Avoid blindly running `git add -A` if unrelated work or untracked files are present.
   - Commit with a concise, imperative message scoped to that group:
     `git commit -m "<short summary>"`

5. **Verify Commits**
   Run `git status -s` and `git log -n <count> --stat` (where `<count>` is the number of commits created) to confirm all commits succeeded and the working tree is in the expected state.
