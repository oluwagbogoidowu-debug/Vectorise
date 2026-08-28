import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PushToggle } from '../../../components/PushToggle';
import { Clock, Check, Plus, Trash2, Volume2, Vibrate, Bell, ArrowLeft } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import { getHapticSettings, setHapticSettings, getSoundSettings, setSoundSettings, triggerHaptic, hapticPatterns } from '../../../utils/haptics';
import { localNotificationScheduler, SprintReminderConfig } from '../../../services/localNotificationScheduler';
import { sprintService } from '../../../services/sprintService';
import { Sprint } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { toast } from 'sonner';

const SprintSettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSprintId = searchParams.get('sprintId');
  const { user } = useAuth();

  const [soundEnabled, setSoundEnabled] = useState(() => getSoundSettings());
  const [hapticsEnabled, setHapticsEnabled] = useState(() => getHapticSettings());

  const [activeSprints, setActiveSprints] = useState<Sprint[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [loadingSprints, setLoadingSprints] = useState(true);

  // Local notification scheduler state
  const [reminderConfig, setReminderConfig] = useState<SprintReminderConfig & { id?: string }>({
    sprintId: '',
    sprintTitle: '',
    enabled: false,
    dailyTime: '09:00',
    taskReminders: {}
  });

  const [selectedOverrideDay, setSelectedOverrideDay] = useState<number>(1);
  const [selectedOverrideTime, setSelectedOverrideTime] = useState<string>('12:00');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const isSystemAuthorized = permissionGranted && (user ? !(user as any).notificationsDisabled : true);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    setSoundSettings(nextVal);
    toast.success(nextVal ? "Completion sound enabled" : "Completion sound muted");
  };

  const toggleHaptics = () => {
    const nextVal = !hapticsEnabled;
    setHapticsEnabled(nextVal);
    setHapticSettings(nextVal);
    if (nextVal) triggerHaptic(hapticPatterns.light);
    toast.success(nextVal ? "Vibration feedback enabled" : "Vibration feedback disabled");
  };

  // Fetch active sprints for user
  useEffect(() => {
    let isMounted = true;
    const loadUserSprints = async () => {
      try {
        if (!user?.id) {
          setLoadingSprints(false);
          return;
        }
        const fetchedEnrollments = await sprintService.getUserEnrollments(user.id);
        const sprintIds = fetchedEnrollments.map(e => (e as any).sprintId || e.sprint_id).filter(Boolean);
        
        if (sprintIds.length === 0) {
          if (isMounted) setLoadingSprints(false);
          return;
        }

        const sprints = await Promise.all(sprintIds.map(id => sprintService.getSprintById(id)));
        const validSprints = sprints.filter((s): s is Sprint => s !== null);

        if (isMounted) {
          setEnrollments(fetchedEnrollments);
          setActiveSprints(validSprints);
          // Match URL sprintId if present, else pick first valid sprint
          const matched = validSprints.find(s => s.id === urlSprintId) || validSprints[0] || null;
          setSelectedSprint(matched);
          setLoadingSprints(false);
        }
      } catch (err) {
        console.error("Error loading sprints for settings:", err);
        if (isMounted) setLoadingSprints(false);
      }
    };

    loadUserSprints();
    return () => { isMounted = false; };
  }, [user?.id, urlSprintId]);

  // Sync reminder config whenever selectedSprint changes
  useEffect(() => {
    if (selectedSprint) {
      const enr = enrollments.find(e => (e as any).sprintId === selectedSprint.id || e.sprint_id === selectedSprint.id);
      const saved = (enr as any)?.reminderConfig || localNotificationScheduler.getConfig(selectedSprint.id) || {
        sprintId: selectedSprint.id,
        sprintTitle: selectedSprint.title,
        enabled: false,
        dailyTime: '09:00',
        taskReminders: {}
      };
      setReminderConfig(saved);
      setPermissionGranted(localNotificationScheduler.hasNotificationPermission());
    }
  }, [selectedSprint, enrollments]);

  const handleToggleReminders = () => {
    if (!selectedSprint) return;
    const nextState = !reminderConfig.enabled;
    const updated = { ...reminderConfig, sprintId: selectedSprint.id, sprintTitle: selectedSprint.title, enabled: nextState };
    setReminderConfig(updated);
    const enr = enrollments.find(e => (e as any).sprintId === selectedSprint.id || e.sprint_id === selectedSprint.id);
    localNotificationScheduler.saveConfig(updated, user?.id, enr?.id);
    toast.success(nextState ? 'Task reminders enabled!' : 'Task reminders disabled.');
  };

  const handleUpdateDailyTime = (newTime: string) => {
    if (!selectedSprint) return;
    const updated = { ...reminderConfig, sprintId: selectedSprint.id, sprintTitle: selectedSprint.title, dailyTime: newTime };
    setReminderConfig(updated);
    const enr = enrollments.find(e => (e as any).sprintId === selectedSprint.id || e.sprint_id === selectedSprint.id);
    localNotificationScheduler.saveConfig(updated, user?.id, enr?.id);
  };

  const handleAddOverride = () => {
    if (!selectedSprint) return;
    const updatedTasks = { ...reminderConfig.taskReminders };
    updatedTasks[selectedOverrideDay] = selectedOverrideTime;

    const updated = { ...reminderConfig, sprintId: selectedSprint.id, sprintTitle: selectedSprint.title, taskReminders: updatedTasks };
    setReminderConfig(updated);
    const enr = enrollments.find(e => (e as any).sprintId === selectedSprint.id || e.sprint_id === selectedSprint.id);
    localNotificationScheduler.saveConfig(updated, user?.id, enr?.id);
    toast.success(`Custom reminder set to ${selectedOverrideTime} for Day ${selectedOverrideDay}!`);
  };

  const handleRemoveOverride = (dayNum: number) => {
    if (!selectedSprint) return;
    const updatedTasks = { ...reminderConfig.taskReminders };
    delete updatedTasks[dayNum];

    const updated = { ...reminderConfig, sprintId: selectedSprint.id, sprintTitle: selectedSprint.title, taskReminders: updatedTasks };
    setReminderConfig(updated);
    const enr = enrollments.find(e => (e as any).sprintId === selectedSprint.id || e.sprint_id === selectedSprint.id);
    localNotificationScheduler.saveConfig(updated, user?.id, enr?.id);
    toast.info(`Removed custom reminder for Day ${dayNum}.`);
  };

  const handleRequestPermission = async () => {
    const granted = await localNotificationScheduler.requestNotificationPermission();
    setPermissionGranted(granted);
    if (user && user.id) {
      try {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, { notificationsDisabled: false });
      } catch (err) {
        console.error("Failed to update user notificationsDisabled state in DB:", err);
      }
    }
    if (granted) {
      toast.success('System reminders unlocked successfully!');
    } else {
      toast.error('Could not request permission. Ensure browser redirects or blocks are cleared.');
    }
  };

  const durationDays = selectedSprint?.duration || 7;

  return (
    <div className="bg-[#FDFDFD] dark:bg-[#121111] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in transition-colors duration-300">
      <header className="bg-white dark:bg-zinc-900 px-6 pt-12 pb-6 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Sprint Settings</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {/* General Interactive Feedback Section */}
        <div className="space-y-3">
          <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] px-1">Audio & Haptics</p>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg text-primary">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest block">Completion Sound</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </div>
            </div>
            
            <button 
              onClick={toggleSound}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer ${soundEnabled ? "bg-[#0E7850] shadow-lg shadow-[#0E7850]/20" : "bg-gray-200 dark:bg-zinc-700"}`}
            >
              <div 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${soundEnabled ? "right-1" : "left-1"}`}
              />
            </button>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg text-primary">
                <Vibrate className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest block">Vibration Feedback</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{hapticsEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            
            <button 
              onClick={toggleHaptics}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer ${hapticsEnabled ? "bg-[#0E7850] shadow-lg shadow-[#0E7850]/20" : "bg-gray-200 dark:bg-zinc-700"}`}
            >
              <div 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${hapticsEnabled ? "right-1" : "left-1"}`}
              />
            </button>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
            <PushToggle 
              label="Unlock Push Notifications"
              showSubLabel={true}
              labelClassName="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Local Task Scheduler Section */}
        <div className="space-y-3 pt-2">
          <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] px-1">Task Reminders & Scheduler</p>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
            {loadingSprints ? (
              <div className="py-6 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : activeSprints.length > 0 ? (
              <>
                {activeSprints.length > 1 && (
                  <div className="space-y-1.5 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Select Sprint</label>
                    <CustomSelect
                      options={activeSprints.map(s => ({ value: s.id, label: s.title }))}
                      value={selectedSprint?.id || ''}
                      onChange={(val) => {
                        const found = activeSprints.find(s => s.id === val);
                        if (found) setSelectedSprint(found);
                      }}
                    />
                  </div>
                )}

                {selectedSprint && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-[#0E7850]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide">{selectedSprint.title}</h4>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{selectedSprint.duration || 7}-Day Guided Sprint</p>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-3">
                      {/* Enable Toggle */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Enable Task Reminders</span>
                        <button
                          onClick={handleToggleReminders}
                          className={`w-10 h-5 rounded-full transition-all duration-300 relative cursor-pointer ${reminderConfig.enabled ? "bg-[#0E7850]" : "bg-gray-200 dark:bg-zinc-700"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${reminderConfig.enabled ? "right-0.5" : "left-0.5"}`}
                          />
                        </button>
                      </div>

                      {reminderConfig.enabled && (
                        <div className="space-y-4 pt-1 animate-fade-in">
                          {/* System Permission Status */}
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">System Reminders</span>
                            {isSystemAuthorized ? (
                              <span className="text-[8px] font-black uppercase text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Authorized
                              </span>
                            ) : (
                              <button
                                onClick={handleRequestPermission}
                                className="text-[9px] font-black uppercase text-[#0E7850] dark:text-emerald-400 hover:text-[#0b5d3e] p-1 px-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 transition-all cursor-pointer"
                              >
                                Authorize
                              </button>
                            )}
                          </div>

                          {/* Daily Default Time */}
                          <div className="flex items-center justify-between pb-2">
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Daily Time</span>
                            <input
                              type="time"
                              value={reminderConfig.dailyTime}
                              onChange={(e) => handleUpdateDailyTime(e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none w-24 text-center focus:border-[#0E7850]"
                            />
                          </div>

                          {/* Override Add Form */}
                          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Set Custom Time Per Day</span>
                            
                            <div className="flex items-center gap-2">
                              <CustomSelect
                                value={selectedOverrideDay}
                                onChange={(val) => setSelectedOverrideDay(Number(val))}
                                options={Array.from({ length: durationDays }).map((_, i) => ({ value: i + 1, label: `Day ${i + 1}` }))}
                                className="flex-1 min-w-[90px]"
                              />

                              <input
                                type="time"
                                value={selectedOverrideTime}
                                onChange={(e) => setSelectedOverrideTime(e.target.value)}
                                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-2 py-1 text-[10px] font-bold text-gray-800 dark:text-gray-100 outline-none w-20 text-center"
                              />

                              <button
                                onClick={handleAddOverride}
                                className="p-2 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title="Add Daily Override"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Existing Overrides List */}
                          {Object.keys(reminderConfig.taskReminders).length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Configured Day Reminders</span>
                              {Object.entries(reminderConfig.taskReminders)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([dayNum, time]) => (
                                  <div key={dayNum} className="flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Day {dayNum} task</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black text-[#0E7850] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">{time}</span>
                                      <button
                                        onClick={() => handleRemoveOverride(Number(dayNum))}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                        title="Delete reminder settings"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-4 text-center text-gray-400 dark:text-gray-500">
                <p className="text-xs font-bold uppercase tracking-wide">No Active Sprint Enrolled</p>
                <p className="text-[9px] mt-0.5">Enroll in a sprint to configure custom day task reminders.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SprintSettings;
