import React from 'react';
import { Bell, CheckCircle2, Sparkles, TicketCheck, X, ArrowRight } from 'lucide-react';
import { LaunchControllable } from '../services/launchService';
import { CountdownParts } from '../hooks/useLaunchActions';

interface ComingSoonLaunchSectionProps {
  item: LaunchControllable;
  itemType: 'sprint' | 'track';
  countdown: CountdownParts;
  remainingSlots: number | null;
  isFull: boolean;
  hasShownInterest: boolean;
  hasReservedSpot: boolean;
  isRecordingInterest: boolean;
  isReservingSpot: boolean;
  onShowInterest: () => void;
  onReserveSpot: () => void;
  priceLabel?: string;
}

export const ComingSoonLaunchSection: React.FC<ComingSoonLaunchSectionProps> = ({
  item,
  countdown,
  remainingSlots,
  isFull,
  hasShownInterest,
  hasReservedSpot,
  isRecordingInterest,
  isReservingSpot,
  onShowInterest,
  onReserveSpot,
  priceLabel,
}) => {
  const preRegEnabled = Boolean(item.preRegistrationEnabled);

  return (
    <section className="rounded-[2rem] bg-[#121514] border border-white/10 p-5 sm:p-7 text-white shadow-2xl space-y-5 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#0E7850]/15 blur-3xl pointer-events-none" />

      {/* Top Row: Coming Soon + Conditional Remaining Slots */}
      <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Coming Soon
        </span>

        {remainingSlots !== null && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              remainingSlots > 0
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                remainingSlots > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            {remainingSlots > 0
              ? `Limited Slots • ${remainingSlots} left`
              : 'All Slots Reserved'}
          </span>
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-1.5 relative z-10">
        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          {item.title}
        </h3>
        {(item as any).subtitle && (
          <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed">
            {(item as any).subtitle}
          </p>
        )}
      </div>

      {/* Clickable Launch Countdown Box (Clicking triggers Show Interest + Notify popup) */}
      <button
        type="button"
        onClick={onShowInterest}
        disabled={isRecordingInterest}
        className="w-full text-left rounded-2xl bg-[#1B1F1D] hover:bg-[#212624] border border-white/10 hover:border-emerald-500/40 p-4 sm:p-5 transition-all cursor-pointer group relative z-10"
        title="Tap to get notified when this goes live"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-emerald-300 transition-colors">
            Launch Countdown
          </span>
          <span className="text-[10px] font-bold text-emerald-400/90 flex items-center gap-1">
            <Bell className="w-3 h-3" />
            {hasShownInterest ? 'Notifying you' : 'Tap to notify me'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { label: 'Days', value: countdown.days },
            { label: 'Hours', value: countdown.hours },
            { label: 'Mins', value: countdown.minutes },
            { label: 'Secs', value: countdown.seconds },
          ].map((unit) => (
            <div
              key={unit.label}
              className="rounded-xl bg-[#0A0C0B] border border-white/5 py-3 px-2 text-center shadow-inner"
            >
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-white">
                {unit.value}
              </div>
              <div className="text-[10px] font-bold text-white/50 mt-0.5 uppercase tracking-wider">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </button>

      {/* Action Buttons: Show Interest + Conditional Reserve My Spot */}
      <div className="space-y-2.5 relative z-10">
        <button
          type="button"
          onClick={onShowInterest}
          disabled={isRecordingInterest}
          className={`w-full py-3.5 px-5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 border ${
            hasShownInterest
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
          }`}
        >
          {hasShownInterest ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Interest Registered • We&apos;ll Notify You</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>{isRecordingInterest ? 'Recording...' : 'Show Interest'}</span>
            </>
          )}
        </button>

        {preRegEnabled && (
          <button
            type="button"
            onClick={onReserveSpot}
            disabled={isReservingSpot || (isFull && !hasReservedSpot)}
            className={`w-full py-3.5 px-5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              hasReservedSpot
                ? 'bg-[#0E7850]/25 border border-emerald-500/40 text-emerald-300 cursor-pointer'
                : isFull
                ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                : 'bg-[#0E7850] hover:bg-[#119160] text-white shadow-lg shadow-[#0E7850]/25 cursor-pointer active:scale-[0.99]'
            }`}
          >
            {hasReservedSpot ? (
              <>
                <TicketCheck className="w-4 h-4 text-emerald-400" />
                <span>Spot Reserved • Mail Sent When Live</span>
              </>
            ) : isFull ? (
              <span>Spots Filled</span>
            ) : isReservingSpot ? (
              <span>Processing Reservation...</span>
            ) : (
              <>
                <span>
                  Reserve My Spot{priceLabel ? ` • ${priceLabel}` : ''}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};

interface LaunchActionModalsProps {
  itemTitle: string;
  interestModalOpen: boolean;
  onCloseInterest: () => void;
  interestConfirmed: boolean;
  isRecordingInterest: boolean;
  onSubmitGuestInterest: () => void;

  reserveModalOpen: boolean;
  onCloseReserve: () => void;
  reserveConfirmed: boolean;
  isReservingSpot: boolean;
  onSubmitGuestReservation: () => void;
  priceLabel?: string;

  modalEmail: string;
  onChangeModalEmail: (val: string) => void;
  modalEmailError: string;
  effectiveEmailDisplay: string;
}

export const LaunchActionModals: React.FC<LaunchActionModalsProps> = ({
  itemTitle,
  interestModalOpen,
  onCloseInterest,
  interestConfirmed,
  isRecordingInterest,
  onSubmitGuestInterest,
  reserveModalOpen,
  onCloseReserve,
  reserveConfirmed,
  isReservingSpot,
  onSubmitGuestReservation,
  priceLabel,
  modalEmail,
  onChangeModalEmail,
  modalEmailError,
  effectiveEmailDisplay,
}) => {
  return (
    <>
      {/* Show Interest Popup */}
      {interestModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative text-center space-y-4">
            <button
              type="button"
              onClick={onCloseInterest}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#0E7850] flex items-center justify-center mx-auto">
              {interestConfirmed ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Bell className="w-7 h-7" />
              )}
            </div>

            {interestConfirmed ? (
              <>
                <div className="space-y-1.5">
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    You&apos;re on the list!
                  </h4>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    We will notify you once it&apos;s live
                    {effectiveEmailDisplay ? (
                      <>
                        {' '}at <span className="font-bold text-gray-900">{effectiveEmailDisplay}</span>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseInterest}
                  className="w-full py-3.5 rounded-xl bg-[#0E7850] hover:bg-[#085C3D] text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all"
                >
                  Got it
                </button>
              </>
            ) : (
              <div className="space-y-3 text-left">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">
                    Get notified when live
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Enter your email and we will notify you once <span className="font-bold text-gray-800">{itemTitle}</span> goes live.
                  </p>
                </div>

                <div>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => onChangeModalEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#0E7850] ${
                      modalEmailError ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {modalEmailError && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">{modalEmailError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onSubmitGuestInterest}
                  disabled={isRecordingInterest}
                  className="w-full py-3.5 rounded-xl bg-[#0E7850] hover:bg-[#085C3D] text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all disabled:opacity-60"
                >
                  {isRecordingInterest ? 'Saving...' : 'Notify Me'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reserve My Spot Popup (for guest email capture or free spot confirmation) */}
      {reserveModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative text-center space-y-4">
            <button
              type="button"
              onClick={onCloseReserve}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#0E7850] flex items-center justify-center mx-auto">
              <TicketCheck className="w-7 h-7" />
            </div>

            {reserveConfirmed ? (
              <>
                <div className="space-y-1.5">
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    Spot Reserved!
                  </h4>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    Your spot for <span className="font-bold text-gray-900">{itemTitle}</span> is confirmed. We will send you an email
                    {effectiveEmailDisplay ? (
                      <>
                        {' '}at <span className="font-bold text-gray-900">{effectiveEmailDisplay}</span>
                      </>
                    ) : null}{' '}
                    once it&apos;s live.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseReserve}
                  className="w-full py-3.5 rounded-xl bg-[#0E7850] hover:bg-[#085C3D] text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all"
                >
                  Done
                </button>
              </>
            ) : (
              <div className="space-y-3 text-left">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">
                    Reserve Your Spot
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Enter your email to lock in early access for <span className="font-bold text-gray-800">{itemTitle}</span>. We&apos;ll email you once it&apos;s live.
                  </p>
                </div>

                <div>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => onChangeModalEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#0E7850] ${
                      modalEmailError ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {modalEmailError && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">{modalEmailError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onSubmitGuestReservation}
                  disabled={isReservingSpot}
                  className="w-full py-3.5 rounded-xl bg-[#0E7850] hover:bg-[#085C3D] text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all disabled:opacity-60"
                >
                  {isReservingSpot
                    ? 'Processing...'
                    : `Reserve My Spot${priceLabel ? ` • ${priceLabel}` : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
