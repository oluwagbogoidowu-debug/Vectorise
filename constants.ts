
export const ARCHETYPES = [
  {
    id: 'explorer',
    name: 'The Explorer',
    energy: 'Discovery',
    description: 'Energy of discovery and curiosity.',
    color: 'from-blue-500 via-cyan-400 to-blue-300',
    icon: '🔭',
    bg: 'bg-blue-50'
  },
  {
    id: 'builder',
    name: 'The Builder',
    energy: 'Creation',
    description: 'Energy of creation and structure.',
    color: 'from-orange-500 via-amber-400 to-orange-300',
    icon: '🏗️',
    bg: 'bg-orange-50'
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    energy: 'Vision',
    description: 'Energy of vision and planning.',
    color: 'from-purple-500 via-indigo-400 to-purple-300',
    icon: '♟️',
    bg: 'bg-purple-50'
  },
  {
    id: 'communicator',
    name: 'The Communicator',
    energy: 'Connection',
    description: 'Energy of connection and expression.',
    color: 'from-pink-500 via-rose-400 to-pink-300',
    icon: '📢',
    bg: 'bg-pink-50'
  },
  {
    id: 'operator',
    name: 'The Operator',
    energy: 'Execution',
    description: 'Energy of execution and flow.',
    color: 'from-emerald-500 via-teal-400 to-emerald-300',
    icon: '⚙️',
    bg: 'bg-emerald-50'
  }
];

export const GROWTH_AREAS = [
  {
    group: '🧠 Get Clear',
    sprints: ['Clarity Sprint', 'Direction Sprint', 'Decision Sprint'],
    options: ['Clarity', 'Direction', 'Decision-making', 'Strategic thinking', 'Critical thinking', 'Problem-solving', 'Self-awareness']
  },
  {
    group: '⚡ Get Into Motion',
    sprints: ['Focus Sprint', 'Consistency Sprint', 'Execution Sprint'],
    options: ['Focus', 'Consistency', 'Execution', 'Discipline', 'Productivity', 'Time management', 'Follow-through', 'Accountability']
  },
  {
    group: '💬 Communicate & Show Up',
    sprints: ['Communication Sprint', 'Visibility Sprint', 'Positioning Sprint'],
    options: ['Communication', 'Public speaking', 'Writing', 'Personal branding', 'Positioning', 'Storytelling', 'Visibility', 'Influence']
  },
  {
    group: '🚀 Build Your Edge',
    sprints: ['Career Clarity Sprint', 'Leadership Sprint', 'Skill Sprint'],
    options: ['Skill-building', 'Leadership', 'Career clarity', 'Entrepreneurship', 'Innovation', 'Opportunity spotting', 'Networking', 'Confidence']
  },
  {
    group: '🧱 Strengthen Yourself',
    sprints: ['Confidence Sprint', 'Resilience Sprint', 'Discipline Sprint'],
    options: ['Resilience', 'Courage', 'Emotional intelligence', 'Self-discipline', 'Adaptability', 'Initiative', 'Growth mindset']
  }
];

export const RISE_PATHWAYS = [
  {
    id: 'student',
    name: '🎓 Student Path',
    description: 'Secondary school student, University student, NYSC',
    routes: 'Clarity-first progression, Exploration-heavy sprints, Lower time intensity'
  },
  {
    id: 'early_career',
    name: '🧭 Early Career Path',
    description: 'Early career professional, Exploring career direction',
    routes: 'Direction + Skill-building, Positioning + Confidence'
  },
  {
    id: 'growth_pro',
    name: '🏢 Growth Professional Path',
    description: 'Mid-career professional, Transitioning to a new field, Seeking promotion',
    routes: 'Strategic thinking, Leadership, Visibility, Execution intensity higher'
  },
  {
    id: 'builder',
    name: '🚀 Builder Path',
    description: 'Building a business, Preparing to start a business',
    routes: 'Execution, Positioning, Focus, Decision-making, Higher accountability pacing'
  },
  {
    id: 'transition',
    name: '🔄 Transition Path',
    description: 'Taking a break, Resetting direction, Rebuilding momentum',
    routes: 'Clarity, Confidence, Consistency'
  }
];

export type QuizQuestion = {
  title: string;
  options: string[];
};

export type PersonaQuizData = {
  [key: string]: QuizQuestion[];
};

export const PERSONA_QUIZZES: PersonaQuizData = {
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
