# Architecture Views Configuration

This directory contains view configurations that generate visual representations of the architecture model. Each YAML file defines what elements and relations to include in a specific visualization.

## View Types

### 1. **Layer View** (layered_architecture.yaml)
Shows all elements across a specific layer or multiple layers with their internal relations.

### 2. **System Context Diagram** (system_context.yaml)
Shows a specific application component and its external dependencies.

### 3. **Data Flow Diagram** (data_flow.yaml)
Visualizes how data flows between systems and components.

### 4. **Deployment View** (deployment.yaml)
Shows how application components are deployed on infrastructure nodes.

### 5. **Process Flow** (process_flows.yaml)
Visualizes business processes with their steps, gateways, and actors.

## Generation Tools

- **PlantUML**: For C4 and entity relationship diagrams
- **Mermaid**: For flowcharts and sequence diagrams (VS Code preview)
- **SVG**: Direct SVG generation via layout engine (ELK.js)

## Usage

Each view configuration YAML specifies:
- What elements to include (by ID or filter)
- What relations to display
- Visualization style (colors, grouping)
- Output format (plantuml, mermaid, svg)

Example:
```yaml
id: "VIEW-LAYERS-FULL"
name: "Complete Architecture Layers"
description: "All layers and their relationships"
output_formats: ["mermaid", "svg"]
elements:
  include_layers: ["Motivation", "Business", "Application", "Technology"]
relations:
  include_types: ["Serving", "Assignment", "Access", "Composition"]
```

## CI/CD Integration

Views are automatically generated during CI/CD pipeline execution when any element or relation files change.
