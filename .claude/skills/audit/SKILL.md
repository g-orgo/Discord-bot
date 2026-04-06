# Audit workflow - Ensure code quality and consistency

Validate code quality and consistency throughout the project.

## 1.  Read copilot instructions
- `e:/raptor/raptor-chatbot/.github/copilot-instructions.md`

## 2. Read existing context files
Read the `.md` files from `.claude/context/` that are relevant to the task:
- `e:/raptor/raptor-chatbot/.claude/context/app.md` — Express server / interaction dispatch
- `e:/raptor/raptor-chatbot/.claude/context/game.md` — RPS game logic
- `e:/raptor/raptor-chatbot/.claude/context/commands.md` — slash command registration
- `e:/raptor/raptor-chatbot/.claude/context/utils.md` — shared utilities

## 3. Perform the audit

- Review the codebase for adherence to the conventions and patterns defined in the copilot instructions and existing context.
- Identify any inconsistencies, potential bugs, or areas for improvement.
- Document findings and suggest actionable recommendations for any issues discovered. Focus on key areas such as module structure, component usage, in-memory state management, and overall code organization.
- Update relevant files that may require changes based on the audit findings, ensuring that all modifications align with the established conventions and patterns.

## 4. Save audit report

After completing the audit, create a report in the `.claude/audits/` directory. The report must include:
- **Date:** today's date (YYYY-MM-DD)
- **Summary:** brief overview of the audit findings and recommendations
- **Files reviewed:** list of all files audited with a short description of each
- **Issues found:** detailed description of any issues discovered, categorized by severity (e.g., critical, major, minor)
- **Recommendations:** actionable suggestions for addressing each issue, including any relevant code snippets or references to best practices.

## 5. Create .md file for stakeholders
Create a summary `.md` file in `e:/raptor/raptor-chatbot/.claude/context` or overwrite the previous one under the name of "audit.md" with a non-technical summary of the audit findings and recommendations for stakeholders who may not be familiar with the technical details. This file should be concise and focus on the key takeaways from the audit, avoiding technical jargon and providing clear explanations of any issues and their potential impact on the project. Also it should be cool and engaging to read, with emojis and a friendly tone to make it more enjoyable for stakeholders to read (add emojis).

## 6. Commit and push changes
After completing the audit and updating the relevant files, commit all changes to the repository with a clear and descriptive commit message summarizing the audit findings and any modifications made. Then, push the changes to the remote repository to ensure that all stakeholders have access to the latest audit report and any related updates.


---

$ARGUMENTS
