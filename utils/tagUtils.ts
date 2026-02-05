
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

/**
 * Translates a full sentence answer into a concise 1-2 word tag.
 */
export const translateToTag = (persona: string, answer: string): string => {
  if (PERSONA_TAG_MAPPING[persona]?.[answer]) {
    return PERSONA_TAG_MAPPING[persona][answer];
  }
  if (COMMON_TAG_MAPPING[answer]) {
    return COMMON_TAG_MAPPING[answer];
  }
  // Fallback: take first two words if no mapping
  return (answer || '').split(' ').slice(0, 2).join(' ');
};

/**
 * Calculates a match score (0-5) between a user's tag-based profile and a sprint's targeting.
 */
export const calculateMatchScore = (userProfile: any, sprintTargeting: any): number => {
    if (!userProfile || !sprintTargeting) return 0;
    
    let score = 0;
    if (userProfile.persona === sprintTargeting.persona) score += 1;
    if (userProfile.p1 === sprintTargeting.p1) score += 1;
    if (userProfile.p2 === sprintTargeting.p2) score += 1;
    if (userProfile.p3 === sprintTargeting.p3) score += 1;
    if (userProfile.occupation === sprintTargeting.occupation) score += 1;
    
    return score;
};

export const QUIZ_STRUCTURE = {
  persona: [
    "Entrepreneur", "Business Owner", "Freelancer/Consultant", "9-5 Professional", "Student/Graduate", "Creative/Hustler"
  ],
  questions: {
    "Entrepreneur": ["Where’s your startup?", "Your biggest roadblock?", "Top priority (Next 12 Months)?"],
    "Business Owner": ["Business type", "Core challenge", "Business goal (Next 12 Months)"],
    "Freelancer/Consultant": ["Service focus", "Challenge", "Growth goal (Next 12 Months)"],
    "Creative/Hustler": ["Focus", "Struggle", "2–3 Year vision"],
    "9-5 Professional": ["Role", "Challenge", "Goal (Next 12 Months)"],
    "Student/Graduate": ["What’s your biggest focus right now?", "What’s your biggest hurdle?", "Where do you see yourself soon (2–3 Years)?"]
  },
  options: {
    "Where’s your startup?": ["Idea", "Pre-launch (MVP)", "Early (first users)", "Growth (scaling)", "Pivoting", "Funded & expanding"],
    "Your biggest roadblock?": ["Validating fit", "Building MVP", "Getting users", "Raising funds", "Scaling team/ops", "Beating competition"],
    "Top priority (Next 12 Months)?": ["Product-market fit", "Grow users", "Secure funding", "Build brand", "Optimize team/ops", "Enter new markets"],
    "Business type": ["Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar"],
    "Core challenge": ["Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital"],
    "Business goal (Next 12 Months)": ["Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins"],
    "Service focus": ["Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise"],
    "Challenge": ["Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time"],
    "Growth goal (Next 12 Months)": ["Attract high-paying clients", "Package/structure services", "Build personal brand", "Shift to retainers", "Diversify into products/courses", "Scale client delivery"],
    "Focus": ["Turn talent into profit", "Grow audience", "Land high-paying clients", "Balance art + money", "Build collabs/partnerships", "Break free from undervaluation"],
    "Struggle": ["Packaging & positioning", "Inconsistent/low income", "Not being seen", "Passion vs. survival conflict", "No structure/strategy", "Charging true worth"],
    "2–3 Year vision": ["Thriving creative biz", "Known authority in craft", "Partnering with big brands", "From hustle to entrepreneurship", "Multiple income streams", "Inspiring others through passion"],
    "Role": ["Mid-level manager", "Senior executive", "Specialist/expert", "Team lead", "Early career, aiming higher", "Other track"],
    "Goal (Next 12 Months)": ["Gain recognition as leader/expert", "Build influence inside & outside", "Prep for entrepreneurship", "Secure promotion/upgrade", "Strengthen personal brand", "Grow network & opportunities"],
    "What’s your biggest focus right now?": ["Build personal brand before job market", "Get clarity on career direction", "Land internships/entry roles", "Move from school to real projects", "Grow skills & confidence to stand out", "Explore entrepreneurship as a path"],
    "What’s your biggest hurdle?": ["Lack of real-world experience", "Unsure how to present myself", "Limited network/connections", "Balancing studies with prep", "Overwhelmed by career options", "Fear of failure/rejection"],
    "Where do you see yourself soon (2–3 Years)?": ["Working in a top company", "Running a small biz/startup", "Advancing studies (Masters/pro courses)", "Known in my field/industry", "Trying out different paths", "Still figuring it out, but progressing"]
  },
  occupation: ["University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"]
};
