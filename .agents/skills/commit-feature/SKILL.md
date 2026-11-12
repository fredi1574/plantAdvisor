---
name: commit-feature
description: >-
  Use this skill when a feature, bugfix, or refactor is complete and the user
  asks to commit the changes to git. Covers pre-commit verification, selective
  staging, commit message formatting, and post-commit checks.
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

3. **Stage Intended Files**
   Stage only the files belonging to the completed feature using explicit paths:
   `git add <file1> <file2> ...`
   Avoid blindly running `git add -A` if unrelated work or untracked files are present.

4. **Commit With a Clear Message**
   Write a concise, imperative commit message describing what the feature or refactor does:
   `git commit -m "<short summary>"`

5. **Verify Commit**
   Run `git status -s` and `git log -n 1 --stat` to confirm the commit succeeded and the working tree is in the expected state.
