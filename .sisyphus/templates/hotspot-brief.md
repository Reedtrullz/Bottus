# Hotspot Brief: {{FILE_NAME}}

> **TL;DR**: {{ONE_SENTENCE_SUMMARY}}
>
> **File**: `{{FILE_PATH}}`
> **Lines**: ~{{LINE_COUNT}}
> **Hotspot Level**: {{HIGH|MEDIUM|LOW}}

---

## Overview

### Purpose
{{WHAT_THIS_FILE_DOES}}

### Context
{{HOW_IT_FITS_INTO_LARGER_SYSTEM}}

---

## Metrics

| Metric | Value |
|--------|-------|
| Lines of Code | ~{{LINE_COUNT}} |
| Functions | {{COUNT}} |
| Classes | {{COUNT}} |
| Exports | {{COUNT}} |
| Cyclomatic Complexity | {{ESTIMATE}} |

### Dependencies
- **Inbound**: {{FILES_THAT_IMPORT_THIS}}
- **Outbound**: {{FILES_THAT_THIS_IMPORTS}}

---

## Hotspots

### Identified Hotspots

| Location | Lines | Issue | Severity |
|----------|-------|-------|----------|
| `{{FUNCTION_NAME}}` | L{{START}}-{{END}} | {{ISSUE_DESCRIPTION}} | {{HIGH|MEDIUM|LOW}} |

### Code Smells
- {{CODE_SMELL_1}}
- {{CODE_SMELL_2}}

### Testing Coverage
- {{TEST_COVERAGE_STATUS}}
- Missing tests: {{WHAT_ISNT_TESTED}}

---

## Risks

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {{RISK_1}} | {{HIGH|MEDIUM|LOW}} | {{HIGH|MEDIUM|LOW}} | {{MITIGATION}} |

### Dependencies Risk

| Dependency | Status | Risk Level |
|------------|--------|------------|
| `{{PACKAGE_NAME}}` | {{ACTIVE|ARCHIVED|DEPRECATED}} | {{HIGH|MEDIUM|LOW}} |

---

## Recommendations

### Immediate Actions
1. {{ACTION_1}}
2. {{ACTION_2}}

### Refactoring Opportunities

#### 1. {{OPPORTUNITY_NAME}}
**Current**:
```typescript
// {{DESCRIPTION_OF_CURRENT_CODE}}
```

**Proposed**:
```typescript
// {{DESCRIPTION_OF_PROPOSED_CHANGE}}
```

**Effort**: {{SMALL|MEDIUM|LARGE}}
**Benefit**: {{DESCRIPTION}}

#### 2. {{OPPORTUNITY_NAME}}
**Current**:
```typescript
// {{DESCRIPTION_OF_CURRENT_CODE}}
```

**Proposed**:
```typescript
// {{DESCRIPTION_OF_PROPOSED_CHANGE}}
```

**Effort**: {{SMALL|MEDIUM|LARGE}}
**Benefit**: {{DESCRIPTION}}

---

## Tests

### Existing Tests
- {{TEST_FILE_1}}
- {{TEST_FILE_2}}

### Recommended Tests

| Test Case | Type | Priority |
|-----------|------|----------|
| {{TEST_DESCRIPTION}} | {{UNIT|INTEGRATION|E2E}} | {{HIGH|MEDIUM|LOW}} |

### Test Strategy
{{HOW_TESTS_SHOULD_BE_STRUCTURED}}

---

## Migration Notes

### Migration Risk Assessment

> **Library**: `{{LIBRARY_NAME}}`
> **Current Version**: `{{VERSION}}`
> **Status**: {{ACTIVE|ARCHIVED|DEPRECATED}}

#### Risk Factors
- **Maintenance Status**: {{STATUS}}
- **Community Support**: {{LEVEL}}
- **Security Updates**: {{YES|NO|UNKNOWN}}
- **Node.js Compatibility**: {{VERSION_RANGE}}

#### Migration Options

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| `{{OPTION_1}}` | {{PROS}} | {{CONS}} | {{SMALL|MEDIUM|LARGE}} |
| `{{OPTION_2}}` | {{PROS}} | {{CONS}} | {{SMALL|MEDIUM|LARGE}} |

#### Recommended Path
{{RECOMMENDATION}}

#### Rollback Plan
{{HOW_TO_ROLLBACK_IF_NEEDED}}

---

## Related Documentation

- **Architecture**: {{LINK_OR_REFERENCE}}
- **Related Briefs**: {{LINK_TO_RELATED_BRIEFS}}
- **AGENTS.md**: {{LINK_TO_AGENTS}}

---

*Last updated: {{DATE}}*
*Review due: {{REVIEW_DATE}}*
