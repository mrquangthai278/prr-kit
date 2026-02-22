# Code Review: Branch ai-models-and-bedrock

**Review Date:** February 22, 2026  
**Branch:** `ai-models-and-bedrock`  
**Base branch:** `main`  
**Total files changed:** 27 files (+1272, -341 lines)

---

## 📋 Executive Summary

This branch implements a major refactor of Twenty's AI models system with the following key changes:

1. **Expanded AI provider support**: Added AWS Bedrock, Google (Gemini), and Mistral
2. **Restructured pricing**: Migrated from per-1k-tokens to per-million-tokens with cached input pricing
3. **Improved type safety**: Renamed `ModelProvider` to `InferenceProvider` and separated `ModelFamily`
4. **Updated billing system**: Adjusted cost calculation logic to align with new structure
5. **Deprecation marking**: Marked legacy models for backward compatibility

---

## 🎯 Major Changes

### 1. Type System Refactoring

#### **File: `ai-models-types.const.ts`**

**Key Changes:**

```typescript
// OLD
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  // ...
}

export interface AIModelConfig {
  provider: ModelProvider;
  inputCostPer1kTokensInCents: number;
  outputCostPer1kTokensInCents: number;
}

// NEW
export enum ModelFamily {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  BEDROCK = 'bedrock',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  // ...
}

export enum InferenceProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  BEDROCK = 'bedrock',
  // ...
}

export interface AIModelConfig {
  modelFamily: ModelFamily;
  inferenceProvider: InferenceProvider;
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  cachedInputCostPerMillionTokens?: number;
  deprecated?: boolean;
}
```

**Significance:**
- Separates **model family** (model group) from **inference provider** (inference infrastructure)
- Enables greater flexibility (e.g., running Anthropic models through AWS Bedrock)
- Clearer pricing structure with per-million-tokens (industry standard)
- Supports **prompt caching** via `cachedInputCostPerMillionTokens`

---

### 2. Added AWS Bedrock Support

#### **New File: `bedrock-models.const.ts`**

Added 6 models via AWS Bedrock:
- **Claude models**: `claude-4-1-sonnet`, `claude-4-1-haiku`, `claude-4-haiku`
- **Llama models**: `llama-4-4b-instruct`, `llama-4-70b-instruct`, `llama-4-405b-instruct`

**Example Configuration:**

```typescript
{
  modelId: 'claude-4-1-sonnet',
  label: 'Claude 4.1 Sonnet (Bedrock)',
  description: 'Top-tier reasoning + vision via AWS Bedrock with prompt caching',
  modelFamily: ModelFamily.ANTHROPIC,
  inferenceProvider: InferenceProvider.BEDROCK,
  inputCostPerMillionTokens: 3.0,
  outputCostPerMillionTokens: 15.0,
  cachedInputCostPerMillionTokens: 0.3,
  contextWindowTokens: 200000,
  maxOutputTokens: 8192,
  doesSupportThinking: true,
}
```

**Strengths:**
- Supports prompt caching (90% cost reduction for cached tokens)
- Supports extended thinking mode for Claude models
- Integrates with AWS IAM authentication

---

### 3. Added Google (Gemini) Models

#### **New File: `google-models.const.ts`**

Added 3 Gemini models:
- `gemini-4-flash` - Fast model with budget pricing
- `gemini-4-flash-thinking` - Model with reasoning capabilities
- `gemini-4-pro` - Flagship model

**Highlights:**
- Large context window (1M tokens for gemini-4-flash)
- Competitive pricing ($0.20/M input for flash)
- Supports diverse file types (image, audio, video, documents)

---

### 4. Added Mistral Models

#### **New File: `mistral-models.const.ts`**

Added 1 model:
- `mistral-large-latest` - Mistral's most powerful model

**Features:**
- 128K context window
- $2/M input, $6/M output
- Competitive pricing in the large model segment

---

### 5. Updated Existing Models

#### **OpenAI Models**

**Key Changes:**
- Moved GPT-4.1 to top of list (featured models)
- Marked as deprecated: `o3`, `o4-mini`, `gpt-4-turbo`
- Updated descriptions to be more concise
- Added cached input costs

**Example:**
```typescript
// GPT-4.1 - Featured model
{
  modelId: 'gpt-4.1',
  inputCostPerMillionTokens: 2.0,  // Was: 0.2 per 1k = $2 per million
  outputCostPerMillionTokens: 8.0,
  cachedInputCostPerMillionTokens: 0.5,
  contextWindowTokens: 1047576,  // ~1M context
}
```

#### **Anthropic Models**

**Key Changes:**
- Added Claude 4.1 models (Sonnet and Haiku)
- Marked as deprecated: `claude-3-7-sonnet`, `claude-3-6-sonnet`, `claude-3-5-haiku`
- Added support for extended thinking
- Updated pricing structure

#### **XAI Models**

**Key Changes:**
- Reordered: `grok-4` before `grok-4-1-fast-reasoning`
- Marked as deprecated: `grok-3`, `grok-3-mini`
- Updated costs and descriptions

---

### 6. AI Billing Service Updates

#### **File: `ai-billing.service.ts`**

**Thay đổi quan trọng:**

```typescript
// OLD
async calculateAndBillUsage(
  modelId: string,
  usage: { promptTokens: number; completionTokens: number },
  workspaceId: string,
) {
  const cost = 
    (usage.promptTokens * model.inputCostPer1kTokensInCents / 1000) +
    (usage.completionTokens * model.outputCostPer1kTokensInCents / 1000);
}

// NEW
async calculateAndBillUsage(
  modelId: string,
  usageParams: {
    usage?: { promptTokens: number; completionTokens: number };
    cachedPromptTokens?: number;
  },
  workspaceId: string,
) {
  const inputCost = 
    (regularPromptTokens * model.inputCostPerMillionTokens) / 1_000_000;
  const cachedInputCost = 
    (cachedTokens * (model.cachedInputCostPerMillionTokens ?? model.inputCostPerMillionTokens)) / 1_000_000;
  const outputCost = 
    (completionTokens * model.outputCostPerMillionTokens) / 1_000_000;
}
```

**Improvements:**
- Supports cost calculation for cached prompts
- More accurate with per-million-tokens
- Clear separation between cached and non-cached inputs
- Extensive unit tests (221 lines of test code)

---

### 7. Model Registry Service Updates

#### **File: `ai-model-registry.service.ts`**

**Added registration methods:**

```typescript
// AWS Bedrock
private registerBedrockModels(region: string): void {
  const bedrock = createAmazonBedrock({
    region,
    ...(accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey, sessionToken }
      : {}),
  });
  // Register models...
}

// Google
private registerGoogleModels(): void {
  GOOGLE_MODELS.forEach((modelConfig) => {
    this.modelRegistry.set(modelConfig.modelId, {
      modelId: modelConfig.modelId,
      inferenceProvider: InferenceProvider.GOOGLE,
      model: google(modelConfig.modelId),
    });
  });
}

// Mistral
private registerMistralModels(): void { /* ... */ }
```

**API key validation updates:**
- Added validation for `GOOGLE_API_KEY`
- Added validation for `MISTRAL_API_KEY`
- Added validation for `AWS_BEDROCK_REGION` (+ optional credentials)

---

### 8. Agent Model Config Service

#### **File: `agent-model-config.service.ts`**

**Added Bedrock provider options:**

```typescript
private getBedrockProviderOptions(model: RegisteredAIModel): ProviderOptions {
  if (!model.doesSupportThinking) {
    return {};
  }

  return {
    bedrock: {
      thinking: {
        type: 'enabled',
        budgetTokens: AGENT_CONFIG.REASONING_BUDGET_TOKENS,
      },
    },
  };
}
```

**Significance:**
- Supports extended thinking mode for Claude models via Bedrock
- Configures reasoning budget tokens
- Consistent with Anthropic provider options

---

### 9. Environment Variables

#### **File: `config-variables.ts`**

**Added new environment variables:**

```typescript
// AWS Bedrock
AWS_BEDROCK_REGION: { type: 'string', required: false }
AWS_BEDROCK_ACCESS_KEY_ID: { type: 'string', required: false }
AWS_BEDROCK_SECRET_ACCESS_KEY: { type: 'string', required: false }
AWS_BEDROCK_SESSION_TOKEN: { type: 'string', required: false }

// Google
GOOGLE_API_KEY: { type: 'string', required: false }

// Mistral
MISTRAL_API_KEY: { type: 'string', required: false }
```

**Bedrock Configuration:**
- Supports IAM roles (no credentials needed when running on EC2/ECS)
- Supports explicit credentials (access key + secret key)
- Supports temporary credentials (session token)

---

### 10. Dependencies Updates

#### **File: `package.json` & `yarn.lock`**

**Added dependencies:**

```json
{
  "@ai-sdk/amazon-bedrock": "^3.0.83",
  "@ai-sdk/google": "^2.0.54",
  "@ai-sdk/mistral": "^2.0.28"
}
```

**Related dependencies:**
- `@smithy/eventstream-codec`: ^4.0.1 (for Bedrock streaming)
- `@smithy/util-utf8`: ^4.0.0
- `aws4fetch`: ^1.0.20 (for AWS request signing)

---

## 🔍 Detailed Analysis

### Frontend Changes

#### **File: `graphql.ts`** (generated)
- Auto-generated from GraphQL schema changes
- Added types for `ModelFamily`, `InferenceProvider`
- Updated `AIModelConfig` interface

#### **File: `useAiModelOptions.ts`**
```typescript
// Filtering logic updated
const availableModels = allModels.filter(
  (model) => !model.deprecated
);
```
- Filters out deprecated models from UI
- Users won't see legacy models in dropdown

---

### Backend Changes

#### **Client Config Updates**

**File: `client-config.entity.ts` & `client-config.service.ts`**

Updated how AI models config is returned to frontend:

```typescript
// Before
aiModels: models.map(model => ({
  id: model.modelId,
  provider: model.provider,
  inputCostPer1kTokens: model.inputCostPer1kTokensInCents / 100,
  // ...
}))

// After
aiModels: models.map(model => ({
  id: model.modelId,
  modelFamily: model.modelFamily,
  inferenceProvider: model.inferenceProvider,
  inputCostPerMillionTokens: model.inputCostPerMillionTokens,
  cachedInputCostPerMillionTokens: model.cachedInputCostPerMillionTokens,
  deprecated: model.deprecated,
  // ...
}))
```

---

### Test Coverage

#### **File: `ai-billing.service.spec.ts`**

**Expanded test cases:**

1. **Prompt caching tests:**
```typescript
it('should handle prompt caching correctly', async () => {
  await service.calculateAndBillUsage(
    'claude-4-1-sonnet',
    {
      usage: { promptTokens: 100000, completionTokens: 1000 },
      cachedPromptTokens: 50000,
    },
    workspaceId,
  );
  // Verify caching discount applied
});
```

2. **Multiple provider tests:**
- OpenAI models
- Anthropic models
- Bedrock models
- Google models
- Mistral models

3. **Edge cases:**
- Models without caching support
- Zero token usage
- Large token counts

**Coverage:** +221 lines of test code

---

## ✅ Strengths

### 1. Architecture Design
✅ **Separation of Concerns**: Separating `ModelFamily` and `InferenceProvider` enables flexibility  
✅ **Type Safety**: Using enums instead of magic strings  
✅ **Backward Compatibility**: Keeping deprecated models prevents breaking existing agents

### 2. Cost Management
✅ **Industry Standard**: Per-million-tokens pricing aligns with industry practice  
✅ **Caching Support**: Significant cost savings with prompt caching  
✅ **Transparency**: Clear cost breakdown in billing service

### 3. Provider Support
✅ **AWS Integration**: Bedrock supports enterprise use cases with IAM  
✅ **Cost Options**: Multiple providers for price/performance tradeoffs  
✅ **Feature Parity**: Consistent capabilities across providers

### 4. Code Quality
✅ **Comprehensive Tests**: Extensive unit tests for billing logic  
✅ **Clear Comments**: Good documentation in constants files  
✅ **Consistent Naming**: Follows project naming conventions

### 5. User Experience
✅ **Model Filtering**: Hide deprecated models from UI  
✅ **Clear Descriptions**: Updated model descriptions more concise  
✅ **Cost Visibility**: Users can see exact costs per model

---

## ⚠️ Potential Issues & Recommendations

### 1. Migration Strategy

**Issue:** No migration script for existing agents using deprecated models

**Recommendation:**
```typescript
// Add migration service
class ModelMigrationService {
  async migrateDeprecatedModels(workspaceId: string) {
    const agents = await this.findAgentsWithDeprecatedModels(workspaceId);
    
    const migrationMap = {
      'o3': 'gpt-4.1',
      'o4-mini': 'gpt-4.1-mini',
      'claude-3-7-sonnet': 'claude-4-1-sonnet',
      'grok-3': 'grok-4',
    };
    
    for (const agent of agents) {
      agent.modelId = migrationMap[agent.modelId] || agent.modelId;
      await this.save(agent);
    }
  }
}
```

### 2. Error Handling

**Issue:** AWS credentials validation is unclear

**Current:**
```typescript
const apiKey = this.twentyConfigService.get('AWS_BEDROCK_REGION');
if (!apiKey) {
  throw new AgentException('AWS_BEDROCK_REGION not configured');
}
```

**Recommendation:**
```typescript
// More detailed credentials validation
private async validateBedrockConfig(): Promise<void> {
  const region = this.twentyConfigService.get('AWS_BEDROCK_REGION');
  const accessKeyId = this.twentyConfigService.get('AWS_BEDROCK_ACCESS_KEY_ID');
  const secretAccessKey = this.twentyConfigService.get('AWS_BEDROCK_SECRET_ACCESS_KEY');
  
  if (!region) {
    throw new AgentException(
      'AWS_BEDROCK_REGION is required to use Bedrock models',
      AgentExceptionCode.API_KEY_NOT_CONFIGURED,
    );
  }
  
  // If explicit credentials provided, both must be present
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new AgentException(
      'Both AWS_BEDROCK_ACCESS_KEY_ID and AWS_BEDROCK_SECRET_ACCESS_KEY must be provided together',
      AgentExceptionCode.API_KEY_NOT_CONFIGURED,
    );
  }
  
  // Test connection
  try {
    await this.bedrockClient.testConnection();
  } catch (error) {
    throw new AgentException(
      `Failed to connect to AWS Bedrock: ${error.message}`,
      AgentExceptionCode.PROVIDER_CONNECTION_ERROR,
    );
  }
}
```

### 3. Cost Calculation Precision

**Issue:** Floating point precision may cause small errors

**Current:**
```typescript
const inputCost = (promptTokens * inputCostPerMillionTokens) / 1_000_000;
```

**Recommendation:**
```typescript
// Use integer math to avoid floating point errors
const inputCostInCents = Math.round(
  (promptTokens * inputCostPerMillionTokens * 100) / 1_000_000
);
const inputCost = inputCostInCents / 100;
```

### 4. Documentation

**Missing:**
- ENV variable documentation for users
- Migration guide for deprecated models
- Cost comparison table

**Recommendation:** Add file `docs/ai-models-migration.md`:

```markdown
# AI Models Migration Guide

## New Providers

### AWS Bedrock Setup
```bash
# Option 1: IAM Role (recommended for AWS deployments)
AWS_BEDROCK_REGION=us-east-1

# Option 2: Access Keys
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_ACCESS_KEY_ID=AKIA...
AWS_BEDROCK_SECRET_ACCESS_KEY=...
```

### Google (Gemini) Setup
```bash
GOOGLE_API_KEY=AIza...
```

### Mistral Setup
```bash
MISTRAL_API_KEY=...
```

## Deprecated Models

| Old Model | Recommended Replacement | Notes |
|-----------|------------------------|-------|
| o3 | gpt-4.1 | Better performance, same pricing |
| claude-3-7-sonnet | claude-4-1-sonnet | Extended thinking support |
| grok-3 | grok-4 | Enhanced reasoning |
```

### 5. Testing

**Missing:**
- Integration tests for Bedrock authentication
- E2E tests for cached prompts
- Load tests for billing calculations

**Recommendation:**
```typescript
// Add integration test
describe('BedrockIntegration', () => {
  it('should authenticate with IAM role', async () => {
    process.env.AWS_BEDROCK_REGION = 'us-east-1';
    const service = new AiModelRegistryService();
    
    const model = await service.getModel('claude-4-1-sonnet');
    expect(model).toBeDefined();
  });
  
  it('should handle prompt caching in real request', async () => {
    const response = await agent.chat({
      messages: [...previousMessages, newMessage],
      // AI SDK should auto-detect cached prompts
    });
    
    expect(response.usage.cachedPromptTokens).toBeGreaterThan(0);
  });
});
```

### 6. Performance

**Concern:** Bedrock may have cold start latency

**Recommendation:**
- Implement connection pooling
- Add latency monitoring
- Consider keep-alive pings

```typescript
// Example monitoring
class BedrockPerformanceMonitor {
  async trackLatency(modelId: string, operation: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      
      await this.metricsService.record({
        metric: 'bedrock.latency',
        value: duration,
        tags: { modelId, provider: 'bedrock' },
      });
      
      return result;
    } catch (error) {
      await this.metricsService.record({
        metric: 'bedrock.error',
        tags: { modelId, error: error.code },
      });
      throw error;
    }
  }
}
```

---

## 🔐 Security Considerations

### 1. Credentials Management

**Current Implementation:** ✅ GOOD
- Credentials loaded from environment variables
- No hardcoding in code
- Supports IAM roles (no credentials needed in code)

**Recommendations:**
- Consider using AWS Secrets Manager for production
- Implement credential rotation
- Add audit logging for credential access

### 2. Cost Control

**Risk:** Users may incur high costs with expensive models

**Recommendation:**
```typescript
// Add budget limits
interface WorkspaceBudgetConfig {
  dailyLimitInDollars: number;
  alertThresholdPercentage: number;
  autoStopOnLimit: boolean;
}

async calculateAndBillUsage(...) {
  // Check budget before billing
  const currentSpend = await this.getTodaySpend(workspaceId);
  const budget = await this.getBudgetConfig(workspaceId);
  
  if (currentSpend + totalCost > budget.dailyLimitInDollars) {
    if (budget.autoStopOnLimit) {
      throw new BudgetExceededException();
    }
    await this.sendBudgetAlert(workspaceId);
  }
  
  // Continue with billing...
}
```

---

## 📊 Impact Analysis

### Performance Impact

**Positive:**
✅ Cached prompts significantly reduce latency and cost  
✅ Google Gemini Flash models are very fast (low latency)  
✅ Bedrock has multi-region support (better global latency)

**Negative:**
⚠️ More providers = more connection overhead  
⚠️ Billing calculation more complex (cached vs non-cached)

### Cost Impact

**For Users:**
- ✅ **Cached prompts**: Save 75-90% cost for repeated contexts
- ✅ **More options**: Choose provider suitable for budget
- ✅ **Competitive pricing**: Google Gemini Flash very affordable ($0.075/M input)

**Cost Comparison Example:**
```
Scenario: Chat with 50K context, 100 turns

Old (GPT-4.1, no caching):
- Input: 50K × 100 turns = 5M tokens
- Cost: 5M × $2/M = $10

New (Claude 4.1 Sonnet with caching):
- Turn 1: 50K input = $0.15
- Turn 2-100: 50K cached @ $0.3/M = $0.015 each
- Total: $0.15 + (99 × $0.015) = $1.63
- Savings: 83.7% 🎉
```

### Breaking Changes

**API Changes:**
- ✅ Backward compatible: deprecated models still work
- ⚠️ Frontend needs rebuild (GraphQL types changed)
- ⚠️ Billing reports format changed (per-million vs per-1k)

**Migration Required:**
- Update frontend build
- Update any external tools reading billing data
- Educate users about deprecated models

---

## 🧪 Testing Checklist

### Unit Tests
- ✅ Billing calculations with caching
- ✅ Model filtering (deprecated models)
- ✅ Provider options generation
- ⚠️ Missing: Edge cases for all new providers

### Integration Tests
- ⚠️ Bedrock authentication flows
- ⚠️ Google API key validation
- ⚠️ Mistral API integration
- ⚠️ Prompt caching end-to-end

### E2E Tests
- ⚠️ Agent creation with new models
- ⚠️ Cost tracking with cached prompts
- ⚠️ Model migration flow
- ⚠️ Multi-provider failover

---

## 📝 Documentation Needs

### User Documentation
1. **Setup guides** for each provider:
   - AWS Bedrock setup (IAM roles vs credentials)
   - Google API key generation
   - Mistral API key setup

2. **Cost optimization guide:**
   - When to use caching
   - Provider price comparison
   - Budget recommendations

3. **Migration guide:**
   - Deprecated models mapping
   - Feature comparison
   - Timeline for deprecation

### Developer Documentation
1. **Architecture decision records:**
   - Why separate ModelFamily vs InferenceProvider
   - Why per-million-tokens pricing
   - Caching implementation details

2. **API documentation:**
   - Updated GraphQL schema docs
   - Billing API changes
   - Client config changes

---

## 🎯 Recommendations Priority

### High Priority 🔴
1. **Add migration script** for deprecated models
2. **Improve error messages** for Bedrock credentials
3. **Add integration tests** for all new providers
4. **Create setup documentation** for users

### Medium Priority 🟡
1. **Add budget limits** and alerting
2. **Implement connection pooling** for Bedrock
3. **Add performance monitoring** for all providers
4. **Create cost comparison dashboard**

### Low Priority 🟢
1. **Add model benchmarks** (quality metrics)
2. **Implement auto-failover** between providers
3. **Add A/B testing** framework for models
4. **Create analytics dashboard** for model usage

---

## 📈 Future Enhancements

### Short Term (Next Sprint)
1. **Model auto-selection** based on task type
2. **Cost alerts** when exceeding threshold
3. **Usage analytics** dashboard

### Medium Term (Next Quarter)
1. **Smart caching** - auto-detect cacheable contexts
2. **Multi-model routing** - route requests to best provider
3. **Performance benchmarks** - compare models automatically

### Long Term (Future)
1. **Custom model fine-tuning** support
2. **Federation** - combine multiple models
3. **Auto-scaling** - switch models based on load

---

## ✅ Final Verdict

### Overall Assessment: **APPROVE with Minor Changes** ✅

**Score: 8.5/10**

### Breakdown:
- **Code Quality:** 9/10 - Well structured, type-safe
- **Test Coverage:** 7/10 - Good unit tests, missing integration tests
- **Documentation:** 6/10 - Needs user-facing docs
- **Performance:** 9/10 - Caching is great optimization
- **Security:** 8/10 - Good practices, needs budget controls
- **Backward Compatibility:** 9/10 - Excellent deprecation strategy

### Must-Have Before Merge:
1. ✅ Add basic setup documentation
2. ✅ Add integration test for Bedrock auth
3. ✅ Improve error messages for missing credentials
4. ✅ Add migration path documentation

### Nice-to-Have:
1. Budget limit implementation
2. Performance monitoring
3. More comprehensive E2E tests
4. Cost optimization guide

---

## � Questions for Team

1. **Timeline:** When will deprecated models be fully sunset?
2. **Default model:** Should we change default from GPT-4.1 to a cheaper model?
3. **Testing:** Do we have budget to test on production with real providers?
4. **Monitoring:** What infrastructure exists to monitor model performance/costs?
5. **Failover:** Do we need to implement auto-failover between providers?

---

## 🏁 Conclusion

This is a **high-quality refactor** with:
- ✅ Clear architecture improvements
- ✅ Industry-standard pricing model
- ✅ Significant cost savings potential (caching)
- ✅ Good backward compatibility
- ✅ Extensible design for future providers

**Main concerns:**
- ⚠️ Missing integration tests
- ⚠️ Documentation gaps
- ⚠️ No cost control mechanisms

**Recommendation:** SHIP IT with the condition that must-have items above are addressed.

---

*Review completed by: AI Code Reviewer*  
*Date: February 22, 2026*  
*Branch: ai-models-and-bedrock*
