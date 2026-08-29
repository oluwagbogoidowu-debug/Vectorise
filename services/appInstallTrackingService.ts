import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  updateDoc,
  increment
} from 'firebase/firestore';

export interface AppInstallEvent {
  id?: string;
  eventType: 'button_click' | 'app_download' | 'app_installed' | 'banner_dismiss';
  buttonText: string;
  source: string;
  userId: string;
  userEmail: string;
  userName: string;
  platform: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  userAgent: string;
  timestamp: string;
  outcome?: string;
  metadata?: Record<string, any>;
}

export interface AppDownloadedUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  totalDownloads: number;
  firstDownloadedAt: string;
  lastDownloadedAt: string;
  platform: string;
  deviceType: string;
  browser: string;
  source: string;
  status: 'installed' | 'active';
  lastActiveAt?: string;
}

export interface AppInstallStats {
  totalClicks: number;
  totalDownloads: number;
  uniqueDownloadersCount: number;
  uniqueClickersCount: number;
  conversionRate: number;
  downloaders: AppDownloadedUser[];
  recentEvents: AppInstallEvent[];
  platformBreakdown: {
    android: number;
    ios: number;
    desktop: number;
    other: number;
  };
  browserBreakdown: Record<string, number>;
  dailyTrend: {
    date: string;
    clicks: number;
    downloads: number;
  }[];
}

const EVENTS_COLLECTION = 'app_install_events';
const USERS_COLLECTION = 'app_downloaded_users';
const STATS_DOC = 'app_install_metrics/summary';

export function detectDeviceDetails() {
  if (typeof window === 'undefined') {
    return { platform: 'Unknown', deviceType: 'desktop' as const, browser: 'Unknown', userAgent: '' };
  }
  const ua = navigator.userAgent;
  let platform = 'Other';
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let browser = 'Other';

  if (/Android/i.test(ua)) {
    platform = 'Android';
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
  } else if (/iPhone/i.test(ua)) {
    platform = 'iOS';
    deviceType = 'mobile';
  } else if (/iPad/i.test(ua)) {
    platform = 'iOS';
    deviceType = 'tablet';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'macOS';
    deviceType = 'desktop';
  } else if (/Windows NT/i.test(ua)) {
    platform = 'Windows';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux';
    deviceType = 'desktop';
  }

  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  }

  return { platform, deviceType, browser, userAgent: ua };
}

export const appInstallTrackingService = {
  /**
   * Record when user clicks the "Use the app for a smoother experience" (or "Open Vectorise App") button.
   */
  trackButtonClick: async (
    user?: { id?: string; email?: string; name?: string } | null,
    options?: {
      buttonText?: string;
      source?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      const device = detectDeviceDetails();
      const userId = user?.id || localStorage.getItem('vec_anon_user_id') || `anon_${Math.random().toString(36).substring(2, 9)}`;
      if (!user?.id && !localStorage.getItem('vec_anon_user_id')) {
        localStorage.setItem('vec_anon_user_id', userId);
      }

      const eventData: AppInstallEvent = {
        eventType: 'button_click',
        buttonText: options?.buttonText || 'Use the app for a smoother experience',
        source: options?.source || 'top_banner',
        userId: userId,
        userEmail: user?.email || '',
        userName: user?.name || user?.email?.split('@')[0] || 'Anonymous User',
        platform: device.platform,
        deviceType: device.deviceType,
        browser: device.browser,
        userAgent: device.userAgent,
        timestamp: new Date().toISOString(),
        outcome: 'clicked',
        metadata: options?.metadata || {}
      };

      // 1. Add event log
      await addDoc(collection(db, EVENTS_COLLECTION), eventData);

      // 2. Increment aggregate metric in summary doc
      try {
        const statsRef = doc(db, 'app_install_metrics', 'summary');
        await setDoc(statsRef, {
          totalClicks: increment(1),
          lastClickedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (sumErr) {
        console.warn("[AppInstallTracker] Non-fatal summary metric increment warning:", sumErr);
      }

      console.log("[AppInstallTracker] Button click recorded successfully:", eventData);
      return true;
    } catch (err) {
      console.error("[AppInstallTracker] Failed to record button click:", err);
      return false;
    }
  },

  /**
   * Record when user downloads or installs the app (prompt accepted or appinstalled browser event).
   */
  trackAppDownload: async (
    user?: { id?: string; email?: string; name?: string } | null,
    options?: {
      source?: string;
      outcome?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      const device = detectDeviceDetails();
      const userId = user?.id || localStorage.getItem('vec_anon_user_id') || `anon_${Math.random().toString(36).substring(2, 9)}`;
      const userEmail = user?.email || '';
      const userName = user?.name || user?.email?.split('@')[0] || 'App User';
      const nowIso = new Date().toISOString();

      const eventData: AppInstallEvent = {
        eventType: 'app_download',
        buttonText: 'Use the app for a smoother experience',
        source: options?.source || 'top_banner',
        userId: userId,
        userEmail: userEmail,
        userName: userName,
        platform: device.platform,
        deviceType: device.deviceType,
        browser: device.browser,
        userAgent: device.userAgent,
        timestamp: nowIso,
        outcome: options?.outcome || 'accepted',
        metadata: options?.metadata || {}
      };

      // 1. Add event log
      await addDoc(collection(db, EVENTS_COLLECTION), eventData);

      // 2. Upsert user into app_downloaded_users collection to accurately track individuals
      const userDocId = userId;
      const userDocRef = doc(db, USERS_COLLECTION, userDocId);
      const existingUserSnap = await getDoc(userDocRef);

      let isNewDownloader = false;
      if (existingUserSnap.exists()) {
        await updateDoc(userDocRef, {
          totalDownloads: increment(1),
          lastDownloadedAt: nowIso,
          platform: device.platform,
          deviceType: device.deviceType,
          browser: device.browser,
          source: options?.source || 'top_banner',
          status: 'installed',
          userName: userName || existingUserSnap.data()?.userName,
          userEmail: userEmail || existingUserSnap.data()?.userEmail
        });
      } else {
        isNewDownloader = true;
        const newDownloader: AppDownloadedUser = {
          id: userDocId,
          userId: userId,
          userEmail: userEmail,
          userName: userName,
          totalDownloads: 1,
          firstDownloadedAt: nowIso,
          lastDownloadedAt: nowIso,
          platform: device.platform,
          deviceType: device.deviceType,
          browser: device.browser,
          source: options?.source || 'top_banner',
          status: 'installed'
        };
        await setDoc(userDocRef, newDownloader);
      }

      // 3. Mark user profile in core 'users' table if logged in
      if (user?.id) {
        try {
          const coreUserRef = doc(db, 'users', user.id);
          await setDoc(coreUserRef, {
            appInstalled: true,
            appDownloadedAt: nowIso,
            appPlatform: device.platform
          }, { merge: true });
        } catch (coreUserErr) {
          console.warn("[AppInstallTracker] Non-fatal user table sync:", coreUserErr);
        }
      }

      // 4. Increment aggregate summary metric
      try {
        const statsRef = doc(db, 'app_install_metrics', 'summary');
        await setDoc(statsRef, {
          totalDownloads: increment(1),
          uniqueDownloadersCount: isNewDownloader ? increment(1) : increment(0),
          lastDownloadedAt: nowIso,
          lastUpdated: nowIso
        }, { merge: true });
      } catch (sumErr) {
        console.warn("[AppInstallTracker] Non-fatal summary metric increment warning:", sumErr);
      }

      console.log("[AppInstallTracker] App download recorded successfully:", eventData);
      return true;
    } catch (err) {
      console.error("[AppInstallTracker] Failed to record app download:", err);
      return false;
    }
  },

  /**
   * Fetch complete app install and banner tracking statistics for the Admin dashboard.
   */
  getAppInstallStats: async (): Promise<AppInstallStats> => {
    try {
      // 1. Fetch all downloaders
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
      const downloaders: AppDownloadedUser[] = usersSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AppDownloadedUser[];

      // 2. Fetch all install events
      const eventsSnap = await getDocs(collection(db, EVENTS_COLLECTION));
      const allEvents: AppInstallEvent[] = eventsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AppInstallEvent[];

      // Sort events newest first
      const sortedEvents = allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const clickEvents = sortedEvents.filter(e => e.eventType === 'button_click');
      const downloadEvents = sortedEvents.filter(e => e.eventType === 'app_download' || e.eventType === 'app_installed');

      const totalClicks = clickEvents.length;
      const totalDownloads = downloadEvents.length;

      // Unique people count: count unique user IDs/emails from download events and downloaders table
      const uniqueDownloaderIds = new Set<string>();
      downloaders.forEach(d => {
        if (d.userId) uniqueDownloaderIds.add(d.userId);
        else if (d.userEmail) uniqueDownloaderIds.add(d.userEmail);
      });
      downloadEvents.forEach(e => {
        if (e.userId) uniqueDownloaderIds.add(e.userId);
        else if (e.userEmail) uniqueDownloaderIds.add(e.userEmail);
      });

      const uniqueClickerIds = new Set<string>();
      clickEvents.forEach(e => {
        if (e.userId) uniqueClickerIds.add(e.userId);
        else if (e.userEmail) uniqueClickerIds.add(e.userEmail);
      });

      const uniqueDownloadersCount = Math.max(downloaders.length, uniqueDownloaderIds.size);
      const uniqueClickersCount = uniqueClickerIds.size;

      // Conversion rate: (unique downloads / unique clicks) or (total downloads / total clicks)
      const conversionRate = totalClicks > 0 
        ? Math.round((totalDownloads / totalClicks) * 100 * 10) / 10 
        : (totalDownloads > 0 ? 100 : 0);

      // Platform breakdown
      const platformBreakdown = {
        android: 0,
        ios: 0,
        desktop: 0,
        other: 0
      };

      const browserBreakdown: Record<string, number> = {};

      downloadEvents.forEach(e => {
        const plat = (e.platform || '').toLowerCase();
        if (plat.includes('android')) platformBreakdown.android++;
        else if (plat.includes('ios') || plat.includes('iphone') || plat.includes('ipad')) platformBreakdown.ios++;
        else if (plat.includes('windows') || plat.includes('mac') || plat.includes('linux')) platformBreakdown.desktop++;
        else platformBreakdown.other++;

        const br = e.browser || 'Other';
        browserBreakdown[br] = (browserBreakdown[br] || 0) + 1;
      });

      // Daily trend for past 7-14 days
      const daysMap: Record<string, { clicks: number; downloads: number }> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        daysMap[key] = { clicks: 0, downloads: 0 };
      }

      sortedEvents.forEach(e => {
        if (!e.timestamp) return;
        const dKey = new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (daysMap[dKey]) {
          if (e.eventType === 'button_click') daysMap[dKey].clicks++;
          else if (e.eventType === 'app_download' || e.eventType === 'app_installed') daysMap[dKey].downloads++;
        }
      });

      const dailyTrend = Object.entries(daysMap).map(([date, counts]) => ({
        date,
        clicks: counts.clicks,
        downloads: counts.downloads
      }));

      return {
        totalClicks,
        totalDownloads,
        uniqueDownloadersCount,
        uniqueClickersCount,
        conversionRate,
        downloaders: downloaders.sort((a, b) => 
          new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime()
        ),
        recentEvents: sortedEvents.slice(0, 100),
        platformBreakdown,
        browserBreakdown,
        dailyTrend
      };
    } catch (err) {
      console.error("[AppInstallTracker] Failed to get install stats:", err);
      return {
        totalClicks: 0,
        totalDownloads: 0,
        uniqueDownloadersCount: 0,
        uniqueClickersCount: 0,
        conversionRate: 0,
        downloaders: [],
        recentEvents: [],
        platformBreakdown: { android: 0, ios: 0, desktop: 0, other: 0 },
        browserBreakdown: {},
        dailyTrend: []
      };
    }
  },

  /**
   * Subscribe in real-time to app install events and downloaders.
   */
  subscribeToInstallEvents: (callback: (stats: AppInstallStats) => void) => {
    try {
      const q = query(collection(db, EVENTS_COLLECTION), limit(150));
      return onSnapshot(q, async () => {
        const stats = await appInstallTrackingService.getAppInstallStats();
        callback(stats);
      }, (err) => {
        console.error("[AppInstallTracker] Real-time listener error:", err);
      });
    } catch (err) {
      console.error("[AppInstallTracker] Subscribe failed:", err);
      return () => {};
    }
  }
};
