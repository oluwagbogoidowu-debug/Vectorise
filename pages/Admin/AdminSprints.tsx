import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, Flame, BookOpen, Sparkles, Info, Settings, Share2, Link2, Check, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { adminCache } from './adminCache';
import SprintReviewsModal from '../../components/SprintReviewsModal';
import {
  LaunchConfigModal,
  LaunchConfigPayload,
  GoingLiveSetupFields,
  defaultLaunchIsoDate,
  validateLaunchConfig,
} from '../../components/LaunchConfigModal';
import { getRemainingSlots } from '../../services/launchService';
import {
  DEFAULT_REFERRAL_SHARE_TEXT,
  subscribeAdminSprintSettings,
  saveAdminSprintSettings,
  composeReferralShareMessage,
} from '../../utils/referralShare';

type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

const AdminSprints: React.FC = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sprint' | 'blog' | 'ignite' | 'settings'>('sprint');
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reviewSprint, setReviewSprint] = useState<Sprint | null>(null);
  const [launchConfigSprint, setLaunchConfigSprint] = useState<Sprint | null>(null);
  const [selectedSettingsSprintId, setSelectedSettingsSprintId] = useState<string>('');
  const [inlineLaunchConfig, setInlineLaunchConfig] = useState<LaunchConfigPayload>({
    isComingSoon: false,
    launchDate: defaultLaunchIsoDate(),
    preRegistrationEnabled: false,
    hasLimitedSlots: false,
    slotLimit: 50,
  });
  const [inlineLaunchError, setInlineLaunchError] = useState<string>('');
  const [isSavingInlineLaunch, setIsSavingInlineLaunch] = useState(false);
  const [inlineLaunchSaved, setInlineLaunchSaved] = useState(false);
  const [referralShareText, setReferralShareText] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (adminCache.sprints && adminCache.sprints.length > 0) {
      setSprints(adminCache.sprints);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    
    const unsubscribe = sprintService.subscribeToAdminSprints((data) => {
      setSprints(data);
      adminCache.sprints = data;
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminSprintSettings((settings) => {
      if (settings.referralShareText !== undefined) {
        setReferralShareText(settings.referralShareText);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectableSprintsForLaunch = useMemo(
    () => sprints.filter((s) => !s.contentType || s.contentType === 'sprint'),
    [sprints]
  );

  const selectedSettingsSprint = useMemo(
    () => selectableSprintsForLaunch.find((s) => s.id === selectedSettingsSprintId) || selectableSprintsForLaunch[0] || null,
    [selectableSprintsForLaunch, selectedSettingsSprintId]
  );

  useEffect(() => {
    if (!selectedSettingsSprintId && selectableSprintsForLaunch.length > 0) {
      setSelectedSettingsSprintId(selectableSprintsForLaunch[0].id);
    }
  }, [selectableSprintsForLaunch, selectedSettingsSprintId]);

  useEffect(() => {
    if (!selectedSettingsSprint) return;
    setInlineLaunchConfig({
      isComingSoon: Boolean(selectedSettingsSprint.isComingSoon),
      launchDate: selectedSettingsSprint.launchDate || defaultLaunchIsoDate(),
      preRegistrationEnabled: Boolean(selectedSettingsSprint.preRegistrationEnabled),
      hasLimitedSlots: Boolean(selectedSettingsSprint.hasLimitedSlots),
      slotLimit:
        selectedSettingsSprint.slotLimit && Number(selectedSettingsSprint.slotLimit) > 0
          ? Number(selectedSettingsSprint.slotLimit)
          : 50,
    });
    setInlineLaunchError('');
  }, [selectedSettingsSprint?.id]);

  const handleSaveInlineLaunchSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSettingsSprint) return;
    const validationErr = validateLaunchConfig(inlineLaunchConfig);
    if (validationErr) {
      setInlineLaunchError(validationErr);
      return;
    }

    setInlineLaunchError('');
    setIsSavingInlineLaunch(true);
    setInlineLaunchSaved(false);
    try {
      const payload: LaunchConfigPayload = {
        isComingSoon: inlineLaunchConfig.isComingSoon,
        launchDate: inlineLaunchConfig.launchDate,
        preRegistrationEnabled: inlineLaunchConfig.isComingSoon
          ? inlineLaunchConfig.preRegistrationEnabled
          : false,
        hasLimitedSlots:
          inlineLaunchConfig.isComingSoon && inlineLaunchConfig.preRegistrationEnabled
            ? inlineLaunchConfig.hasLimitedSlots
            : false,
        slotLimit:
          inlineLaunchConfig.isComingSoon &&
          inlineLaunchConfig.preRegistrationEnabled &&
          inlineLaunchConfig.hasLimitedSlots
            ? inlineLaunchConfig.slotLimit
            : null,
      };
      await sprintService.updateSprint(selectedSettingsSprint.id, payload);
      const updated = sprints.map((item) =>
        item.id === selectedSettingsSprint.id ? { ...item, ...payload } : item
      );
      setSprints(updated);
      adminCache.sprints = updated;
      setInlineLaunchSaved(true);
      toast.success(
        payload.isComingSoon
          ? `${selectedSettingsSprint.title} set to Going Live Soon`
          : `${selectedSettingsSprint.title} updated to standard launch mode`
      );
      setTimeout(() => setInlineLaunchSaved(false), 2500);
    } catch (err: any) {
      console.error('Failed saving inline sprint launch setup:', err);
      setInlineLaunchError(err?.message || 'Failed to save Going Live setup.');
      toast.error('Failed to save Going Live setup');
    } finally {
      setIsSavingInlineLaunch(false);
    }
  };

  const handleSaveSprintSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaved(false);
    try {
      await saveAdminSprintSettings({
        referralShareText: referralShareText.trim(),
      });
      setSettingsSaved(true);
      toast.success('Sprint referral text saved');
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      console.error('Error saving admin sprint settings:', err);
      toast.error('Failed to save sprint settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInsertToken = (token: string) => {
    setReferralShareText((prev) => {
      const trimmedEnd = prev.replace(/\s+$/, '');
      if (!trimmedEnd) return token;
      return `${trimmedEnd} ${token}`;
    });
  };

  const filteredSprints = useMemo(() => {
    let tFiltered = sprints.filter(s => {
      if (activeTab === 'sprint') {
        return !s.contentType || s.contentType === 'sprint';
      }
      return s.contentType === activeTab;
    });

    let filtered: Sprint[] = [];
    switch (sprintFilter) {
      case 'active':
        filtered = tFiltered.filter(s => s.approvalStatus === 'approved');
        break;
      case 'core':
        filtered = tFiltered.filter(s => 
          s.sprintType === 'Foundational' || 
          s.sprintType === 'Fundamentals' || 
          s.sprintType === 'Core' || 
          s.sprintType === 'Expert' || 
          s.category === 'Core Platform Sprint' || 
          s.category === 'Growth Fundamentals'
        );
        break;
      case 'pending':
        filtered = tFiltered.filter(s => s.approvalStatus === 'pending_approval');
        break;
      case 'rejected':
        filtered = tFiltered.filter(s => s.approvalStatus === 'rejected');
        break;
      default:
        filtered = tFiltered;
        break;
    }

    return [...filtered].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [sprints, sprintFilter, activeTab]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await sprintService.deleteSprint(deletingId);
      toast.success("Sprint deleted successfully");
      const updatedSprints = sprints.filter(s => s.id !== deletingId);
      setSprints(updatedSprints);
      adminCache.sprints = updatedSprints;
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting sprint:", error);
      toast.error("Failed to delete sprint");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (sprint: Sprint) => {
    const newPublished = !sprint.published;
    // OPTIMISTIC UPDATE: Update state immediately with zero delay
    const updatedSprints = sprints.map(s => s.id === sprint.id ? { ...s, published: newPublished } : s);
    setSprints(updatedSprints);
    adminCache.sprints = updatedSprints;

    try {
      await sprintService.updateSprint(sprint.id, { published: newPublished });
      toast.success(`${sprint.title} is now ${newPublished ? 'ON (Published)' : 'OFF (Hidden)'}`);
    } catch (error) {
      console.error("Error toggling publish state:", error);
      // Revert on failure
      const reverted = sprints.map(s => s.id === sprint.id ? { ...s, published: sprint.published } : s);
      setSprints(reverted);
      adminCache.sprints = reverted;
      toast.error("Failed to update status");
    }
  };

  const handleToggleBlogLive = async (sprint: Sprint) => {
    const isLive = sprint.approvalStatus === 'approved';
    const newStatus: any = isLive ? 'pending_approval' : 'approved';
    // OPTIMISTIC UPDATE: Update state immediately with zero delay
    const updatedSprints = sprints.map(s => s.id === sprint.id ? { ...s, approvalStatus: newStatus } : s);
    setSprints(updatedSprints);
    adminCache.sprints = updatedSprints;

    try {
      await sprintService.updateSprint(sprint.id, { approvalStatus: newStatus });
      toast.success(`${sprint.title} is now ${newStatus === 'approved' ? 'LIVE' : 'NOT LIVE (Hidden)'}`);
    } catch (error) {
      console.error("Error toggling blog status:", error);
      // Revert on failure
      const reverted = sprints.map(s => s.id === sprint.id ? { ...s, approvalStatus: sprint.approvalStatus } : s);
      setSprints(reverted);
      adminCache.sprints = reverted;
      toast.error("Failed to update status");
    }
  };

  const handleSaveLaunchConfig = async (config: LaunchConfigPayload) => {
    if (!launchConfigSprint) return;
    await sprintService.updateSprint(launchConfigSprint.id, {
      isComingSoon: config.isComingSoon,
      launchDate: config.launchDate,
      preRegistrationEnabled: config.preRegistrationEnabled,
      hasLimitedSlots: config.hasLimitedSlots,
      slotLimit: config.slotLimit,
    });
    const updated = sprints.map((item) =>
      item.id === launchConfigSprint.id ? { ...item, ...config } : item
    );
    setSprints(updated);
    adminCache.sprints = updated;
    toast.success(
      config.isComingSoon
        ? `${launchConfigSprint.title} set to Going Live Soon`
        : `${launchConfigSprint.title} is back to standard launch mode`
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 relative">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight italic">Delete Sprint?</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{sprints.find(s => s.id === deletingId)?.title}"</span>? 
              This will remove the sprint and clean up its references in tracks and orchestration.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Delete Sprint'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tabbed Interface Selector (Sprint, RiseBlog, Ignite) */}
      <div className="flex justify-start">
        <div className="inline-flex bg-gray-100 p-1 rounded-2xl gap-0.5">
            <button
                type="button"
                onClick={() => {
                    setActiveTab('sprint');
                    setSprintFilter('all');
                }}
                className={`flex flex-col items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'sprint' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Flame className="w-3.5 h-3.5" />
                <span>Sprint</span>
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('blog');
                    setSprintFilter('all');
                }}
                className={`flex flex-col items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'blog' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <BookOpen className="w-3.5 h-3.5" />
                <span>RiseBlog</span>
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('ignite');
                    setSprintFilter('all');
                }}
                className={`flex flex-col items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'ignite' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ignite</span>
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('settings');
                }}
                className={`flex flex-col items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Settings className="w-3.5 h-3.5" />
                <span>Sprint Settings</span>
            </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-8 max-w-3xl">
        <form
          onSubmit={handleSaveSprintSettings}
          className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                <Share2 className="w-3 h-3" />
                <span>Referral Sharing</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Sprint Settings
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Write the referral message participants share when inviting a friend. Their unique sprint referral link is automatically injected with this text as they share it.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="admin-referral-share-text"
                className="text-[10px] font-black text-gray-500 uppercase tracking-widest"
              >
                Referral Share Text
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertToken('{sprintTitle}')}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 text-gray-600 hover:text-primary text-[10px] font-bold transition-colors cursor-pointer"
                >
                  + {'{sprintTitle}'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('{link}')}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 text-gray-600 hover:text-primary text-[10px] font-bold transition-colors cursor-pointer"
                >
                  + {'{link}'}
                </button>
              </div>
            </div>

            <textarea
              id="admin-referral-share-text"
              rows={4}
              value={referralShareText}
              onChange={(e) => setReferralShareText(e.target.value)}
              placeholder={DEFAULT_REFERRAL_SHARE_TEXT}
              className="w-full px-4 py-3.5 bg-gray-50/60 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y"
            />

            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Optional placeholders: <code className="text-gray-600 font-semibold">{'{sprintTitle}'}</code> inserts the completed sprint&apos;s title, and <code className="text-gray-600 font-semibold">{'{link}'}</code> places the referral URL inline. If <code className="text-gray-600 font-semibold">{'{link}'}</code> is omitted, the referral link is automatically appended below your text.
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0E7850]">
              <Link2 className="w-3.5 h-3.5" />
              <span>Share Preview (With Injected Link)</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-800 font-medium whitespace-pre-wrap leading-relaxed break-words">
              {
                composeReferralShareMessage({
                  templateText: referralShareText,
                  sprintTitle:
                    sprints.find((s) => !s.contentType || s.contentType === 'sprint')?.title ||
                    'Audit Your Year',
                  shareUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://vectorise.app'}/sprint/${
                    sprints.find((s) => !s.contentType || s.contentType === 'sprint')?.id || 'sprint-id'
                  }?ref=USERCODE`,
                }).textWithLink
              }
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSavingSettings}
              className="px-7 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              {settingsSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </>
              ) : (
                <span>{isSavingSettings ? 'Saving...' : 'Save Sprint Settings'}</span>
              )}
            </Button>
          </div>
        </form>

        {/* Going Live Setup Section inside Sprint Settings */}
        <form
          onSubmit={handleSaveInlineLaunchSetup}
          className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0E7850] border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                <CalendarClock className="w-3 h-3" />
                <span>Launch Countdown &amp; Pre-Registration</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Going Live Setup
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Select a sprint to configure its Coming Soon countdown timer, Show Interest notifications, and Reserve My Spot capacity limits.
              </p>
            </div>
          </div>

          {selectableSprintsForLaunch.length === 0 ? (
            <p className="text-xs text-gray-400 font-bold py-4">No sprints available yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="admin-sprint-launch-selector"
                  className="text-[10px] font-black text-gray-500 uppercase tracking-widest block"
                >
                  Select Sprint
                </label>
                <select
                  id="admin-sprint-launch-selector"
                  value={selectedSettingsSprint?.id || ''}
                  onChange={(e) => setSelectedSettingsSprintId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-[#0E7850] focus:ring-2 focus:ring-[#0E7850]/15 outline-none"
                >
                  {selectableSprintsForLaunch.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.title}
                      {sp.isComingSoon ? ' (Going Live Soon)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSettingsSprint && (
                <GoingLiveSetupFields
                  value={inlineLaunchConfig}
                  onChange={setInlineLaunchConfig}
                  interestCount={selectedSettingsSprint.interestCount || 0}
                  reservedCount={selectedSettingsSprint.reservedCount || 0}
                  showStats={true}
                />
              )}

              {inlineLaunchError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                  {inlineLaunchError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSavingInlineLaunch || !selectedSettingsSprint}
                  className="px-7 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  {inlineLaunchSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>{isSavingInlineLaunch ? 'Saving...' : 'Save Going Live Setup'}</span>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
        </div>
      ) : (
      <>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50">
        {['all', 'active', 'core', 'pending', 'rejected'].map(f => (
          <button key={f} onClick={() => setSprintFilter(f as SprintFilter)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${sprintFilter === f ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'}`}>{f.replace('_', ' ')}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredSprints.map(s => (
          <div key={s.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 hover:shadow-md transition-all">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 shadow-sm"><img src={s.blogImage || s.coverImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'} className="w-full h-full object-cover" alt="" /></div>
            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <h3 className="font-black text-gray-900 text-lg tracking-tight line-clamp-2 break-words">{s.title}</h3>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.duration} Days</span>
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.category}</span>
                <span className={`px-2 py-1 rounded-lg ${s.approvalStatus === 'approved' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'}`}>{s.approvalStatus.replace('_', ' ')}</span>
                {s.isComingSoon && (
                  <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70">
                    Going Live Soon
                  </span>
                )}
                {s.isComingSoon && getRemainingSlots(s) !== null && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-[#0E7850] border border-emerald-200/70">
                    {getRemainingSlots(s)} slots left
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'blog' && (
                <div className="flex items-center gap-2 border-r border-gray-150 pr-4 mr-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${s.approvalStatus === 'approved' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.approvalStatus === 'approved' ? 'LIVE' : 'HIDDEN'}
                  </span>
                  <button
                    onClick={() => handleToggleBlogLive(s)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      s.approvalStatus === 'approved' ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                    title={s.approvalStatus === 'approved' ? "Hide Blog" : "Make Blog Live"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        s.approvalStatus === 'approved' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              {activeTab === 'ignite' && (
                <div className="flex items-center gap-2 border-r border-gray-150 pr-4 mr-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${s.published ? 'text-emerald-600' : 'text-gray-405'}`}>
                    {s.published ? 'ON' : 'OFF'}
                  </span>
                  <button
                    onClick={() => handleTogglePublish(s)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      s.published ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                    title={s.published ? "Turn Off" : "Turn On"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        s.published ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setLaunchConfigSprint(s)}
                className={`p-3 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                  s.isComingSoon
                    ? 'bg-emerald-50 border-emerald-200 text-[#0E7850] hover:bg-emerald-100'
                    : 'bg-white border-gray-100 text-gray-400 hover:text-[#0E7850] hover:bg-emerald-50/60'
                }`}
                title="Going Live Soon & Countdown Settings"
                aria-label="Going Live Soon Settings"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setReviewSprint(s)}
                className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:bg-emerald-50/60 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="View Completion Reviews"
                aria-label="View Reviews"
              >
                <Info className="w-4 h-4" />
              </button>
              <Link to={`/coach/sprint/edit/${s.id}`}><button className="px-8 py-3 bg-white border border-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all">Edit</button></Link>
              <button 
                onClick={() => setDeletingId(s.id)}
                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Delete Sprint"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* Full Bleed Reviews Modal */}
      <SprintReviewsModal
        isOpen={reviewSprint !== null}
        sprint={reviewSprint}
        onClose={() => setReviewSprint(null)}
      />

      {/* Going Live Soon Configuration Modal */}
      <LaunchConfigModal
        isOpen={launchConfigSprint !== null}
        item={launchConfigSprint}
        itemType="sprint"
        onClose={() => setLaunchConfigSprint(null)}
        onSave={handleSaveLaunchConfig}
      />
    </div>
  );
};

export default AdminSprints;
