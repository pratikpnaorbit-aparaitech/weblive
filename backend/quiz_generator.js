const fs = require('fs');

function generateQuestion(qNum, project) {
  let questionText = "";
  let correctText = "";
  let distractors = [];

  const modules = project.modules || [];
  const outcomes = project.outcomes || [];
  const stack = project.stack || "";
  const firstStack = stack.split(",")[0]?.trim() || "Node.js";
  const secondStack = stack.split(",")[1]?.trim() || "Express";

  switch (qNum) {
    case 1:
      questionText = `What is the primary objective of the "${project.name}" project?`;
      correctText = project.objective || "To automate system operations and business workflows.";
      distractors = [
        "To build a static landing page with no interactive features.",
        "To install and configure server operating systems manually.",
        "To design physical hardware prototypes and microcontrollers."
      ];
      break;
    case 2:
      questionText = `Under which domain/technology category is the "${project.name}" project categorized?`;
      correctText = project.domain || "Web Development";
      distractors = [
        "Embedded Systems & IoT",
        "Hardware Maintenance & Support",
        "Graphic Design & UI Mockups"
      ];
      break;
    case 3:
      questionText = `Which of the following technologies is listed in the official stack of "${project.name}"?`;
      correctText = firstStack;
      distractors = [
        "COBOL compiler frameworks",
        "Ruby on Rails framework",
        "Legacy PHP 4 templating"
      ];
      break;
    case 4:
      questionText = `What is the recommended database technology for the "${project.name}" stack?`;
      correctText = stack.toLowerCase().includes("mongodb") ? "MongoDB" : (stack.toLowerCase().includes("mysql") ? "MySQL" : "NoSQL / Relational Database");
      distractors = [
        "Local browser sessionStorage only",
        "Microsoft Access 97",
        "Raw comma-separated text files"
      ];
      break;
    case 5:
      questionText = `Which of the following is a core functional module in the "${project.name}" architecture?`;
      correctText = modules[0] || "Dashboard Administration";
      distractors = [
        "Web Scraping Crawler Agent",
        "Blockchain Ledger Auditor",
        "Raw FTP Socket Connector"
      ];
      break;
    case 6:
      questionText = `In the "${project.name}" application, what is the key purpose of the "${modules[1] || "Reporting"}" module?`;
      correctText = `To manage operations, view statistics, or process actions for ${modules[1] || "Reporting"}.`;
      distractors = [
        "To compile raw stylesheet rules in runtime.",
        "To run system hardware diagnostics tests.",
        "To scan incoming network packages at the packet level."
      ];
      break;
    case 7:
      questionText = `Which of the following is a verified system module for the "${project.name}" project?`;
      correctText = modules[2] || "System Configuration";
      distractors = [
        "Machine Learning Sentiment Analyzer",
        "Continuous Integration Build Script",
        "Legacy Mail Transfer Protocol Relay"
      ];
      break;
    case 8:
      questionText = `Which of the following is an expected learning outcome of completing the "${project.name}" project?`;
      correctText = outcomes[0] || "System integration and secure deployment.";
      distractors = [
        "Installing computer hardware motherboards",
        "Troubleshooting wireless router signals",
        "Designing physical printed brochures"
      ];
      break;
    case 9:
      questionText = `What architectural skill is validated by building the "${project.name}" project?`;
      correctText = outcomes[1] || "Modular development and API designs.";
      distractors = [
        "Performing direct database server hardware upgrades",
        "Typing documentation on physical print media",
        "Installing device drivers on client workstations"
      ];
      break;
    case 10:
      questionText = `Which architectural design pattern is most suitable for the "${project.name}" backend?`;
      correctText = "MVC (Model-View-Controller) / Modular Layered Architecture";
      distractors = [
        "Monolithic Single-File Scripting Pattern",
        "Procedural Global Function Framework",
        "Event-Driven Hardware Interrupter System"
      ];
      break;
    case 11:
      questionText = `In "${project.name}", how should API endpoints be secured against unauthorized access?`;
      correctText = "Using token-based authorization (e.g., JWT) in request headers.";
      distractors = [
        "Storing authentication variables in global frontend state.",
        "Encoding credentials in plain text in query parameters.",
        "Disabling CORS controls completely on the server."
      ];
      break;
    case 12:
      questionText = `Which HTTP method should be used to create new records in the "${project.name}" backend?`;
      correctText = "POST";
      distractors = [
        "GET",
        "DELETE",
        "OPTIONS"
      ];
      break;
    case 13:
      questionText = `Which HTTP method is most appropriate for modifying an existing record/state in the "${project.name}" backend?`;
      correctText = "PUT or PATCH";
      distractors = [
        "GET",
        "DELETE",
        "HEAD"
      ];
      break;
    case 14:
      questionText = `Why is backend input validation critical in the "${project.name}" application?`;
      correctText = "To prevent injection, verify data constraints, and block malformed payloads before database writes.";
      distractors = [
        "To speed up browser page render times.",
        "To allow cross-origin scripting on all paths.",
        "To bypass security policies established by the web server."
      ];
      break;
    case 15:
      questionText = `What is the typical operational workflow for the "${project.name}" portal?`;
      correctText = "User logs in -> Opens Dashboard -> Interacts with project modules -> Modifies database state.";
      distractors = [
        "Guest accesses page -> Prints empty report -> Restarts server -> Logs out.",
        "Install camera driver -> Restart client workstation -> Clear database.",
        "Connect via FTP -> Edit JSON directly -> Download Excel spreadsheet."
      ];
      break;
    case 16:
      questionText = `What is the role of CORS middleware in the "${project.name}" backend configuration?`;
      correctText = "To authorize and restrict cross-origin requests from client domain endpoints.";
      distractors = [
        "To compress the size of files stored on the server.",
        "To automatically trigger database backup protocols.",
        "To encrypt connection string credentials on the server."
      ];
      break;
    case 17:
      questionText = `How should exceptions or database connectivity drops be handled in the "${project.name}" backend?`;
      correctText = "Catch errors, log details for debugging, and return a clean JSON error response with an appropriate HTTP status code.";
      distractors = [
        "Allow the server to crash so that it initiates a container restart.",
        "Expose the raw node stack trace in the client browser UI.",
        "Write dummy data to data.json to bypass database connection failures."
      ];
      break;
    case 18:
      questionText = `Why would you add indexing to search fields in the "${project.name}" database schemas?`;
      correctText = "To speed up query search performance and reduce data lookup delays.";
      distractors = [
        "To compress stored data into smaller volumes.",
        "To prevent unauthorized users from viewing the indexed field.",
        "To generate chapter documentation automatically."
      ];
      break;
    case 19:
      questionText = `Which practice improves the throughput and scalability of the "${project.name}" API?`;
      correctText = "Keeping API routes stateless and utilizing database connection pooling.";
      distractors = [
        "Storing all user session objects in global memory variables.",
        "Handling all request threads synchronously on a single core.",
        "Uploading user documents directly into the codebase folder."
      ];
      break;
    case 20:
      questionText = `How should user authentication states be maintained securely on the frontend client of "${project.name}"?`;
      correctText = "Stored in localStorage or cookies, and validated via backend token verification on every route request.";
      distractors = [
        "Written to local client-side JSON files via FS scripts.",
        "Kept only in temporary global variables in active script tags.",
        "Exchanged via plain-text url hash parameters."
      ];
      break;
    case 21:
      questionText = `What is a primary real-world application or target environment for "${project.name}"?`;
      correctText = project.realWorldApp || "Managing business workflows, administrative tracking, and data processing.";
      distractors = [
        "Setting up network VPN gateway tunnels.",
        "Operating physical barcode scanners.",
        "Hosting high-resolution virtual gaming lobbies."
      ];
      break;
    case 22:
      questionText = `How does the "${modules[3] || "Analytics"}" module integrate with the database in "${project.name}"?`;
      correctText = `It reads and aggregates database records to produce summary results for "${modules[3] || "Analytics"}".`;
      distractors = [
        "It clears database collections to optimize disk space.",
        "It uses client-side calculations based on hardcoded arrays.",
        "It updates CSS rules dynamically on the stylesheet."
      ];
      break;
    case 23:
      questionText = `Why is "${secondStack}" chosen for the "${project.name}" backend implementation?`;
      correctText = `For its robust routing engine, simplicity, and middleware execution pipeline.`;
      distractors = [
        "To automate client-side visual stylesheet layouts.",
        "For native hardware interfacing capabilities.",
        "For compile-time type checking and safety."
      ];
      break;
    case 24:
      questionText = `How are state changes committed securely in the "${project.name}" application?`;
      correctText = "By validating requests on the server, running sanitization middleware, and executing verified database updates.";
      distractors = [
        "By modifying query strings on the client web page.",
        "By periodically flushing client browser session caches.",
        "By downloading Excel reports from the administration tab."
      ];
      break;
    case 25:
      questionText = `In the "${project.name}" learning track, what final step must a student complete?`;
      correctText = "Pass the technical assessment quiz and submit a verified GitHub repository URL for review.";
      distractors = [
        "Clear local databases and register a new candidate username.",
        "Capture manual camera proof images and upload notes.",
        "Modify documentation settings and publish chapters."
      ];
      break;
  }

  // Shuffle options
  const options = [correctText, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const correctIndex = options.indexOf(correctText);
  const correctLetter = ["A", "B", "C", "D"][correctIndex];

  return {
    id: `${project.id}-q-${qNum}`,
    projectId: project.id,
    question: questionText,
    optionA: options[0],
    optionB: options[1],
    optionC: options[2],
    optionD: options[3],
    correctAnswer: correctLetter,
    marks: 2,
    active: true
  };
}

function ensureAllQuizzes(db, filePath) {
  db.quizzes = Array.isArray(db.quizzes) ? db.quizzes : [];
  db.questions = Array.isArray(db.questions) ? db.questions : [];
  db.quizResults = Array.isArray(db.quizResults) ? db.quizResults : [];

  const quizMap = new Map(db.quizzes.map(q => [q.projectId, q]));
  const questionCountMap = new Map();
  db.questions.forEach(q => {
    if (q.active !== false) {
      questionCountMap.set(q.projectId, (questionCountMap.get(q.projectId) || 0) + 1);
    }
  });

  let changed = false;
  db.projects.forEach(project => {
    if (!quizMap.has(project.id)) {
      db.quizzes.push({
        projectId: project.id,
        title: `${project.name} Assessment Quiz`,
        totalQuestions: 25,
        totalMarks: 50,
        marksPerQuestion: 2,
        status: "active"
      });
      changed = true;
    }

    const count = questionCountMap.get(project.id) || 0;
    if (count === 0) {
      for (let qNum = 1; qNum <= 25; qNum++) {
        const generated = generateQuestion(qNum, project);
        db.questions.push(generated);
      }
      changed = true;
    }
  });

  if (changed && filePath) {
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
  }
}

module.exports = {
  generateQuestion,
  ensureAllQuizzes
};
