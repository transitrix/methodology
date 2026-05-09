# Transitrix Architecture Examples

This document provides concrete examples of elements and relations for different architectural scenarios.

---

## Example 1: E-Commerce Order Processing System

### Scenario
We're modeling a complete e-commerce platform's order processing workflow, from customer request through fulfillment.

### Elements to Create

#### Motivation Layer (01_motivation)

**File: `GOAL-REV-001.yaml`**
```yaml
id: "GOAL-REV-001"
name: "Increase Order Processing Efficiency"
type: "Goal"
layer: "Motivation"

metadata:
  status: "Active"
  owner: "cto.email"
  created_at: "2026-05-03"
  updated_at: "2026-05-03"
  tags: ["operational", "revenue"]

properties:
  description: "Reduce order processing time from 4 hours to 30 minutes"
  scope: "Enterprise"
  priority: "Critical"
  timeline: "2026-Q3"
  success_criteria:
    - "Average order processing time < 30 minutes"
    - "System availability > 99.9%"
    - "Customer satisfaction score > 4.5/5"
```

#### Business Layer (02_business)

**File: `PROC-ORD-FULFILL.bpmn.transitrix.yaml`** (BPMN Process)
```yaml
id: "PROC-ORD-FULFILL"
name: "Order Fulfillment Process"
type: "BusinessProcess"
layer: "Business"

metadata:
  status: "Active"
  owner: "operations.manager"
  created_at: "2026-05-03"
  tags: ["core-process", "customer-facing"]

properties:
  description: "End-to-end order fulfillment from request to delivery"
  scope: "Order Management"
  frequency: "Continuous"
  avg_duration_minutes: 120
  criticality: "Critical"

bpmn:
  start_event:
    id: "START_ORDER"
    name: "Customer Places Order"
    event_type: "None"

  activities:
    - id: "VALIDATE_ORDER"
      name: "Validate Order"
      type: "ServiceTask"
      assigned_role: null
      required_system: "APP-ORDER-VALIDATOR"

    - id: "PROCESS_PAYMENT"
      name: "Process Payment"
      type: "ServiceTask"
      assigned_role: null
      required_system: "APP-PAYMENT-SERVICE"

    - id: "PICK_PACK"
      name: "Pick and Pack Items"
      type: "UserTask"
      assigned_role: "ROLE-WAREHOUSE-PICKER"
      required_system: null

    - id: "SHIP_ORDER"
      name: "Ship Order"
      type: "ServiceTask"
      assigned_role: null
      required_system: "APP-SHIPPING-INTEGRATION"

  sequences:
    - id: "FLOW_1"
      source_id: "START_ORDER"
      target_id: "VALIDATE_ORDER"
      name: ""

    - id: "FLOW_2"
      source_id: "VALIDATE_ORDER"
      target_id: "PROCESS_PAYMENT"
      name: ""

    - id: "FLOW_3"
      source_id: "PROCESS_PAYMENT"
      target_id: "PICK_PACK"
      name: ""

    - id: "FLOW_4"
      source_id: "PICK_PACK"
      target_id: "SHIP_ORDER"
      name: ""

  end_event:
    id: "END_SHIPPED"
    name: "Order Shipped"
    event_type: "None"

metrics:
  sla_completion_hours: 24
  target_completion_rate_percent: 98
  average_processing_time_minutes: 120
  bottleneck_activity: "PICK_PACK"

resources:
  required_roles: ["ROLE-WAREHOUSE-PICKER", "ROLE-ORDER-PROCESSOR"]
  required_systems: ["APP-ORDER-VALIDATOR", "APP-PAYMENT-SERVICE", "APP-SHIPPING-INTEGRATION"]
  required_data: ["Customer Data", "Order Details", "Inventory Data"]
```

**File: `ROLE-ORDER-PROCESSOR.yaml`**
```yaml
id: "ROLE-ORDER-PROCESSOR"
name: "Order Processor"
type: "BusinessRole"
layer: "Business"

metadata:
  status: "Active"
  owner: "ops.manager"
  created_at: "2026-05-03"
  tags: ["operational", "core"]

properties:
  description: "Processes customer orders and manages fulfillment workflow"
  scope: "Order Management Department"
  criticality: "Critical"
  responsibility_area: "Order Processing"
  competencies:
    - "Order Management"
    - "Customer Communication"
    - "System Usage (Order Management System)"

governance:
  approval_required: false
  compliance_frameworks: ["PCI-DSS"]
```

#### Application Layer (03_application)

**File: `ORDER_API.yaml`**
```yaml
id: "APP-ORD-API-001"
name: "Order Processing API"
type: "ApplicationComponent"
layer: "Application"

metadata:
  status: "Active"
  owner: "backend.team"
  created_at: "2026-05-03"
  tags: ["microservice", "critical"]

properties:
  description: "REST API for order placement, validation, and status tracking"
  criticality: "Critical"
  tech_stack: "FastAPI, Python 3.12"
  programming_language: "Python"
  repository_url: "https://github.com/ecommerce/order-api"
  api_type: "REST"
  api_endpoints:
    - "POST /api/v1/orders"
    - "GET /api/v1/orders/{order_id}"
    - "PUT /api/v1/orders/{order_id}/cancel"
  data_classification: "Internal"
  deployment_model: "Kubernetes"
  scaling_strategy: "Horizontal"
  sla_availability: "99.9%"

versioning:
  current_version: "2.3.1"
  release_cycle: "Continuous"

dependencies:
  - "APP-ORDER-VALIDATOR-001"
  - "APP-PAYMENT-SERVICE-001"
  - "APP-NOTIFICATION-SERVICE-001"

quality_attributes:
  test_coverage: "87%"
  security_scanning: true
  performance_tested: true

governance:
  change_control_required: true
  approval_required: true
  build_pipeline: "GitHub Actions"
```

**File: `PAYMENT_SERVICE.yaml`**
```yaml
id: "APP-PAYMENT-SERVICE-001"
name: "Payment Processing Service"
type: "ApplicationComponent"
layer: "Application"

metadata:
  status: "Active"
  owner: "payments.team"
  created_at: "2026-05-03"
  tags: ["microservice", "security-critical"]

properties:
  description: "Handles payment processing, fraud detection, and transaction recording"
  criticality: "Critical"
  tech_stack: "Node.js, Express.js, TypeScript"
  programming_language: "TypeScript"
  repository_url: "https://github.com/ecommerce/payment-service"
  api_type: "REST"
  api_endpoints:
    - "POST /api/v1/payments/process"
    - "GET /api/v1/payments/{transaction_id}/status"
  data_classification: "Confidential"  # Handles sensitive payment data
  deployment_model: "Kubernetes"
  sla_availability: "99.95%"

dependencies:
  - "APP-FRAUD-DETECTION-001"
  - "EXT-STRIPE-GATEWAY"

quality_attributes:
  test_coverage: "95%"
  security_scanning: true
  performance_tested: true
```

#### Technology Layer (04_technology)

**File: `POSTGRES_PRIMARY.yaml`**
```yaml
id: "NODE-DB-ORDERS-PRIMARY"
name: "PostgreSQL Orders Database - Primary"
type: "Node"
layer: "Technology"

metadata:
  status: "Active"
  owner: "infrastructure.team"
  created_at: "2026-05-03"
  tags: ["database", "production", "critical"]

properties:
  description: "Primary PostgreSQL database for order and transaction data"
  criticality: "Critical"
  infrastructure_type: "Database"
  deployment_location: "AWS us-east-1a"
  environment: "Production"
  instance_count: 1

  cpu_cores: 16
  memory_gb: 64
  storage_gb: 1000
  network_throughput_mbps: 10000

  vendor: "AWS"
  product_name: "RDS PostgreSQL 15.3"
  license_type: "Commercial"
  license_expiry: "2027-12-31"

  support_level: "Premium"
  maintenance_window: "Sunday 02:00-06:00 UTC"
  end_of_life: "2028-12-31"

  encryption_at_rest: true
  encryption_in_transit: true
  security_certifications: ["ISO27001", "SOC2"]
  backup_strategy: "Hourly WAL backups, daily snapshots"
  disaster_recovery_plan: "RTO: 2h, RPO: 15min, standby in us-east-1b"

capacity:
  current_utilization_percent: 45
  max_capacity_threshold_percent: 80
  growth_projection_percent_per_year: 20

operations:
  monitoring_tool: "CloudWatch, Prometheus"
  log_retention_days: 90
  metrics_retention_days: 365
  alerting_enabled: true

cost_allocation:
  monthly_cost_usd: 2500
  cost_center: "Infrastructure"
  chargeback_model: "Shared"

references:
  parent_node: null
  connected_nodes: ["NODE-DB-ORDERS-STANDBY"]
  hosted_applications: ["APP-ORD-API-001", "APP-PAYMENT-SERVICE-001"]
```

**File: `KUBERNETES_CLUSTER.yaml`**
```yaml
id: "NODE-K8S-PROD-01"
name: "Production Kubernetes Cluster"
type: "Node"
layer: "Technology"

metadata:
  status: "Active"
  owner: "platform.team"
  created_at: "2026-05-03"
  tags: ["kubernetes", "production", "orchestration"]

properties:
  description: "Production Kubernetes cluster running microservices"
  criticality: "Critical"
  infrastructure_type: "Compute"
  deployment_location: "AWS us-east-1 (Multi-AZ)"
  environment: "Production"
  instance_count: 12  # Worker nodes

  cpu_cores: 384  # 32 cores × 12 nodes
  memory_gb: 768  # 64GB × 12 nodes
  storage_gb: 5000  # Shared storage

  vendor: "AWS"
  product_name: "Amazon EKS (Kubernetes 1.28)"
  license_type: "Commercial"

  support_level: "Enterprise"
  maintenance_window: "Weekly rolling updates"
  end_of_life: "2026-12-31"  # Plan K8s version upgrade

  encryption_at_rest: true
  encryption_in_transit: true
  security_certifications: ["ISO27001", "CIS Kubernetes Benchmark"]
  backup_strategy: "Persistent volume snapshots hourly"
  disaster_recovery_plan: "RTO: 30min, RPO: 1hour, multi-region replication"

capacity:
  current_utilization_percent: 65
  max_capacity_threshold_percent: 85
  growth_projection_percent_per_year: 25

operations:
  monitoring_tool: "Prometheus + Grafana"
  log_retention_days: 30
  metrics_retention_days: 90
  alerting_enabled: true

cost_allocation:
  monthly_cost_usd: 8000
  cost_center: "Platform Infrastructure"
  chargeback_model: "Tiered by namespace CPU/Memory"

references:
  connected_nodes: ["NODE-DB-ORDERS-PRIMARY"]
  hosted_applications: ["APP-ORD-API-001", "APP-PAYMENT-SERVICE-001", "APP-NOTIFICATION-SERVICE-001"]
```

### Relations Between Elements

**File: `APP_TO_DB_01.yaml`** (Order API → PostgreSQL)
```yaml
id: "REL-APP-ORD-API-TO-DB"

source:
  id: "APP-ORD-API-001"
  type: "ApplicationComponent"

target:
  id: "NODE-DB-ORDERS-PRIMARY"
  type: "Node"

type: "Access"

metadata:
  status: "Active"
  created_at: "2026-05-03"
  created_by: "architecture.team"

properties:
  description: "Order API reads and writes order data to PostgreSQL"
  criticality: "Critical"
  protocol: "PostgreSQL (TCP)"
  port: 5432
  encrypted: true
  data_classification: "Internal"
  data_volume_per_day_gb: 150
  synchronous: true
  expected_latency_ms: 50
  throughput_requests_per_second: 5000

governance:
  change_control_required: true
  impact_analysis_required: true
```

**File: `PROC_TO_APP_01.yaml`** (Order Process uses Order API)
```yaml
id: "REL-PROC-TO-API"

source:
  id: "PROC-ORD-FULFILL"
  type: "BusinessProcess"

target:
  id: "APP-ORD-API-001"
  type: "ApplicationComponent"

type: "Realization"

metadata:
  status: "Active"
  created_at: "2026-05-03"
  created_by: "architecture.team"

properties:
  description: "Order Fulfillment process is implemented by Order API"
  criticality: "Critical"

governance:
  change_control_required: true
```

---

## Example 2: Minimal Setup for Small Team

If you're just starting, you can begin with a simpler structure:

### Minimum Elements
1. **One Goal** - What are we trying to achieve?
2. **One Business Process** - How do we do it?
3. **One Application Component** - What system supports it?
4. **One Infrastructure Node** - Where does it run?
5. **Relations** - How do they connect?

### Quick Template (Simplified)

**File: `SIMPLE_GOAL.yaml`**
```yaml
id: "GOAL-MVP-001"
name: "Launch MVP Product"
type: "Goal"
layer: "Motivation"

metadata:
  status: "Active"
  owner: "team.lead@company.com"
  created_at: "2026-05-03"

properties:
  description: "Get first version to production by Q2 2026"
  priority: "Critical"
  timeline: "2026-06-30"
  success_criteria:
    - "System operational in production"
    - "First users onboarded"
```

**File: `SIMPLE_PROCESS.yaml`**
```yaml
id: "PROC-MVP-001"
name: "Core User Workflow"
type: "BusinessProcess"
layer: "Business"

metadata:
  status: "Active"
  owner: "team.lead@company.com"
  created_at: "2026-05-03"

properties:
  description: "Primary workflow users will follow"
  criticality: "High"
```

**File: `SIMPLE_APP.yaml`**
```yaml
id: "APP-MVP-001"
name: "MVP Application"
type: "ApplicationComponent"
layer: "Application"

metadata:
  status: "Draft"
  owner: "dev.team@company.com"
  created_at: "2026-05-03"

properties:
  description: "Main application serving MVP features"
  tech_stack: "React, Node.js"
  repository_url: "https://github.com/company/mvp"
```

**File: `SIMPLE_SERVER.yaml`**
```yaml
id: "NODE-SERVER-001"
name: "Production Server"
type: "Node"
layer: "Technology"

metadata:
  status: "Draft"
  owner: "ops.team@company.com"
  created_at: "2026-05-03"

properties:
  description: "Single server running MVP app"
  deployment_location: "AWS us-east-1"
  environment: "Production"
  instance_count: 1
```

---

## How to Use These Examples

1. **For reference:** Read through to understand structure and content
2. **For copy-paste:** Adapt any example to your scenario
3. **For templates:** Use as base for `.templates/elements/` if needed
4. **For team training:** Show these to colleagues to explain the format

---

## Tips for Writing Good Descriptions

✅ **Good:**
```yaml
description: "REST API for managing customer orders, handling validation, payment processing, and status updates. Serves mobile and web clients with real-time order tracking."
```

❌ **Poor:**
```yaml
description: "Order API"
```

---

## More Patterns

Need more examples? Check:
- `.templates/` for barebones templates
- `GETTING_STARTED.md` for step-by-step workflow examples
- `method/Transitrix Методология...md` for architectural patterns

Happy modeling! 🏗️
