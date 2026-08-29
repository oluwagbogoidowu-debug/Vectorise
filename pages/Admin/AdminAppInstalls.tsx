import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  appInstallTrackingService, 
  AppInstallStats, 
  AppDownloadedUser, 
  AppInstallEvent 
} from '../../services/appInstallTrackingService';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  MousePointerClick, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ExternalLink, 
  ShieldCheck, 
  Globe, 
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export default function AdminAppInstalls() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AppInstallStats>({
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'downloaders' | 'events' | 'analytics'>('downloaders');
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'iOS' | 'Desktop'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'button_click' | 'app_download'>('all');

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await appInstallTrackingService.getAppInstallStats();
      setStats(data);
    } catch (err) {
      console.error("[AdminAppInstalls] Failed to load data:", err);
      toast.error("Failed to load app adoption metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Subscribe to live events
    const unsub = appInstallTrackingService.subscribeToInstallEvents((newStats) => {
      setStats(newStats);
    });
    return () => unsub();
  }, []);

  // Filtered Downloaders
  const filteredDownloaders = useMemo(() => {
    return stats.downloaders.filter(u => {
      const nameMatch = (u.userName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (u.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
      const idMatch = (u.userId || '').toLowerCase().includes(searchQuery.toLowerCase());
      const textMatches = nameMatch || emailMatch || idMatch;

      if (!textMatches) return false;

      if (platformFilter === 'all') return true;
      if (platformFilter === 'Android') return (u.platform || '').toLowerCase().includes('android');
      if (platformFilter === 'iOS') return (u.platform || '').toLowerCase().includes('ios');
      if (platformFilter === 'Desktop') {
        const p = (u.platform || '').toLowerCase();
        return p.includes('windows') || p.includes('mac') || p.includes('linux') || u.deviceType === 'desktop';
      }
      return true;
    });
  }, [stats.downloaders, searchQuery, platformFilter]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return stats.recentEvents.filter(e => {
      const matchSearch = 
        (e.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.buttonText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.platform || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (eventTypeFilter === 'all') return true;
      if (eventTypeFilter === 'button_click') return e.eventType === 'button_click';
      if (eventTypeFilter === 'app_download') return e.eventType === 'app_download' || e.eventType === 'app_installed';
      return true;
    });
  }, [stats.recentEvents, searchQuery, eventTypeFilter]);

  const platformTotal = stats.platformBreakdown.android + stats.platformBreakdown.ios + stats.platformBreakdown.desktop + stats.platformBreakdown.other;

  const getPlatformPercentage = (count: number) => {
    if (platformTotal === 0) return 0;
    return Math.round((count / platformTotal) * 100);
  };

  const handleExportCSV = () => {
    if (stats.downloaders.length === 0) {
      toast.error("No downloaders data to export");
      return;
    }
    const headers = ['User ID', 'Full Name', 'Email', 'Downloads Count', 'First Downloaded', 'Last Downloaded', 'Platform', 'Device', 'Browser'];
    const rows = stats.downloaders.map(d => [
      `"${d.userId}"`,
      `"${d.userName || ''}"`,
      `"${d.userEmail || ''}"`,
      d.totalDownloads,
      `"${d.firstDownloadedAt || ''}"`,
      `"${d.lastDownloadedAt || ''}"`,
      `"${d.platform || ''}"`,
      `"${d.deviceType || ''}"`,
      `"${d.browser || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vectorise_app_downloaders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 font-sans">
        <div className="w-8 h-8 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Loading App Tracking Intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900/5 via-teal-900/5 to-transparent p-6 sm:p-8 rounded-[2.5rem] border border-emerald-950/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#0E7850]/10 text-[#0E7850] border border-[#0E7850]/20">
              <span className="w-2 h-2 rounded-full bg-[#0E7850] animate-pulse"></span>
              Live App Adoption Telemetry
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            App Download & Button Click Tracker
          </h2>
          <p className="text-xs font-bold text-gray-500 mt-1 max-w-2xl">
            Real-time conversion tracking for the <span className="font-extrabold text-gray-800">"Use the app for a smoother experience"</span> button, including total clicks, complete app installations, and the verified list of people who downloaded it.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchStats}
            className="flex-1 md:flex-none px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Refresh
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none px-5 py-3 bg-[#0E7850] hover:bg-[#0c6644] text-white shadow-md rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Downloaders
          </button>
        </div>
      </div>

      {/* CORE 4 METRICS OVERVIEW CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Clicks */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex flex-col justify-between hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Banner Button Clicks</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{stats.totalClicks}</p>
              <span className="text-xs font-bold text-gray-400">clicks</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {stats.uniqueClickersCount} Unique Clickers
            </p>
          </div>
        </div>

        {/* Metric 2: Total App Downloads */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex flex-col justify-between hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Downloads</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0E7850] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-[#0E7850]">{stats.totalDownloads}</p>
              <span className="text-xs font-bold text-gray-400">installs</span>
            </div>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-[#0E7850]" /> Verified Installations
            </p>
          </div>
        </div>

        {/* Metric 3: People Who Downloaded (Unique individuals) */}
        <div className="bg-white rounded-[2rem] border border-emerald-100/80 bg-gradient-to-br from-emerald-50/20 to-white p-6 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">People Who Downloaded</span>
            <div className="w-10 h-10 rounded-2xl bg-[#0E7850] text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{stats.uniqueDownloadersCount}</p>
              <span className="text-xs font-bold text-emerald-700">unique people</span>
            </div>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-2 flex items-center gap-1">
              Distinct individual accounts
            </p>
          </div>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex flex-col justify-between hover:border-gray-200 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Click-To-Install Rate</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{stats.conversionRate}%</p>
              <span className="text-xs font-bold text-purple-600">conversion</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </section>

      {/* PLATFORM & DEVICE BREAKDOWN ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Device Distribution Card */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-7 shadow-sm">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#0E7850]" /> Platform Distribution
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6">
            Where users are downloading Vectorise
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Android
                </span>
                <span className="text-gray-900 font-mono font-black">
                  {stats.platformBreakdown.android} ({getPlatformPercentage(stats.platformBreakdown.android)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${getPlatformPercentage(stats.platformBreakdown.android)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> iOS / iPhone / iPad
                </span>
                <span className="text-gray-900 font-mono font-black">
                  {stats.platformBreakdown.ios} ({getPlatformPercentage(stats.platformBreakdown.ios)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${getPlatformPercentage(stats.platformBreakdown.ios)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Desktop (Mac/Windows/Linux)
                </span>
                <span className="text-gray-900 font-mono font-black">
                  {stats.platformBreakdown.desktop} ({getPlatformPercentage(stats.platformBreakdown.desktop)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${getPlatformPercentage(stats.platformBreakdown.desktop)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Activity Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> Daily Interaction Trend
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                Comparison of button clicks vs completed app installations over the last 7 days
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 block"></span>
                <span className="text-[9px] font-black text-gray-400 uppercase">Clicks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#0E7850] block"></span>
                <span className="text-[9px] font-black text-gray-400 uppercase">Downloads</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E7850" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0E7850" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                <Area type="monotone" dataKey="downloads" name="Downloads" stroke="#0E7850" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDownloads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveSubTab('downloaders')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'downloaders'
              ? 'bg-[#0E7850] text-white shadow-md'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" /> People Who Downloaded ({stats.downloaders.length})
        </button>
        <button
          onClick={() => setActiveSubTab('events')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'events'
              ? 'bg-[#0E7850] text-white shadow-md'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <MousePointerClick className="w-4 h-4" /> Live Event & Click Log ({stats.recentEvents.length})
        </button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeSubTab === 'downloaders' ? "Search people by name, email, ID..." : "Search click events, labels, users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0E7850]"
          />
        </div>

        {activeSubTab === 'downloaders' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform:</span>
            <div className="flex gap-1">
              {(['all', 'Android', 'iOS', 'Desktop'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    platformFilter === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Type:</span>
            <div className="flex gap-1">
              {(['all', 'button_click', 'app_download'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEventTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    eventTypeFilter === t
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'button_click' ? 'Clicks' : 'Downloads'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: PEOPLE WHO DOWNLOADED THE APP */}
      {activeSubTab === 'downloaders' && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Directory of People Who Downloaded The App
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                Showing {filteredDownloaders.length} verified installers
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">User / Identity</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Address</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Platform & Device</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Browser</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Downloaded Date</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredDownloaders.length > 0 ? (
                  filteredDownloaders.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0E7850] to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                            {(user.userName || user.userEmail || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{user.userName || 'Anonymous User'}</p>
                            <p className="text-[9px] font-mono text-gray-400 truncate max-w-[120px]">{user.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-600">{user.userEmail || '—'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                          {user.platform?.toLowerCase().includes('android') ? (
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                          ) : user.platform?.toLowerCase().includes('ios') ? (
                            <Smartphone className="w-3 h-3 text-blue-600" />
                          ) : (
                            <Laptop className="w-3 h-3 text-indigo-600" />
                          )}
                          {user.platform || 'Mobile'} ({user.deviceType || 'mobile'})
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-500">{user.browser || 'Browser'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {user.firstDownloadedAt ? new Date(user.firstDownloadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {user.firstDownloadedAt ? new Date(user.firstDownloadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-[#0E7850] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> App Installed
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {user.userId && !user.userId.startsWith('anon_') && (
                          <button
                            onClick={() => navigate(`/admin/analytics/user/${encodeURIComponent(user.userId)}`)}
                            className="p-2 text-gray-400 hover:text-[#0E7850] hover:bg-[#0E7850]/10 rounded-xl transition-all cursor-pointer"
                            title="Inspect User Details"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">No downloaders found</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          When users tap "Use the app for a smoother experience" and install the app, they will be listed here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE INTERACTION & EVENT LOG */}
      {activeSubTab === 'events' && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Live Banner Interaction & Download Audit Stream
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                Realtime chronological log of button clicks and installation confirmations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Event Type</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Button Text / Action</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">User Identity</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Platform / OS</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Browser</th>
                  <th className="py-4 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt, idx) => (
                    <tr key={evt.id || idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        {evt.eventType === 'button_click' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            <MousePointerClick className="w-3 h-3 text-blue-600" /> Button Click
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-[#0E7850] border border-emerald-200">
                            <Download className="w-3 h-3 text-[#0E7850]" /> App Download
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-gray-900">{evt.buttonText}</span>
                        <span className="block text-[8px] font-mono text-gray-400">Source: {evt.source}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800">{evt.userName || evt.userEmail || 'Anonymous'}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{evt.userEmail || evt.userId}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-700">{evt.platform}</span>
                        <span className="block text-[8px] font-mono text-gray-400">{evt.deviceType}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-600">{evt.browser}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-900">
                          {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="block text-[9px] font-mono text-gray-400">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-3">
                          <MousePointerClick className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">No events logged yet</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          Interaction events on the top banner will be streamed live here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
