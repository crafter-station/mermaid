"use client";

import { useCallback, useRef, useState } from "react";
import { SampleCard } from "./sample-card";

interface Sample {
	title: string;
	description: string;
	category: string;
	source: string;
}

const SAMPLES: Sample[] = [
	{
		title: "Basic Flow",
		description: "Simple top-down flowchart with decision branching.",
		category: "flowchart",
		source: `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Success]
  B -->|No| D[Retry]
  D --> B`,
	},
	{
		title: "Node Shapes",
		description: "All available node shapes: rectangle, rounded, diamond, circle, stadium, and more.",
		category: "flowchart",
		source: `graph LR
  A[Rectangle] --> B(Rounded)
  B --> C{Diamond}
  C --> D((Circle))
  D --> E([Stadium])
  E --> F[[Subroutine]]`,
	},
	{
		title: "Edge Types",
		description: "Solid, dotted, and thick edges with labels.",
		category: "flowchart",
		source: `graph LR
  A --> B
  A -->|labeled| C
  B -.-> D
  C ==> E
  D -.->|dotted label| F`,
	},
	{
		title: "Subgraphs",
		description: "Group related nodes into named subgraphs for visual organization.",
		category: "flowchart",
		source: `graph TB
  subgraph Frontend
    A[React App] --> B[API Client]
  end
  subgraph Backend
    C[Express Server] --> D[(Database)]
  end
  B --> C`,
	},
	{
		title: "CI/CD Pipeline",
		description: "Continuous integration pipeline from commit to production.",
		category: "flowchart",
		source: `graph LR
  A[Push] --> B[Build]
  B --> C[Test]
  C --> D{Pass?}
  D -->|Yes| E[Stage]
  D -->|No| F[Fix]
  E --> G[Deploy]
  F --> A`,
	},
	{
		title: "Direction Variants",
		description: "Top-to-bottom, left-to-right, right-to-left, and bottom-to-top flows.",
		category: "flowchart",
		source: `graph RL
  A[End] --> B[Process]
  B --> C[Start]
  C --> D{Check}
  D -->|OK| A
  D -->|Fail| C`,
	},
	{
		title: "Decision Tree",
		description: "Multi-level decision tree with multiple outcomes.",
		category: "flowchart",
		source: `graph TD
  A{Is it raining?}
  A -->|Yes| B{Have umbrella?}
  A -->|No| C[Go outside]
  B -->|Yes| D[Walk with umbrella]
  B -->|No| E{Urgent?}
  E -->|Yes| F[Run]
  E -->|No| G[Wait]`,
	},
	{
		title: "Microservices",
		description: "Microservices architecture with API gateway and service mesh.",
		category: "flowchart",
		source: `graph TD
  A[Client] --> B[API Gateway]
  B --> C[Auth Service]
  B --> D[User Service]
  B --> E[Order Service]
  D --> F[(User DB)]
  E --> G[(Order DB)]
  E --> H[Payment Service]`,
	},
	{
		title: "Basic Sequence",
		description: "Request-response pattern between client and server.",
		category: "sequence",
		source: `sequenceDiagram
  participant C as Client
  participant S as Server
  participant D as Database
  C->>S: GET /api/users
  S->>D: SELECT * FROM users
  D-->>S: ResultSet
  S-->>C: 200 OK (JSON)`,
	},
	{
		title: "Arrow Types",
		description: "All sequence diagram arrow types: solid, dotted, with and without arrowheads.",
		category: "sequence",
		source: `sequenceDiagram
  participant A
  participant B
  A->B: Solid line
  A-->B: Dotted line
  A->>B: Solid arrow
  A-->>B: Dotted arrow
  B->>A: Response`,
	},
	{
		title: "Activation Boxes",
		description: "Show when participants are active processing requests.",
		category: "sequence",
		source: `sequenceDiagram
  participant U as User
  participant A as App
  participant DB as Database
  U->>A: Login request
  activate A
  A->>DB: Verify credentials
  activate DB
  DB-->>A: Valid
  deactivate DB
  A-->>U: Token
  deactivate A`,
	},
	{
		title: "Alt/Loop/Par Blocks",
		description: "Conditional, loop, and parallel execution blocks.",
		category: "sequence",
		source: `sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: Request
  alt success
    S-->>C: 200 OK
  else error
    S-->>C: 500 Error
  end
  loop Retry 3x
    C->>S: Retry
  end`,
	},
	{
		title: "OAuth 2.0 Flow",
		description: "Authorization code flow with token exchange.",
		category: "sequence",
		source: `sequenceDiagram
  participant U as User
  participant A as App
  participant P as Auth Provider
  participant R as Resource
  U->>A: Login
  A->>P: Redirect to auth
  P->>U: Login form
  U->>P: Credentials
  P->>A: Auth code
  A->>P: Exchange code
  P-->>A: Access token
  A->>R: API call + token
  R-->>A: Protected data
  A-->>U: Dashboard`,
	},
	{
		title: "Self Message",
		description: "A participant sending a message to itself for internal processing.",
		category: "sequence",
		source: `sequenceDiagram
  participant S as Server
  participant C as Cache
  S->>S: Validate input
  S->>C: Check cache
  C-->>S: Cache miss
  S->>S: Process request
  S->>C: Update cache
  C-->>S: OK`,
	},
	{
		title: "Basic Class",
		description: "Simple class with attributes and methods.",
		category: "class",
		source: `classDiagram
  class User {
    +String name
    +String email
    +login()
    +logout()
  }
  class Admin {
    +String role
    +ban(user)
  }
  User <|-- Admin`,
	},
	{
		title: "Visibility Modifiers",
		description: "Public, private, protected, and package access modifiers.",
		category: "class",
		source: `classDiagram
  class Account {
    +String id
    -String password
    #int balance
    ~String internal
    +getBalance() int
    -hashPassword() String
  }`,
	},
	{
		title: "Relationships",
		description: "Inheritance, composition, aggregation, and association.",
		category: "class",
		source: `classDiagram
  Animal <|-- Dog
  Animal <|-- Cat
  Dog *-- Leg
  Dog o-- Toy
  Cat --> Mouse
  class Animal {
    +String name
    +speak()
  }`,
	},
	{
		title: "Design Pattern",
		description: "Observer pattern with subject and listeners.",
		category: "class",
		source: `classDiagram
  class EventEmitter {
    -Map listeners
    +on(event, fn)
    +emit(event, data)
    +off(event, fn)
  }
  class Logger {
    +handle(data)
  }
  class Analytics {
    +handle(data)
  }
  EventEmitter o-- Logger
  EventEmitter o-- Analytics`,
	},
	{
		title: "Class Hierarchy",
		description: "Multi-level inheritance tree with abstract base class.",
		category: "class",
		source: `classDiagram
  class Shape {
    +int x
    +int y
    +area() float
    +draw()
  }
  class Circle {
    +int radius
    +area() float
  }
  class Rectangle {
    +int width
    +int height
    +area() float
  }
  Shape <|-- Circle
  Shape <|-- Rectangle`,
	},
	{
		title: "Basic ER",
		description: "Users and orders with one-to-many relationship.",
		category: "er",
		source: `erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  LINE_ITEM }o--|| PRODUCT : references`,
	},
	{
		title: "Cardinality Types",
		description: "All ER diagram cardinality types: one, many, zero-or-one, zero-or-more.",
		category: "er",
		source: `erDiagram
  PERSON ||--o{ ADDRESS : lives_at
  PERSON ||--|| PASSPORT : has
  COMPANY ||--o{ EMPLOYEE : employs
  EMPLOYEE }o--o{ PROJECT : works_on`,
	},
	{
		title: "E-Commerce Schema",
		description: "Complete e-commerce data model with customers, orders, and products.",
		category: "er",
		source: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_LINE : contains
  ORDER_LINE }o--|| PRODUCT : references
  PRODUCT }o--|| CATEGORY : belongs_to
  CUSTOMER ||--o{ REVIEW : writes
  REVIEW }o--|| PRODUCT : about`,
	},
	{
		title: "Blog Schema",
		description: "Blog platform with authors, posts, comments, and tags.",
		category: "er",
		source: `erDiagram
  AUTHOR ||--o{ POST : writes
  POST ||--o{ COMMENT : has
  POST }o--o{ TAG : tagged_with
  COMMENT }o--|| AUTHOR : written_by`,
	},
	{
		title: "Basic State",
		description: "Simple state machine with transitions.",
		category: "state",
		source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Processing : start
  Processing --> Success : complete
  Processing --> Error : fail
  Error --> Idle : reset
  Success --> [*]`,
	},
	{
		title: "Connection Lifecycle",
		description: "WebSocket connection states from connecting to closed.",
		category: "state",
		source: `stateDiagram-v2
  [*] --> Connecting
  Connecting --> Open : connected
  Connecting --> Closed : timeout
  Open --> Closing : disconnect
  Open --> Closed : error
  Closing --> Closed : done
  Closed --> Connecting : reconnect
  Closed --> [*]`,
	},
	{
		title: "Order Status",
		description: "E-commerce order state machine with cancellation and refunds.",
		category: "state",
		source: `stateDiagram-v2
  [*] --> Pending
  Pending --> Confirmed : payment
  Pending --> Cancelled : cancel
  Confirmed --> Shipped : ship
  Shipped --> Delivered : deliver
  Delivered --> [*]
  Cancelled --> [*]`,
	},
	{
		title: "Language Distribution",
		description: "Pie chart showing programming language usage percentages.",
		category: "pie",
		source: `pie title Languages Used
  "TypeScript" : 45
  "Rust" : 25
  "Go" : 15
  "Python" : 10
  "Other" : 5`,
	},
	{
		title: "Sprint Timeline",
		description: "Two-week sprint with design, development, testing, and review phases.",
		category: "gantt",
		source: `gantt
  title Sprint 1
  dateFormat YYYY-MM-DD
  section Design
    Wireframes     :a1, 2025-01-01, 3d
    UI Design      :a2, after a1, 2d
  section Dev
    Frontend       :b1, after a2, 5d
    Backend        :b2, after a2, 4d
  section QA
    Testing        :c1, after b1, 3d`,
	},
	{
		title: "Web Technologies",
		description: "Mind map of modern web development technologies.",
		category: "mindmap",
		source: `mindmap
  root((Web Dev))
    Frontend
      React
      Vue
      Svelte
    Backend
      Node.js
      Deno
      Bun
    Database
      PostgreSQL
      Redis`,
	},
	{
		title: "Project Planning",
		description: "Mind map breaking down a project into phases and deliverables.",
		category: "mindmap",
		source: `mindmap
  root((Project))
    Phase 1
      Research
      Design
      Prototype
    Phase 2
      Development
      Testing
      Review
    Phase 3
      Launch
      Monitor`,
	},
];

const CATEGORIES = [
	{ id: "all", label: "All" },
	{ id: "flowchart", label: "Flowchart" },
	{ id: "sequence", label: "Sequence" },
	{ id: "class", label: "Class" },
	{ id: "er", label: "ER" },
	{ id: "state", label: "State" },
	{ id: "pie", label: "Pie" },
	{ id: "gantt", label: "Gantt" },
	{ id: "mindmap", label: "Mindmap" },
];

export function SamplesGallery() {
	const [activeCategory, setActiveCategory] = useState("all");
	const renderTimesRef = useRef<Map<number, number>>(new Map());
	const [totalTime, setTotalTime] = useState<number | null>(null);

	const filtered = activeCategory === "all"
		? SAMPLES
		: SAMPLES.filter((s) => s.category === activeCategory);

	const handleRenderTime = useCallback((index: number, ms: number) => {
		renderTimesRef.current.set(index, ms);
		if (renderTimesRef.current.size === SAMPLES.length) {
			let total = 0;
			for (const t of renderTimesRef.current.values()) total += t;
			setTotalTime(total);
		}
	}, []);

	const categoryCounts = SAMPLES.reduce<Record<string, number>>((acc, s) => {
		acc[s.category] = (acc[s.category] || 0) + 1;
		return acc;
	}, {});

	return (
		<section id="samples" className="py-24 px-6">
			<div className="mx-auto max-w-6xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Gallery
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					{SAMPLES.length} samples. Every one playable.
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-4 max-w-lg mx-auto">
					8 diagram types, each with a play button. Watch any diagram build itself step by step.
				</p>
				{totalTime !== null && (
					<p className="text-center mb-8">
						<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent-green)]/20 bg-[var(--accent-green)]/5 text-xs font-mono text-[var(--accent-green)]">
							{SAMPLES.length} samples rendered in {totalTime.toFixed(0)}ms
						</span>
					</p>
				)}

				<div className="flex flex-wrap gap-2 justify-center mb-12">
					{CATEGORIES.map((cat) => {
						const count = cat.id === "all" ? SAMPLES.length : (categoryCounts[cat.id] || 0);
						const isActive = activeCategory === cat.id;
						return (
							<button
								key={cat.id}
								onClick={() => setActiveCategory(cat.id)}
								className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer ${
									isActive
										? "bg-[var(--accent-blue)] text-white"
										: "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
								}`}
							>
								{cat.label}
								<span className={`ml-1.5 ${isActive ? "text-white/70" : "text-[var(--text-muted)]/50"}`}>
									{count}
								</span>
							</button>
						);
					})}
				</div>

				<div className="grid gap-6">
					{filtered.map((sample, i) => {
						const globalIndex = SAMPLES.indexOf(sample);
						return (
							<SampleCard
								key={`${sample.category}-${sample.title}`}
								title={sample.title}
								description={sample.description}
								category={sample.category}
								source={sample.source}
								renderTimeRef={(ms) => handleRenderTime(globalIndex, ms)}
							/>
						);
					})}
				</div>
			</div>
		</section>
	);
}
