import React, { useState, useEffect, useMemo } from 'react';
import { 
  sprintAnalyticsService, 
  SprintFunnelMetrics 
} from '../../services/sprintAnalyticsService';
import { Sprint } from '../../types';
import { 
  Eye, 
  Play, 
  CheckCircle2, 
  Trophy, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  BarChart2, 
  Download, 
  Layers, 
  ArrowUpRight,
  Filter,
  CheckCircle,
  HelpCircle,
  Zap,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import CustomSelect from '../../components/CustomSelect';

const CustomFunnelTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl font-sans min-w-[200px]">
        <p className="text-xs font-black text-gray-900 mb-2 truncate max-w-[220px]">
          {data.name || data.stage}
        </p>
        <div className="space-y-1 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100/60">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Count:</span>
            <span className="text-xs font-mono font-black text-gray-900">
              {Number(data.value || data.count || 0).toLocaleString()}
            </span>
          </div>
          {data.percentage !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Step Yield:</span>
              <span className="text-xs font-mono font-black text-primary">
                {data.percentage}%
              </span>
            </div>
          )}
          {data.dropoff !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Drop-off:</span>
              <span className="text-xs font-mono font-black text-rose-500">
                {data.dropoff}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomSprintBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl font-sans min-w-[220px]">
        <p className="text-xs font-black text-gray-900 mb-2 truncate max-w-[240px]" title={data.fullTitle}>
          {data.fullTitle}
        </p>
        <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100/60">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Views:
            </span>
            <span className="text-xs font-mono font-black text-gray-900">
              {Number(data.views || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Starts:
            </span>
            <span className="text-xs font-mono font-black text-gray-900">
              {Number(data.starts || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Move 1:
            </span>
            <span className="text-xs font-mono font-black text-gray-900">
              {Number(data.move1 || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed:
            </span>
            <span className="text-xs font-mono font-black text-emerald-700">
              {Number(data.completions || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const AdminSprintAnalytics: React.FC = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [metricsBySprint, setMetricsBySprint] = useState<Record<string, SprintFunnelMetrics>>({});
  const [totals, setTotals] = useState({
    totalViews: 0,
    totalStarts: 0,
    totalMove1: 0,
    totalCompletions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'views' | 'starts' | 'move1' | 'completions' | 'conversion' | 'title'>('views');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await sprintAnalyticsService.getAllSprintFunnelMetrics();
      setSprints(data.sprints);
      setMetricsBySprint(data.metricsBySprint);
      setTotals({
        totalViews: data.totalViews,
        totalStarts: data.totalStarts,
        totalMove1: data.totalMove1,
        totalCompletions: data.totalCompletions
      });
    } catch (err) {
      console.error('[AdminSprintAnalytics] Fetch failed:', err);
      toast.error('Failed to load sprint analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    sprints.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [sprints]);

  // Filtered & Sorted Sprints
  const filteredSprints = useMemo(() => {
    return sprints
      .filter(sprint => {
        const titleMatch = sprint.title.toLowerCase().includes(searchQuery.toLowerCase());
        const idMatch = sprint.id.toLowerCase().includes(searchQuery.toLowerCase());
        const catMatch = (sprint.category || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSearch = titleMatch || idMatch || catMatch;

        const matchesCat = categoryFilter === 'all' || sprint.category === categoryFilter;

        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        const mA = metricsBySprint[a.id] || { descriptionViews: 0, previewStarts: 0, move1Success: 0, sprintCompletions: 0 };
        const mB = metricsBySprint[b.id] || { descriptionViews: 0, previewStarts: 0, move1Success: 0, sprintCompletions: 0 };

        if (sortBy === 'views') return mB.descriptionViews - mA.descriptionViews;
        if (sortBy === 'starts') return mB.previewStarts - mA.previewStarts;
        if (sortBy === 'move1') return mB.move1Success - mA.move1Success;
        if (sortBy === 'completions') return mB.sprintCompletions - mA.sprintCompletions;
        if (sortBy === 'conversion') {
          const rateA = mA.descriptionViews > 0 ? (mA.sprintCompletions / mA.descriptionViews) : 0;
          const rateB = mB.descriptionViews > 0 ? (mB.sprintCompletions / mB.descriptionViews) : 0;
          return rateB - rateA;
        }
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [sprints, metricsBySprint, searchQuery, categoryFilter, sortBy]);

  // Overall Funnel Stages Chart Data
  const funnelChartData = useMemo(() => {
    const views = totals.totalViews;
    const starts = totals.totalStarts;
    const move1 = totals.totalMove1;
    const comp = totals.totalCompletions;

    const startsYield = views > 0 ? Math.round((starts / views) * 100) : 0;
    const move1Yield = starts > 0 ? Math.round((move1 / starts) * 100) : 0;
    const compYield = move1 > 0 ? Math.round((comp / move1) * 100) : 0;

    return [
      {
        stage: '1. Description Views',
        name: 'Sprint Description Views',
        count: views,
        percentage: 100,
        dropoff: views > 0 ? Math.round(((views - starts) / views) * 100) : 0,
        fill: '#3b82f6'
      },
      {
        stage: '2. Preview Starts',
        name: 'Sprint Preview Starts',
        count: starts,
        percentage: startsYield,
        dropoff: starts > 0 ? Math.round(((starts - move1) / starts) * 100) : 0,
        fill: '#8b5cf6'
      },
      {
        stage: '3. Move 1 Success',
        name: 'Move 1 Success Page',
        count: move1,
        percentage: move1Yield,
        dropoff: move1 > 0 ? Math.round(((move1 - comp) / move1) * 100) : 0,
        fill: '#f59e0b'
      },
      {
        stage: '4. Sprint Completion',
        name: 'Sprint Completion',
        count: comp,
        percentage: compYield,
        dropoff: 0,
        fill: '#10b981'
      }
    ];
  }, [totals]);

  // Top Sprints Bar Chart Data (Top 8 by views)
  const topSprintsChartData = useMemo(() => {
    return filteredSprints.slice(0, 8).map(sprint => {
      const m = metricsBySprint[sprint.id] || {
        descriptionViews: 0,
        previewStarts: 0,
        move1Success: 0,
        sprintCompletions: 0
      };

      let shortTitle = sprint.title || 'Sprint';
      if (shortTitle.length > 18) {
        shortTitle = shortTitle.substring(0, 16) + '...';
      }

      return {
        name: shortTitle,
        fullTitle: sprint.title,
        views: m.descriptionViews,
        starts: m.previewStarts,
        move1: m.move1Success,
        completions: m.sprintCompletions
      };
    });
  }, [filteredSprints, metricsBySprint]);

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Sprint Title', 'Sprint ID', 'Category', 'Description Views', 'Preview Starts', 'Move 1 Success', 'Sprint Completion', 'Start Conversion %', 'Move 1 Conversion %', 'Full Completion %'];
      const rows = filteredSprints.map(s => {
        const m = metricsBySprint[s.id] || { descriptionViews: 0, previewStarts: 0, move1Success: 0, sprintCompletions: 0 };
        const startRate = m.descriptionViews > 0 ? Math.round((m.previewStarts / m.descriptionViews) * 100) : 0;
        const move1Rate = m.previewStarts > 0 ? Math.round((m.move1Success / m.previewStarts) * 100) : 0;
        const compRate = m.descriptionViews > 0 ? Math.round((m.sprintCompletions / m.descriptionViews) * 100) : 0;

        return [
          `"${(s.title || '').replace(/"/g, '""')}"`,
          `"${s.id}"`,
          `"${s.category || 'General'}"`,
          m.descriptionViews,
          m.previewStarts,
          m.move1Success,
          m.sprintCompletions,
          `${startRate}%`,
          `${move1Rate}%`,
          `${compRate}%`
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `sprint_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Sprint analytics exported successfully!');
    } catch (e) {
      console.error('Failed to export CSV:', e);
      toast.error('Failed to export CSV file.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Computing Sprint Funnel Analytics...
        </p>
      </div>
    );
  }

  // Summary Metrics calculations
  const totalSprintsCount = sprints.length;
  const overallConversion = totals.totalViews > 0 
    ? Math.round((totals.totalCompletions / totals.totalViews) * 100) 
    : 0;
  const startToMove1Rate = totals.totalStarts > 0 
    ? Math.round((totals.totalMove1 / totals.totalStarts) * 100) 
    : 0;

  return (
    <div className="space-y-10 animate-fade-in font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Sprint Performance & Funnel Analytics</h2>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">
              Strictly Sprints
            </span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-wider">
            Tracking Sprint description views, preview starts, Move 1 success, and full sprint completions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3" /> Refresh Data
          </button>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stage 1: Sprint description views */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4 hover:border-blue-100 transition-colors">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Sprint Description Views
            </p>
            <p className="text-2xl font-black text-gray-900 mt-2 leading-none font-mono">
              {totals.totalViews.toLocaleString()}
            </p>
            <span className="text-[8px] font-black text-blue-600 uppercase tracking-wide mt-1.5 block">
              Across {totalSprintsCount} Sprints
            </span>
          </div>
        </div>

        {/* Stage 2: Sprint preview Starts */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4 hover:border-purple-100 transition-colors">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <Play className="w-6 h-6 ml-0.5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Sprint Preview Starts
            </p>
            <p className="text-2xl font-black text-gray-900 mt-2 leading-none font-mono">
              {totals.totalStarts.toLocaleString()}
            </p>
            <span className="text-[8px] font-black text-purple-600 uppercase tracking-wide mt-1.5 block">
              {totals.totalViews > 0 ? Math.round((totals.totalStarts / totals.totalViews) * 100) : 0}% View-to-Start
            </span>
          </div>
        </div>

        {/* Stage 3: Move 1 success page */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4 hover:border-amber-100 transition-colors">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Move 1 Success Page
            </p>
            <p className="text-2xl font-black text-gray-900 mt-2 leading-none font-mono">
              {totals.totalMove1.toLocaleString()}
            </p>
            <span className="text-[8px] font-black text-amber-600 uppercase tracking-wide mt-1.5 block">
              {startToMove1Rate}% Move 1 Yield
            </span>
          </div>
        </div>

        {/* Stage 4: Sprint completion */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex items-center gap-4 hover:border-emerald-100 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Sprint Completion
            </p>
            <p className="text-2xl font-black text-gray-900 mt-2 leading-none font-mono">
              {totals.totalCompletions.toLocaleString()}
            </p>
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wide mt-1.5 block">
              {overallConversion}% Full Conversion
            </span>
          </div>
        </div>

      </section>

      {/* CHARTS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FUNNEL OVERVIEW BAR CHART */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Overall Funnel Progression
              </h3>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                {overallConversion}% End-to-End
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-6 tracking-wide">
              Step-by-step participant flow through key sprint milestones
            </p>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barSize={22}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis 
                  dataKey="stage" 
                  type="category" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  width={110}
                />
                <Tooltip content={<CustomFunnelTooltip />} cursor={{ fill: 'rgba(229, 231, 235, 0.2)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 6, 6, 0]}
                  fill="#0E7850"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Funnel Summary Pills */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50 mt-4">
            <div className="bg-blue-50/50 p-2.5 rounded-xl text-center border border-blue-100/50">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Start Rate</span>
              <span className="text-xs font-mono font-black text-blue-700">
                {totals.totalViews > 0 ? Math.round((totals.totalStarts / totals.totalViews) * 100) : 0}%
              </span>
            </div>
            <div className="bg-amber-50/50 p-2.5 rounded-xl text-center border border-amber-100/50">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Move 1 Rate</span>
              <span className="text-xs font-mono font-black text-amber-700">
                {startToMove1Rate}%
              </span>
            </div>
            <div className="bg-emerald-50/50 p-2.5 rounded-xl text-center border border-emerald-100/50">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Finish Rate</span>
              <span className="text-xs font-mono font-black text-emerald-700">
                {totals.totalMove1 > 0 ? Math.round((totals.totalCompletions / totals.totalMove1) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* TOP SPRINTS COMPARISON MULTI-BAR CHART */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 lg:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" /> Top Sprints Milestone Comparison
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-wide">
                Comparing Views, Starts, Move 1 Success, and Completions per sprint
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 block"></span>
                <span className="text-[9px] font-black text-gray-500 uppercase">Views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 block"></span>
                <span className="text-[9px] font-black text-gray-500 uppercase">Starts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 block"></span>
                <span className="text-[9px] font-black text-gray-500 uppercase">Move 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                <span className="text-[9px] font-black text-gray-500 uppercase">Done</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[280px] overflow-x-auto overflow-y-hidden scrollbar-hidden">
            <div className="h-full min-w-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSprintsChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barSize={10}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={8} 
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomSprintBarTooltip />} cursor={{ fill: 'rgba(229, 231, 235, 0.2)' }} />
                  <Bar name="Views" dataKey="views" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar name="Starts" dataKey="starts" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  <Bar name="Move 1" dataKey="move1" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar name="Completions" dataKey="completions" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right mt-2">
            Showing top {Math.min(8, filteredSprints.length)} active sprints
          </p>
        </div>

      </section>

      {/* FILTER CONTROLS BAR */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search sprint by title, category, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 text-xs rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-gray-400 font-medium"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <CustomSelect 
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map(c => ({ value: c, label: c }))
                ]}
                className="w-40"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <CustomSelect 
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'views', label: 'Sort: Most Views' },
                { value: 'starts', label: 'Sort: Most Starts' },
                { value: 'move1', label: 'Sort: Most Move 1' },
                { value: 'completions', label: 'Sort: Most Completions' },
                { value: 'conversion', label: 'Sort: Highest Conversion' },
                { value: 'title', label: 'Sort: Title (A-Z)' }
              ]}
              className="w-48"
            />
          </div>
        </div>

      </section>

      {/* SPRINT ANALYTICS TABLE */}
      <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Details</th>
                <th className="px-6 py-5 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center">Description Views</th>
                <th className="px-6 py-5 text-[9px] font-black text-purple-600 uppercase tracking-widest text-center">Preview Starts</th>
                <th className="px-6 py-5 text-[9px] font-black text-amber-600 uppercase tracking-widest text-center">Move 1 Success</th>
                <th className="px-6 py-5 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">Sprint Completion</th>
                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Funnel Drop-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSprints.length > 0 ? (
                filteredSprints.map((sprint, idx) => {
                  const m = metricsBySprint[sprint.id] || {
                    descriptionViews: 0,
                    previewStarts: 0,
                    move1Success: 0,
                    sprintCompletions: 0
                  };

                  const startRate = m.descriptionViews > 0 
                    ? Math.round((m.previewStarts / m.descriptionViews) * 100) 
                    : (m.previewStarts > 0 ? 100 : 0);

                  const move1Rate = m.previewStarts > 0 
                    ? Math.round((m.move1Success / m.previewStarts) * 100) 
                    : (m.move1Success > 0 ? 100 : 0);

                  const compRate = m.move1Success > 0 
                    ? Math.round((m.sprintCompletions / m.move1Success) * 100) 
                    : (m.sprintCompletions > 0 ? 100 : 0);

                  const fullFunnelRate = m.descriptionViews > 0 
                    ? Math.round((m.sprintCompletions / m.descriptionViews) * 100) 
                    : (m.sprintCompletions > 0 ? 100 : 0);

                  return (
                    <tr key={sprint.id} className="hover:bg-primary/[0.015] transition-colors">
                      
                      {/* Sprint Name & Metadata */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 max-w-xs md:max-w-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900 truncate block hover:text-primary transition-colors" title={sprint.title}>
                                {sprint.title || 'Untitled Sprint'}
                              </span>
                              {sprint.category && (
                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 shrink-0">
                                  {sprint.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">
                                ID: {sprint.id.substring(0, 12)}...
                              </span>
                              {sprint.duration && (
                                <span className="text-[10px] text-gray-400">
                                  • {sprint.duration} Moves
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 1. Sprint Description Views */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-gray-900 bg-blue-50/70 border border-blue-100/60 px-3 py-1 rounded-xl">
                            {m.descriptionViews.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 mt-0.5">
                            {totals.totalViews > 0 ? `${Math.round((m.descriptionViews / totals.totalViews) * 100)}% of views` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Sprint Preview Starts */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-purple-700 bg-purple-50/70 border border-purple-100/60 px-3 py-1 rounded-xl">
                            {m.previewStarts.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-purple-600 mt-0.5">
                            {startRate}% of views
                          </span>
                        </div>
                      </td>

                      {/* 3. Move 1 Success Page */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-amber-700 bg-amber-50/70 border border-amber-100/60 px-3 py-1 rounded-xl">
                            {m.move1Success.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-amber-600 mt-0.5">
                            {move1Rate}% of starts
                          </span>
                        </div>
                      </td>

                      {/* 4. Sprint Completion */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
                            {m.sprintCompletions.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 mt-0.5">
                            {compRate}% of Move 1
                          </span>
                        </div>
                      </td>

                      {/* Funnel Progress Visual */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs font-black font-mono text-gray-800">
                            {fullFunnelRate}% Total
                          </span>
                          <div className="w-28 bg-gray-100 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-blue-500 h-full" 
                              style={{ width: `${Math.min(100, (m.descriptionViews > 0 ? 100 : 0) * 0.25)}%` }}
                              title={`Views: ${m.descriptionViews}`}
                            />
                            <div 
                              className="bg-purple-500 h-full" 
                              style={{ width: `${Math.min(100, (startRate / 100) * 25)}%` }}
                              title={`Starts: ${m.previewStarts}`}
                            />
                            <div 
                              className="bg-amber-500 h-full" 
                              style={{ width: `${Math.min(100, (move1Rate / 100) * 25)}%` }}
                              title={`Move 1: ${m.move1Success}`}
                            />
                            <div 
                              className="bg-emerald-500 h-full" 
                              style={{ width: `${Math.min(100, (compRate / 100) * 25)}%` }}
                              title={`Completions: ${m.sprintCompletions}`}
                            />
                          </div>
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                      No sprints matched your search query.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};

export default AdminSprintAnalytics;
