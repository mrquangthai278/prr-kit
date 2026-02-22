# LangChain — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from 'langchain'`, `from '@langchain/`, `langchain`, `LLMChain`, `ChatOpenAI`, `PromptTemplate`, `AgentExecutor`, `VectorStore`

---

## Security
- **[CRITICAL]** User input inserted directly into a system prompt or template without sanitization → prompt injection allows the user to override system instructions or extract confidential prompt content. Treat all user input as untrusted data; use structured output parsers instead of raw string insertion.
- **[CRITICAL]** Agent configured with `PythonREPLTool`, `BashTool`, or other arbitrary code execution tools → a prompt injection attack causes the agent to execute malicious code on the server. Disable code-execution tools in production; use sandboxed environments with strict allowlists if required.
- **[HIGH]** LLM-generated output used directly in code execution paths, SQL queries, or shell commands without validation → second-order injection. Always validate and escape LLM output before using it in downstream operations.
- **[HIGH]** Vector store containing sensitive or multi-tenant data queried without per-user access control → user A retrieves user B's embedded documents. Partition vector stores by user/tenant or apply metadata filters on every retrieval query.
- **[HIGH]** LLM provider API keys stored in environment variables without rotation or access auditing → stolen key results in unbounded API cost. Use a secrets manager with automatic rotation; monitor API usage for anomalies.
- **[MEDIUM]** Conversation history persisted in a database with user PII and no encryption or retention policy → privacy regulation violation. Encrypt conversation records at rest and enforce a retention/deletion policy.
- **[MEDIUM]** Agent given a web search or HTTP request tool without restrictions → SSRF attack causes agent to probe internal network services. Restrict tool-accessible URLs to an allowlist and block private IP ranges.

---

## Performance
- **[HIGH]** LLM responses not streamed for long-running generation → end-user sees a blank UI until the full response arrives. Use `stream: true` or `astream()` and emit tokens progressively to the client.
- **[HIGH]** Full conversation history sent to the LLM on every turn without summarisation → context window fills up, responses degrade, and costs scale linearly with conversation length. Apply `ConversationSummaryBufferMemory` or trim history to a rolling window.
- **[HIGH]** No caching configured for identical or similar prompts → every request hits the LLM API, inflating cost and latency. Enable `langchain.cache` with an in-memory, Redis, or SQLite backend for deterministic prompts.
- **[MEDIUM]** Sequential LLM calls that are independent of each other → total latency is the sum of all calls. Use `RunnableParallel` to execute independent chains concurrently.
- **[MEDIUM]** Entire large document embedded as a single chunk → exceeds context window limits and retrieval quality degrades. Use `RecursiveCharacterTextSplitter` with appropriate `chunk_size` and `chunk_overlap`.
- **[MEDIUM]** Synchronous LangChain APIs used inside an async application framework → event loop blocked during LLM calls. Use async chain methods (`ainvoke`, `astream`) throughout async code.
- **[LOW]** Embeddings recomputed for the same documents on every application restart → unnecessary API cost and startup latency. Persist embeddings to a vector store with disk or database backing.

---

## Architecture
- **[HIGH]** Prompt text hardcoded as inline string literals → prompts not version controlled, reviewed, or A/B testable. Store prompts as `PromptTemplate` objects in dedicated files or manage them via LangChain Hub.
- **[HIGH]** Agent tools not explicitly scoped with descriptions and parameter schemas → agent misuses tools or attempts to call non-existent capabilities. Define each tool with a precise description and use `args_schema` with Pydantic models.
- **[MEDIUM]** LangSmith tracing not enabled in production → no observability into chain execution, token usage, or latency. Set `LANGCHAIN_TRACING_V2=true` and configure the LangSmith API key for all environments.
- **[MEDIUM]** Retrieval and generation tightly coupled in one chain → cannot optimise, test, or swap retrieval independently. Separate the retrieval step (query transformation, vector search, reranking) from the generation step.
- **[MEDIUM]** `ConversationChain` or `LLMChain` used instead of LCEL (LangChain Expression Language) → legacy API with limited composability. Migrate to `Runnable` pipes (`chain = prompt | llm | parser`) for maintainability.
- **[LOW]** Prompt versions not tracked in LangChain Hub or a version control system → impossible to roll back a prompt regression. Commit prompts to version control and tag releases.

---

## Code Quality
- **[HIGH]** LLM response parsed with string splitting or regex instead of output parsers → brittle parsing breaks on minor format variation. Use `PydanticOutputParser`, `JsonOutputParser`, or `StructuredOutputParser` with format instructions in the prompt.
- **[HIGH]** No retry or fallback logic for LLM API rate limit or transient errors → single request failure surfaces directly to the user. Wrap chain invocations with `.with_retry()` or a try/except with exponential backoff, and configure `with_fallbacks()` for model failover.
- **[MEDIUM]** Chain not tested with adversarial or edge-case inputs → prompt injection and malformed output not caught before production. Write unit tests with mocked LLMs and integration tests with boundary inputs.
- **[MEDIUM]** Conversation history not managed with `RunnableWithMessageHistory` → manual history threading is error-prone and inconsistent. Use `RunnableWithMessageHistory` with a `BaseChatMessageHistory` backend.
- **[MEDIUM]** `AgentExecutor` `verbose=True` left on in production → internal chain reasoning and tool calls logged to stdout. Set `verbose=False` in production and route structured logs to an observability platform.
- **[LOW]** LangChain version pinned with a broad range (`>=0.1`) → breaking API changes introduced silently. Pin to an exact minor version and review the changelog before upgrading.

---

## Common Bugs & Pitfalls
- **[HIGH]** `AgentExecutor` created without `max_iterations` or `max_execution_time` → agent enters an infinite reasoning loop, generating unbounded API costs. Always set `max_iterations` (e.g., 10) and `max_execution_time` as safeguards.
- **[HIGH]** Vector store not persisted to disk or a database → all embeddings lost on application restart and must be recomputed. Use a persistent backend (Chroma with `persist_directory`, Pinecone, pgvector) and load on startup.
- **[MEDIUM]** Token count not validated before sending to the LLM → request exceeds the model's context window and the API returns an error. Count tokens with the model's tokenizer before each request and truncate or summarise if needed.
- **[MEDIUM]** `ConversationBufferMemory` used without a maximum token or turn limit → memory grows without bound until the context window is exceeded. Replace with `ConversationBufferWindowMemory` or `ConversationSummaryBufferMemory`.
- **[MEDIUM]** Tool `description` is vague or overlaps with another tool → agent calls the wrong tool or oscillates between tools. Write unambiguous, action-oriented descriptions that clearly distinguish each tool's purpose.
- **[LOW]** Chain inputs not validated with Pydantic before invocation → malformed inputs produce confusing internal errors. Define input schemas with Pydantic and validate at the chain entry point.
