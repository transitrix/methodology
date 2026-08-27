# `assembled_on` relation tests

This example directory contains test fixtures for the `assembled_on` relation kind validator.

## Test cases

**Positive tests** (should validate without errors):
- `REL-APP-ASSEMBLED-ON-PRODUCT-1`: Application release assembled on a product release (different subject types)
- `REL-PRODUCT-ASSEMBLED-ON-APP-1`: Product release assembled on an application release (different subject types)

**Negative tests** (should produce validator errors):
- `REL-INVALID-NOT-RELEASE-FROM-1`: Source endpoint is not a RELEASE (REL-001)
- `REL-INVALID-NOT-RELEASE-TO-1`: Target endpoint is not a RELEASE (REL-001)  
- `REL-INVALID-UNRESOLVED-FROM-1`: Source endpoint references an unadmitted/missing RELEASE (REL-002)
- `REL-INVALID-UNRESOLVED-TO-1`: Target endpoint references an unadmitted/missing RELEASE (REL-002)

## Structure

Each test case is a self-contained relation file. Positive-test relations reference the admitted RELEASE elements defined in this example. Negative-test relations are designed to trigger specific validator codes.
