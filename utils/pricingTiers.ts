import { Sprint } from '../types';

export type PricingTierId = 'standard' | 'complete';

export interface ResolvedPricingTier {
  id: PricingTierId;
  number: string;
  name: string;
  badge: string;
  price: number;
  currencySymbol: string;
  formattedPrice: string;
  features: string[];
}

export const getCurrencySymbol = (currency?: string): string => {
  switch ((currency || 'NGN').toUpperCase()) {
    case 'USD':
      return '$';
    case 'GHS':
      return 'GH₵';
    case 'KES':
      return 'KSh ';
    case 'NGN':
    default:
      return '₦';
  }
};

export const resolveSprintPricingTiers = (
  sprint?: Partial<Sprint> | null
): {
  standard: ResolvedPricingTier;
  complete: ResolvedPricingTier;
} => {
  const totalMoves = Math.max(1, Number(sprint?.duration || 5));
  const freeMoves = Math.min(2, totalMoves);
  const remainingMoves = Math.max(0, totalMoves - freeMoves);
  const symbol = getCurrencySymbol(sprint?.currency);

  const standardPrice =
    typeof sprint?.standardPrice === 'number'
      ? sprint.standardPrice
      : typeof sprint?.price === 'number' && sprint.price > 0
      ? sprint.price
      : 500;

  const completePrice =
    typeof sprint?.completePrice === 'number' ? sprint.completePrice : 1000;

  const standardFeatures = [
    `First ${freeMoves} move${freeMoves === 1 ? '' : 's'} free.`,
    remainingMoves > 0
      ? `Unlock remaining ${remainingMoves} move${remainingMoves === 1 ? '' : 's'}.`
      : 'Unlock full sprint experience.',
    `Complete all ${totalMoves} move${totalMoves === 1 ? '' : 's'}.`,
    'Save your reflections on VectoRise.',
    'Access your completed audit on the platform.',
  ];

  const completeFeatures = [
    'Everything in Standard Access.',
    `Downloadable report of all ${totalMoves} move${totalMoves === 1 ? '' : 's'}.`,
    'Keep a personal copy of your completed audit.',
    'Revisit your reflections anytime.',
  ];

  return {
    standard: {
      id: 'standard',
      number: '01.',
      name: 'Standard Access',
      badge: 'Core experience',
      price: standardPrice,
      currencySymbol: symbol,
      formattedPrice: `${symbol}${standardPrice.toLocaleString()}`,
      features: standardFeatures,
    },
    complete: {
      id: 'complete',
      number: '02.',
      name: 'Complete Access',
      badge: 'Best value',
      price: completePrice,
      currencySymbol: symbol,
      formattedPrice: `${symbol}${completePrice.toLocaleString()}`,
      features: completeFeatures,
    },
  };
};
