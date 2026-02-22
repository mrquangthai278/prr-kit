# OpenAI API — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'openai'`, `import openai`, `OpenAI()`, `client.chat.completions`, `OPENAI_API_KEY`, `gpt-4`, `gpt-3.5`, `dall-e`

---

## Security
- **[CRITICAL]** `OPENAI_API_KEY` included in client-side JavaScript bundles or mobile app binaries → key extractable by any user, enabling unauthorized API usage at the application's expense. Move all API calls server-side; never expose the key to the client.
- **[HIGH]** Raw user input passed as the `content` of the system message → prompt injection allows users to override system instructions or leak the system prompt. Treat user content as untrusted; separate it clearly from system instructions and validate structure.
- **[HIGH]** LLM output rendered directly as HTML or passed to `eval()` without sanitization → XSS or code injection if the model generates malicious content. Sanitize all model output before rendering; never use `innerHTML` or `eval` with LLM responses.
- **[HIGH]** Project API key not used; account-level key with full access granted instead → compromise of one service exposes all projects and billing. Use project-scoped keys with the minimum required model and endpoint permissions.
- **[MEDIUM]** Conversation history containing user PII stored without encryption or a defined retention policy → privacy regulation violation. Encrypt stored conversations and enforce a deletion schedule aligned with your privacy policy.
- **[MEDIUM]** Function calling tools configured with dangerous side effects (file deletion, sending emails, database writes) without a human-in-the-loop confirmation step → agent autonomously takes destructive actions. Require explicit user confirmation before executing irreversible tool calls.

---

## Performance
- **[HIGH]** Chat completions not streamed (`stream: false`) for responses that users wait for → UI appears frozen until the full response is returned. Use `stream: true` with server-sent events or WebSocket to emit tokens progressively.
- **[HIGH]** `max_tokens` not set → model generates the maximum possible response length regardless of task needs, inflating cost and latency. Set `max_tokens` to a reasonable upper bound for the specific task.
- **[HIGH]** No request-level or semantic caching for prompts with repeated or identical inputs → every request hits the API, accumulating unnecessary cost. Implement exact-match caching (Redis) for deterministic prompts; use OpenAI's prompt caching for long system prompts.
- **[MEDIUM]** `gpt-4` (or `gpt-4o`) used for simple classification or extraction tasks where `gpt-4o-mini` is sufficient → 10-25x higher cost with no quality benefit. Profile task requirements and choose the smallest model that meets the quality bar.
- **[MEDIUM]** Batch API not used for offline processing jobs → synchronous requests at standard pricing for workloads that tolerate async processing. Use the Batch API for 50% cost reduction on non-latency-sensitive tasks.
- **[LOW]** `logprobs` not requested when the application needs uncertainty estimation → downstream logic cannot assess model confidence. Request `logprobs: true` and `top_logprobs` when the application needs to branch on model certainty.

---

## Architecture
- **[HIGH]** API calls made directly from the frontend application → API key exposed, no server-side rate limiting, no cost controls per user. Create a backend proxy endpoint that authenticates users, applies rate limits, and forwards requests to OpenAI.
- **[HIGH]** No fallback model or provider configured → primary model unavailability causes complete feature outage. Implement a fallback chain: primary model to a smaller model or alternative provider using the same interface.
- **[MEDIUM]** System prompts and message templates hardcoded as string literals in application code → prompts not versioned, reviewed, or A/B testable. Extract prompts to dedicated template files or a prompt management system with version control.
- **[MEDIUM]** No per-user or per-session token budget enforced → a single user can consume the entire API quota. Track token usage per user with a counter in Redis or a database and enforce soft/hard limits.
- **[MEDIUM]** Requests and responses not logged for debugging and quality monitoring → impossible to diagnose failures or improve prompts. Log sanitized request/response pairs (with PII removed) to an observability platform.
- **[LOW]** API version not pinned in the client configuration → a model deprecation or API change silently breaks the application. Pin the model name and use a specific API version header; subscribe to OpenAI's deprecation notifications.

---

## Code Quality
- **[HIGH]** No error handling for `RateLimitError`, `APIConnectionError`, `APIStatusError` → transient errors surface directly to users as unhandled exceptions. Wrap all API calls in a try/except block and handle each error type with appropriate user messaging or retry.
- **[HIGH]** No retry logic with exponential backoff for rate limit and server errors → temporary API issues cause permanent request failures. Implement retry with jitter, honouring the `Retry-After` response header when present.
- **[MEDIUM]** `temperature` set to a fixed value regardless of use case → high temperature for factual extraction produces hallucinations; low temperature for creative tasks produces repetitive output. Set `temperature` per task type: near 0 for factual/structured, 0.7-1.0 for creative.
- **[MEDIUM]** System prompt not tested against injection attempts → adversarial inputs bypass system instructions in production. Test the system prompt with known injection patterns and add instruction hierarchy enforcement.
- **[MEDIUM]** TypeScript response types not validated at runtime → `response.choices[0].message.content` accessed without null checking, crashing when the API returns an unexpected shape. Use Zod or the SDK's typed interfaces and validate before accessing nested fields.
- **[LOW]** `presence_penalty` and `frequency_penalty` not considered for long-form generation tasks → repetitive output degrades quality in summaries or stories. Tune these parameters based on the output domain.

---

## Common Bugs & Pitfalls
- **[HIGH]** `finish_reason: 'length'` not checked → truncated responses treated as complete, producing partial JSON, cut-off sentences, or incomplete function calls. Always check `finish_reason` and handle `'length'` by requesting continuation or increasing `max_tokens`.
- **[HIGH]** Function/tool call response not checked for `finish_reason: 'tool_calls'` before parsing `tool_calls` → accessing `tool_calls` when `finish_reason` is `'stop'` causes a null dereference. Gate all `tool_calls` parsing behind a `finish_reason === 'tool_calls'` check.
- **[MEDIUM]** Token counting implemented with a character-based heuristic instead of the correct tokenizer → prompts silently exceed context limits at the API boundary. Use the `tiktoken` library with the model-specific encoding for accurate token counting.
- **[MEDIUM]** File or image uploads not validated for size and MIME type before sending → requests rejected by the API with a cryptic error after upload. Validate file size against API limits and allowed content types client-side before uploading.
- **[MEDIUM]** `message.content` accessed directly when the response may be a tool call message → `content` is `null` for `assistant` messages with `tool_calls`. Check the `role` and `finish_reason` before accessing `content`.
- **[LOW]** `seed` parameter not used in tests → non-deterministic responses make automated testing of prompt behaviour unreliable. Set `seed` to a fixed value in tests to increase response consistency.
