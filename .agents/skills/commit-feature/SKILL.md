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
   - Commit with a clear, explanatory message scoped to that group:
     - **Subject line (Conventional Commits):** Use `<type>(<optional-scope>): <clear imperative summary>` (e.g., `feat`, `fix`, `refactor`, `docs`, `chore`, `test`). Keep it specific and readable on its own (~50–72 characters).
     - **Explanatory body:** Required for all non-trivial changes; a single clear subject line is fine for tiny tweaks (e.g., typo fixes or one-line config updates).
       - Explain **why** the change was made (context or problem being solved) and **what** changed at a high level.
       - Use plain English and short bullet points when listing multiple key details, so a future reader can understand the intent and impact from `git log` without reading the full diff.
     - Use multiple `-m` flags (which works reliably in both PowerShell and bash) to write multi-line messages:
       ```bash
       git commit -m "<type>(<scope>): <clear summary>" -m "<why this change is needed and key details>"
       ```

5. **Verify Commits**
   Run `git status -s` and `git log -n <count> --stat` (where `<count>` is the number of commits created) to confirm all commits succeeded, the messages read clearly, and the working tree is in the expected state.

## Example Commit Message

```text
feat(plants): track watering intervals per plant

Plants previously shared a fixed 7-day reminder, which caused overwatering
notifications for succulents and missed alerts for tropical plants.

- Add `watering_interval_days` column to the plants schema
- Update the plant creation form to let users set a custom interval
- Calculate next watering dates from each plant's configured interval
```
