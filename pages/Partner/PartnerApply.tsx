import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { partnerService } from '../../services/partnerService';

const PartnerApply: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: '',
    primaryPlatform: '',
    platformLink: '',
    influenceTarget: '',
    commonRequests: '',
    whyPartner: '',
    introductionStrategy: [] as string[],
    identityType: '',
    futureCoachIntent: '',
    agreedToRewards: false,
    agreedToRecommendations: false
  });

  const updateForm = (key: string, val: any) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const toggleStrategy = (strategy: string) => {
    const current = [...formData.introductionStrategy];
    const idx = current.indexOf(strategy);
    if (idx > -1) current.splice(idx, 1);
    else current.push(strategy);
    updateForm('introductionStrategy', current);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await partnerService.submitApplication(formData);
      setStep(99); // Success view
    } catch (err) {
      alert("Application failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-bold placeholder-white/20 focus:ring-4 focus:ring-white/5 outline-none transition-all";
  const labelClasses = "block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3 ml-1";

  if (step === 99) {
    return (
      <div className="flex flex-col h-screen bg-primary p-10 items-center justify-center text-center animate-fade-in overflow-hidden relative">
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-3xl font-black mb-4 italic">Application Received.</h1>
          <p className="text-lg text-white/60 font-medium italic max-w-sm mb-12 leading-relaxed">
            Your application is now in the partner registry. Our curators will review your profile and reach out via email.
          </p>
          <Button onClick={() => navigate('/')} className="bg-white text-primary px-12 py-4 rounded-full font-black uppercase tracking-widest text-xs">
            Return Home
          </Button>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 scale-[1.5]">
          <LocalLogo type="white" className="w-96 h-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-primary p-6 md:p-12 overflow-hidden selection:bg-white/10 relative">
      <div className="max-w-xl mx-auto w-full flex flex-col h-full relative z-10">
        
        <header className="flex justify-between items-center mb-12 flex-shrink-0">
          <LocalLogo type="white" className="h-10 w-auto opacity-90" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Slide 0{step + 1}</p>
            <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white transition-all duration-700 shadow-[0_0_10px_white]" style={{ width: `${((step+1)/6)*100}%` }}></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar py-10 animate-fade-in" key={step}>
          
          {step === 0 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none mb-2">Let’s establish your <br/> partner profile.</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Full Name</label>
                  <input type="text" value={formData.fullName} onChange={e => updateForm('fullName', e.target.value)} className={inputClasses} placeholder="Your legal name" />
                </div>
                <div>
                  <label className={labelClasses}>Email Address</label>
                  <input type="email" value={formData.email} onChange={e => updateForm('email', e.target.value)} className={inputClasses} placeholder="your@email.com" />
                </div>
                <div>
                  <label className={labelClasses}>Country</label>
                  <input type="text" value={formData.country} onChange={e => updateForm('country', e.target.value)} className={inputClasses} placeholder="Current location" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">Where is your <br/> primary voice?</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Primary Platform</label>
                  <select value={formData.primaryPlatform} onChange={e => updateForm('primaryPlatform', e.target.value)} className={inputClasses}>
                    <option value="">Select Voice</option>
                    {["Instagram", "X (Twitter)", "LinkedIn", "WhatsApp Community", "Email List", "Offline / Community", "Other"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Link to Your Main Platform</label>
                  <input type="url" value={formData.platformLink} onChange={e => updateForm('platformLink', e.target.value)} className={inputClasses} placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">Your circle of <br/> influence.</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Who do you primarily influence?</label>
                  <select value={formData.influenceTarget} onChange={e => updateForm('influenceTarget', e.target.value)} className={inputClasses}>
                    <option value="">Select Audience</option>
                    {["Students", "Young professionals", "Founders / Entrepreneurs", "Creatives", "Faith-based audience", "Corporate professionals", "Mixed audience"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>What do people usually come to you for?</label>
                  <textarea value={formData.commonRequests} onChange={e => updateForm('commonRequests', e.target.value)} className={inputClasses + " h-32 resize-none"} placeholder="e.g. They ask for career advice..." />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">Your catalytic <br/> intent.</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Why do you want to partner with Vectorise?</label>
                  <textarea value={formData.whyPartner} onChange={e => updateForm('whyPartner', e.target.value)} className={inputClasses + " h-24 resize-none"} placeholder="Tell us your motivation" />
                </div>
                <div>
                  <label className={labelClasses}>How do you plan to introduce sprints?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["Personal recommendation", "Content (posts / videos)", "1-on-1 sessions", "Group or community", "Not sure yet"].map(s => (
                      <button 
                        key={s} 
                        onClick={() => toggleStrategy(s)}
                        className={`p-4 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${formData.introductionStrategy.includes(s) ? 'bg-white text-primary border-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">Identity & <br/> Future.</h2>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Which best describes you right now?</label>
                  <select value={formData.identityType} onChange={e => updateForm('identityType', e.target.value)} className={inputClasses}>
                    <option value="">Select Identity</option>
                    {["Influencer / Content creator", "Coach / Facilitator", "Mentor / Teacher", "Community leader", "Just starting out"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Do you see yourself becoming a coach later?</label>
                  <div className="flex gap-3">
                    {["Yes", "Maybe", "No"].map(v => (
                      <button key={v} onClick={() => updateForm('futureCoachIntent', v)} className={`flex-1 p-4 rounded-xl font-black uppercase tracking-widest text-[11px] border transition-all ${formData.futureCoachIntent === v ? 'bg-white text-primary border-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-10">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">The Partner <br/> Charter.</h2>
              <div className="space-y-6">
                <label className="flex items-start gap-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] cursor-pointer hover:bg-white/10 transition-all">
                  <input type="checkbox" checked={formData.agreedToRewards} onChange={e => updateForm('agreedToRewards', e.target.checked)} className="w-6 h-6 mt-1 rounded bg-white/10 border-white/20 text-white" />
                  <p className="text-sm font-bold text-white/80 leading-relaxed italic">I understand that rewards are based on real participation and completed sprints, not just signups.</p>
                </label>
                <label className="flex items-start gap-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] cursor-pointer hover:bg-white/10 transition-all">
                  <input type="checkbox" checked={formData.agreedToRecommendations} onChange={e => updateForm('agreedToRecommendations', e.target.checked)} className="w-6 h-6 mt-1 rounded bg-white/10 border-white/20 text-white" />
                  <p className="text-sm font-bold text-white/80 leading-relaxed italic">I agree to recommend only sprints I believe will help the person.</p>
                </label>
              </div>
            </div>
          )}

        </main>

        <footer className="pt-6 pb-12 flex-shrink-0 flex gap-4">
          {step > 0 && (
            <button onClick={handleBack} className="px-8 py-4 bg-white/5 text-white/40 font-black uppercase tracking-widest text-[11px] rounded-full hover:bg-white/10 transition-all">Back</button>
          )}
          {step < 5 ? (
            <button 
              disabled={
                (step === 0 && (!formData.fullName || !formData.email)) ||
                (step === 1 && (!formData.primaryPlatform || !formData.platformLink)) ||
                (step === 2 && (!formData.influenceTarget || !formData.commonRequests)) ||
                (step === 3 && (!formData.whyPartner || formData.introductionStrategy.length === 0)) ||
                (step === 4 && (!formData.identityType || !formData.futureCoachIntent))
              }
              onClick={handleNext} 
              className="flex-1 py-5 bg-white text-primary font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl active:scale-95 transition-all disabled:opacity-30"
            >
              Continue
            </button>
          ) : (
            <Button 
              isLoading={isSubmitting} 
              disabled={!formData.agreedToRewards || !formData.agreedToRecommendations}
              onClick={handleSubmit} 
              className="flex-1 py-5 bg-white text-primary font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl"
            >
              Apply to Partner &rarr;
            </Button>
          )}
        </footer>

      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PartnerApply;