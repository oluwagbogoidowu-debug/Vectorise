
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MOCK_SPRINTS, SUBSCRIPTION_PLANS } from '../../services/mockData';
import Button from '../../components/Button';

// Compact mock reviews for the "What people are saying" section
const MOCK_REVIEWS = [
    { id: 1, user: "Alex M.", avatar: "https://i.pravatar.cc/150?u=1", text: "Changed my daily routine. Highly recommend!" },
    { id: 2, user: "Sarah J.", avatar: "https://i.pravatar.cc/150?u=2", text: "Short, effective, exactly what I needed." },
    { id: 3, user: "Mike T.", avatar: "https://i.pravatar.cc/150?u=3", text: "The coaching tips were spot on." },
];

const RecommendedSprints: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const { persona, answers, recommendedPlan } = location.state || {};

  const suggestedPlan = SUBSCRIPTION_PLANS.find(p => p.id === recommendedPlan);

  // Simulate personalized recommendations with scoring logic
  const recommendedSprints = useMemo(() => {
    if (!persona) return MOCK_SPRINTS.slice(0, 5);

    // Calculate a relevance score for each sprint
    const scores = MOCK_SPRINTS.map(sprint => {
        let score = 0;

        // 1. Category Match based on Persona (Broad filter)
        const lowerPersona = persona.toLowerCase();
        const lowerCategory = sprint.category.toLowerCase();

        // Base affinities
        if (lowerPersona.includes('entrepreneur') || lowerPersona.includes('business')) {
            if (lowerCategory === 'business') score += 10;
            if (lowerCategory === 'productivity') score += 5;
        } else if (lowerPersona.includes('freelancer')) {
             if (lowerCategory === 'business') score += 10;
             if (lowerCategory === 'productivity') score += 5;
        } else if (lowerPersona.includes('creative')) {
             if (lowerCategory === 'business') score += 5;
             if (lowerCategory === 'wellness') score += 5;
        } else if (lowerPersona.includes('9-5')) {
             if (lowerCategory === 'productivity') score += 10;
             if (lowerCategory === 'wellness') score += 5;
        } else if (lowerPersona.includes('student')) {
             if (lowerCategory === 'productivity') score += 10;
             if (lowerCategory === 'business') score += 5;
        }

        // 2. Keyword matching from Quiz Answers (Granular filter)
        if (answers) {
            const answerValues = Object.values(answers).map(v => String(v).toLowerCase());
            const combinedAnswers = answerValues.join(' ');

            // Productivity Keywords
            if (['focus', 'clarity', 'goal', 'time', 'habit', 'procrastination', 'structure', 'plan', 'overwhelm'].some(k => combinedAnswers.includes(k))) {
                if (lowerCategory === 'productivity') score += 5;
                if (sprint.title.toLowerCase().includes('habit')) score += 3;
                if (sprint.title.toLowerCase().includes('clarity')) score += 3;
            }

            // Wellness Keywords
            if (['stress', 'burnout', 'anxiety', 'balance', 'health', 'energy', 'mindful', 'detox', 'peace'].some(k => combinedAnswers.includes(k))) {
                if (lowerCategory === 'wellness') score += 5;
                if (sprint.title.toLowerCase().includes('digital') && combinedAnswers.includes('distraction')) score += 5;
            }

            // Business Keywords
            if (['client', 'sales', 'money', 'income', 'revenue', 'launch', 'scale', 'market', 'brand', 'hustle', 'profit'].some(k => combinedAnswers.includes(k))) {
                if (lowerCategory === 'business') score += 5;
            }

            // Specific Boosts
            if (combinedAnswers.includes('launch') && sprint.title.toLowerCase().includes('launch')) score += 10;
        }

        return { sprint, score };
    });

    // Sort by score descending
    const sorted = scores.sort((a, b) => b.score - a.score);
    
    // Return top 5
    return sorted.map(s => s.sprint).slice(0, 5);

  }, [persona, answers]);

  // Select the first sprint by default when recommendations load
  useEffect(() => {
    if (recommendedSprints.length > 0 && !selectedSprintId) {
        setSelectedSprintId(recommendedSprints[0].id);
    }
  }, [recommendedSprints, selectedSprintId]);

  const handleCardClick = (id: string) => {
    setSelectedSprintId(id);
  };

  const handleGetStarted = () => {
    if (selectedSprintId) {
        // Navigate to sign up, passing the selected sprint ID AND the profile data (persona/answers) to be stored
        navigate('/signup', { state: { sprintId: selectedSprintId, persona, answers, recommendedPlan } });
    }
  };

  const selectedSprint = recommendedSprints.find(s => s.id === selectedSprintId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="pt-8 px-6 mb-6">
             <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {persona ? `Top Picks for ${persona}s` : 'Your Personalized Sprint Picks'}
             </h1>
             <p className="text-gray-500 mt-2 text-lg">Based on your quiz, these sprints are the best match for your goals.</p>
        </div>

        {/* Recommended Plan Banner */}
        {suggestedPlan && (
            <div className="mx-6 mb-8 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Recommended Plan</p>
                    <h3 className="text-lg font-bold text-gray-900">{suggestedPlan.name} Tier</h3>
                    <p className="text-sm text-gray-600">Access unlimited sprints for {suggestedPlan.currency}{suggestedPlan.price.toLocaleString()}/mo.</p>
                </div>
                <div className="relative z-10 text-right">
                    <span className="text-2xl font-bold text-blue-700">{suggestedPlan.currency}{suggestedPlan.price.toLocaleString()}</span>
                </div>
            </div>
        )}

        {/* Carousel Container */}
        <div className="flex-1 flex flex-col justify-center min-h-[300px]">
            <div className="flex overflow-x-auto px-6 gap-4 snap-x pb-8 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {recommendedSprints.map((sprint) => (
                    <div 
                        key={sprint.id}
                        onClick={() => handleCardClick(sprint.id)}
                        className={`flex-shrink-0 w-72 bg-white rounded-2xl p-6 shadow-sm border-2 cursor-pointer transition-all duration-300 snap-center relative
                            ${selectedSprintId === sprint.id 
                                ? 'border-primary ring-4 ring-primary/10 transform -translate-y-2 shadow-lg' 
                                : 'border-transparent hover:border-gray-200'
                            }
                        `}
                    >
                        <div className="mb-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                selectedSprintId === sprint.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {sprint.category}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{sprint.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-4 leading-relaxed">{sprint.description}</p>
                        
                        {selectedSprintId === sprint.id && (
                            <div className="absolute top-4 right-4 text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}

                {/* Discover More Card in Carousel */}
                <div 
                    onClick={() => navigate('/discover')}
                    className="flex-shrink-0 w-72 bg-gray-100/50 rounded-2xl p-6 border-2 border-dashed border-gray-300 cursor-pointer transition-all duration-300 snap-center flex flex-col items-center justify-center hover:bg-white hover:border-primary group"
                >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 group-hover:text-primary transition-colors">Discover More</h3>
                    <p className="text-sm text-gray-400">Browse full library</p>
                </div>
            </div>
        </div>

        {/* Selected Sprint & Action Section */}
        <div className="bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] mt-auto min-h-[280px]">
            <div className="max-w-md mx-auto h-full flex flex-col justify-between">
                {selectedSprint ? (
                    <div className="space-y-6 animate-fade-in flex-1 flex flex-col">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Selected Sprint</p>
                                    <h2 className="text-2xl font-bold text-primary leading-none">{selectedSprint.title}</h2>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xl font-bold text-gray-900">₦{selectedSprint.price.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500">{selectedSprint.duration} Days</span>
                                </div>
                            </div>
                            
                            {/* What people are saying section - Link to Shine */}
                            <div className="bg-gray-50 rounded-xl p-4 mt-4">
                                <Link to="/shine" className="flex justify-between items-center mb-3 group">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide group-hover:text-primary transition-colors">What people are saying</p>
                                    <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Community &rarr;</span>
                                </Link>
                                <Link to="/shine" className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                    {MOCK_REVIEWS.map(review => (
                                        <div key={review.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex-shrink-0 w-48 snap-center hover:border-primary/50 transition-colors">
                                            <p className="text-xs text-gray-700 italic mb-2 line-clamp-2 leading-relaxed">"{review.text}"</p>
                                            <div className="flex items-center gap-2">
                                                <img src={review.avatar} className="w-5 h-5 rounded-full bg-gray-200" alt=""/>
                                                <span className="text-[10px] font-bold text-gray-400">{review.user}</span>
                                            </div>
                                        </div>
                                    ))}
                                </Link>
                            </div>
                        </div>

                        <div className="mt-auto pt-2">
                             <Button 
                                onClick={handleGetStarted}
                                className="w-full py-4 text-lg rounded-xl shadow-lg font-bold"
                            >
                                Start Free with Subscription
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 opacity-50 grayscale flex-1 flex flex-col justify-center">
                         <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Select a Sprint</p>
                            <h2 className="text-2xl font-bold text-gray-300">Choose a card above</h2>
                        </div>
                        <Button disabled className="w-full py-4 text-lg rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed">
                            Get Started
                        </Button>
                    </div>
                )}
            </div>
        </div>
        
        <style>{`
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fadeIn 0.3s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default RecommendedSprints;
