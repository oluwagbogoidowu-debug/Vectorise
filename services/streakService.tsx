import React from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { Participant, ParticipantSprint } from '../types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';

export const streakService = {
  calculateCurrentStreak: (enrollments: ParticipantSprint[]): number => {
    if (!enrollments || enrollments.length === 0) return 0;

    const allProgress = enrollments.flatMap(e => e.progress || []);
    const completedTasks = allProgress.filter(p => p.completed);
    
    const completionDates = completedTasks
      .map(p => p.completedAt ? new Date(p.completedAt) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    if (completionDates.length > 0) {
      const checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);
      
      const lastComp = new Date(completionDates[0]);
      lastComp.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((checkDate.getTime() - lastComp.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        currentStreak = 1;
        let lastDate = lastComp;
        for (let i = 1; i < completionDates.length; i++) {
          const d = new Date(completionDates[i]);
          d.setHours(0, 0, 0, 0);
          const diff = Math.floor((lastDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            currentStreak++;
            lastDate = d;
          } else if (diff > 1) {
            break;
          }
        }
      }
    }
    return currentStreak;
  },

  checkStreakMilestones: async (user: Participant, enrollments: ParticipantSprint[]): Promise<boolean> => {
    if (!user || !enrollments || enrollments.length === 0) return false;

    const streak = streakService.calculateCurrentStreak(enrollments);
    if (streak === 0) return false;

    // Define target milestones: 7, 14, 30, 50, 100
    const milestones = [7, 14, 30, 50, 100];
    const hitMilestone = milestones.find(m => streak >= m);

    if (!hitMilestone) return false;

    const alreadyNotified = user.notifiedStreakMilestones || [];
    if (alreadyNotified.includes(hitMilestone)) return false;

    // We found a new milestone to celebrate!
    const sessionKey = `celebrating_streak_${user.id}_${hitMilestone}`;
    if (sessionStorage.getItem(sessionKey)) return false;
    sessionStorage.setItem(sessionKey, 'true');

    try {
      // 1. Persist that we've notified this milestone
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        notifiedStreakMilestones: arrayUnion(hitMilestone)
      });

      // 2. Fire the canvas-confetti blast!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0E7850', '#159E6A', '#34D399', '#FCD34D', '#10B981']
      });

      // 3. Trigger a stylish React toast component
      toast.custom((t) => (
        <div className="bg-white border-2 border-[#0E7850]/20 rounded-[2rem] p-5 shadow-xl flex items-start gap-4 max-w-sm">
          <div className="h-12 w-12 rounded-2xl bg-[#0E7850]/10 flex items-center justify-center text-2xl flex-shrink-0 animate-bounce">
            🔥
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-[#0E7850] uppercase tracking-widest leading-none mb-1">STREAK MILESTONE ENTRANCE</p>
            <h4 className="text-sm font-black text-gray-900 leading-snug mb-1">Consistency Unleashed!</h4>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              You've hit an incredible <span className="font-black text-gray-900">{hitMilestone}-day streak</span>. You are rewriting your habits. Keep rising!
            </p>
          </div>
          <button 
            onClick={() => toast.dismiss(t)} 
            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ), {
        duration: 8000
      });

      return true;
    } catch (e) {
      console.error("[StreakService] Failed to record/celebrate milestone", e);
      return false;
    }
  }
};
