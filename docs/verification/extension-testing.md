# Chrome Extension V2 — Testing Reference

This document describes how to execute and verify the application journey verification test suites.

## 1. Test Architecture

The tests cover:
- **Session Manager & Idempotency**: Ensuring sessions are created, recovered on refresh, and duplicate events are ignored.
- **Scoring Engine**: Validating correct positive score allocation for different phases of the journey (portal detection, resume upload, submission confirmation, etc.).
- **URL Parser**: Mapping URLs to appropriate portals and identifiers.
- **Portals**: Verification against the Greenhouse adapter.

## 2. Test Execution

The verification tests are located in `testing/tests/verification/` and are built using Vitest.

To run only the verification tests:
```bash
npm run test --prefix testing -- tests/verification/
```

To run the entire workspace test runner:
```bash
npm run test --prefix testing
```

## 3. Test Cases covered

- **Test 1**: Temporary success toast matches.
- **Test 2**: Successful post-submission network response checks.
- **Test 3**: Dashboard redirect and new application matchups.
- **Test 4**: Verification Journey scoring validations (0, partial, complete 100/100).
- **Test 5**: Verification Session & Event duplication idempotency checks.
- **Test 6**: CRM check endpoint URL matching logic.
