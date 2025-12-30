# AI Agents Guidelines

This document defines the rules that **all AI tools, agents, and assistants must follow across this project.**
Every commit, PR, build, or automated action executed by an AI must comply with these standards.

----

## 1. Commit Message Standards

### 1.1 Use Conventional Commits
AI agents **must always write meaningful commit messages** following the **Conventional Commits** specification:

```
<type>(optional scope): <short summary>
<detailed description of what changed and why>
BREAKING CHANGE: <optional>
```

Common types include:

- feat: new feature
- fix: bug fix
- docs: documentation changes
- refactor: code restructuring
- test: tests added or updated
- chore: maintenance tasks
- perf: performance improvements
- style: formatting or lint-only updates

### 1.2 Include a Detailed Description
Every commit message **must include a descriptive body** explaining:

- What changed
- Why it changed
- Any relevant context

### 1.3 Example Commit Messages

**Good:**
```
test: add comprehensive tests for AriesPaymentService
Added unit tests for determineBMSPaymentStatus and deductBnplPayment methods.
Tests cover all payment status transitions and error scenarios.
Uses MockK for mocking dependencies following project conventions.
Co-authored-by: Windsurf <windsurf@codeium.ai>
```

**Good:**
```
fix(payment): correct BNPL deduction error handling
Fixed exception message formatting to include itinerary ID.
Improved error logging for failed BNPL payment deductions.
Co-authored-by: Windsurf <windsurf@codeium.ai>
```

---

## 2. Co-Author Requirements

### 2.1 AI Agents Must Commit Using Their Own Identity
If an AI agent performs a commit, it must add a `Co-authored-by:` trailer using its **correct identity and canonical email**.

#### Known AI Agents and Their Required Identities

| Agent / Tool         | Required Co-Author Line |
|----------------------|--------------------------|
| **Windsurf**         | Co-authored-by: Windsurf <windsurf@codeium.ai> |
| **Cursor AI**        | Co-authored-by: Cursor AI <cursor@cursor.ai> |
| **GitHub Copilot**   | Co-authored-by: GitHub Copilot <copilot@github.com> |
| **ChatGPT**          | Co-authored-by: ChatGPT <chatgpt@openai.com> |
| **Claude**           | Co-authored-by: Claude <noreply@anthropic.com> |

### 2.2 Rules for Agents NOT Listed Above
If an AI agent is **not** in the list above, it must:

1. Use its **official name** as the display label
2. Use its **official domain-based email**, if known
3. If no official email is available, use fallback format:
   ```
   <agent-name>@unknown-ai.local
   ```

4. Construct the co-author trailer as:
   ```
   Co-authored-by: <Agent Name> <<email>>
   ```

#### Example (unknown agent)

```
Co-authored-by: NeoCodeAI <neocodeai@unknown-ai.local>
```

If the agent has a domain, use:

```
Co-authored-by: NeoCodeAI <bot@neocode.ai>
```

### 2.3 Placement Rules
- `Co-authored-by:` must appear **only at the footer**, never inside the description body.
- One blank line must separate the commit body and the trailer.
- No duplicate trailers.
- Only one identity per agent.

Correct:

```
fix: resolve caching header issue
Updated cache invalidation logic to avoid stale reads.
Co-authored-by: Cursor AI <cursor@cursor.ai>
```

Incorrect:

❌ Co-author inside body
❌ Wrong or placeholder email
❌ Duplicated identity lines

### 2.4 Multiple AI Agents Collaborating
If multiple agents contributed, list each one:

```
Co-authored-by: Cursor AI <cursor@cursor.ai>
Co-authored-by: Windsurf <windsurf@codeium.ai>
Co-authored-by: ChatGPT <chatgpt@openai.com>
```

### 2.5 Identity Validation
Before committing, the agent must validate:

- Its identity matches the table or fallback rules
- The co-author line appears **only** in the footer
- Formatting is correct

If identity cannot be determined, the agent must ask:

```
I do not recognize my agent identity. Should I use this co-author line?
Co-authored-by: <Agent Name> <generated-email>
```

---

## 3. Workflow After Making Changes

### 3.1 Ask Before Committing
After generating or updating files, the AI agent must ask:

> **"Should I commit these changes?"**
---
