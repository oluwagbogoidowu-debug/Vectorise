import React from 'react';
import { Plus, Trash2, BookOpen, Sparkles } from 'lucide-react';
import { TrackStory } from '../types';

interface TrackStoriesSetupProps {
  stories: TrackStory[];
  onChange: (stories: TrackStory[]) => void;
}

export const TrackStoriesSetup: React.FC<TrackStoriesSetupProps> = ({ stories = [], onChange }) => {
  const handleAddStory = () => {
    const newStory: TrackStory = {
      id: `story_${Date.now()}`,
      title: '',
      content: ''
    };
    onChange([...stories, newStory]);
  };

  const handleUpdateStory = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...stories];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
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
              Stories from the Journey
            </h4>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full">
              {stories.length} {stories.length === 1 ? 'Story' : 'Stories'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-bold mt-0.5">
            Add short, inspiring journey stories displayed as swipeable cards on the track page.
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
          <p className="text-xs text-gray-400 font-medium">No stories added yet. Click + to create a story card.</p>
          <button
            type="button"
            onClick={handleAddStory}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider border border-gray-200 cursor-pointer"
          >
            + Add First Story
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story, index) => (
            <div
              key={story.id || index}
              className="p-5 sm:p-6 bg-gray-50/70 rounded-3xl border border-gray-100 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Story #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveStory(index)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                  Story Title
                </label>
                <input
                  type="text"
                  value={story.title}
                  onChange={(e) => handleUpdateStory(index, 'title', e.target.value)}
                  placeholder="e.g. From scattered to hyper-focused"
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                  Story Content
                </label>
                <textarea
                  value={story.content}
                  onChange={(e) => handleUpdateStory(index, 'content', e.target.value)}
                  placeholder="Share a short writeup or perspective from taking the track..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                />
              </div>
            </div>
          ))}

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
