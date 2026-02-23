
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
