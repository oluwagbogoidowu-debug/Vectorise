export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'Mindset' | 'Execution' | 'Micro-Habits' | 'Influence';
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  likes: number;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'sprints-science',
    title: 'The Science of 15-Minute Sprints: How Micro-Habits Drive Legacy Results',
    excerpt: 'Ambition is cheap; momentum is rare. Learn how shrinking your focus to small, daily 15-minute execution cycles rewires your neural pathways for compounding success.',
    category: 'Micro-Habits',
    readTime: '4 min read',
    publishedAt: 'June 25, 2026',
    author: {
      name: 'Dr. James Clear',
      role: 'Behavioral Psychologist & Peak Performance Coach',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
    },
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    likes: 124,
    content: `
# The Science of 15-Minute Sprints

Ambition is cheap; momentum is rare. 

We live in a culture obsessed with grand transformations. We set audacious yearly resolutions, draft complex five-year plans, and buy books on overnight success. Yet, behavioral science tells us a different story: **grand goals do not produce grand results. Systems do.**

When you attempt to change your entire life in a single day, your brain's amygdala registers this massive shift as a threat. It triggers a stress response, encouraging procrastination and returning you to safe, comfortable habits.

This is where the **15-Minute Sprint** protocol comes in.

## Shrinking the Target
To build a habit that lasts, you must make it so easy that you cannot say no to it. By shrinking your execution focus to a single, high-leverage 15-minute sprint per day:

1. **You eliminate activation energy**: The hardest part of any task is starting. A 15-minute commitment feels psychologically trivial, breaking the friction of starting.
2. **You leverage momentum**: Once you begin, you often want to keep going. But even if you stop at 15 minutes, you have chalked up a win for the day.
3. **You build consistency over intensity**: Intensity is what gets you started; consistency is what makes you grow. 15 minutes of focus every day for a year compounds to **over 90 hours** of high-leverage work.

## How Sprints Rewire Your Brain
Each time you complete a sprint, your brain releases a micro-dose of dopamine—the neurotransmitter associated with reward and motivation. This positive reinforcement loop signals to your neural pathways that the action is beneficial, lowering the cognitive load required to perform that task tomorrow.

Over 21 to 66 days, this pathway shifts from conscious effort to automatic routine. You are no longer "trying" to work out, write, or study; you are simply someone who does.

## Designing Your Next Sprint
To make your daily action step highly effective:
* **Decide the night before**: Never start your sprint by figuring out what to do. Know exactly what your single action item is before the clock starts.
* **Remove distractions**: Put your phone in another room, close unrelated browser tabs, and set a countdown timer for 15 minutes.
* **Reflect immediately**: Take 30 seconds after your sprint to note what you learned. This anchors the progress in your awareness.

*Stop trying to leap across the chasm. Build a bridge, one daily sprint at a time.*
`
  },
  {
    id: 'clarity-first',
    title: 'Clarity First, Execution Second: Breaking the Cycle of False Productivity',
    excerpt: 'Busy is a lazy drug. Running fast in the wrong direction is worse than standing still. Discover how to align your daily efforts with your true progression compass.',
    category: 'Mindset',
    readTime: '3 min read',
    publishedAt: 'June 24, 2026',
    author: {
      name: 'Elena Rostova',
      role: 'Growth Strategist & Systems Architect',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80'
    },
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    likes: 98,
    content: `
# Clarity First, Execution Second

Have you ever finished a 12-hour workday feeling utterly exhausted, yet strangely unaccomplished? 

You cleared your inbox, answered dozens of Slack threads, attended four meetings, and tweaked your presentation slides. You were active. You were busy. But did you actually move any closer to your primary goals?

This is **false productivity**—the comfortable trap of doing easy, urgent work to avoid the hard, important work of aligning your direction.

## Busy is a Lazy Drug
It is easy to hide behind a long to-do list. When we are busy, we don't have to think about whether we are doing the right things. We can tell ourselves (and our teams) that we are working hard.

But running fast in the wrong direction is worse than standing still. Standing still allows you to look at the map and adjust your heading. Running fast just carries you deeper into the wilderness.

> "There is nothing so useless as doing efficiently that which should not be done at all." — Peter Drucker

## The Alignment Protocol
To break the cycle of false productivity, you must establish a **Clarity First** rule. Before you touch any work, ask yourself three aligning questions:

1. **What is my ultimate outcome for this week?** If you cannot name the one thing that will make everything else easier or unnecessary, you are not ready to execute.
2. **Does this task serve that outcome?** Be ruthless. If an item on your list doesn't directly advance your primary outcome, push it to a secondary list or eliminate it.
3. **Am I mistaking activity for progression?** Standardize your tracking. Measure outcomes, not hours spent or buttons clicked.

## Building the Discipline of Stillness
Aligning your direction requires moments of silence. It is in the space between action steps that clarity is born. 
* Set aside 10 minutes every morning to **map your focus**.
* Say 'no' to opportunities that do not fit your current development phase.
* Accept that some minor tasks will remain incomplete, and that is the price of true focus.

*True productivity isn't about doing more; it is about becoming more aligned with what truly matters.*
`
  },
  {
    id: 'multiplier-effect',
    title: 'The Multiplier Effect: Building Your Influence and Lifting Others',
    excerpt: 'The ultimate form of leadership is not having followers, but creating other leaders. Discover how expanding your circle of opportunity multiplies your own growth.',
    category: 'Influence',
    readTime: '5 min read',
    publishedAt: 'June 22, 2026',
    author: {
      name: 'Marcus Vance',
      role: 'Executive Director, Horizon Initiative',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
    },
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    likes: 156,
    content: `
# The Multiplier Effect

In the early stages of our careers, we are judged on our individual execution. We strive to be the smartest, the fastest, and the most reliable person in the room.

But as you advance, a fundamental shift must occur. Your value is no longer measured by your individual output. It is measured by the **multiplier effect**—how much you can elevate the performance, clarity, and vision of those around you.

The ultimate form of leadership is not having followers, but creating other leaders.

## The Chemistry of Influence
When you help someone start their rise, several incredible things happen:

1. **You accelerate your own learning**: The best way to master a concept is to teach it. Helping others clarify their goals forces you to sharpen your own frameworks.
2. **You build a high-trust network**: Trust is the currency of opportunity. By selflessly offering guidance, you create an inner circle of advocates who will support you in future ventures.
3. **You create leverage**: One person can only execute so much. But if you ignite growth in ten people, who in turn ignite others, you build an unstoppable exponential wave of positive change.

## Becoming a Catalyst of Opportunity
Lifting others doesn't require a formal executive title. You can start today with simple, intentional actions:
* **Invite others into the loop**: Share your favorite frameworks and resources. When you find a sprint or a tool that works for you, introduce it to someone who is struggling with direction.
* **Ask, don't tell**: Avoid giving flat advice. Instead, ask powerful questions that lead others to find their own clarity.
* **Celebrate milestones**: Be the first to recognize and praise another person's breakthrough. Encouragement is a scarce and powerful resource.

*Don't rise alone. Bring your tribe along, and the peak will be infinitely more rewarding.*
`
  },
  {
    id: 'reflection-art',
    title: 'The Art of the Daily Reflection: Turning Everyday Lessons into Clarity',
    excerpt: 'Experience is not the best teacher; evaluated experience is. Unlock the simple 2-minute reflective practice that transforms passive days into compounding Wisdom.',
    category: 'Mindset',
    readTime: '3 min read',
    publishedAt: 'June 20, 2026',
    author: {
      name: 'Siddharth Mehta',
      role: 'Mindfulness Expert & Author',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
    },
    coverImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80',
    likes: 87,
    content: `
# The Art of the Daily Reflection

We read books, listen to podcasts, and attend workshops, hoping that some external piece of information will unlock our potential. Yet, the most valuable insights we will ever receive are already happening to us, every single day.

The problem is that we let them slip away.

Without reflection, we are like a computer that processes thousands of calculations but never hits "Save." We have experiences, but we do not extract the lessons.

**Experience is not the best teacher; evaluated experience is.**

## The Reflection Deficit
Most people are constantly reacting. They jump from one notification to the next, from one meeting to another, without pausing to process. This creates cognitive clutter, leaving us feeling overwhelmed and directionless.

By setting aside just **2 minutes** at the end of each sprint or day, you can double your rate of learning.

## The 2-Minute Reflection Framework
You do not need to write pages in a journal. Simply answer two clear questions:

1. **What went well today, and why?** This trains your brain to notice success patterns and build on them.
2. **What was my biggest friction point, and how can I adjust tomorrow?** This shifts you from complaining about obstacles to designing solutions around them.

## The Compound Benefit
When you write down a reflection:
* **You crystallize the learning**: Translating a feeling or experience into structured words forces cognitive clarity.
* **You build a personal database of wisdom**: When you look back at your reflections from three months ago, you will notice repeating cycles, allowing you to debug your behavior patterns.
* **You create alignment**: Reflection brings your attention back to your intention, ensuring that your execution remains centered.

*Don't just survive your days. Harvest them.*
`
  }
];

export const blogService = {
  getPosts: (): BlogPost[] => {
    return BLOG_POSTS;
  },
  getPostById: (id: string): BlogPost | undefined => {
    return BLOG_POSTS.find(p => p.id === id);
  },
  likePost: (id: string): void => {
    const post = BLOG_POSTS.find(p => p.id === id);
    if (post) {
      post.likes += 1;
    }
  }
};
