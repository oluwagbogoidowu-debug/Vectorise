import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Coach } from '../../types';
import { userService, sanitizeData } from '../../services/userService';
import { useNavigate } from 'react-router-dom';

const CoachSettings: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<Partial<Coach>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                profileImageUrl: user.profileImageUrl,
                bio: (user as Coach).bio,
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile(sanitizeData(formData));
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
            <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
                <button onClick={() => navigate(-1)} className="text-xs font-bold text-gray-500 mb-4">← Back to Profile</button>
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Account Settings</h1>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Name</label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Profile Image URL</label>
                        <input type="url" name="profileImageUrl" value={formData.profileImageUrl || ''} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Bio</label>
                        <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows={4} className="w-full p-2 border border-gray-200 rounded-lg mt-1"></textarea>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full py-3 bg-primary text-white rounded-lg font-bold disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default CoachSettings;
