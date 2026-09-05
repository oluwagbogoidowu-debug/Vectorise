import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { sprintService } from './sprintService';
import { userService } from './userService';
import { Sprint, Participant } from '../types';

export const calculateReadingTimeStats = (post: { title?: string; excerpt?: string; content: string }) => {
  const text = `${post.title || ''} ${post.excerpt || ''} ${post.content || ''}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.ceil(words / 200));
  // 200 words per minute => (words / 200) * 60 seconds. Minimum sensible floor of 20 seconds.
  const estimatedTotalSeconds = Math.max(20, Math.round((words / 200) * 60));
  // 50% of estimated reading time
  const requiredSeconds = Math.max(10, Math.round(estimatedTotalSeconds * 0.5));

  return {
    wordCount: words,
    estimatedMinutes,
    estimatedTotalSeconds,
    requiredSeconds,
    formattedReadTime: `${estimatedMinutes} min read`
  };
};

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'Mindset' | 'Execution' | 'Micro-Habits' | 'Influence' | string;
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  likes: number;
  audience?: string[];
}

export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getBlogPostUrl = (post: { id: string; title: string; audience?: string[] }): string => {
  let audienceSlug = 'general';
  const rawAudience = post.audience;
  if (Array.isArray(rawAudience)) {
    const cleanedAudience = rawAudience.map(a => String(a).trim()).filter(Boolean);
    if (cleanedAudience.length === 1) {
      audienceSlug = slugify(cleanedAudience[0]) || 'general';
    } else {
      audienceSlug = 'general';
    }
  } else if (typeof rawAudience === 'string' && (rawAudience as string).trim()) {
    audienceSlug = slugify(rawAudience) || 'general';
  }

  const titleSlug = slugify(post.title) || post.id;
  return `/${audienceSlug}/${titleSlug}`;
};

export const SEED_BLOG_SPRINTS: Sprint[] = [
  {
    id: 'sprints-science',
    coachId: 'admin1',
    title: 'The Science of 15-Minute Sprints: How Micro-Habits Drive Legacy Results',
    subtitle: 'Ambition is cheap; momentum is rare. Learn how shrinking your focus to small, daily 15-minute execution cycles rewires your neural pathways for compounding success.',
    description: `Ambition is cheap; momentum is rare. \n\nWe live in a culture obsessed with grand transformations. We set audacious yearly resolutions, draft complex five-year plans, and buy books on overnight success. Yet, behavioral science tells us a different story: **grand goals do not produce grand results. Systems do.**\n\nWhen you attempt to change your entire life in a single day, your brain's amygdala registers this massive shift as a threat. It triggers a stress response, encouraging procrastination and returning you to safe, comfortable habits.\n\nThis is where the **15-Minute Sprint** protocol comes in.\n\n## Shrinking the Target\nTo build a habit that lasts, you must make it so easy that you cannot say no to it. By shrinking your execution focus to a single, high-leverage 15-minute sprint per day:\n\n1. **You eliminate activation energy**: The hardest part of any task is starting. A 15-minute commitment feels psychologically trivial, breaking the friction of starting.\n2. **You leverage momentum**: Once you begin, you often want to keep going. But even if you stop at 15 minutes, you have chalked up a win for the day.\n3. **You build consistency over intensity**: Intensity is what gets you started; consistency is what makes you grow. 15 minutes of focus every day for a year compounds to **over 90 hours** of high-leverage work.\n\n## How Sprints Rewire Your Brain\nEach time you complete a sprint, your brain releases a micro-dose of dopamine—the neurotransmitter associated with reward and motivation. This positive reinforcement loop signals to your neural pathways that the action is beneficial, lowering the cognitive load required to perform that task tomorrow.\n\nOver 21 to 66 days, this pathway shifts from conscious effort to automatic routine. You are no longer "trying" to work out, write, or study; you are simply someone who does.\n\n## Designing Your Next Sprint\nTo make your daily action step highly effective:\n* **Decide the night before**: Never start your sprint by figuring out what to do. Know exactly what your single action item is before the clock starts.\n* **Remove distractions**: Put your phone in another room, close unrelated browser tabs, and set a countdown timer for 15 minutes.\n* **Reflect immediately**: Take 30 seconds after your sprint to note what you learned. This anchors the progress in your awareness.\n\n*Stop trying to leap across the chasm. Build a bridge, one daily sprint at a time.*`,
    contentType: 'blog',
    blogBody: `Ambition is cheap; momentum is rare. \n\nWe live in a culture obsessed with grand transformations. We set audacious yearly resolutions, draft complex five-year plans, and buy books on overnight success. Yet, behavioral science tells us a different story: **grand goals do not produce grand results. Systems do.**\n\nWhen you attempt to change your entire life in a single day, your brain's amygdala registers this massive shift as a threat. It triggers a stress response, encouraging procrastination and returning you to safe, comfortable habits.\n\nThis is where the **15-Minute Sprint** protocol comes in.\n\n## Shrinking the Target\nTo build a habit that lasts, you must make it so easy that you cannot say no to it. By shrinking your execution focus to a single, high-leverage 15-minute sprint per day:\n\n1. **You eliminate activation energy**: The hardest part of any task is starting. A 15-minute commitment feels psychologically trivial, breaking the friction of starting.\n2. **You leverage momentum**: Once you begin, you often want to keep going. But even if you stop at 15 minutes, you have chalked up a win for the day.\n3. **You build consistency over intensity**: Intensity is what gets you started; consistency is what makes you grow. 15 minutes of focus every day for a year compounds to **over 90 hours** of high-leverage work.\n\n## How Sprints Rewire Your Brain\nEach time you complete a sprint, your brain releases a micro-dose of dopamine—the neurotransmitter associated with reward and motivation. This positive reinforcement loop signals to your neural pathways that the action is beneficial, lowering the cognitive load required to perform that task tomorrow.\n\nOver 21 to 66 days, this pathway shifts from conscious effort to automatic routine. You are no longer "trying" to work out, write, or study; you are simply someone who does.\n\n## Designing Your Next Sprint\nTo make your daily action step highly effective:\n* **Decide the night before**: Never start your sprint by figuring out what to do. Know exactly what your single action item is before the clock starts.\n* **Remove distractions**: Put your phone in another room, close unrelated browser tabs, and set a countdown timer for 15 minutes.\n* **Reflect immediately**: Take 30 seconds after your sprint to note what you learned. This anchors the progress in your awareness.\n\n*Stop trying to leap across the chasm. Build a bridge, one daily sprint at a time.*`,
    blogImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    category: 'Micro-Habits',
    published: true,
    approvalStatus: 'approved',
    createdAt: new Date('2026-06-25T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-25T10:00:00Z').toISOString(),
    likes: 124,
    price: 0,
    currency: 'NGN',
    duration: 1,
    difficulty: 'Beginner',
    dailyContent: []
  },
  {
    id: 'clarity-first',
    coachId: 'admin1',
    title: 'Clarity First, Execution Second: Breaking the Cycle of False Productivity',
    subtitle: 'Busy is a lazy drug. Running fast in the wrong direction is worse than standing still. Discover how to align your daily efforts with your true progression compass.',
    description: `Have you ever finished a 12-hour workday feeling utterly exhausted, yet strangely unaccomplished? \n\nYou cleared your inbox, answered dozens of Slack threads, attended four meetings, and tweaked your presentation slides. You were active. You were busy. But did you actually move any closer to your primary goals?\n\nThis is **false productivity**—the comfortable trap of doing easy, urgent work to avoid the hard, important work of aligning your direction.\n\n## Busy is a Lazy Drug\nIt is easy to hide behind a long to-do list. When we are busy, we don't have to think about whether we are doing the right things. We can tell ourselves (and our teams) that we are working hard.\n\nBut running fast in the wrong direction is worse than standing still. Standing still allows you to look at the map and adjust your heading. Running fast just carries you deeper into the wilderness.\n\n> "There is nothing so useless as doing efficiently that which should not be done at all." — Peter Drucker\n\n## The Alignment Protocol\nTo break the cycle of false productivity, you must establish a **Clarity First** rule. Before you touch any work, ask yourself three aligning questions:\n\n1. **What is my ultimate outcome for this week?** If you cannot name the one thing that will make everything else easier or unnecessary, you are not ready to execute.\n2. **Does this task serve that outcome?** Be ruthless. If an item on your list doesn't directly advance your primary outcome, push it to a secondary list or eliminate it.\n3. **Am I mistaking activity for progression?** Standardize your tracking. Measure outcomes, not hours spent or buttons clicked.\n\n## Building the Discipline of Stillness\nAligning your direction requires moments of silence. It is in the space between action steps that clarity is born. \n* Set aside 10 minutes every morning to **map your focus**.\n* Say 'no' to opportunities that do not fit your current development phase.\n* Accept that some minor tasks will remain incomplete, and that is the price of true focus.\n\n*True productivity isn't about doing more; it is about becoming more aligned with what truly matters.*`,
    contentType: 'blog',
    blogBody: `Have you ever finished a 12-hour workday feeling utterly exhausted, yet strangely unaccomplished? \n\nYou cleared your inbox, answered dozens of Slack threads, attended four meetings, and tweaked your presentation slides. You were active. You were busy. But did you actually move any closer to your primary goals?\n\nThis is **false productivity**—the comfortable trap of doing easy, urgent work to avoid the hard, important work of aligning your direction.\n\n## Busy is a Lazy Drug\nIt is easy to hide behind a long to-do list. When we are busy, we don't have to think about whether we are doing the right things. We can tell ourselves (and our teams) that we are working hard.\n\nBut running fast in the wrong direction is worse than standing still. Standing still allows you to look at the map and adjust your heading. Running fast just carries you deeper into the wilderness.\n\n> "There is nothing so useless as doing efficiently that which should not be done at all." — Peter Drucker\n\n## The Alignment Protocol\nTo break the cycle of false productivity, you must establish a **Clarity First** rule. Before you touch any work, ask yourself three aligning questions:\n\n1. **What is my ultimate outcome for this week?** If you cannot name the one thing that will make everything else easier or unnecessary, you are not ready to execute.\n2. **Does this task serve that outcome?** Be ruthless. If an item on your list doesn't directly advance your primary outcome, push it to a secondary list or eliminate it.\n3. **Am I mistaking activity for progression?** Standardize your tracking. Measure outcomes, not hours spent or buttons clicked.\n\n## Building the Discipline of Stillness\nAligning your direction requires moments of silence. It is in the space between action steps that clarity is born. \n* Set aside 10 minutes every morning to **map your focus**.\n* Say 'no' to opportunities that do not fit your current development phase.\n* Accept that some minor tasks will remain incomplete, and that is the price of true focus.\n\n*True productivity isn't about doing more; it is about becoming more aligned with what truly matters.*`,
    blogImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    category: 'Mindset',
    published: true,
    approvalStatus: 'approved',
    createdAt: new Date('2026-06-24T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-24T10:00:00Z').toISOString(),
    likes: 98,
    price: 0,
    currency: 'NGN',
    duration: 1,
    difficulty: 'Beginner',
    dailyContent: []
  },
  {
    id: 'multiplier-effect',
    coachId: 'admin1',
    title: 'The Multiplier Effect: Building Your Influence and Lifting Others',
    subtitle: 'The ultimate form of leadership is not having followers, but creating other leaders. Discover how expanding your circle of opportunity multiplies your own growth.',
    description: `In the early stages of our careers, we are judged on our individual execution. We strive to be the smartest, the fastest, and the most reliable person in the room.\n\nBut as you advance, a fundamental shift must occur. Your value is no longer measured by your individual output. It is measured by the **multiplier effect**—how much you can elevate the performance, clarity, and vision of those around you.\n\nThe ultimate form of leadership is not having followers, but creating other leaders.\n\n## The Chemistry of Influence\nWhen you help someone start their rise, several incredible things happen:\n\n1. **You accelerate your own learning**: The best way to master a concept is to teach it. Helping others clarify their goals forces you to sharpen your own frameworks.\n2. **You build a high-trust network**: Trust is the currency of opportunity. By selflessly offering guidance, you create an inner circle of advocates who will support you in future ventures.\n3. **You create leverage**: One person can only execute so much. But if you ignite growth in ten people, who in turn ignite others, you build an unstoppable exponential wave of positive change.\n\n## Becoming a Catalyst of Opportunity\nLifting others doesn't require a formal executive title. You can start today with simple, intentional actions:\n* **Invite others into the loop**: Share your favorite frameworks and resources. When you find a sprint or a tool that works for you, introduce it to someone who is struggling with direction.\n* **Ask, don't tell**: Avoid giving flat advice. Instead, ask powerful questions that lead others to find their own clarity.\n* **Celebrate milestones**: Be the first to recognize and praise another person's breakthrough. Encouragement is a scarce and powerful resource.\n\n*Don't rise alone. Bring your tribe along, and the peak will be infinitely more rewarding.*`,
    contentType: 'blog',
    blogBody: `In the early stages of our careers, we are judged on our individual execution. We strive to be the smartest, the fastest, and the most reliable person in the room.\n\nBut as you advance, a fundamental shift must occur. Your value is no longer measured by your individual output. It is measured by the **multiplier effect**—how much you can elevate the performance, clarity, and vision of those around you.\n\nThe ultimate form of leadership is not having followers, but creating other leaders.\n\n## The Chemistry of Influence\nWhen you help someone start their rise, several incredible things happen:\n\n1. **You accelerate your own learning**: The best way to master a concept is to teach it. Helping others clarify their goals forces you to sharpen your own frameworks.\n2. **You build a high-trust network**: Trust is the currency of opportunity. By selflessly offering guidance, you create an inner circle of advocates who will support you in future ventures.\n3. **You create leverage**: One person can only execute so much. But if you ignite growth in ten people, who in turn ignite others, you build an unstoppable exponential wave of positive change.\n\n## Becoming a Catalyst of Opportunity\nLifting others doesn't require a formal executive title. You can start today with simple, intentional actions:\n* **Invite others into the loop**: Share your favorite frameworks and resources. When you find a sprint or a tool that works for you, introduce it to someone who is struggling with direction.\n* **Ask, don't tell**: Avoid giving flat advice. Instead, ask powerful questions that lead others to find their own clarity.\n* **Celebrate milestones**: Be the first to recognize and praise another person's breakthrough. Encouragement is a scarce and powerful resource.\n\n*Don't rise alone. Bring your tribe along, and the peak will be infinitely more rewarding.*`,
    blogImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    category: 'Influence',
    published: true,
    approvalStatus: 'approved',
    createdAt: new Date('2026-06-22T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-22T10:00:00Z').toISOString(),
    likes: 156,
    price: 0,
    currency: 'NGN',
    duration: 1,
    difficulty: 'Beginner',
    dailyContent: []
  },
  {
    id: 'reflection-art',
    coachId: 'admin1',
    title: 'The Art of the Daily Reflection: Turning Everyday Lessons into Clarity',
    subtitle: 'Experience is not the best teacher; evaluated experience is. Unlock the simple 2-minute reflective practice that transforms passive days into compounding Wisdom.',
    description: `We read books, listen to podcasts, and attend workshops, hoping that some external piece of information will unlock our potential. Yet, the most valuable insights we will ever receive are already happening to us, every single day.\n\nThe problem is that we let them slip away.\n\nWithout reflection, we are like a computer that processes thousands of calculations but never hits "Save." We have experiences, but we do not extract the lessons.\n\n**Experience is not the best teacher; evaluated experience is.**\n\n## The Reflection Deficit\nMost people are constantly reacting. They jump from one notification to the next, from one meeting to another, without pausing to process. This creates cognitive clutter, leaving us feeling overwhelmed and directionless.\n\nBy setting aside just **2 minutes** at the end of each sprint or day, you can double your rate of learning.\n\n## The 2-Minute Reflection Framework\nYou do not need to write pages in a journal. Simply answer two clear questions:\n\n1. **What went well today, and why?** This trains your brain to notice success patterns and build on them.\n2. **What was my biggest friction point, and how can I adjust tomorrow?** This shifts you from complaining about obstacles to designing solutions around them.\n\n## The Compound Benefit\nWhen you write down a reflection:\n* **You crystallize the learning**: Translating a feeling or experience into structured words forces cognitive clarity.\n* **You build a personal database of wisdom**: When you look back at your reflections from three months ago, you will notice repeating cycles, allowing you to debug your behavior patterns.\n* **You create alignment**: Reflection brings your attention back to your intention, ensuring that your execution remains centered.\n\n*Don't just survive your days. Harvest them.*`,
    contentType: 'blog',
    blogBody: `We read books, listen to podcasts, and attend workshops, hoping that some external piece of information will unlock our potential. Yet, the most valuable insights we will ever receive are already happening to us, every single day.\n\nThe problem is that we let them slip away.\n\nWithout reflection, we are like a computer that processes thousands of calculations but never hits "Save." We have experiences, but we do not extract the lessons.\n\n**Experience is not the best teacher; evaluated experience is.**\n\n## The Reflection Deficit\nMost people are constantly reacting. They jump from one notification to the next, from one meeting to another, without pausing to process. This creates cognitive clutter, leaving us feeling overwhelmed and directionless.\n\nBy setting aside just **2 minutes** at the end of each sprint or day, you can double your rate of learning.\n\n## The 2-Minute Reflection Framework\nYou do not need to write pages in a journal. Simply answer two clear questions:\n\n1. **What went well today, and why?** This trains your brain to notice success patterns and build on them.\n2. **What was my biggest friction point, and how can I adjust tomorrow?** This shifts you from complaining about obstacles to designing solutions around them.\n\n## The Compound Benefit\nWhen you write down a reflection:\n* **You crystallize the learning**: Translating a feeling or experience into structured words forces cognitive clarity.\n* **You build a personal database of wisdom**: When you look back at your reflections from three months ago, you will notice repeating cycles, allowing you to debug your behavior patterns.\n* **You create alignment**: Reflection brings your attention back to your intention, ensuring that your execution remains centered.\n\n*Don't just survive your days. Harvest them.*`,
    blogImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80',
    category: 'Mindset',
    published: true,
    approvalStatus: 'approved',
    createdAt: new Date('2026-06-20T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-20T10:00:00Z').toISOString(),
    likes: 87,
    price: 0,
    currency: 'NGN',
    duration: 1,
    difficulty: 'Beginner',
    dailyContent: []
  }
];

let isSeedingPromise: Promise<void> | null = null;

export const ensureSeedBlogsInFirestore = (): Promise<void> => {
  if (isSeedingPromise) return isSeedingPromise;

  isSeedingPromise = (async () => {
    try {
      for (const blog of SEED_BLOG_SPRINTS) {
        let snap = await getDoc(doc(db, 'experiences', 'RiseBlog', 'items', blog.id, 'sprintdetails', 'info'));
        if (!snap.exists()) {
          snap = await getDoc(doc(db, 'experiences', blog.id, 'sprintdetails', 'info'));
        }
        if (!snap.exists()) {
          console.log(`[Seed] Creating blog post in Firestore: ${blog.id}`);
          await sprintService.createSprint(blog);
        }
      }
    } catch (err) {
      console.error('[Seed] Failed to seed blog posts to Firestore:', err);
    }
  })();

  return isSeedingPromise;
};

export const blogService = {
  ensureSeedBlogsInFirestore,
  getPostById: (id: string): BlogPost | undefined => {
    const found = SEED_BLOG_SPRINTS.find(p => p.id === id);
    if (!found) return undefined;
    const words = (found.blogBody || found.description || '').split(/\s+/).length;
    return {
      id: found.id,
      title: found.title,
      excerpt: found.subtitle || found.description.slice(0, 150),
      content: found.blogBody || found.description,
      category: found.category as any,
      readTime: `${Math.max(1, Math.round(words / 200))} min read`,
      publishedAt: new Date(found.createdAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      author: {
        name: 'Platform Admin',
        role: 'Vectorise Lead',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
      },
      coverImage: found.blogImage || found.coverImageUrl || '',
      likes: found.likes || 0,
      audience: found.audience || []
    };
  },
  likePost: (id: string): void => {
    const post = SEED_BLOG_SPRINTS.find(p => p.id === id);
    if (post && post.likes) {
      post.likes += 1;
    }
  },

  getBlogReadStats: async (userId?: string): Promise<{
    totalReads: number;
    claimedCycles: number;
    readBlogIds: string[];
    currentCycleReads: number;
    readsRemaining: number;
    hasRewardToClaim: boolean;
  }> => {
    const fallbackUserKey = userId || 'guest';
    const localReadsKey = `vectorise_blog_reads_${fallbackUserKey}`;
    const localClaimedKey = `vectorise_blog_claimed_${fallbackUserKey}`;
    const localIdsKey = `vectorise_blog_read_ids_${fallbackUserKey}`;

    let localReads = parseInt(localStorage.getItem(localReadsKey) || '0', 10);
    let localClaimed = parseInt(localStorage.getItem(localClaimedKey) || '0', 10);
    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(localIdsKey) || '[]');
    } catch {
      localIds = [];
    }

    let remoteReads = 0;
    let remoteClaimed = 0;
    let remoteIds: string[] = [];

    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const uData = userDoc.data() as Partial<Participant>;
          remoteReads = uData.blogReadsCount || 0;
          remoteClaimed = uData.claimedBlogRewardCycles || 0;
          remoteIds = uData.blogReadIds || [];
        }
      } catch (err) {
        console.error('Error fetching blog read stats from Firestore:', err);
      }
    }

    const allIds = Array.from(new Set([...localIds, ...remoteIds].filter(Boolean)));
    const claimedCycles = Math.max(localClaimed, remoteClaimed);
    // Count is strictly the number of unique blog posts completed (or preserved cycle offset)
    const totalReads = Math.max(allIds.length, claimedCycles * 10);

    // Update local storage to stay in sync
    localStorage.setItem(localReadsKey, String(totalReads));
    localStorage.setItem(localClaimedKey, String(claimedCycles));
    localStorage.setItem(localIdsKey, JSON.stringify(allIds));

    // Progress in the current 10-read cycle
    const effectiveUnclaimed = Math.max(0, totalReads - (claimedCycles * 10));
    const hasRewardToClaim = effectiveUnclaimed >= 10;
    
    // When rewards are ready to claim, display shows 10 / 10 reads.
    // If not ready, shows current in-cycle reads (0..9)
    const currentCycleReads = hasRewardToClaim ? 10 : (effectiveUnclaimed % 10);
    const readsRemaining = hasRewardToClaim ? 0 : Math.max(0, 10 - currentCycleReads);

    return {
      totalReads,
      claimedCycles,
      readBlogIds: allIds,
      currentCycleReads,
      readsRemaining,
      hasRewardToClaim
    };
  },

  claimBlogReward: async (userId: string): Promise<{
    success: boolean;
    totalReads: number;
    claimedCycles: number;
    currentCycleReads: number;
    readsRemaining: number;
    hasRewardToClaim: boolean;
  }> => {
    if (!userId) {
      throw new Error('Please log in to claim your 20 coins reward.');
    }

    const fallbackUserKey = userId;
    const localReadsKey = `vectorise_blog_reads_${fallbackUserKey}`;
    const localClaimedKey = `vectorise_blog_claimed_${fallbackUserKey}`;
    const localIdsKey = `vectorise_blog_read_ids_${fallbackUserKey}`;

    let localClaimed = parseInt(localStorage.getItem(localClaimedKey) || '0', 10);
    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(localIdsKey) || '[]');
    } catch {
      localIds = [];
    }

    let remoteClaimed = 0;
    let remoteIds: string[] = [];

    // Sync from Firestore if available
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const uData = userDoc.data() as Partial<Participant>;
        remoteClaimed = uData.claimedBlogRewardCycles || 0;
        remoteIds = uData.blogReadIds || [];
      }
    } catch (e) {
      console.error(e);
    }

    const allIds = Array.from(new Set([...localIds, ...remoteIds].filter(Boolean)));
    const claimedCycles = Math.max(localClaimed, remoteClaimed);
    const totalReads = Math.max(allIds.length, claimedCycles * 10);

    const effectiveUnclaimed = Math.max(0, totalReads - (claimedCycles * 10));
    if (effectiveUnclaimed < 10) {
      throw new Error('You have not completed 10 reads for this reward yet.');
    }

    const newClaimed = claimedCycles + 1;
    localStorage.setItem(localClaimedKey, String(newClaimed));
    localStorage.setItem(localReadsKey, String(totalReads));
    localStorage.setItem(localIdsKey, JSON.stringify(allIds));

    // Award 20 coins to user wallet and increment claimed cycles
    try {
      await userService.processWalletTransaction(userId, {
        type: 'credit',
        amount: 20,
        description: `RiseBlog Reading Milestone Claim (${newClaimed * 10} reads)`
      });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        claimedBlogRewardCycles: newClaimed,
        blogReadsCount: totalReads
      });
    } catch (err) {
      console.error('Error claiming blog reward in Firestore:', err);
      // Fallback update on user doc
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          walletBalance: increment(20),
          claimedBlogRewardCycles: newClaimed
        });
      } catch (e) {
        console.error('Fallback wallet increment failed:', e);
      }
    }

    const postClaimUnclaimed = Math.max(0, totalReads - (newClaimed * 10));
    const nextHasReward = postClaimUnclaimed >= 10;
    const nextCycleReads = nextHasReward ? 10 : (postClaimUnclaimed % 10);
    const nextRemaining = nextHasReward ? 0 : Math.max(0, 10 - nextCycleReads);

    return {
      success: true,
      totalReads,
      claimedCycles: newClaimed,
      currentCycleReads: nextCycleReads,
      readsRemaining: nextRemaining,
      hasRewardToClaim: nextHasReward
    };
  },

  isInsightCompleted: async (userId: string | undefined, postId: string): Promise<boolean> => {
    const fallbackKey = userId || 'guest';
    const localIdsKey = `vectorise_blog_read_ids_${fallbackKey}`;
    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(localIdsKey) || '[]');
    } catch {
      localIds = [];
    }
    if (localIds.includes(postId)) return true;

    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const uData = userDoc.data() as Partial<Participant>;
          if (uData.blogReadIds?.includes(postId)) {
            localIds.push(postId);
            localStorage.setItem(localIdsKey, JSON.stringify(Array.from(new Set(localIds))));
            return true;
          }
        }
      } catch (err) {
        console.error('Error checking isInsightCompleted:', err);
      }
    }
    return false;
  },

  recordCompletedInsightRead: async (userId: string | undefined, postId: string, postTitle?: string): Promise<{
    success: boolean;
    isFirstCompletion: boolean;
    readStats: {
      totalReads: number;
      claimedCycles: number;
      currentCycleReads: number;
      readsRemaining: number;
      hasRewardToClaim: boolean;
    };
  }> => {
    const fallbackUserKey = userId || 'guest';
    const localClaimedKey = `vectorise_blog_claimed_${fallbackUserKey}`;
    const localIdsKey = `vectorise_blog_read_ids_${fallbackUserKey}`;
    const localReadsKey = `vectorise_blog_reads_${fallbackUserKey}`;

    let localClaimed = parseInt(localStorage.getItem(localClaimedKey) || '0', 10);
    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(localIdsKey) || '[]');
    } catch {
      localIds = [];
    }

    let remoteClaimed = 0;
    let remoteIds: string[] = [];

    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const uData = userDoc.data() as Partial<Participant>;
          remoteClaimed = uData.claimedBlogRewardCycles || 0;
          remoteIds = uData.blogReadIds || [];
        }
      } catch (err) {
        console.error('Error checking remote user reads:', err);
      }
    }

    let claimedCycles = Math.max(localClaimed, remoteClaimed);
    let allIds = Array.from(new Set([...localIds, ...remoteIds].filter(Boolean)));

    // STRICT UNIQUE CHECK: A blog post can only ever be counted ONCE per user
    const isFirstCompletion = !allIds.includes(postId);
    if (isFirstCompletion) {
      allIds.push(postId);

      localStorage.setItem(localIdsKey, JSON.stringify(allIds));
      localStorage.setItem(localClaimedKey, String(claimedCycles));

      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            blogReadsCount: Math.max(allIds.length, claimedCycles * 10),
            blogReadIds: arrayUnion(postId)
          });
        } catch (err) {
          console.error('Error updating read count in Firestore:', err);
        }
      }
    }

    const totalReads = Math.max(allIds.length, claimedCycles * 10);
    localStorage.setItem(localReadsKey, String(totalReads));

    const effectiveUnclaimed = Math.max(0, totalReads - (claimedCycles * 10));
    const hasRewardToClaim = effectiveUnclaimed >= 10;
    const currentCycleReads = hasRewardToClaim ? 10 : (effectiveUnclaimed % 10);
    const readsRemaining = hasRewardToClaim ? 0 : Math.max(0, 10 - currentCycleReads);

    return {
      success: true,
      isFirstCompletion,
      readStats: {
        totalReads,
        claimedCycles,
        currentCycleReads,
        readsRemaining,
        hasRewardToClaim
      }
    };
  }
};

