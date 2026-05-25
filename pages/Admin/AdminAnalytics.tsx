import React, { useState, useEffect, useMemo } from 'react';
import { 
  analyticsService, 
  UserSprintAnalytics, 
  UserActivityLog 
} from '../../services/analyticsService';
import { 
  Activity, 
  Calendar, 
  TrendingUp, 
  UserCheck, 
  Search, 
  Zap, 
  AlertCircle, 
  Award, 
  ListFilter, 
  RefreshCw, 
  Database,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AdminAnalytics: React.FC = () => {
  const [coreAnalytics, setCoreAnalytics] = useState<UserSprintAnalytics[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'core_table' | 'activity_logs'>('core_table');
  
  // Filters and searches
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<'all' | 'task_submission' | 'check_in'>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coreData, logsData] = await Promise.all([
        analyticsService.getAllSprintAnalytics(),
        analyticsService.getAllActivityLogs()
      ]);

      // Sort core data by last activity (newest first)
      const sortedCore = [...coreData].sort(
        (a, b) => new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime()
      );
      
      // Sort logs by created_at (newest first)
      const sortedLogs = [...logsData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCoreAnalytics(sortedCore);
      setActivityLogs(sortedLogs);
    } catch (err) {
      console.error("[AdminAnalytics] Fetch failed:", err);
      toast.error("Failed to fetch streak analytics data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter systems
  const filteredCore = useMemo(() => {
    return coreAnalytics.filter(item => {
      const matchesSearch = 
        item.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.active_sprint_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [coreAnalytics, searchQuery, statusFilter]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(item => {
      const matchesSearch = 
        item.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sprint_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesActionType = actionTypeFilter === 'all' || item.action_type === actionTypeFilter;
      
      return matchesSearch && matchesActionType;
    });
  }, [activityLogs, searchQuery, actionTypeFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalUsers = new Set(coreAnalytics.map(c => c.user_id)).size;
    const activeStreaksCount = coreAnalytics.filter(c => c.current_streak > 0).length;
    const peakStreak = coreAnalytics.reduce((max, c) => Math.max(max, c.longest_streak || 0), 0);
    const inactiveUsers = coreAnalytics.filter(c => c.status === 'inactive').length;
    const activeUsers = coreAnalytics.filter(c => c.status === 'active').length;

    return {
      totalUsers,
      totalLogs: activityLogs.length,
      activeUsers,
      inactiveUsers,
      activeStreaksCount,
      peakStreak
    };
  }, [coreAnalytics, activityLogs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Synching Core Streaks Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Daily Sprint Entry & Streaks Tracker</h2>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-wider">
            Enterprise analytics engine based on consecutive active days and daily checks
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className="w-3 h-3" /> Reload Database
        </button>
      </div>

      {/* CORE SUMMARY METRICS CARD */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Core Users</p>
            <p className="text-2xl font-black text-gray-900 mt-1.5 leading-none">{stats.totalUsers}</p>
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wide mt-1 block">
              ● {stats.activeUsers} Active State
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Inactive Users</p>
            <p className="text-2xl font-black text-gray-900 mt-1.5 leading-none">{stats.inactiveUsers}</p>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-wide mt-1 block">
              &gt; 3 Days absence
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Active Streaks</p>
            <p className="text-2xl font-black text-gray-900 mt-1.5 leading-none">{stats.activeStreaksCount}</p>
            <span className="text-[8px] font-black text-orange-600 uppercase tracking-wide mt-1 block">
              Peak: {stats.peakStreak} Days
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Actions Logged</p>
            <p className="text-2xl font-black text-gray-900 mt-1.5 leading-none">{stats.totalLogs}</p>
            <span className="text-[8px] font-black text-blue-600 uppercase tracking-wide mt-1 block">
              Across all milestones
            </span>
          </div>
        </div>

      </section>

      {/* FILTER CONTROLS BAR */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Toggle Grid Tabs */}
        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('core_table')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'core_table' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Core User Sprint Table
          </button>
          <button 
            onClick={() => setActiveTab('activity_logs')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'activity_logs' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Daily Activity Log Table
          </button>
        </div>

        {/* Search Input and Select Fields */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search user ID or sprint ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 text-xs rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-primary/25 transition-all"
            />
          </div>

          {activeTab === 'core_table' ? (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5">
              <ListFilter className="w-3 h-3 text-gray-400" />
              <select 
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[10px] uppercase font-black tracking-wider text-gray-600 outline-none cursor-pointer"
              >
                <option value="all">All States</option>
                <option value="active">Active Sprints</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5">
              <ListFilter className="w-3 h-3 text-gray-400" />
              <select 
                value={actionTypeFilter}
                onChange={(e: any) => setActionTypeFilter(e.target.value)}
                className="bg-transparent text-[10px] uppercase font-black tracking-wider text-gray-600 outline-none cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="task_submission">Task Submissions</option>
                <option value="check_in">Daily Checkins</option>
              </select>
            </div>
          )}
        </div>

      </section>

      {/* CORE USER SPRINT TABLE */}
      {activeTab === 'core_table' && (
        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">User Identifier</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Sprint</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Start</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Run / Peak Streak</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Total Active Days</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Last Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCore.length > 0 ? (
                  filteredCore.map((item, idx) => (
                    <tr key={idx} className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-gray-900 truncate max-w-[180px]" title={item.user_id}>
                            {item.user_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-semibold text-gray-700">
                          {item.active_sprint_id?.substring(0, 15) || 'n/a'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs text-gray-500 font-mono">
                        {item.sprint_start_date ? new Date(item.sprint_start_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                            🔥 {item.current_streak}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            / {item.longest_streak || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center text-xs font-black text-gray-700">
                        {item.total_active_days} Days
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider ${
                          item.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : item.status === 'inactive'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-xs font-bold text-gray-700">
                          {item.last_check_in ? new Date(item.last_check_in).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5 font-mono">
                          {item.last_check_in ? new Date(item.last_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                        No Core User Sprint statistics matches filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* DAILY ACTIVITY LOG TABLE */}
      {activeTab === 'activity_logs' && (
        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Log ID / Reference</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">User Identifier</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Identifier</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Calendar Date</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Action Type</th>
                  <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Logged timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-8 py-5 text-xs font-mono text-gray-400">
                        {log.created_at ? `log_${new Date(log.created_at).getTime().toString().slice(-7)}` : `idx_${idx}`}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-gray-900 truncate max-w-[180px]" title={log.user_id}>
                          {log.user_id}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-semibold text-gray-500">
                          {log.sprint_id?.substring(0, 15) || 'n/a'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center text-xs font-black text-gray-700 font-mono">
                        {log.date}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle className="w-3 h-3 text-emerald-500" /> COMPLETED
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {log.action_type || 'task'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right text-xs text-gray-500 font-mono">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                        No user daily activity actions logged in database.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
};

export default AdminAnalytics;
