import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Users, Sparkles, Bell, TicketCheck } from 'lucide-react';
import { LaunchControllable, getRemainingSlots } from '../services/launchService';

export interface LaunchConfigPayload {
  isComingSoon: boolean;
  launchDate: string;
  preRegistrationEnabled: boolean;
  hasLimitedSlots: boolean;
  slotLimit: number | null;
}

export function isoToDatetimeLocal(iso?: string): string {
  if (!iso) {
    return '';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function defaultLaunchIsoDate(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function datetimeLocalToIso(localVal: string): string {
  if (!localVal) return '';
  const parsed = new Date(localVal);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

export function validateLaunchConfig(config: LaunchConfigPayload): string | null {
  if (!config.isComingSoon) return null;
  if (!config.launchDate) {
    return 'Please select a target launch date and time for the countdown.';
  }
  const parsed = new Date(config.launchDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid launch date & time.';
  }
  if (config.preRegistrationEnabled && config.hasLimitedSlots) {
    const n = Number(config.slotLimit);
    if (!Number.isFinite(n) || n <= 0) {
      return 'Slot limit must be greater than 0 when capacity is limited.';
    }
  }
  return null;
}

interface GoingLiveSetupFieldsProps {
  value: LaunchConfigPayload;
  onChange: (next: LaunchConfigPayload) => void;
  interestCount?: number;
  reservedCount?: number;
  showStats?: boolean;
}

export const GoingLiveSetupFields: React.FC<GoingLiveSetupFieldsProps> = ({
  value,
  onChange,
  interestCount = 0,
  reservedCount = 0,
  showStats = true,
}) => {
  const remaining = getRemainingSlots({
    id: '',
    hasLimitedSlots: value.hasLimitedSlots,
    slotLimit: value.slotLimit,
    reservedCount,
  });

  const localInputValue = isoToDatetimeLocal(value.launchDate || (value.isComingSoon ? defaultLaunchIsoDate() : ''));

  const handleToggleComingSoon = () => {
    const nextComingSoon = !value.isComingSoon;
    onChange({
      ...value,
      isComingSoon: nextComingSoon,
      launchDate: nextComingSoon ? (value.launchDate || defaultLaunchIsoDate()) : value.launchDate,
      preRegistrationEnabled: nextComingSoon ? value.preRegistrationEnabled : false,
      hasLimitedSlots: nextComingSoon ? value.hasLimitedSlots : false,
    });
  };

  return (
    <div className="space-y-4">
      {showStats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <Bell className="w-4 h-4 text-[#0E7850] shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Interests
              </p>
              <p className="text-base font-black text-gray-900 tabular-nums">
                {interestCount}
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <TicketCheck className="w-4 h-4 text-[#0E7850] shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Reserved Spots
              </p>
              <p className="text-base font-black text-gray-900 tabular-nums">
                {reservedCount}
                {remaining !== null && (
                  <span className="text-[11px] font-bold text-[#0E7850] ml-1.5">
                    ({remaining} left)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle 1: Going Live Soon */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0E7850]" />
            Going Live Soon Mode
          </p>
          <p className="text-xs text-gray-500 font-medium">
            Replaces the Start action with a launch countdown, Show Interest, and optional spot reservation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleComingSoon}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            value.isComingSoon ? 'bg-[#0E7850]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
              value.isComingSoon ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {value.isComingSoon && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Target Launch Date/Time */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              Countdown Target Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={localInputValue}
              onChange={(e) =>
                onChange({
                  ...value,
                  launchDate: datetimeLocalToIso(e.target.value),
                })
              }
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-[#0E7850] focus:ring-2 focus:ring-[#0E7850]/15 outline-none"
            />
          </div>

          {/* Toggle 2: Pre-Registration (Reserve My Spot) */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-black text-gray-900">
                Enable Pre-Registration (&quot;Reserve My Spot&quot;)
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Allows users to pay &amp; reserve their spot before launch day.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  preRegistrationEnabled: !value.preRegistrationEnabled,
                  hasLimitedSlots: !value.preRegistrationEnabled ? value.hasLimitedSlots : false,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                value.preRegistrationEnabled ? 'bg-[#0E7850]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  value.preRegistrationEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Limited Slots (Only shown when pre-registration is enabled) */}
          {value.preRegistrationEnabled && (
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0E7850]" />
                    Limited Registration Slots
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Display remaining slot count only when capacity is genuinely capped.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextLimited = !value.hasLimitedSlots;
                    onChange({
                      ...value,
                      hasLimitedSlots: nextLimited,
                      slotLimit: nextLimited
                        ? (value.slotLimit && value.slotLimit > 0 ? value.slotLimit : 50)
                        : null,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    value.hasLimitedSlots ? 'bg-[#0E7850]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      value.hasLimitedSlots ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {value.hasLimitedSlots && (
                <div className="space-y-1.5 pt-2 border-t border-gray-200/70">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
                    Maximum Total Slots
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={value.slotLimit ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onChange({
                        ...value,
                        slotLimit: raw === '' ? null : Math.max(1, Math.floor(Number(raw) || 0)),
                      });
                    }}
                    placeholder="50"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 focus:border-[#0E7850] outline-none"
                  />
                  {showStats && (
                    <p className="text-[11px] font-semibold text-gray-500">
                      Reserved so far: <span className="font-bold text-gray-800">{reservedCount}</span>
                      {remaining !== null && (
                        <> &middot; Remaining shown to public: <span className="font-bold text-[#0E7850]">{remaining} left</span></>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LaunchConfigModalProps {
  isOpen: boolean;
  item: LaunchControllable | null;
  itemType: 'sprint' | 'track';
  onClose: () => void;
  onSave: (config: LaunchConfigPayload) => Promise<void>;
}

export const LaunchConfigModal: React.FC<LaunchConfigModalProps> = ({
  isOpen,
  item,
  itemType,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<LaunchConfigPayload>({
    isComingSoon: false,
    launchDate: defaultLaunchIsoDate(),
    preRegistrationEnabled: false,
    hasLimitedSlots: false,
    slotLimit: 50,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !item) return;
    setConfig({
      isComingSoon: Boolean(item.isComingSoon),
      launchDate: item.launchDate || defaultLaunchIsoDate(),
      preRegistrationEnabled: Boolean(item.preRegistrationEnabled),
      hasLimitedSlots: Boolean(item.hasLimitedSlots),
      slotLimit: item.slotLimit && Number(item.slotLimit) > 0 ? Number(item.slotLimit) : 50,
    });
    setError('');
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateLaunchConfig(config);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave({
        isComingSoon: config.isComingSoon,
        launchDate: config.launchDate,
        preRegistrationEnabled: config.isComingSoon ? config.preRegistrationEnabled : false,
        hasLimitedSlots:
          config.isComingSoon && config.preRegistrationEnabled ? config.hasLimitedSlots : false,
        slotLimit:
          config.isComingSoon && config.preRegistrationEnabled && config.hasLimitedSlots
            ? config.slotLimit
            : null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save launch settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0E7850] shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0E7850]">
                {itemType === 'track' ? 'Track Launch Setup' : 'Sprint Launch Setup'}
              </p>
              <h3 className="text-base font-black text-gray-900 truncate">
                {item.title || 'Configure Launch'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <GoingLiveSetupFields
            value={config}
            onChange={setConfig}
            interestCount={item.interestCount || 0}
            reservedCount={item.reservedCount || 0}
            showStats={true}
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-xl bg-[#0E7850] hover:bg-[#085C3D] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#0E7850]/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Launch Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
