import { UserRole, Coach, Participant, Admin, RoleDefinition, Sprint, LifecycleStage, LifecycleSlot, SprintType, ParticipantSprint, Referral, ShinePost, CoachingComment } from '../types';

export const FOCUS_OPTIONS = [
  // Initial Personas
  "Entrepreneur", "Business Owner", "Freelancer/Consultant", "9-5 Professional", "Student/Graduate", "Creative/Hustler",
  // Entrepreneur
  "Idea", "Pre-launch (MVP)", "Early (first users)", "Growth (scaling)", "Pivoting", "Funded & expanding",
  "Validating fit", "Building MVP", "Getting users", "Raising funds", "Scaling team/ops", "Beating competition",
  "Product-market fit", "Grow users", "Secure funding", "Build brand", "Optimize team/ops", "Enter new markets",
  // Business Owner
  "Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar",
  "Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital",
  "Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins",
  // Freelancer/Consultant
  "Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise",
  "Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time",
  "Attract high-paying clients", "Package/structure services", "Build personal brand", "Shift to retainers", "Diversify into products/courses", "Scale client delivery",
  // Creative/Hustler
  "Turn talent into profit", "Grow audience", "Land high-paying clients", "Balance art + money", "Build collabs/partnerships", "Break free from undervaluation",
  "Packaging & positioning", "Inconsistent/low income", "Not being seen", "Passion vs. survival conflict", "No structure/strategy", "Charging true worth",
  "Thriving creative biz", "Known authority in craft", "Partnering with big brands", "From hustle to entrepreneurship", "Multiple income streams", "Inspiring others through passion",
  // 9-5 Professional
  "Mid-level manager", "Senior executive", "Specialist/expert", "Team lead", "Early career, aiming higher", "Other track",
  "Not recognized for expertise", "Plateaued/no growth", "Struggling to move into leadership", "Hard to stand out", "Preparing to pivot to entrepreneurship", "Balancing career + personal goals",
  "Gain recognition as leader/expert", "Build influence inside & outside", "Prep for entrepreneurship", "Secure promotion/upgrade", "Strengthen personal brand", "Grow network & opportunities",
  // Student/Graduate
  "Build personal brand before job market", "Get clarity on career direction", "Land internships/entry roles", "Move from school to real projects", "Grow skills & confidence to stand out", "Explore entrepreneurship as a path",
  "Lack of real-world experience", "Unsure how to present myself", "Limited network/connections", "Balancing studies with prep", "Overwhelmed by career options", "Fear of failure/rejection",
  "Working in a top company", "Running a small biz/startup", "Advancing studies (Masters/pro courses)", "Known in my field/industry", "Trying out different paths", "Still figuring it out, but progressing",
  // Employment Status
  "University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"
];

export const FOUNDATION_CLARITY_OPTIONS = [
  "I’m still trying to figure my direction",
  "I have ideas but no clear focus",
  "I know what I want — I need to execute",
  "I just want to explore what’s possible"
];

// USER DEFINED HIERARCHY MAPPING - EXACT LIST
export const PERSONA_HIERARCHY: Record<string, string[][]> = {
    "Entrepreneur": [
        ["Idea", "Pre-launch (MVP)", "Early (first users)", "Growth (scaling)", "Pivoting", "Funded & expanding"],
        ["Validating fit", "Building MVP", "Getting users", "Raising funds", "Scaling team/ops", "Beating competition"],
        ["Product-market fit", "Grow users", "Secure funding", "Build brand", "Optimize team/ops", "Enter new markets"]
    ],
    "Business Owner": [
        ["Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar"],
        ["Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital"],
        ["Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins"]
    ],
    "Freelancer/Consultant": [
        ["Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise"],
        ["Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time"],
        ["Attract high-paying clients", "Package/structure services", "Build personal brand", "Shift to retainers", "Diversify into products/courses", "Scale client delivery"]
    ],
    "Creative/Hustler": [
        ["Turn talent into profit", "Grow audience", "Land high-paying clients", "Balance art + money", "Build collabs/partnerships", "Break free from undervaluation"],
        ["Packaging & positioning", "Inconsistent/low income", "Not being seen", "Passion vs. survival conflict", "No structure/strategy", "Charging true worth"],
        ["Thriving creative biz", "Known authority in craft", "Partnering with big brands", "From hustle to entrepreneurship", "Multiple income streams", "Inspiring others through passion"]
    ],
    "9-5 Professional": [
        ["Mid-level manager", "Senior executive", "Specialist/expert", "Team lead", "Early career, aiming higher", "Other track"],
        ["Not recognized for expertise", "Plateaued/no growth", "Struggling to move into leadership", "Hard to stand out", "Preparing to pivot to entrepreneurship", "Balancing career + personal goals"],
        ["Gain recognition as leader/expert", "Build influence inside & outside", "Prep for entrepreneurship", "Secure promotion/upgrade", "Strengthen personal brand", "Grow network & opportunities"]
    ],
    "Student/Graduate": [
        ["Build personal brand before job market", "Get clarity on career direction", "Land internships/entry roles", "Move from school to real projects", "Grow skills & confidence to stand out", "Explore entrepreneurship as a path"],
        ["Lack of real-world experience", "Unsure how to present myself", "Limited network/connections", "Balancing studies with prep", "Overwhelmed by career options", "Fear of failure/rejection"],
        ["Working in a top company", "Running a small biz/startup", "Advancing studies (Masters/pro courses)", "Known in my field/industry", "Trying out different paths", "Still figuring it out, but progressing"]
    ]
};

export const PERSONAS = Object.keys(PERSONA_HIERARCHY);

export const CATEGORY_TO_STAGE_MAP: Record<string, LifecycleStage> = {
    // 01. Foundation: Stabilising the person before direction or action.
    'Mindset': 'Foundation',
    'Self-Belief': 'Foundation',
    'Self-Trust': 'Foundation',
    'Limiting Beliefs': 'Foundation',
    'Emotional Resilience': 'Foundation',
    'Emotional Intelligence': 'Foundation',
    'Inner Work': 'Foundation',
    'Mental Fitness': 'Foundation',
    'Wellness': 'Foundation',
    'Health': 'Foundation',
    'Lifestyle': 'Foundation',
    'Stress Management': 'Foundation',
    'Energy Management': 'Foundation',
    'Burnout Recovery': 'Foundation',
    'Faith-Based': 'Foundation',
    'Inner Peace': 'Foundation',
    'Growth Fundamentals': 'Foundation', // Platform Core
    'Core Platform Sprint': 'Foundation', // Platform Core
    'Clarity': 'Foundation', // Explicitly mapped to Foundation for the Clarity Slot

    // 02. Direction: Helping people understand who they are and where they’re headed.
    'Life': 'Direction',
    'Self-Discovery': 'Direction',
    'Identity': 'Direction',
    'Purpose': 'Direction',
    'Vision': 'Direction',
    'Purpose Alignment': 'Direction',
    'Meaning': 'Direction',
    'Consciousness': 'Direction',

    // 03. Execution: Doing the work daily and building momentum.
    'Productivity': 'Execution',
    'Performance': 'Execution',
    'High Performance': 'Execution',
    'Focus': 'Execution',
    'Discipline': 'Execution',
    'Consistency': 'Execution',
    'Habits': 'Execution',
    'Accountability': 'Execution',
    'Time Management': 'Execution',

    // 04. Proof: Turning effort into visible capability and outcomes.
    'Career': 'Proof',
    'Professional Development': 'Proof',
    'Leadership': 'Proof',
    'Executive Development': 'Proof',
    'Transition': 'Proof',
    'Work-Life Balance': 'Proof',

    // 05. Positioning: How value is expressed, communicated, and perceived.
    'Communication': 'Positioning',
    'Interpersonal Skills': 'Positioning',
    'Boundaries': 'Positioning',
    'Conflict Resolution': 'Positioning',
    'Connection': 'Positioning',
    'Personal Branding': 'Positioning',
    'Visibility': 'Positioning',
    'Expression': 'Positioning',
    'Thought Leadership': 'Positioning',
    'Content Creation': 'Positioning',

    // 06. Stability: Making progress sustainable and financially grounded.
    'Business': 'Stability',
    'Entrepreneurship': 'Stability',
    'Startup': 'Stability',
    'Founder': 'Stability',
    'Solopreneur': 'Stability',
    'Money Mindset': 'Stability',
    'Financial Empowerment': 'Stability',
    'Wealth Mindset': 'Stability',

    // 07. Expansion: Rebuilding, scaling, or evolving into a new chapter.
    'Creativity': 'Expansion',
    'Life Transitions': 'Expansion',
    'Reinvention': 'Expansion',
    'Change': 'Expansion',
    'Reset': 'Expansion',
    'Growth': 'Expansion',
    'Transformation': 'Expansion',
    'Relationships': 'Expansion'
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_TO_STAGE_MAP).sort();

export const LIFECYCLE_STAGES_CONFIG: Record<LifecycleStage, { subtitle: string; description: string }> = {
    'Foundation': {
        subtitle: '01. Foundation',
        description: 'Stabilising the person before direction or action.'
    },
    'Direction': {
        subtitle: '02. Direction',
        description: 'Helping people understand who they are and where they’re headed.'
    },
    'Execution': {
        subtitle: '03. Execution',
        description: 'Doing the work daily and building momentum.'
    },
    'Proof': {
        subtitle: '04. Proof',
        description: 'Turning effort into visible capability and outcomes.'
    },
    'Positioning': {
        subtitle: '05. Positioning',
        description: 'How value is expressed, communicated, and perceived.'
    },
    'Stability': {
        subtitle: '06. Stability',
        description: 'Making progress sustainable and financially grounded.'
    },
    'Expansion': {
        subtitle: '07. Expansion',
        description: 'Rebuilding, scaling, or evolving into a new chapter.'
    }
};

export const LIFECYCLE_SLOTS: LifecycleSlot[] = [
    // Foundation uniquely has 3 subcategories as requested
    { id: 'slot_found_clarity', stage: 'Foundation', type: 'Execution', name: 'Clarity', required: true, maxCount: 1 },
    { id: 'slot_found_orient', stage: 'Foundation', type: 'Diagnostic', name: 'Orientation', required: true, maxCount: 1 },
    { id: 'slot_found_core', stage: 'Foundation', type: 'Execution', name: 'Core Foundation', required: true, maxCount: 1 },
    
    // Direction stage slots - 4 slots as requested
    { id: 'slot_dir_track', stage: 'Direction', type: 'Narrowing', name: 'Track Card', required: true, maxCount: 1 },
    { id: 'slot_dir_paid', stage: 'Direction', type: 'Narrowing', name: 'First Paid Sprint', required: true, maxCount: 1 },
    { id: 'slot_dir_growth', stage: 'Direction', type: 'Narrowing', name: 'Growth Fundamental', required: true, maxCount: 1 },
    { id: 'slot_dir_core', stage: 'Direction', type: 'Narrowing', name: 'Platform Core', required: true, maxCount: 1 },
    { id: 'slot_exec_primary', stage: 'Execution', type: 'Execution', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_proof_primary', stage: 'Proof', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_pos_primary', stage: 'Positioning', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_stab_primary', stage: 'Stability', type: 'Stabilization', name: 'Mapping Slot', required: true, maxCount: 1 },
    { id: 'slot_exp_primary', stage: 'Expansion', type: 'Expression', name: 'Mapping Slot', required: true, maxCount: 1 }
];

export const INITIAL_OPTIONS = [
  "Entrepreneur",
  "Business Owner",
  "Freelancer/Consultant",
  "9-5 Professional",
  "Student/Graduate",
  "Creative/Hustler"
];

export const OCCUPATION_QUESTION = {
  title: "What is your current<br />employment status?",
  options: ["University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"]
};

export const PERSONA_QUIZZES: Record<string, { title: string; options: string[] }[]> = {
  "Entrepreneur": [
    {
      title: "Where’s your startup?",
      options: ["Idea", "Pre-launch (MVP)", "Early (first users)", "Growth (scaling)", "Pivoting", "Funded & expanding"]
    },
    {
      title: "Your biggest roadblock?",
      options: ["Validating fit", "Building MVP", "Getting users", "Raising funds", "Scaling team/ops", "Beating competition"]
    },
    {
      title: "Top priority (Next 12 Months)?",
      options: ["Product-market fit", "Grow users", "Secure funding", "Build brand", "Optimize team/ops", "Enter new markets"]
    }
  ],
  "Business Owner": [
    {
      title: "Business type",
      options: ["Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar"]
    },
    {
      title: "Core challenge",
      options: ["Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital"]
    },
    {
      title: "Business goal (Next 12 Months)",
      options: ["Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins"]
    }
  ],
  "Freelancer/Consultant": [
    {
      title: "Service focus",
      options: ["Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise"]
    },
    {
      title: "Challenge",
      options: ["Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time"]
    },
    {
      title: "Growth goal (Next 12 Months)",
      options: ["Attract high-paying clients", "Package/structure services", "Build personal brand", "Shift to retainers", "Diversify into products/courses", "Scale client delivery"]
    }
  ],
  "Creative/Hustler": [
    {
      title: "Focus",
      options: ["Turn talent into profit", "Grow audience", "Land high-paying clients", "Balance art + money", "Build collabs/partnerships", "Break free from undervaluation"]
    },
    {
      title: "Struggle",
      options: ["Packaging & positioning", "Inconsistent/low income", "Not being seen", "Passion vs. survival conflict", "No structure/strategy", "Charging true worth"]
    },
    {
      title: "2–3 Year vision",
      options: ["Thriving creative biz", "Known authority in craft", "Partnering with big brands", "From hustle to entrepreneurship", "Multiple income streams", "Inspiring others through passion"]
    }
  ],
  "9-5 Professional": [
    {
      title: "Role",
      options: ["Mid-level manager", "Senior executive", "Specialist/expert", "Team lead", "Early career, aiming higher", "Other track"]
    },
    {
      title: "Challenge",
      options: ["Not recognized for expertise", "Plateaued/no growth", "Struggling to move into leadership", "Hard to stand out", "Preparing to pivot to entrepreneurship", "Balancing career + personal goals"]
    },
    {
      title: "Goal (Next 12 Months)",
      options: ["Gain recognition as leader/expert", "Build influence inside & outside", "Prep for entrepreneurship", "Secure promotion/upgrade", "Strengthen personal brand", "Grow network & opportunities"]
    }
  ],
  "Student/Graduate": [
    {
      title: "What’s your biggest focus right now?",
      options: ["Build personal brand before job market", "Get clarity on career direction", "Land internships/entry roles", "Move from school to real projects", "Grow skills & confidence to stand out", "Explore entrepreneurship as a path"]
    },
    {
      title: "What’s your biggest hurdle?",
      options: ["Lack of real-world experience", "Unsure how to present myself", "Limited network/connections", "Balancing studies with prep", "Overwhelmed by career options", "Fear of failure/rejection"]
    },
    {
      title: "Where do you see yourself soon (2–3 Years)?",
      options: ["Working in a top company", "Running a small biz/startup", "Advancing studies (Masters/pro courses)", "Known in my field/industry", "Trying out different paths", "Still figuring it out, but progressing"]
    }
  ]
};

export const PERSONA_TAG_MAPPING: Record<string, Record<string, string>> = {
  "Entrepreneur": {
    "Idea": "Idea",
    "Pre-launch (MVP)": "Pre-launch",
    "Early (first users)": "First Users",
    "Growth (scaling)": "Scaling",
    "Pivoting": "Pivoting",
    "Funded & expanding": "Funded",
    "Validating fit": "Market Fit",
    "Building MVP": "MVP Dev",
    "Getting users": "Acquisition",
    "Raising funds": "Fundraising",
    "Scaling team/ops": "Operations",
    "Beating competition": "Strategy",
    "Product-market fit": "Market Fit",
    "Grow users": "Growth",
    "Secure funding": "Funding",
    "Build brand": "Branding",
    "Optimize team/ops": "Operations",
    "Enter new markets": "Expansion"
  },
  "Business Owner": {
    "Product-based": "Product",
    "Service-based": "Service",
    "Hybrid (product + service)": "Hybrid",
    "Franchise": "Franchise",
    "E-commerce / Online store": "E-commerce",
    "Local / Brick-and-mortar": "Local",
    "Attracting new clients/customers": "Acquisition",
    "Retaining existing clients/customers": "Retention",
    "Scaling & increasing revenue": "Scaling",
    "Managing operations/team": "Operations",
    "Standing out from competitors": "Positioning",
    "Accessing funding/capital": "Capital",
    "Build recognizable brand": "Branding",
    "Expand into new markets/locations": "Expansion",
    "Improve loyalty & retention": "Loyalty",
    "Streamline operations": "Efficiency",
    "Launch new products/services": "Innovation",
    "Increase profitability/margins": "Profit"
  },
  "Freelancer/Consultant": {
    "Coaching/mentoring": "Coaching",
    "Design/creative": "Design",
    "Marketing/sales": "Marketing",
    "Tech/IT": "Tech",
    "Business/management consulting": "Consulting",
    "Other expertise": "Expert",
    "Getting consistent clients": "Consistency",
    "Charging my worth": "Pricing",
    "Standing out": "Branding",
    "Building credibility": "Authority",
    "Structuring offers/packages": "Packaging",
    "Managing clients & time": "Workflow",
    "Attract high-paying clients": "Premium",
    "Package/structure services": "Packaging",
    "Build personal brand": "Personal Brand",
    "Shift to retainers": "Retainers",
    "Diversify into products/courses": "Scale",
    "Scale client delivery": "Workflow"
  },
  "Creative/Hustler": {
    "Turn talent into profit": "Monetization",
    "Grow audience": "Audience",
    "Land high-paying clients": "Premium",
    "Balance art + money": "Sustainability",
    "Build collabs/partnerships": "Network",
    "Break free from undervaluation": "Pricing",
    "Packaging & positioning": "Positioning",
    "Inconsistent/low income": "Income",
    "Not being seen": "Visibility",
    "Passion vs. survival conflict": "Purpose",
    "No structure/strategy": "Strategy",
    "Charging true worth": "Value",
    "Thriving creative biz": "Success",
    "Known authority in craft": "Authority",
    "Partnering with big brands": "Enterprise",
    "From hustle to entrepreneurship": "Pivot",
    "Multiple income streams": "Streams",
    "Inspiring others through passion": "Impact"
  },
  "9-5 Professional": {
    "Mid-level manager": "Manager",
    "Senior executive": "Executive",
    "Specialist/expert": "Specialist",
    "Team lead": "Team Lead",
    "Early career, aiming higher": "Emergent",
    "Other track": "Professional",
    "Not recognized for expertise": "Authority",
    "Plateaued/no growth": "Growth",
    "Struggling to move into leadership": "Leadership",
    "Hard to stand out": "Visibility",
    "Preparing to pivot to entrepreneurship": "Exit Path",
    "Balancing career + personal goals": "Balance",
    "Gain recognition as leader/expert": "Leader",
    "Build influence inside & outside": "Influence",
    "Prep for entrepreneurship": "Exit Path",
    "Secure promotion/upgrade": "Promotion",
    "Strengthen personal brand": "Personal Brand",
    "Grow network & opportunities": "Network"
  },
  "Student/Graduate": {
    "Build personal brand before job market": "Branding",
    "Get clarity on career direction": "Clarity",
    "Land internships/entry roles": "Career Start",
    "Move from school to real projects": "Practical",
    "Grow skills & confidence to stand out": "Skills",
    "Explore entrepreneurship as a path": "Founding",
    "Lack of real-world experience": "Experience",
    "Unsure how to present myself": "Presentation",
    "Limited network/connections": "Networking",
    "Balancing studies with prep": "Time Mgmt",
    "Overwhelmed by career options": "Clarity",
    "Fear of failure/rejection": "Confidence",
    "Working in a top company": "Corporate",
    "Running a small biz/startup": "Founder",
    "Advancing studies (Masters/pro courses)": "Academic",
    "Known in my field/industry": "Expert",
    "Trying out different paths": "Exploring",
    "Still figuring it out, but progressing": "Growth"
  }
};

export const COMMON_TAG_MAPPING: Record<string, string> = {
  "University Student": "Student",
  "Employed / Earning Salary": "Employed",
  "Self-Employed / Business": "Business",
  "Unemployed / Looking": "Unemployed"
};

export const MOCK_ROLES: RoleDefinition[] = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'Full access to all system features.',
    baseRole: UserRole.ADMIN,
    permissions: ['user:view', 'user:manage', 'role:manage', 'analytics:view', 'sprint:delete', 'community:moderate'],
  }
];

export const MOCK_SPRINTS: Sprint[] = [];

export const MOCK_USERS: (Coach | Participant | Admin)[] = [
  {
    id: 'admin1',
    name: 'Platform Controller',
    email: 'admin@vectorise.com',
    role: UserRole.ADMIN,
    profileImageUrl: 'https://picsum.photos/seed/admin1/200',
  }
];

export const MOCK_PARTICIPANT_SPRINTS: ParticipantSprint[] = [];
export const MOCK_PAYOUTS: any[] = [];
export const MOCK_REFERRALS: Referral[] = [];
export const MOCK_SHINE_POSTS: ShinePost[] = [];
export const MOCK_COACHING_COMMENTS: CoachingComment[] = [];