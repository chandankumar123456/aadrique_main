// Content for the Complete AI Engineering Programme page (/ai-engineering).
// Kept static (not CMS-backed) so the landing page renders without an API round-trip.

export const PROGRAMME_PATH = "/ai-engineering";
export const PROGRAMME_INTEREST = "Complete AI Engineering Programme";
export const PROGRAMME_APPLY = "/ai-engineering/apply";
// Fallback when online applications are disabled (no Google client configured).
export const PROGRAMME_CONTACT = "/contact?interest=ai-engineering";

export const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Graduated", "Other"];
export const PYTHON_LEVELS = ["New to programming", "Beginner", "Comfortable", "Advanced"];
export const HEARD_FROM = ["Instagram", "WhatsApp", "LinkedIn", "Friend or classmate", "College / faculty", "Google search", "Other"];

// Batch start, midnight IST. Drives the countdowns and the "starts in" copy.
export const START_DATE = new Date("2026-12-15T00:00:00+05:30");
export const START_LABEL = "15 December 2026";
export const START_SHORT = "15 Dec 2026";

// Fee shown to students. The API is the source of truth for what is charged
// (backend/programme.py → fee_breakdown); keep these in step.
export const FEE = { base: 14999, gstRate: 0, gst: 0, total: 14999 };
export const inr = (n, digits = 2) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;


export const EARLY_BIRD_SEATS = 20;
export const PRIMARY_CTA = "Apply for Batch 01";

// ── Hero ────────────────────────────────────────────────────────
export const HERO = {
  label: "AADRIQUE · Complete AI Engineering Programme · Batch 01",
  lines: ["Don't just learn AI.", "Learn to build with it."],
  subhead: "A four-month, live and practical AI Engineering programme for BTech 2nd- and 3rd-year students.",
  summary:
    "Learn directly from industry professionals. Get one-to-one mentor sessions every weekend. Build five portfolio projects, including a deployed AI application. Earn a programme completion certificate by meeting the course requirements. And put yourself forward for competitive paid internship opportunities for top performers.",
  facts: [
    ["Starts", "15 December 2026"],
    ["Duration", "16 weeks"],
    ["Format", "Live instructor-led sessions"],
    ["Live teaching", "Approximately 80 hours"],
  ],
  disclaimer:
    "First 20 confirmed admissions qualify for the early-bird fee. Internship selection is competitive and is not guaranteed to every student.",
};

export const DIFFERENTIATORS = [
  ["Live learning", "Instructor-led live sessions — and every session is recorded, so you can catch up if you miss one."],
  ["Industry mentorship", "Practical demonstrations, technical walkthroughs and project guidance from industry professionals."],
  ["Personal interaction", "One-to-one mentor sessions every Saturday and Sunday, alongside group learning."],
  ["Five core projects", "Practical work you can document and present in your portfolio."],
  ["Completion certificate", "A programme certificate in your name after meeting the published completion requirements."],
  ["Paid internship pathway", "Top performers may be shortlisted for available paid internship opportunities."],
];

// ── The student problem ─────────────────────────────────────────
export const PROBLEM = {
  title: ["Watching tutorials is easy.", "Building something that works is different."],
  paragraphs: [
    "You may already know how to find a Python tutorial, follow a machine learning video or ask an AI tool to generate code.",
    "But when someone asks you to build an application from scratch, explain why your model works, connect an API, fix an error or deploy your project, the real learning begins.",
    "That is the gap this programme is designed to help you work through. You will not just move from one topic to another. You will practise implementing concepts, solving problems, getting feedback and improving your work.",
  ],
  goal: "By the end of the programme, have real projects you can open, explain and demonstrate.",
};

// ── Outcomes ────────────────────────────────────────────────────
export const OUTCOMES = [
  { title: "Build your technical foundation", desc: "Learn Python, developer tools, data handling, statistics and machine learning fundamentals." },
  { title: "Understand and implement AI models", desc: "Work with machine learning, deep learning, neural networks, computer vision and natural language processing." },
  { title: "Build with modern generative AI", desc: "Work with LLM APIs, embeddings, retrieval-augmented generation (RAG), vector databases and AI agent workflows." },
  { title: "Turn prototypes into applications", desc: "Build backend APIs, connect databases, use Docker and deploy an AI application." },
  { title: "Develop a portfolio", desc: "Complete five core projects, weekly exercises and a final deployed capstone that you can document and demonstrate." },
];
export const OUTCOMES_NOTE =
  "Your progress depends on attending sessions and putting in independent practice outside class. The programme provides instruction and guidance; your portfolio is built through your own implementation.";

// ── Why AADRIQUE ────────────────────────────────────────────────
export const WHY = [
  {
    title: "Learn from industry professionals",
    desc: "Learn how AI concepts are used in practical engineering work. Industry professionals contribute through technical demonstrations, implementation walkthroughs, practical discussions and project reviews — so you see how engineers approach problems, make technical decisions and turn an idea into a working application.",
  },
  {
    title: "Learn live. Ask questions. Get unstuck.",
    desc: "Every scheduled weekday class is instructor-led and live — and recorded, so you can catch up if you miss one. Ask questions, follow implementations in real time, and use the one-to-one mentor sessions every Saturday and Sunday to discuss your progress, clarify technical challenges and get direction on your projects.",
  },
  {
    title: "Build five core portfolio projects",
    desc: "Concepts become useful when you can apply them. Work on five core projects, supported by weekly coding exercises and assignments — practical work to discuss in technical interviews and present on GitHub.",
  },
  {
    title: "Follow a complete AI Engineering learning path",
    desc: "Move through Python, data science, machine learning, deep learning, generative AI, LLM applications, RAG, AI agents, backend development and deployment in a structured sequence.",
  },
  {
    title: "Earn a programme completion certificate",
    desc: "Students who meet the programme's attendance, assessment and project-completion requirements receive an AADRIQUE programme completion certificate issued in their name. The practical work you build alongside it is what demonstrates your skills.",
  },
  {
    title: "Compete for paid internship opportunities",
    desc: "High-performing students may be shortlisted for available paid internship positions based on technical knowledge, project implementation, problem-solving, consistency and teamwork. Competitive — not guaranteed for every enrollee.",
  },
  {
    title: "Gain exposure through an industry network",
    desc: "AADRIQUE has a network of 20+ partner companies. Depending on each organisation's confirmed role, it may contribute industry interactions, project insights, mentoring, technology collaboration or relevant career opportunities.",
  },
];

// ── Mentorship & live interaction ───────────────────────────────
export const LIVE_MEANS = [
  "Scheduled live instructor-led classes every weekday.",
  "Live coding and technical walkthroughs.",
  "Opportunities to ask questions and clarify concepts.",
  "Practical exercises and project development.",
  "One-to-one mentor sessions every Saturday and Sunday.",
  "Recordings of every live session, so you can catch up on anything you miss.",
];
export const MENTOR_HELPS = [
  "Understanding difficult concepts.",
  "Reviewing progress and project direction.",
  "Identifying gaps in implementation.",
  "Getting guidance when you are blocked.",
  "Improving how you document and present your work.",
];

// ── Projects ────────────────────────────────────────────────────
export const PROJECTS = [
  { title: "Machine Learning Prediction System", desc: "Build and evaluate a prediction model using Scikit-learn. Learn how to prepare data, train a model and evaluate its performance." },
  { title: "Computer Vision Application", desc: "Develop an image-classification application using PyTorch and transfer learning." },
  { title: "Enterprise-Style RAG Assistant", desc: "Create an assistant that can retrieve information from uploaded documents and generate answers grounded in the retrieved content." },
  { title: "Agentic AI Research Assistant", desc: "Build an AI workflow that uses tools and APIs to carry out a multi-step task." },
  { title: "Production AI Application", desc: "Develop and deploy an application that integrates an AI model, backend API and database." },
];
export const PORTFOLIO_NOTE =
  "Document your projects, organise your code on GitHub and prepare to explain the problem, approach, implementation and results.";
export const PROJECTS_NOTE =
  "Project scope and tools may be updated as the programme progresses. Additional weekly exercises and smaller projects will reinforce the concepts covered in class.";

// ── Curriculum ──────────────────────────────────────────────────
const wk = (week, title, topics, kind, text) => ({ week, title, topics, deliverable: { kind, text } });

export const MONTHS = [
  {
    month: "Month 01",
    title: "Programming, Data Science and Machine Learning Foundations",
    objective: "Build a strong foundation in Python programming, data handling and core machine learning concepts.",
    outcome: "Build, train and evaluate a machine learning model.",
    weeks: [
      wk(1, "Python Programming Fundamentals", [
        "Introduction to Python and the development environment", "Variables, data types and operators",
        "Conditional statements and loops", "Functions and basic problem-solving",
        "Lists, tuples, sets and dictionaries", "Practical coding exercises",
      ], "Assignment", "Build a Python-based student management application."),
      wk(2, "Intermediate Python and Developer Tools", [
        "Object-oriented programming", "Classes, objects, inheritance and encapsulation", "Modules and packages",
        "Exception handling and file handling", "Working with JSON and CSV files", "Git and GitHub fundamentals",
        "Introduction to APIs and HTTP requests",
      ], "Assignment", "Build a Python automation tool and publish the code on GitHub."),
      wk(3, "Data Science and Mathematics for AI", [
        "NumPy fundamentals", "Pandas for data manipulation", "Data cleaning and preprocessing",
        "Data visualisation using Matplotlib", "Descriptive statistics and probability fundamentals",
        "Linear algebra concepts used in machine learning", "Exploratory data analysis",
      ], "Assignment", "Perform exploratory data analysis on a real-world dataset."),
      wk(4, "Introduction to Machine Learning", [
        "Supervised and unsupervised learning", "Regression and classification", "Linear and logistic regression",
        "Decision trees and random forests", "K-nearest neighbours and Naive Bayes",
        "Training, validation and test datasets", "Accuracy, precision, recall and F1 score", "Overfitting and underfitting",
      ], "Project", "Student performance prediction using Scikit-learn."),
    ],
  },
  {
    month: "Month 02",
    title: "Advanced Machine Learning and Deep Learning",
    objective: "Understand how machine learning models learn and build neural-network-based applications.",
    outcome: "Build and evaluate a deep learning application.",
    weeks: [
      wk(5, "Advanced Machine Learning", [
        "Clustering and K-means", "Hierarchical clustering", "Principal Component Analysis (PCA)", "Ensemble learning",
        "Boosting and XGBoost", "Feature engineering", "Hyperparameter tuning and cross-validation",
      ], "Practical work", "Customer segmentation."),
      wk(6, "Neural Networks Fundamentals", [
        "How neural networks work", "Perceptrons, weights and biases", "Activation functions",
        "Forward propagation and backpropagation", "Loss functions and gradient descent",
      ], "Practical work", "Build a basic neural network."),
      wk(7, "Deep Learning with PyTorch", [
        "Tensors and tensor operations", "Building models with PyTorch", "Loss functions and optimisers",
        "Training loops", "Convolutional Neural Networks (CNNs)", "Transfer learning",
      ], "Project work", "Image classification application."),
      wk(8, "Natural Language Processing", [
        "Text preprocessing", "Tokenisation", "Word embeddings", "Text classification", "Attention mechanisms",
        "Transformer fundamentals",
      ], "Practical work", "Build a text classification application."),
    ],
  },
  {
    month: "Month 03",
    title: "Generative AI and LLM Engineering",
    objective: "Build applications using large language models, retrieval systems and AI agents.",
    outcome: "Build a RAG application and an AI agent that can use tools to complete tasks.",
    weeks: [
      wk(9, "Large Language Models and Prompt Engineering", [
        "LLM fundamentals", "GPT and transformer concepts", "Tokens and context windows", "Prompt engineering",
        "Working with LLM APIs", "Structured outputs", "Function and tool calling",
      ], "Project work", "Build an AI assistant."),
      wk(10, "Embeddings, Vector Databases and RAG", [
        "Text embeddings", "Semantic search", "Document ingestion", "Chunking strategies",
        "Vector databases: FAISS, Chroma and pgvector", "Retrieval-Augmented Generation (RAG)", "RAG evaluation fundamentals",
      ], "Project", "Build a PDF knowledge assistant."),
      wk(11, "AI Frameworks and Agentic Workflows", [
        "LangChain fundamentals", "Prompt templates and output parsers", "Tool integration and function calling",
        "LangGraph fundamentals", "Stateful workflows", "Multi-step AI agents", "Evaluation and guardrails",
      ], "Project work", "Build an AI research assistant."),
      wk(12, "Open-Source Models and Fine-Tuning", [
        "Hugging Face ecosystem", "Working with open-source models", "Model inference", "Fine-tuning concepts",
        "LoRA and QLoRA fundamentals", "Dataset preparation", "Multimodal AI: text, image and audio",
      ], "Project work", "Build a domain-specific AI application."),
    ],
  },
  {
    month: "Month 04",
    title: "Production AI Engineering and Deployment",
    objective: "Learn how to turn AI prototypes into usable, deployable and maintainable applications.",
    outcome: "Deliver a portfolio-ready AI application with deployment and technical documentation.",
    weeks: [
      wk(13, "Backend Development for AI Applications", [
        "Backend architecture", "REST APIs", "FastAPI", "PostgreSQL", "Authentication fundamentals",
        "AI model and API integration",
      ], "Practical work", "Build an AI backend."),
      wk(14, "Deployment and DevOps Fundamentals", [
        "Docker and containers", "Cloud deployment fundamentals", "Environment variables and secrets", "GitHub Actions",
        "CI/CD fundamentals",
      ], "Practical work", "Deploy an AI application."),
      wk(15, "Testing, Evaluation and AI Safety", [
        "Application testing", "LLM and RAG evaluation", "Hallucination checks", "Logging and monitoring",
        "Prompt injection and security", "Privacy fundamentals", "Latency and cost optimisation",
      ], "Practical work", "Improve and evaluate a deployed RAG application."),
      wk(16, "Capstone and AI System Design", [
        "AI system design fundamentals", "Choosing models and infrastructure", "Capstone implementation",
        "Code review and documentation", "GitHub portfolio preparation", "Project demonstration",
        "Interview and presentation preparation",
      ], "Final outcome", "Demonstrate a deployed AI application with a backend, database and project documentation."),
    ],
  },
];

// ── Tools ───────────────────────────────────────────────────────
export const TOOLS = [
  "Python", "Git & GitHub", "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "XGBoost", "PyTorch",
  "Hugging Face", "LLM APIs", "LangChain", "LangGraph", "FAISS", "Chroma", "pgvector", "FastAPI",
  "PostgreSQL", "Docker", "GitHub Actions",
];
export const TOOLS_NOTE =
  "The tools introduced will depend on the topic and project. The programme focuses on understanding how to use them to build working applications, not simply memorising tool names.";

// ── Weekly experience ───────────────────────────────────────────
export const WEEK_SCHEDULE = [
  { day: "Mon", focus: "New concepts and foundations" },
  { day: "Tue", focus: "Technical deep dive" },
  { day: "Wed", focus: "Live coding and implementation" },
  { day: "Thu", focus: "Practical exercises and problem-solving" },
  { day: "Fri", focus: "Project development and assessment" },
  { day: "Sat", focus: "One-to-one mentor sessions, doubt-clearing and project mentoring", optional: true },
  { day: "Sun", focus: "One-to-one mentor sessions, self-study and assignments", optional: true },
];

export const CLASS_STRUCTURE = [
  { time: "0–10", activity: "Concept introduction" },
  { time: "10–25", activity: "Technical explanation and code walkthrough" },
  { time: "25–45", activity: "Live implementation" },
  { time: "45–55", activity: "Student challenge" },
  { time: "55–60", activity: "Assignment and recap" },
];

// ── Assessment & certificate ────────────────────────────────────
export const ASSESSMENT = [
  { label: "Weekly coding assignments", weight: 20 },
  { label: "Monthly practical assessments", weight: 20 },
  { label: "Individual projects", weight: 25 },
  { label: "Final capstone project", weight: 25 },
  { label: "Attendance and participation", weight: 10 },
];

// ── Internship ──────────────────────────────────────────────────
export const INTERNSHIP_STEPS = [
  ["Build and participate", "Complete assignments, practical assessments and projects."],
  ["Demonstrate your skills", "Show technical understanding, implementation ability and problem-solving."],
  ["Get evaluated", "Performance is assessed against the published selection criteria."],
  ["Shortlisting", "Eligible top performers may be shortlisted for available paid internship positions."],
  ["Opportunity details", "Selected candidates receive the internship details — duration, stipend, responsibilities and conditions — before accepting."],
];

export const INTERNSHIP_CRITERIA = [
  { label: "Technical knowledge", weight: 25 },
  { label: "Project implementation", weight: 30 },
  { label: "Problem-solving", weight: 20 },
  { label: "Attendance and consistency", weight: 10 },
  { label: "Communication and teamwork", weight: 15 },
];

// ── Network ─────────────────────────────────────────────────────
export const NETWORK_TYPES = [
  "Industry or project collaboration",
  "Internship opportunities",
  "Hiring or career opportunity collaboration",
  "Technology or academic collaboration",
];

// ── Free videos vs this programme ───────────────────────────────
export const COMPARE = {
  them: "Self-paced videos alone",
  us: "This programme",
  rows: [
    ["Learn at your own pace, often without a fixed learning sequence", "Follow a structured 16-week learning path"],
    ["Pause a video when you have a doubt", "Ask questions during live instructor-led sessions"],
    ["Work through examples on your own", "Practise through guided implementation and assignments"],
    ["Feedback may be limited or self-directed", "Get project guidance and mentor interactions"],
    ["Projects may remain unfinished", "Work towards five core projects and a deployed capstone"],
    ["No programme-based internship selection pathway", "Top performers may be considered for available paid internship opportunities"],
  ],
};

// ── Who should apply ────────────────────────────────────────────
export const WHO = [
  "BTech 2nd-year students who want to start building AI skills early.",
  "BTech 3rd-year students preparing for internships and placements.",
  "Students interested in Python, machine learning and generative AI.",
  "Students who want to build practical projects and a technical portfolio.",
  "Learners who are willing to practise and complete assignments outside live sessions.",
];
export const NOT_FIT = [
  "You only want a certificate without doing the practical work.",
  "You cannot regularly attend the live sessions.",
  "You are not willing to practise outside the scheduled class hour.",
  "You expect a guaranteed internship or placement.",
];

// ── Programme details (fees section) ────────────────────────────
export const DETAILS = [
  ["Programme", "Complete AI Engineering Programme"],
  ["Batch", "Batch 01"],
  ["Start date", "15 December 2026"],
  ["Duration", "4 months / 16 weeks"],
  ["Live teaching", "Approximately 80 hours"],
  ["Format", "Live instructor-led sessions"],
  ["Target audience", "BTech 2nd- and 3rd-year students"],
  ["Mentoring", "One-to-one mentor sessions every Saturday and Sunday"],
  ["Recordings", "Every live session is recorded"],
  ["Projects", "Five core portfolio projects + weekly assignments"],
  ["Certification", "Completion certificate in your name, subject to programme requirements"],
  ["Internship", "Competitive paid internship opportunities for selected top performers"],
  ["Industry network", "20+ partner companies"],
  ["Refunds", "Fees are non-refundable"],
];

// ── Admissions ──────────────────────────────────────────────────
export const ENROL_STEPS = [
  { title: "Apply", desc: "Sign in with Google and fill the short application — it takes about two minutes." },
  { title: "Pay & confirm your seat", desc: "Pay securely online through Razorpay — UPI, cards or net banking. The early-bird fee applies to the first 20 admissions; after that the regular fee applies." },
  { title: "Join onboarding", desc: "Get ready for the programme, set up your development environment and begin with Python fundamentals on 15 December 2026." },
];

// ── FAQ ─────────────────────────────────────────────────────────
export const FAQS = [
  { q: "When does the batch start?", a: "Batch 01 begins on 15 December 2026." },
  { q: "How long is the programme?", a: "The programme runs for 16 weeks, approximately four months." },
  { q: "Are the classes live?", a: "Yes. The programme is designed around live instructor-led sessions, approximately one hour per weekday." },
  { q: "How many live teaching hours are included?", a: "Approximately 80 hours across the 16-week programme." },
  {
    q: "What are the one-to-one mentor interactions?",
    a: "One-to-one mentor sessions run every Saturday and Sunday, alongside the weekday group classes. Use them to discuss your progress, clear doubts and get direction on your projects.",
  },
  {
    q: "Will industry professionals teach the programme?",
    a: "Industry professionals contribute through practical demonstrations, technical walkthroughs, implementation sessions and project guidance.",
  },
  {
    q: "Is this programme practical or theory-based?",
    a: "It combines technical foundations with coding exercises, assignments, practical assessments and five core portfolio projects, including a deployed capstone.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes — students who meet the attendance, assessment and project-completion requirements receive an AADRIQUE programme completion certificate issued in their name.",
  },
  {
    q: "Is a paid internship guaranteed?",
    a: "No. Paid internship opportunities are competitive and may be offered to selected top performers when positions are available. They are not guaranteed to every student.",
  },
  {
    q: "What if I miss a live session?",
    a: "Every live session is recorded, so you can catch up on anything you miss.",
  },
  {
    q: "Does the 20+ partner company network guarantee a placement?",
    a: "No. The network may support different forms of industry exposure and collaboration. Not every organisation offers internships or recruitment opportunities.",
  },
  { q: "Do I need prior AI knowledge?", a: "No. Python foundations are included. You should be willing to practise independently and complete assignments." },
  {
    q: "What will I build?",
    a: "You will work towards five core projects: a machine learning prediction system, a computer vision application, an enterprise-style RAG assistant, an agentic AI research assistant and a production AI application.",
  },
  {
    q: "How much does the programme cost?",
    a: "The early-bird fee is ₹14,999 for the first 20 admissions, subject to availability; after that the fee is ₹17,999. You pay online through Razorpay (UPI, cards, net banking) right after applying.",
  },
  {
    q: "Can I get a refund?",
    a: "No. Programme fees, including partial payments, are non-refundable once paid. Please read the refund policy before paying.",
  },
  {
    q: "Is one hour per day enough?",
    a: "The scheduled live teaching is approximately one hour per weekday. You will need additional time outside class for coding practice, assignments and project development.",
  },
];

// ── Final CTA ───────────────────────────────────────────────────
export const FINAL = {
  title: "Your next step in AI should be something you can build.",
  body: "Learn from industry professionals. Ask questions in live sessions. Get mentor interaction. Build five practical projects. Work towards a deployed AI capstone. Earn your completion certificate by meeting the programme requirements. And compete for paid internship opportunities based on your performance.",
  disclaimer:
    "Paid internships are competitive and not guaranteed. Certification is subject to programme completion requirements. Company network participation and opportunities depend on each organisation's confirmed role. Fees are non-refundable.",
};
