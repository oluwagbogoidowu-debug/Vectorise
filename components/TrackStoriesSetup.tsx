import React from 'react';
import { Plus, Trash2, BookOpen, Sparkles, User, Image as ImageIcon } from 'lucide-react';
import { TrackStory } from '../types';

interface TrackStoriesSetupProps {
  stories: TrackStory[];
  onChange: (stories: TrackStory[]) => void;
}

export const TrackStoriesSetup: React.FC<TrackStoriesSetupProps> = ({ stories = [], onChange }) => {
  const handleAddStory = () => {
    const newStory: TrackStory = {
      id: `story_${Date.now()}`,
      authorName: '',
      authorHeadline: '',
      authorAvatar: '',
      title: '',
      content: ''
    };
    onChange([...stories, newStory]);
  };

  const handleUpdateStory = (index: number, field: keyof TrackStory, value: string) => {
    const updated = [...stories];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    // Sync alias fields for compatibility
    if (field === 'authorName') updated[index].name = value;
    if (field === 'authorHeadline') updated[index].headline = value;
    if (field === 'authorAvatar') updated[index].avatar = value;
    onChange(updated);
  };

  const handleRemoveStory = (index: number) => {
    const updated = stories.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 sm:p-10 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
              Stories from Coach's Journey
            </h4>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full">
              {stories.length} {stories.length === 1 ? 'Story' : 'Stories'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-bold mt-0.5">
            Add coach stories with author profile details and expandable writeups for the track description page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddStory}
          className="p-2.5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Add Story"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Add Story</span>
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="py-8 px-4 text-center border-2 border-dashed border-gray-100 rounded-3xl space-y-3">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-xs text-gray-400 font-medium">No coach stories added yet. Click + to create a story card.</p>
          <button
            type="button"
            onClick={handleAddStory}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider border border-gray-200 cursor-pointer"
          >
            + Add First Story
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {stories.map((story, index) => {
            const authorName = story.authorName || story.name || '';
            const authorHeadline = story.authorHeadline || story.headline || '';
            const authorAvatar = story.authorAvatar || story.avatar || story.avatarUrl || '';

            return (
              <div
                key={story.id || index}
                className="p-6 sm:p-7 bg-gray-50/70 rounded-3xl border border-gray-100 space-y-4 relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0 text-emerald-800 font-black text-xs">
                      {authorAvatar ? (
                        <img src={authorAvatar} alt={authorName || "Coach"} className="w-full h-full object-cover" />
                      ) : (
                        authorName ? authorName.substring(0, 2).toUpperCase() : <User className="w-5 h-5 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block">
                        Story #{index + 1}
                      </span>
                      <p className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                        {authorName || "Unnamed Coach"}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveStory(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Author Details: Name, Headline & Avatar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                      Coach Name
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => handleUpdateStory(index, 'authorName', e.target.value)}
                      placeholder="e.g. Coach Alex Rivera"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                      Coach Headline
                    </label>
                    <input
                      type="text"
                      value={authorHeadline}
                      onChange={(e) => handleUpdateStory(index, 'authorHeadline', e.target.value)}
                      placeholder="e.g. Lead Clarity Coach"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={authorAvatar}
                      onChange={(e) => handleUpdateStory(index, 'authorAvatar', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Story Title & Content */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                      Story Title
                    </label>
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => handleUpdateStory(index, 'title', e.target.value)}
                      placeholder="e.g. Overcoming the Mid-Career Fog"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                      Story Content
                    </label>
                    <textarea
                      value={story.content}
                      onChange={(e) => handleUpdateStory(index, 'content', e.target.value)}
                      placeholder="Share the coach's perspective, struggle, transformation, or lesson from this journey..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddStory}
              className="w-full py-3 bg-white hover:bg-gray-50 border border-dashed border-gray-200 text-gray-600 hover:text-primary rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Story</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackStoriesSetup;
