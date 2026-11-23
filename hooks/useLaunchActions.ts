import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  launchService,
  LaunchItemType,
  LaunchControllable,
  getRemainingSlots,
  isRegistrationFull,
} from '../services/launchService';
import { paymentService } from '../services/paymentService';
import { toast } from 'sonner';

export interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

export function computeCountdown(launchDate?: string): CountdownParts {
  if (!launchDate) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: false };
  }
  const targetMs = new Date(launchDate).getTime();
  if (!Number.isFinite(targetMs)) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: false };
  }
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    isExpired: false,
  };
}

interface UseLaunchActionsOptions {
  item: LaunchControllable | null | undefined;
  itemType: LaunchItemType;
  priceAmount: number;
  currency?: string;
  selectedTier?: 'standard' | 'complete';
  externalGuestEmail?: string;
}

export function useLaunchActions({
  item,
  itemType,
  priceAmount,
  currency = 'NGN',
  selectedTier,
  externalGuestEmail,
}: UseLaunchActionsOptions) {
  const { user } = useAuth();

  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    computeCountdown(item?.launchDate)
  );
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [interestConfirmed, setInterestConfirmed] = useState(false);
  const [isRecordingInterest, setIsRecordingInterest] = useState(false);

  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [reserveConfirmed, setReserveConfirmed] = useState(false);
  const [isReservingSpot, setIsReservingSpot] = useState(false);

  const [modalEmail, setModalEmail] = useState('');
  const [modalEmailError, setModalEmailError] = useState('');

  const [hasShownInterest, setHasShownInterest] = useState(false);
  const [hasReservedSpot, setHasReservedSpot] = useState(false);

  useEffect(() => {
    setCountdown(computeCountdown(item?.launchDate));
    if (!item?.launchDate) return;
    const interval = setInterval(() => {
      setCountdown(computeCountdown(item?.launchDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [item?.launchDate]);

  useEffect(() => {
    if (!item?.id || !item?.isComingSoon) return;
    const checkEmail = user?.email || externalGuestEmail || '';
    if (checkEmail) {
      launchService
        .hasUserShownInterest(itemType, item.id, checkEmail)
        .then(setHasShownInterest)
        .catch(() => {});
    }
    if (checkEmail || user?.id) {
      launchService
        .hasUserReservedSpot(itemType, item.id, checkEmail || null, user?.id || null)
        .then(setHasReservedSpot)
        .catch(() => {});
    }
  }, [item?.id, item?.isComingSoon, itemType, user?.email, user?.id, externalGuestEmail]);

  const remainingSlots = useMemo(() => getRemainingSlots(item), [item]);
  const isFull = useMemo(() => isRegistrationFull(item), [item]);

  const effectivePrefillEmail = (user?.email || externalGuestEmail || modalEmail || '').trim();

  const executeInterestSave = useCallback(
    async (emailToUse: string) => {
      if (!item?.id) return;
      setIsRecordingInterest(true);
      setModalEmailError('');
      try {
        await launchService.recordLaunchInterest({
          itemType,
          itemId: item.id,
          itemTitle: item.title || item.id,
          email: emailToUse,
          name: user?.name || 'Vectorise User',
          userId: user?.id,
        });
        setHasShownInterest(true);
        setInterestConfirmed(true);
        setInterestModalOpen(true);
      } catch (err: any) {
        console.error('Error recording interest:', err);
        toast.error(err?.message || 'Could not record your interest. Please try again.');
      } finally {
        setIsRecordingInterest(false);
      }
    },
    [item?.id, item?.title, itemType, user?.id, user?.name]
  );

  const handleShowInterest = useCallback(async () => {
    if (!item?.id) return;
    setModalEmailError('');
    if (user?.email) {
      await executeInterestSave(user.email);
      return;
    }
    if (externalGuestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalGuestEmail.trim())) {
      await executeInterestSave(externalGuestEmail.trim());
      return;
    }
    setInterestConfirmed(false);
    setInterestModalOpen(true);
  }, [item?.id, user?.email, externalGuestEmail, executeInterestSave]);

  const submitGuestInterest = useCallback(async () => {
    const clean = modalEmail.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setModalEmailError('Please enter a valid email address.');
      return;
    }
    await executeInterestSave(clean);
  }, [modalEmail, executeInterestSave]);

  const executeReserveSpot = useCallback(
    async (emailToUse: string) => {
      if (!item?.id) return;
      if (isFull) {
        toast.error('All limited spots for this launch have been filled.');
        return;
      }

      setIsReservingSpot(true);
      setModalEmailError('');
      try {
        const cleanEmail = emailToUse.trim().toLowerCase();
        const traceId = user?.id || `guest_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
        const userName = user?.name || 'Vectorise Guest';
        const roundedAmount = Math.max(0, Math.round(priceAmount));

        if (roundedAmount === 0) {
          await launchService.reserveFreeSpot({
            itemType,
            itemId: item.id,
            itemTitle: item.title || item.id,
            email: cleanEmail,
            name: userName,
            userId: user?.id,
            selectedTier,
            currency,
          });
          setHasReservedSpot(true);
          setReserveConfirmed(true);
          setReserveModalOpen(true);
          setIsReservingSpot(false);
          return;
        }

        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: traceId,
          email: cleanEmail,
          ...(itemType === 'track' ? { trackId: item.id } : { sprintId: item.id }),
          amount: roundedAmount,
          currency,
          name: userName,
          selectedTier,
          isPreRegistration: true,
          preRegItemType: itemType,
        });

        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error('Payment link not received.');
        }
      } catch (err: any) {
        console.error('Error reserving spot:', err);
        toast.error(err?.message || 'Could not reserve your spot. Please try again.');
        setIsReservingSpot(false);
      }
    },
    [item?.id, item?.title, itemType, isFull, user?.id, user?.name, priceAmount, currency, selectedTier]
  );

  const handleReserveSpot = useCallback(async () => {
    if (!item?.id || !item.preRegistrationEnabled) return;
    if (isFull) {
      toast.error('Sorry, all limited spots have been reserved.');
      return;
    }
    if (hasReservedSpot) {
      setReserveConfirmed(true);
      setReserveModalOpen(true);
      return;
    }

    setModalEmailError('');
    if (user?.email) {
      await executeReserveSpot(user.email);
      return;
    }
    if (externalGuestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalGuestEmail.trim())) {
      await executeReserveSpot(externalGuestEmail.trim());
      return;
    }
    setReserveConfirmed(false);
    setReserveModalOpen(true);
  }, [
    item?.id,
    item?.preRegistrationEnabled,
    isFull,
    hasReservedSpot,
    user?.email,
    externalGuestEmail,
    executeReserveSpot,
  ]);

  const submitGuestReservation = useCallback(async () => {
    const clean = modalEmail.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setModalEmailError('Please enter a valid email address.');
      return;
    }
    await executeReserveSpot(clean);
  }, [modalEmail, executeReserveSpot]);

  return {
    countdown,
    remainingSlots,
    isFull,
    hasShownInterest,
    hasReservedSpot,
    isRecordingInterest,
    isReservingSpot,
    interestModalOpen,
    setInterestModalOpen,
    interestConfirmed,
    reserveModalOpen,
    setReserveModalOpen,
    reserveConfirmed,
    modalEmail,
    setModalEmail,
    modalEmailError,
    setModalEmailError,
    effectiveEmailDisplay: effectivePrefillEmail,
    handleShowInterest,
    submitGuestInterest,
    handleReserveSpot,
    submitGuestReservation,
  };
}
