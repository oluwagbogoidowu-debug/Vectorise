
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LocalLogo from '../../../components/LocalLogo';
import { PushToggle } from '../../../components/PushToggle';
import { pushNotificationService } from '../../../services/pushNotificationService';
import { notificationService } from '../../../services/notificationService';
import { toast } from 'sonner';
import { Terminal, Send, Bell, Smartphone, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Playground state
  const [testTitle, setTestTitle] = useState('Test Push Notification 🚀');
  const [testBody, setTestBody] = useState('Welcome to the Notification Playground! Your device is successfully subscribed.');
  const [testUrl, setTestUrl] = useState('/profile/settings');
  const [testIcon, setTestIcon] = useState('https://img.icons8.com/fluency-systems-filled/96/0E7850/star.png');
  const [testImage, setTestImage] = useState('https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?q=80&w=600&auto=format&fit=crop');
  const [sendingPush, setSendingPush] = useState(false);
  const [sendingInApp, setSendingInApp] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('welcome');

  const templates: Record<string, { title: string; body: string; image?: string; icon?: string }> = {
    welcome: {
      title: 'Test Push Notification 🚀',
      body: 'Welcome to the Notification Playground! Your device is successfully subscribed.',
      icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/star.png',
      image: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?q=80&w=600&auto=format&fit=crop'
    },
    milestone: {
      title: 'Streak Milestones Hit! 🏆',
      body: 'Outstanding consistency! You completed 3 consecutive days. Your streak is glowing.',
      icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/trophy.png',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop'
    },
    sprint: {
      title: 'Sprint Day Unlocked ⏰',
      body: 'Ready to complete Day 4 of your Vision Sprint? Touch to begin your session.',
      icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/unlock.png',
      image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=600&auto=format&fit=crop'
    },
    coach: {
      title: 'Coach Sarah sent feedback 💬',
      body: '"Superb reflections on today\'s check-in! Love how you connected your values to your actions."',
      icon: 'https://img.icons8.com/fluency-systems-filled/96/0E7850/chat.png',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop'
    },
    custom: {
      title: '',
      body: '',
      icon: '',
      image: ''
    }
  };

  const handleSelectTemplate = (key: string) => {
    setActiveTemplate(key);
    if (key !== 'custom') {
      const t = templates[key];
      setTestTitle(t.title);
      setTestBody(t.body);
      setTestIcon(t.icon || '');
      setTestImage(t.image || '');
    }
  };

  const isRegistered = !!(user as any)?.fcmToken;

  const triggerPushTest = async () => {
    if (!user) {
      toast.error('You must be signed in.');
      return;
    }

    if (!isRegistered) {
      toast.warning('No FCM token found for your account. Please enable Push Notifications first using the switch above.');
      return;
    }

    setSendingPush(true);
    const toastId = toast.loading('Dispatching test FCM payload...');
    try {
      await pushNotificationService.sendPush(
        user.id,
        testTitle || 'Test Alert',
        testBody || 'This is a test notification payload.',
        testUrl || '/profile/settings',
        'test-notification',
        true, // bypassActiveCheck = true
        testImage || undefined,
        testIcon || undefined
      );
      toast.success('FCM push payload dispatched successfully!', { id: toastId });
    } catch (err: any) {
      console.error('[Playground] Send push failed:', err);
      toast.error('Failed to dispatch test notification.', { id: toastId });
    } finally {
      setSendingPush(false);
    }
  };

  const triggerInAppTest = async () => {
    if (!user) {
      toast.error('You must be signed in.');
      return;
    }

    setSendingInApp(true);
    const toastId = toast.loading('Writing notification to DB...');
    try {
      await notificationService.createNotification(
        user.id,
        'sprint_day_unlocked',
        testTitle || 'In-App Notification',
        testBody || 'This notice was successfully recorded in your database ledger.',
        {
          actionUrl: testUrl || '/profile/settings',
          bypassActiveCheck: true,
          image: testImage || undefined,
          icon: testIcon || undefined
        }
      );
      toast.success('In-app database notification saved & push triggered!', { id: toastId });
    } catch (err: any) {
      console.error('[Playground] Send in-app failed:', err);
      toast.error('Failed to write database notification.', { id: toastId });
    } finally {
      setSendingInApp(false);
    }
  };

  const toggleDarkMode = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    if (nextVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="bg-[#FDFDFD] dark:bg-[#121111] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in transition-colors duration-300">
      <header className="bg-white dark:bg-zinc-900 px-6 pt-12 pb-6 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Account</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-3 px-1">Settings</p>
          
          <Link to="/profile/settings/edit" className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg">👤</div>
              <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Edit Profile</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link to="/profile/settings/identity" className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg">🧬</div>
              <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Identity Settings</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>

          {/* Dark Mode toggle before push notification */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0E7850]/5 dark:bg-[#0E7850]/10 flex items-center justify-center text-lg">
                {isDarkMode ? '🌙' : '☀️'}
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest block">Dark Mode</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{isDarkMode ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            
            <button 
              onClick={toggleDarkMode}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isDarkMode ? "bg-[#0E7850] shadow-lg shadow-[#0E7850]/20" : "bg-gray-200"}`}
            >
              <div 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isDarkMode ? "right-1" : "left-1"}`}
              />
            </button>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
            <PushToggle />
          </div>

          {/* Notification Playground Section */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0E7850]/5 dark:bg-[#0E7850]/10 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-[#0E7850]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Notification Playground</h3>
                  <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Device Subscription Verification</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isRegistered ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  {isRegistered ? 'Token Subscribed' : 'No FCM Token'}
                </span>
              </div>
            </div>

            {/* Template Selectors */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Select Payload Template</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Object.keys(templates).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTemplate(key)}
                    className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                      activeTemplate === key
                        ? 'bg-[#0E7850] text-white border-transparent shadow-sm'
                        : 'bg-gray-50 dark:bg-zinc-850 hover:bg-gray-100 dark:hover:bg-zinc-850 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-zinc-800'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Custom Title</label>
                <input
                  type="text"
                  placeholder="Enter custom title..."
                  value={testTitle}
                  onChange={(e) => {
                    setTestTitle(e.target.value);
                    setActiveTemplate('custom');
                  }}
                  className="w-full px-4 py-2.5 text-xs font-bold bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0E7850] text-gray-900 dark:text-gray-150 transition-all placeholder-gray-400"
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Custom Message Body</label>
                <textarea
                  placeholder="Enter custom text body..."
                  value={testBody}
                  rows={2}
                  onChange={(e) => {
                    setTestBody(e.target.value);
                    setActiveTemplate('custom');
                  }}
                  className="w-full px-4 py-2.5 text-xs font-bold bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0E7850] text-gray-900 dark:text-gray-150 transition-all placeholder-gray-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Custom Icon URL</label>
                  <input
                    type="text"
                    placeholder="https://img.icons8.com/... (optional)"
                    value={testIcon}
                    onChange={(e) => {
                      setTestIcon(e.target.value);
                      setActiveTemplate('custom');
                    }}
                    className="w-full px-4 py-2.5 text-[10px] font-mono bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0E7850] text-gray-900 dark:text-gray-150 transition-all placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Custom Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... (optional)"
                    value={testImage}
                    onChange={(e) => {
                      setTestImage(e.target.value);
                      setActiveTemplate('custom');
                    }}
                    className="w-full px-4 py-2.5 text-[10px] font-mono bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E7850] text-gray-900 dark:text-gray-150 transition-all placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Launch Redirect URL</label>
                <input
                  type="text"
                  placeholder="e.g. /profile/settings"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-mono bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0E7850] text-gray-900 dark:text-gray-150 transition-all"
                />
              </div>
            </div>

            {/* Mock Mobile OS Banner Preview */}
            <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-2xl p-4 space-y-2.5 transition-colors duration-300">
              <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                Live OS Banner Preview
              </span>
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm flex items-start gap-3 relative overflow-hidden transition-all duration-300">
                <div className="w-1.5 h-full bg-[#0E7850] absolute left-0 top-0 bottom-0" />
                <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-850 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-zinc-800">
                  {testIcon ? (
                    <img 
                      src={testIcon} 
                      alt="Icon" 
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png';
                      }}
                    />
                  ) : (
                    <span className="text-md">📲</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-[11px] font-black text-gray-900 dark:text-gray-100 truncate uppercase tracking-wider">
                      {testTitle || 'Untitled Notification'}
                    </h4>
                    <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase shrink-0 ml-2">now</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal mt-0.5 max-h-12 overflow-hidden line-clamp-2">
                    {testBody || 'Type a customized title/body or pick a template above.'}
                  </p>
                  
                  {testImage && (
                    <div className="mt-2.5 overflow-hidden rounded-lg border border-gray-100 dark:border-zinc-850/60 aspect-[1.91] max-h-32 bg-gray-50/50">
                      <img src={testImage} alt="Notification Banner" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-[8px] text-[#0E7850] font-black uppercase tracking-wider mt-1.5 flex items-center gap-1">
                    <span>Redirect URL:</span>
                    <span className="text-gray-400 dark:text-gray-500 font-medium lowercase tracking-normal">{testUrl}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={triggerPushTest}
                disabled={sendingPush || !isRegistered}
                className={`py-3 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  isRegistered
                    ? 'bg-[#0E7850] hover:bg-[#0c6644] active:scale-[0.98] text-white shadow-md shadow-[#0E7850]/15 disabled:opacity-55'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 border border-gray-150 dark:border-zinc-800 cursor-not-allowed'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                {sendingPush ? 'Sending FCM...' : 'Trigger Push payload'}
              </button>

              <button
                type="button"
                onClick={triggerInAppTest}
                disabled={sendingInApp}
                className="py-3 px-4 bg-white dark:bg-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl font-black text-[10px] text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-55"
              >
                <Send className="w-3.5 h-3.5 shrink-0 text-[#0E7850]" />
                {sendingInApp ? 'Writing DB...' : 'Write In-App Notification'}
              </button>
            </div>

            {!isRegistered && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/35 rounded-2xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-normal font-medium">
                  Your device has not generated an active FCM registration token. Please configure the toggle switch above to subscription "Enabled" to retrieve a token before sending push tests.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={logout}
            className="w-full py-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </main>

      <footer className="p-10 flex justify-center opacity-10 dark:opacity-20">
        <LocalLogo type="green" className="h-6 w-auto" />
      </footer>
    </div>
  );
};

export default AccountSettings;
