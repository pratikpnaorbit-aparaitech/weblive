const path = require('path');

function getDetailedTheoryForChapter(title, proj) {
  const projName = proj.name || "Enterprise Project";
  const projTitle = proj.title || projName;
  const projSummary = proj.summary || "Core business system";
  const projStack = proj.stack || "React, Node.js, Express, MongoDB";
  const projDomain = proj.domain || "Web Development";
  const projModules = Array.isArray(proj.modules) && proj.modules.length ? proj.modules : ["Dashboard", "Reports", "Settings"];
  const projObjective = proj.objective || `Build and integrate ${projName} system components.`;
  const projOutcomes = Array.isArray(proj.outcomes) && proj.outcomes.length ? proj.outcomes : ["Production deployment", "Database integration"];
  const projId = proj.id || "project-id";

  // Helper to categorize domain
  const isAI = /AI|ML|Artificial Intelligence|Machine Learning|Data Science/i.test(projDomain);
  const isDataAnalyst = /Data Analyst/i.test(projDomain);
  const isCloud = /Cloud/i.test(projDomain);
  const isDevOps = /DevOps/i.test(projDomain);
  const isIoT = /IoT|Internet of Things/i.test(projDomain);
  const isJava = /Java/i.test(projDomain);
  const isMern = /MERN/i.test(projDomain);
  const isDrone = /Drone/i.test(projDomain);
  const isPython = /Python/i.test(projDomain);
  const isSap = /SAP/i.test(projDomain);
  const isCad = /AutoCAD|CAD/i.test(projDomain);
  const isEmbedded = /Embedded/i.test(projDomain);
  const isDsa = /Data Structures|DSA/i.test(projDomain);

  // Helper to sanitize terms
  const sanitize = (str) => String(str).replace(/[^\w\s-]/g, '').trim();

  switch (title) {
    case "Overview": {
      const capabilities = projModules.map(m => `Support automated operations for ${m.toLowerCase()}`).join(", ");
      return {
        introduction: `The ${projName} is designed specifically as a high-performance system for the ${projDomain} domain. In modern enterprise workflows, managing ${projSummary.toLowerCase()} manually presents critical operational overheads. This project provides a production-grade codebase built on ${projStack} to automate these processes. The main objective is to ${projObjective.toLowerCase()} and achieve verified outputs such as: ${projOutcomes.join(", ")}.`,
        subtopics: [
          `Core Business Context of ${projName}`,
          `Industry Relevance in ${projDomain} Operations`,
          `Target End-Users and Persona Roles for ${projName}`,
          `System Scope and Lifecycle Parameters of ${projName}`,
          `Technology Stack Integration Matrix of ${projName}`,
          `Key Performance Indicators (KPIs) & SLAs of ${projName}`
        ],
        sections: [
          {
            heading: "1. Project Purpose & Industry Relevance",
            content: `The primary purpose of ${projName} is to solve the bottleneck of ${projSummary.toLowerCase()} inside the ${projDomain} sector. By leveraging ${projStack}, it introduces modern automated standards. Industry relevance for ${projName} includes streamlining transactional flows, eliminating manual verification times, and establishing secure records.`,
            bulletPoints: [
              `Target Users: Operators, analysts, and administrative managers specializing in ${projDomain} for the ${projName} portal.`,
              `Core Objective: ${projObjective} within the ${projName} workspace.`,
              `Core Stack: Integrates ${projStack} for frontend, backend, and data layers of ${projName}.`,
              `Capabilities: ${capabilities} for the ${projName} platform.`
            ]
          },
          {
            heading: "2. Scope of Implementation",
            content: `The implementation covers all aspects of the core workflow for ${projName}, from user request routing to database transactions and compliance reporting. It establishes strict access boundaries between system roles in ${projName}.`,
            bulletPoints: [
              `Includes the following distinct modules inside ${projName}: ${projModules.join(", ")}.`,
              `Provides full audit trails for tracking user actions within the ${projName} database.`,
              `Designed for responsive displays and low-latency API communication for ${projName} screens.`
            ]
          }
        ]
      };
    }

    case "Problem & Solution": {
      let manualProblem = "fragmented ledger tracking, slow communication loops, and human entry error.";
      let solutionImpact = `consolidating the database, validating input states instantly via backend middleware, and serving analytics dashboards.`;
      
      if (isAI) {
        manualProblem = "slow candidate profile matching, manual document reviews, and subjective screening bias.";
        solutionImpact = "leveraging natural language processing models to extract keywords, cross-reference skill taxonomies, and score candidates objectively.";
      } else if (isIoT) {
        manualProblem = "lack of real-time physical telemetry, delayed threshold warnings, and manual environmental sensor readings.";
        solutionImpact = "deploying sensor polling loops transmitting telemetry over light MQTT brokers to fire automated relays and email alarms.";
      } else if (isDevOps) {
        manualProblem = "delayed software build integrations, manual package deployments, and inconsistent staging environments.";
        solutionImpact = "establishing automated CI/CD yaml pipelines that test, build containers, and deploy to Kubernetes or EC2 instances.";
      } else if (isDataAnalyst) {
        manualProblem = "fragmented raw business transactions, manual chart plotting, and delayed operational performance metrics.";
        solutionImpact = "constructing SQL metrics pipelines and dashboard layouts aggregating KPIs dynamically to output interactive chart views.";
      } else if (isCad) {
        manualProblem = "manual drawing alignments, dimensional scaling mismatches, and delayed structural blueprint revisions.";
        solutionImpact = "drafting precise CAD sketches using solid geometric primitives, applying scale constraints, and exporting detailed BOM listings.";
      }

      return {
        introduction: `The ${projName} directly addresses the operational bottlenecks of ${manualProblem} Under manual methods in ${projDomain}, organizations suffer from high data error rates, lack of compliance trails, and high latency in daily work. By deploying ${projName}, the business automates these tasks, reducing operational processing times significantly.`,
        subtopics: [
          `Identified Manual Vulnerabilities & Bottlenecks of ${projName}`,
          `Business Impact of Delayed Information Routing in ${projName}`,
          `The Proposed Web System: Technical Solution for ${projName}`,
          `Direct Advantages & Strategic Benefits of ${projName}`,
          `Security Constraints and System Boundaries for ${projName}`,
          `Expected Operational Improvements & ROI of ${projName}`
        ],
        sections: [
          {
            heading: "1. Problem Statement",
            content: `The manual or legacy process of handling ${projSummary.toLowerCase()} inside the ${projDomain} sector creates significant risks. Without automated checkmarks, verification is slow and lacks compliance audit logs. Information is scattered, making real-time monitoring of ${projName} impossible.`,
            bulletPoints: [
              `Inefficiency: Manual checks for ${projName} cause high operational delay.`,
              `Data Loss: Lack of historical logs in the ${projName} database prevents compliance audits.`,
              `Error Risk: Spreadsheets used for ${projName} are prone to entry mistakes.`
            ]
          },
          {
            heading: "2. The Centralized Solution",
            content: `The proposed ${projName} system resolves these problems by ${solutionImpact}`,
            bulletPoints: [
              `Centralized DB: Stores all ${projName} operations securely.`,
              `Automated Rules: Enforces checks on client requests before database write inside the ${projName} controllers.`,
              `Visual Dashboards: Displays real-time KPIs and statuses for ${projName} managers.`
            ]
          }
        ]
      };
    }

    case "Requirements": {
      const funcs = projModules.map(m => `The ${projName} system must provide a ${m} module supporting all validation requirements.`);
      
      let domainNfr = [
        `Response Time: REST API calls for ${projName} must complete in under 200ms.`,
        `Concurrency: Maintain steady operation for up to 500 concurrent sessions on ${projName}.`,
        `Security: Require authentication headers for all modifying actions in the ${projName} API.`
      ];

      if (isAI) {
        domainNfr = [
          `Model Inference Latency: NLP/ML parsing in ${projName} must complete in under 1.5 seconds per document.`,
          `Accuracy: Achieve at least 85% skill extraction precision matching in the ${projName} model.`,
          `Data Privacy: Anonymize or protect candidate PII on ingestion into ${projName}.`
        ];
      } else if (isIoT) {
        domainNfr = [
          `Network Latency: MQTT telemetry updates for ${projName} must execute in under 1 second.`,
          `Power Efficiency: The ${projName} sensor controller must utilize low-power sleep schedules.`,
          `Fault Tolerance: Auto-reconnect client sockets on ${projName} gateway dropouts.`
        ];
      } else if (isDataAnalyst) {
        domainNfr = [
          `Data Refresh: Dashboard data for ${projName} must sync with source tables on every page load.`,
          `Query Speed: ${projName} aggregations over 10,000 records must resolve under 500ms.`,
          `Visual Fidelity: Interactive charts inside the ${projName} dashboards must scale responsively.`
        ];
      } else if (isDevOps) {
        domainNfr = [
          `Pipeline Execution Speed: Docker builds and test checks for ${projName} must complete under 10 minutes.`,
          `Uptime: Ensure 99.9% uptime with instant container health recovery for the ${projName} portal.`,
          `Immutable Logs: Pipeline logs for the ${projName} stages must be logged to a central repository.`
        ];
      }

      return {
        introduction: `Detailed requirements specification for ${projName} establishes the scope for engineering development in ${projDomain}. Functional requirements outline what user actions the ${projName} codebase must execute, while non-functional requirements define performance, latency, and security thresholds.`,
        subtopics: [
          `Functional Requirements Specification (FRS) of ${projName}`,
          `Non-Functional Security and SLA Requirements of ${projName}`,
          `System Interface Prerequisites of ${projName}`,
          `Required Software Packages & Libraries for ${projName}`,
          `Hardware / Host Machine Constraints for ${projName}`
        ],
        sections: [
          {
            heading: "1. Functional Requirements Matrix",
            content: `The ${projName} system must implement the following business logic functions:`,
            bulletPoints: funcs.concat([
              `Execute: ${projObjective} for the ${projName} workspace.`,
              `Enforce access boundaries on user actions within the ${projName} portal.`
            ])
          },
          {
            heading: "2. Non-Functional Quality Metrics",
            content: `The ${projName} software must conform to these operational limits to ensure high usability and performance:`,
            bulletPoints: domainNfr
          }
        ]
      };
    }

    case "Workflow": {
      let flowSteps = [
        `1. User logs into the ${projName} application portal.`,
        `2. The ${projName} dashboard loads the selected modules.`,
        `3. The ${projName} system processes requests via its API controller.`,
        `4. The ${projName} database commits changes and updates UI state.`,
        `5. Output report or status is generated for ${projName}.`
      ];

      if (isAI) {
        flowSteps = [
          `1. Recruiter creates job posting profile for ${projName}.`,
          `2. The ${projName} system extracts and indexes job requirement keywords.`,
          `3. Candidate uploads PDF/doc resume files to the ${projName} platform.`,
          `4. Text parsing script inside ${projName} extracts text and structures metadata.`,
          `5. NLP matching in ${projName} matches resume details against job specifications.`,
          `6. Recruiter dashboard of ${projName} displays candidate ranking scorecard.`
        ];
      } else if (isIoT) {
        flowSteps = [
          `1. Embedded microcontrollers for ${projName} boot and calibrate sensor inputs.`,
          `2. Sensors poll environmental status metrics (moisture, temperature) for ${projName}.`,
          `3. Telemetry payload is structured as JSON and published to the ${projName} MQTT broker.`,
          `4. Backend server subscribes to ${projName} MQTT stream and inserts logs into InfluxDB.`,
          `5. Web dashboard of ${projName} fetches records to display metric trends.`,
          `6. Automated relays trigger physical valves if ${projName} thresholds are exceeded.`
        ];
      } else if (isDevOps) {
        flowSteps = [
          `1. Developer commits and pushes code to the ${projName} repository.`,
          `2. GitHub runner triggers webhook and starts testing container for ${projName}.`,
          `3. Code compilation tests and unit test suites execute for ${projName}.`,
          `4. Docker build compiles code into multi-stage production image for ${projName}.`,
          `5. Container is pushed to private Docker registry inside the ${projName} cluster.`,
          `6. Deploy agent runs deployment scripts and switches traffic for ${projName}.`
        ];
      } else if (isMern || isJava || isPython) {
        // POS / E-commerce workflow
        if (projId.includes("billing") || projId.includes("pos") || projId.includes("hospital") || projId.includes("banking")) {
          flowSteps = [
            `1. Operator registers client or table resource inside the ${projName} system.`,
            `2. Interactive dashboard of ${projName} loads inventory menu or schedule slots.`,
            `3. Operator selects items/appointments and clicks submit in the ${projName} interface.`,
            `4. System calculates totals, taxes, and registers transaction record in the ${projName} database.`,
            `5. Local invoice is created and printed, ${projName} database updates stock ledger.`
          ];
        } else {
          flowSteps = [
            `1. Customer searches product catalogs or listings on the ${projName} storefront.`,
            `2. User adds selection to shopping cart or booking calendar inside the ${projName} UI.`,
            `3. System checks stock availability in the ${projName} database.`,
            `4. Checkout redirects to secure ${projName} payment simulator.`,
            `5. Payment success triggers order registration and sends alert to ${projName} admin.`
          ];
        }
      } else if (isDsa) {
        flowSteps = [
          `1. Application loads initial network graph, dataset, or text strings into the ${projName} runner.`,
          `2. User inputs query, target node, or source text inside the ${projName} interface.`,
          `3. Selection structures are initialized (segment trees, priority heaps, tries) for ${projName}.`,
          `4. Optimization search algorithm executes (Dijkstra pathing, compression loops) on the ${projName} data.`,
          `5. Results table showing computational metrics (hops, ratios, times) displays on the ${projName} interface.`
        ];
      }

      return {
        introduction: `The workflow of ${projName} outlines the execution pipeline from input data loading to user results. This logical map governs state transitions and prevents data corruption during processing.`,
        subtopics: [
          `System Execution Path Map for ${projName}`,
          `User Flow Step-by-Step Sequences for ${projName}`,
          `Exception Routing and Recovery Steps for ${projName}`,
          `Database Commit and Write Triggers of ${projName}`,
          `Output Report and Analytics Generation in ${projName}`
        ],
        sections: [
          {
            heading: "1. Core System Workflow Path",
            content: `The ${projName} system coordinates operational actions through this sequence of transitions:`,
            bulletPoints: flowSteps
          }
        ]
      };
    }

    case "Modules": {
      const mods = projModules.map((m, index) => {
        return {
          heading: `${index + 1}. Module: ${m}`,
          content: `Automates all workflows related to ${m.toLowerCase()} features within the ${projName} platform.`,
          bulletPoints: [
            `Purpose: Handle specialized validation for ${projName} ${m.toLowerCase()} features.`,
            `Inputs: HTTP request payloads containing data related to ${projName} ${m.toLowerCase()}.`,
            `Outputs: Updated ${projName} database records and JSON status indicators.`,
            `Business Logic: Checks user roles, sanitizes fields, updates ${projName} database.`
          ]
        };
      });

      return {
        introduction: `The modular architecture of ${projName} enforces clean division of features. Each module maintains its own routes, schemas, and utility helper files.`,
        subtopics: projModules.map(m => `${m} Sub-system Specifications in ${projName}`),
        sections: mods
      };
    }

    case "Architecture": {
      let archStyle = "Standard 3-Tier Layered Web Architecture.";
      let clientTier = "HTML5 Single Page App (SPA) styled with custom responsive CSS layouts.";
      let serverTier = "Node.js Express REST API server providing stateless routing.";
      let databaseTier = "MongoDB Cloud database synced with local JSON storage.";
      let components = [
        `Presentation layer: Express static middleware serving ${projName} client scripts.`,
        `Security layer: JWT parser middleware verifying authorization tokens for ${projName}.`,
        `Database mapping layer: Mongoose schema definitions matching ${projName} collections.`
      ];

      if (isAI) {
        archStyle = "AI-Driven Document Processing Pipeline Architecture.";
        clientTier = "Web interface displaying analytical matching and scoring scorecards.";
        serverTier = "FastAPI endpoint routing text extraction and scoring requests.";
        databaseTier = "Vector stores or MongoDB collections caching candidate embeddings.";
        components = [
          `Document ingestion pipeline: Apache Tika or python-docx text parser for ${projName}.`,
          `NLP skill matcher: Scikit-learn TF-IDF matrices or Hugging Face transformers configured for ${projName}.`,
          `Result analyzer: Pandas scoring script saving outputs to the ${projName} database.`
        ];
      } else if (isIoT) {
        archStyle = "IoT Edge-to-Cloud Telemetry Pipeline Architecture.";
        clientTier = "Web monitoring dashboard displaying physical metric trends.";
        serverTier = "MQTT broker bridging device signals and database storage.";
        databaseTier = "InfluxDB or MongoDB storing time-series sensor logs.";
        components = [
          `Edge controller: ESP32 / Raspberry Pi polling physical GPIO inputs for ${projName}.`,
          `Broker gateway: Mosquitto server managing publish/subscribe queues for ${projName}.`,
          `Subscriber worker: Node.js script inserting JSON signals into the ${projName} database.`
        ];
      } else if (isDevOps) {
        archStyle = "Automated CI/CD Virtual Deployment Architecture.";
        clientTier = "DevOps monitoring dashboard rendering test coverage metrics.";
        serverTier = "Jenkins Automation Server or GitHub Actions runner.";
        databaseTier = "Private Docker Registry caching compiled production images.";
        components = [
          `Pipeline runner: YAML workflow triggers testing suites for the ${projName} repository.`,
          `Infrastructure controller: Terraform templates provisioning cloud nodes for ${projName}.`,
          `Configuration daemon: Ansible playbooks mounting ${projName} server variables.`
        ];
      } else if (isSap) {
        archStyle = "SAP ERP Integration Architecture.";
        clientTier = "SAP Fiori application dashboards.";
        serverTier = "SAP Gateway exposing ABAP OData endpoints.";
        databaseTier = "SAP HANA In-Memory Database engine.";
        components = [
          `Data extractor: ABAP Open SQL scripts configured for ${projName} datasets.`,
          `OData service provider: SAP Gateway definitions for ${projName}.`,
          `Analytical compiler: SAP Analytics Cloud connector for ${projName}.`
        ];
      }

      return {
        introduction: `The technical architecture of ${projName} establishes the interaction guidelines between software tiers in ${projDomain}. By dividing the components into presentation, logic, and data layers, the ${projName} codebase is modular and scalable.`,
        subtopics: [
          `Architectural Paradigm Selection for ${projName}`,
          `Client Tier Frameworks & Display Engine of ${projName}`,
          `Application Processing Tiers & Logic Controllers of ${projName}`,
          `Database Schemas & Storage Tier Configurations of ${projName}`,
          `Network Channels & Protocols for ${projName}`
        ],
        sections: [
          {
            heading: "1. Architectural Blueprint",
            content: `The ${projName} system implements a ${archStyle}`,
            bulletPoints: [
              `Client Layer: ${clientTier} tailored for ${projName}.`,
              `Server Layer: ${serverTier} managing the routing of ${projName}.`,
              `Database Layer: ${databaseTier} powering the persistence of ${projName}.`
            ]
          },
          {
            heading: "2. Key Components",
            content: `The critical components coordinating the ${projName} system workflows include:`,
            bulletPoints: components
          }
        ]
      };
    }

    case "Database": {
      const collections = projModules.map(m => sanitize(m).toLowerCase().replace(/\s+/g, '_'));
      
      const tables = collections.map(col => {
        return {
          heading: `Collection Schema: ${col}`,
          content: `Stores all database transactions related to the ${projName} project's ${col} features.`,
          bulletPoints: [
            `Primary Key: ${col}_id (UUID string inside the ${projName} database)`,
            `Indexed Fields: ${col}_id, createdAt in ${projName}`,
            `Key Attributes: status (string), details (JSON object), updatedAt (ISO date) for ${projName} ${col} entity`,
            `Sample Document: { "${col}_id": "uuid-1234", "status": "active", "createdAt": "${new Date().toISOString()}" }`
          ]
        };
      });

      return {
        introduction: `Data persistence in ${projName} is managed by structured schema structures. All database transactions must pass schema validation checkmarks before being committed to disk.`,
        subtopics: collections.map(col => `Collection Schema definition: ${col} in ${projName}`),
        sections: tables
      };
    }

    case "APIs": {
      const endpoints = projModules.slice(0, 4).map(m => {
        const slug = sanitize(m).toLowerCase().replace(/\s+/g, '-');
        return {
          heading: `Route: POST /api/${slug}`,
          content: `Processes transactional actions for the ${projName} ${m.toLowerCase()} features.`,
          bulletPoints: [
            `Method: POST to ${projName} backend`,
            `Authentication: Bearer Token required for ${projName} operations`,
            `Request Payload: { "action": "execute", "data": {}, "projectId": "${projId}" }`,
            `Success Response: 200 OK - { "success": true, "message": "${m} updated successfully in ${projName}" }`,
            `Error Response: 400 Bad Request - { "success": false, "error": "Validation failed for ${projName} ${m}" }`
          ]
        };
      });

      return {
        introduction: `The RESTful API interfaces of ${projName} expose standard HTTP routes for querying and editing system data. All endpoints require JSON payloads and return structured responses.`,
        subtopics: projModules.slice(0, 4).map(m => `API Route: /api/${sanitize(m).toLowerCase().replace(/\s+/g, '-')} inside ${projName}`),
        sections: endpoints
      };
    }

    case "Security": {
      let specSecurity = "Role-Based Access Control (RBAC) maps permissions to roles.";
      let dataSec = "Standard data encryption using bcrypt/PBKDF2 hashes.";

      if (isAI) {
        specSecurity = "Candidate PII Masking: Automatically scrub email and phone details from raw documents during ingestion.";
        dataSec = "Document Validation: Strict mime-type checks preventing executables from entering parsing folders.";
      } else if (isIoT) {
        specSecurity = "Device Tokenization: Each microcontroller must authenticate using a unique token before publishing MQTT payloads.";
        dataSec = "Payload Validation: Filter and drop out-of-range sensor spikes to prevent database storage exhaustion.";
      } else if (isDevOps) {
        specSecurity = "Least Privilege Access: GitHub workflow secrets must utilize scoped tokens with read-only repo privileges.";
        dataSec = "Vulnerability Scans: Implement Trivy/Snyk scans inside pipelines to drop builds with critical dependencies.";
      }

      return {
        introduction: `Security implementations in ${projName} guard backend endpoints from common vulnerabilities. Data protection policies protect both active memory transactions and stored database fields.`,
        subtopics: [
          `Authentication Protocol Specs of ${projName}`,
          `Authorization Rules & RBAC Matrix of ${projName}`,
          `Input Validation and Sanitation Strategies of ${projName}`,
          `Cryptographic Protection & Hashing Algorithms of ${projName}`,
          `Secure Auditing and Log Management of ${projName}`
        ],
        sections: [
          {
            heading: "1. Core Access Control Framework",
            content: `All client access requests are verified before routing to ${projName} logic controllers:`,
            bulletPoints: [
              `Authentication: Salted PBKDF2 cryptography with JWT tokens containing role claims for the ${projName} users.`,
              `Access Controls: ${specSecurity} inside the ${projName} routers.`,
              `Session Expiry: Automatic token invalidation after 24 hours of inactivity on ${projName}.`
            ]
          },
          {
            heading: "2. Data Protection Standards",
            content: `Stored data is protected against extraction attacks inside the ${projName} hosting scope:`,
            bulletPoints: [
              `At-Rest Security: Database clusters for ${projName} utilize transparent disk encryption.`,
              `In-Transit Security: TLS v1.3 encryption for all ${projName} HTTP routing.`,
              `Data Protections: ${dataSec} in the ${projName} environment.`
            ]
          }
        ]
      };
    }

    case "UI/UX": {
      const views = projModules.map(m => {
        return {
          heading: `View Screen: ${m} Dashboard`,
          content: `Presents all controls and metric charts related to ${projName} ${m.toLowerCase()} inputs.`,
          bulletPoints: [
            `Role Access: Operator and Admin views for the ${projName} dashboard.`,
            `Key Elements: Search bars, sorting filter lists, interactive status cards for ${projName} ${m.toLowerCase()} operations.`,
            `Interaction Rules: Actions trigger instant visual loaders and notifications on ${projName} response.`
          ]
        };
      });

      return {
        introduction: `The user interface of ${projName} is designed as a clean Single Page App (SPA). Interface views for ${projName} load modules dynamically, responding immediately to viewport size variations.`,
        subtopics: projModules.map(m => `${m} screen mockup in ${projName}`),
        sections: views
      };
    }

    case "Code Examples": {
      let codeText = `// Javascript helper logic for ${projName}
function processItems(items) {
  return items.map(item => {
    return {
      id: item.id,
      status: item.status || "active",
      updatedAt: new Date().toISOString()
    };
  });
}`;

      if (isAI) {
        codeText = `# Python NLP matching script for ${projName}
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_match_score(resume_text, job_desc):
    # Clean text inputs
    clean_resume = re.sub(r'\\s+', ' ', resume_text.lower())
    clean_job = re.sub(r'\\s+', ' ', job_desc.lower())
    
    # Calculate similarity metrics
    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform([clean_resume, clean_job])
    return cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]`;
      } else if (isIoT) {
        codeText = `// C++ ESP32 telemetry publisher for ${projName}
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

void publishTelemetry(float value) {
  StaticJsonDocument<200> doc;
  doc["deviceId"] = "device_001";
  doc["value"] = value;
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("telemetry/metrics", buffer);
}`;
      } else if (isDevOps) {
        codeText = `# GitHub Actions workflow trigger for ${projName}
name: Automated Integration Check
on:
  push:
    branches: [ main ]
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Execute Test Suite
        run: npm run test:unit
      - name: Build Docker Container
        run: docker build -t project-app:latest .`;
      } else if (isJava) {
        codeText = `// Spring Boot Repository interface for ${projName}
package com.aparaitech.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    @Query("SELECT p FROM ProjectEntity p WHERE p.status = 'active'")
    List<ProjectEntity> findActiveProjects();
}`;
      } else if (isDsa) {
        codeText = `// C++ Priority Queue logic for ${projName}
#include <iostream>
#include <vector>
#include <queue>

struct TaskNode {
    int id;
    int priority;
    bool operator<(const TaskNode& other) const {
        return priority < other.priority; // max-heap configuration
    }
};

void scheduleTasks() {
    std::priority_queue<TaskNode> taskQueue;
    taskQueue.push({101, 5});
    taskQueue.push({102, 9});
    
    // Process highest priority
    TaskNode topTask = taskQueue.top();
    std::cout << "Executing task: " << topTask.id << std::endl;
}`;
      }

      return {
        introduction: `The following code example demonstrates the implementation of a core function in the ${projName} architecture. This educational snippet utilizes clean conventions and standard API paradigms.`,
        subtopics: [`Core Logic Implementation Blueprint of ${projName}`],
        sections: [
          {
            heading: "1. Core Function Implementation",
            content: `The code snippet below executes key tasks related to the ${projObjective.toLowerCase()}:`,
            bulletPoints: [
              `Tech: Built with target libraries matching the ${projName} tech stack.`,
              `Verification: Includes error-trapping clauses to catch ${projName} runtime exceptions.`,
              `Optimization: Designed to maintain O(1) or O(N log N) computational efficiency for ${projName}.`
            ]
          }
        ],
        codeExamples: [
          {
            title: `${projName} Core Logic Snippet`,
            language: isAI ? "python" : (isIoT || isEmbedded || isDsa ? "cpp" : (isJava ? "java" : (isDevOps ? "yaml" : "javascript"))),
            code: codeText,
            explanation: `Implements the core business logic described in the modules specifications.`,
            order: 1
          }
        ]
      };
    }

    case "Testing": {
      let testCaseText = "Enforce unit test validations on status records.";
      let edgeCaseText = "Missing or null fields in request payloads.";

      if (isAI) {
        testCaseText = "Model scoring precision validation using cross-validation sets.";
        edgeCaseText = "Document inputs containing corrupted files or garbled characters.";
      } else if (isIoT) {
        testCaseText = "MQTT reconnect test under sudden packet drops.";
        edgeCaseText = "Hardware sensor sending absolute zero values on physical failure.";
      } else if (isDevOps) {
        testCaseText = "Run test scripts validating that Docker images build successfully.";
        edgeCaseText = "Concurrent branch merge conflicts and missing environment parameters.";
      }

      return {
        introduction: `Testing processes verify that the ${projName} performs reliably under peak user loads. Test suites cover unit validations, API path tests, and boundary checks.`,
        subtopics: [
          `Unit Testing Assertions & Mock Frameworks of ${projName}`,
          `Integration Testing Loops & API Endpoints Verification of ${projName}`,
          `Performance Verification & Simulated Traffic Stress Tests of ${projName}`,
          `Security Vulnerability Gates & Threat Modeling Tests of ${projName}`,
          `Critical Edge Cases & Error Boundary Recoveries of ${projName}`
        ],
        sections: [
          {
            heading: "1. Unit & Integration Test Scenarios",
            content: `The testing suite must cover the following critical checks for the ${projName} components:`,
            bulletPoints: [
              `Functional Check: ${testCaseText} for ${projName}.`,
              `API Check: Assert that the ${projName} API paths reject requests missing header authentication.`,
              `CRUD Check: Assert database fields are correctly matching ${projName} schema constraints.`
            ]
          },
          {
            heading: "2. Operational Edge Cases",
            content: `The code handles exception states gracefully inside the ${projName} context:`,
            bulletPoints: [
              `Edge Case 1: ${edgeCaseText} inside the ${projName} controllers.`,
              `Edge Case 2: Concurrent requests attempting to write to the same ${projName} record ID.`,
              `Edge Case 3: Complete database connection dropouts with active ${projName} queues.`
            ]
          }
        ]
      };
    }

    case "Deployment": {
      let deployPlatform = "AWS EC2 instances using Docker container runners.";
      let envVars = [
        `PORT: Server port for the ${projName} server`,
        `JWT_SECRET: Authorization hash signature key for ${projName}`,
        `MONGODB_URI: Cloud database connection string for ${projName} database`
      ];

      if (isDevOps) {
        deployPlatform = "Kubernetes clusters managed via Helm charts.";
      } else if (isIoT) {
        deployPlatform = "Local gateway hub syncing with Cloud IoT Core.";
      }

      return {
        introduction: `Deploying the ${projName} system moves compiled code assets to production servers. This documentation covers staging configurations, environment variables, and scaling scripts.`,
        subtopics: [
          `Target Host Infrastructure Overview of ${projName}`,
          `Deployment Environment Variables Checklist of ${projName}`,
          `Database Provisioning & Replication Setup of ${projName}`,
          `Production Build & Asset Optimization Steps of ${projName}`,
          `Uptime Monitoring, Auto-scaling Rules & Health Checks of ${projName}`
        ],
        sections: [
          {
            heading: "1. Staging Environment Guidelines",
            content: `The production host runs on ${deployPlatform} for ${projName} setup:`,
            bulletPoints: envVars
          },
          {
            heading: "2. Build & Deploy Steps",
            content: `Execute the deploy sequences sequentially for the ${projName} backend:`,
            bulletPoints: [
              `Step 1: Clone ${projName} codebase and set up environment parameters in .env file.`,
              `Step 2: Run clean check tests and compile ${projName} static assets.`,
              `Step 3: Launch containers or boot server triggers for ${projName} deployment.`,
              `Step 4: Verify health routes show healthy status codes on ${projName} server.`
            ]
          }
        ]
      };
    }

    case "Assignment": {
      return {
        introduction: `The practical assignment for the ${projName} candidate assesses skill competency. The developer must build and deploy modules, checking off all requirements listed below.`,
        subtopics: [
          `Milestone 1: Codebase Analysis & Routing Configuration of ${projName}`,
          `Milestone 2: Database Model Creation & Schema Validations of ${projName}`,
          `Milestone 3: Core API Endpoints Implementation & Integration of ${projName}`,
          `Milestone 4: Testing Coverage Verification & Edge Checks of ${projName}`,
          `Milestone 5: Deployment & GitHub Repository Submission of ${projName}`
        ],
        sections: [
          {
            heading: "1. Required Deliverables",
            content: `Candidates must build and complete the following core features of the ${projName} system:`,
            bulletPoints: [
              `Deliverable 1: Implement database model support for ${projModules.slice(0, 3).join(", ")} in ${projName}.`,
              `Deliverable 2: Build REST API endpoints supporting updates for ${projName}.`,
              `Deliverable 3: Integrate frontend layout grids displaying state summaries of ${projName}.`,
              `Deliverable 4: Verify that all unit test checks for ${projName} resolve successfully.`
            ]
          },
          {
            heading: "2. Grading Criteria Matrix",
            content: `Submissions of the ${projName} are scored on a 100-point scale:`,
            bulletPoints: [
              `Security (25%): Secure header routing and database validation constraints in ${projName}.`,
              `Fidelity (25%): Full responsive alignment of screens for the ${projName} UI.`,
              `Functionality (25%): Successful run of all ${projName} modules.`,
              `Tests (25%): Coverage metrics for the ${projName} unit check files.`
            ]
          }
        ]
      };
    }

    case "Quiz": {
      let q1 = `Which database schema collection tracks the core objects in ${projName}?`;
      let a1 = `The ${sanitize(projModules[0]).toLowerCase()} records table.`;
      
      let q2 = `What is the primary technical objective of ${projName}?`;
      let a2 = `To ${projObjective.toLowerCase()}`;

      let q3 = `Which security safeguard is implemented to protect ${projName} REST endpoints?`;
      let a3 = `JWT authorization tokens containing user claims for ${projName}.`;

      let q4 = `What is the expected non-functional latency SLA for ${projName} API routing?`;
      let a4 = `Responses should return in under 200ms for optimal ${projName} user experience.`;

      let q5 = `What is the primary function of the ${projModules[0]} module in ${projName}?`;
      let a5 = `Validate parameters and process core activities related to ${projModules[0].toLowerCase()} workflows in the ${projName} application.`;

      let q6 = `Which user roles are authorized to perform state modifications inside the ${projName} portal?`;
      let a6 = `Administrative managers and verified operators of the ${projName} system.`;

      let q7 = `Why is the tech stack (${projStack}) selected for building ${projName}?`;
      let a7 = `To enable scalable, asynchronous business logic and database persistence for ${projName}.`;

      let q8 = `What validation constraint is checked on ${projName} input parameters?`;
      let a8 = `Requests containing empty values or invalid fields are rejected at the ${projName} controller boundary.`;

      let q9 = `Which operational bottleneck is resolved by deploying ${projName} automation?`;
      let a9 = `Manual entry errors, lack of historical logs, and high processing latency in ${projName}.`;

      let q10 = `What is the primary communication protocol used between the frontend and backend of ${projName}?`;
      let a10 = `Stateless HTTP requests sending JSON payloads over TLS for the ${projName} APIs.`;

      let q11 = `What test checking is verified during unit tests of ${projName}?`;
      let a11 = `Asserting that database collections validate schema parameters correctly for ${projName}.`;

      let q12 = `Where is the production build of ${projName} typically hosted?`;
      let a12 = `Cloud infrastructure or virtual servers managing Docker containers for ${projName}.`;

      let q13 = `What is the standard error-trapping pattern inside the ${projName} backend controllers?`;
      let a13 = `Using try/catch middleware blocks that return structured error JSON for ${projName}.`;

      let q14 = `How does ${projName} handle query scalability boundaries?`;
      let a14 = `By using stateless APIs and database indexes on lookups and primary keys for ${projName}.`;

      let q15 = `Which index optimizes lookup performance in the ${projName} database?`;
      let a15 = `Compound indexes on entity primary IDs and creation dates inside the ${projName} tables.`;

      return {
        introduction: `Assess your knowledge of ${projName} architecture, requirements, workflows, and database models. Choose the correct answers to complete the module.`,
        subtopics: [
          `Conceptual Architecture Check of ${projName}`,
          `Security Safeguards Check of ${projName}`,
          `Workflow Logic Check of ${projName}`,
          `Data Schema Validation Check of ${projName}`
        ],
        sections: [
          {
            heading: "Question 1: Database Architecture",
            content: q1,
            bulletPoints: [
              `A) The default config properties dictionary.`,
              `B) (Correct) ${a1}`,
              `C) The public route settings file.`,
              `Explanation: Database integrity for ${projName} is maintained by structuring records under dedicated collection schemes.`
            ]
          },
          {
            heading: "Question 2: System Objectives",
            content: q2,
            bulletPoints: [
              `A) To establish manual backup routines.`,
              `B) To write simple command interfaces.`,
              `C) (Correct) ${a2}`,
              `Explanation: Core objectives outline the primary operational problem the ${projName} solves.`
            ]
          },
          {
            heading: "Question 3: Endpoint Protection",
            content: q3,
            bulletPoints: [
              `A) Clear text password checks.`,
              `B) IP blocklists.`,
              `C) (Correct) ${a3}`,
              `Explanation: Secure routes for ${projName} require header verification to block unauthorized queries.`
            ]
          },
          {
            heading: "Question 4: SLA Targets",
            content: q4,
            bulletPoints: [
              `A) Under 5 seconds.`,
              `B) (Correct) ${a4}`,
              `C) Under 10 seconds.`,
              `Explanation: Fast API response metrics are critical for real-time ${projName} web portal responsiveness.`
            ]
          },
          {
            heading: "Question 5: Core Module Action",
            content: q5,
            bulletPoints: [
              `A) (Correct) ${a5}`,
              `B) Style client side layout grids for templates unrelated to ${projName}.`,
              `C) Delete unrelated system logs from the server root of ${projName}.`,
              `Explanation: The ${projModules[0]} module handles key logic for ${projModules[0].toLowerCase()} inside ${projName}.`
            ]
          },
          {
            heading: "Question 6: Access Privileges",
            content: q6,
            bulletPoints: [
              `A) Unauthenticated guest accounts accessing ${projName}.`,
              `B) External database drivers without authorization in ${projName}.`,
              `C) (Correct) ${a6}`,
              `Explanation: The security policy maps modify actions to verified user roles in ${projName}.`
            ]
          },
          {
            heading: "Question 7: Stack Selection",
            content: q7,
            bulletPoints: [
              `A) To compile local binary files for ${projName}.`,
              `B) (Correct) ${a7}`,
              `C) To design offline paper documents for ${projName}.`,
              `Explanation: The technical stack provides modern development tools for the ${projName} features.`
            ]
          },
          {
            heading: "Question 8: Input Validations",
            content: q8,
            bulletPoints: [
              `A) (Correct) ${a8}`,
              `B) Encrypt public styling stylesheets of ${projName}.`,
              `C) Delay server routing of ${projName} by several hours.`,
              `Explanation: Backend controllers sanitise and check payload fields to prevent DB inconsistencies in ${projName}.`
            ]
          },
          {
            heading: "Question 9: Legacy System Overheads",
            content: q9,
            bulletPoints: [
              `A) High cost of printing sheets for the ${projName} activities.`,
              `B) (Correct) ${a9}`,
              `C) Low internet connectivity of the ${projName} edge nodes.`,
              `Explanation: Automating operational flows eliminates transcription errors and speeds up verification times in ${projName}.`
            ]
          },
          {
            heading: "Question 10: Client-Server Protocol",
            content: q10,
            bulletPoints: [
              `A) (Correct) ${a10}`,
              `B) SMTP for raw data mail in ${projName}.`,
              `C) FTP binary file transfers for ${projName}.`,
              `Explanation: REST API routing coordinates JSON payloads over secured HTTPS links for subproject ${projName}.`
            ]
          },
          {
            heading: "Question 11: Testing Checks",
            content: q11,
            bulletPoints: [
              `A) File directory listings of the ${projName} project folder.`,
              `B) Styling properties checks for ${projName} web views.`,
              `C) (Correct) ${a11}`,
              `Explanation: Database validation testing ensures values conform to database schema definitions in ${projName}.`
            ]
          },
          {
            heading: "Question 12: Production Hosting",
            content: q12,
            bulletPoints: [
              `A) Local browser cache only for the ${projName} files.`,
              `B) (Correct) ${a12}`,
              `C) Git repository commits only for the ${projName} changes.`,
              `Explanation: Hosting builds on scalable cloud platforms ensures reliable uptime SLA for ${projName}.`
            ]
          },
          {
            heading: "Question 13: Controller Design Pattern",
            content: q13,
            bulletPoints: [
              `A) (Correct) ${a13}`,
              `B) Crashing the node script process of ${projName} immediately.`,
              `C) Silently ignoring errors in ${projName}.`,
              `Explanation: Catching async operations inside try/catch blocks guards ${projName} backend endpoints from crashes.`
            ]
          },
          {
            heading: "Question 14: System Performance Scaling",
            content: q14,
            bulletPoints: [
              `A) Increasing local RAM only for the ${projName} server.`,
              `B) Limiting the database size of ${projName} to 10 records.`,
              `C) (Correct) ${a14}`,
              `Explanation: Stateless services and indexed data fields enable horizontal scale capability for ${projName}.`
            ]
          },
          {
            heading: "Question 15: Storage Search Optimisation",
            content: q15,
            bulletPoints: [
              `A) (Correct) ${a15}`,
              `B) Plain text styles used in ${projName} layout.`,
              `C) Temporary log files created by ${projName} processes.`,
              `Explanation: Creating indexes on lookup fields speeds up query search execution inside ${projName}.`
            ]
          }
        ]
      };
    }

    case "References":
    default: {
      let docLinks = [
        `React documentation for ${projName}: https://react.dev/`,
        `Express routing guide for ${projName}: https://expressjs.com/`,
        `MongoDB schema modeling for ${projName}: https://mongoosejs.com/`
      ];

      if (isAI) {
        docLinks = [
          `FastAPI Web routing guide for ${projName}: https://fastapi.tiangolo.com/`,
          `Scikit-learn Regression & Classification for ${projName}: https://scikit-learn.org/`,
          `TensorFlow Model Building for ${projName}: https://www.tensorflow.org/`
        ];
      } else if (isIoT) {
        docLinks = [
          `PubSubClient MQTT documentation for ${projName}: https://pubsubclient.knolleary.net/`,
          `Arduino Reference specifications for ${projName}: https://www.arduino.cc/reference/`,
          `ESP32 hardware details for ${projName}: https://www.espressif.com/`
        ];
      } else if (isDevOps) {
        docLinks = [
          `GitHub Actions Workflow commands for ${projName}: https://docs.github.com/actions`,
          `Kubernetes deployment guidelines for ${projName}: https://kubernetes.io/docs/`,
          `Docker container registries for ${projName}: https://docs.docker.com/`
        ];
      } else if (isJava) {
        docLinks = [
          `Spring Boot starter guide for ${projName}: https://spring.io/projects/spring-boot`,
          `Hibernate JPA specifications for ${projName}: https://hibernate.org/`,
          `MySQL Connector details for ${projName}: https://dev.mysql.com/doc/`
        ];
      }

      return {
        introduction: `Refer to these official documentation resources and specifications to guide your development of the ${projName} application modules.`,
        subtopics: [`Technical Documentation & Specifications Guide for ${projName}`],
        sections: [
          {
            heading: "1. Technology Specifications References",
            content: `Official reference links for the packages and frameworks used in the ${projName} project stack:`,
            bulletPoints: docLinks
          }
        ]
      };
    }
  }
}

module.exports = {
  getDetailedTheoryForChapter
};
