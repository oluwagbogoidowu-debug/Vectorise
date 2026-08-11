import React, { useState, useEffect, useMemo } from 'react';
import { userService } from '../../services/userService';
import { Participant } from '../../types';
import { adminCache } from './adminCache';

export default function AdminSystemParticipantControl() {
  const [users, setUsers] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action modal state
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [actionType, setActionType] = useState<'clear_auth' | 'delete_db' | 'delete_both' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async (forceRefresh = false) => {
    if (!forceRefresh && adminCache.users?.participants) {
      setUsers(adminCache.users.participants);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
      if (adminCache.users) {
        adminCache.users.participants = data;
      }
    } catch (err) {
      console.error('Error fetching users for System Participant Control:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.id || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const openConfirmation = (user: Participant, type: 'clear_auth' | 'delete_db' | 'delete_both') => {
    setSelectedUser(user);
    setActionType(type);
  };

  const closeModal = () => {
    if (isProcessing) return;
    setSelectedUser(null);
    setActionType(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedUser || !actionType) return;
    setIsProcessing(true);
    try {
      if (actionType === 'clear_auth') {
        await userService.adminDeleteUserAuth(selectedUser.id);
      } else if (actionType === 'delete_db') {
        await userService.adminDeleteUserDb(selectedUser.id);
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        if (adminCache.users) {
          adminCache.users.participants = adminCache.users.participants.filter(u => u.id !== selectedUser.id);
        }
      } else if (actionType === 'delete_both') {
        await userService.adminDeleteUserFull(selectedUser.id);
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        if (adminCache.users) {
          adminCache.users.participants = adminCache.users.participants.filter(u => u.id !== selectedUser.id);
        }
      }
      setSelectedUser(null);
      setActionType(null);
    } catch (err) {
      console.error('Error executing user deletion action:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 shadow-sm space-y-8 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-8">
        <div className="space-y-2 text-left">
          <span className="text-[9px] font-black tracking-widest text-[#0E7850] bg-emerald-50 px-3 py-1.5 rounded-full uppercase">
            Participant Control
          </span>
          <h3 className="text-xl font-black text-gray-900 tracking-tight italic">
            User Removal & Auth Clearing Panel
          </h3>
          <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-2xl">
            View all users currently in the database. Clear Firebase Auth credentials, delete complete user documents/files by User ID from the database, or wipe both.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative flex-shrink-0 w-full md:w-72">
          <input
            type="text"
            placeholder="Search name, email, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No matching users found in database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
            <span>Showing {filteredUsers.length} Users in Database</span>
            <span>Actions: Clear Auth | Delete Database File</span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                {/* User Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center font-black text-gray-400 text-sm">
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (u.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-gray-900 leading-tight truncate">{u.name || 'Unnamed User'}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border leading-none ${
                        (u.role || '').toLowerCase() === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        (u.role || '').toLowerCase() === 'coach' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {u.role || 'Participant'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 truncate">{u.email}</p>
                    <p className="text-[9px] font-mono text-gray-400 truncate mt-0.5">ID: {u.id}</p>
                  </div>
                </div>

                {/* Delete Controls & Repair */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                  {/* Repair Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const panel = document.getElementById('repair-responses-btn');
                      if (panel) {
                        panel.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Audit and repair user response records using Repair Responses panel"
                  >
                    <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Repair Responses</span>
                  </button>

                  {/* Delete Button 1: Clear Auth */}
                  <button
                    type="button"
                    onClick={() => openConfirmation(u, 'clear_auth')}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Clear user credentials from Firebase Authentication"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span>Clear Auth</span>
                  </button>

                  {/* Delete Button 2: Delete User File (DB) */}
                  <button
                    type="button"
                    onClick={() => openConfirmation(u, 'delete_db')}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Entirely delete user file/document from database collection by ID"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete User File (DB)</span>
                  </button>

                  {/* Delete Button 3: Delete Both */}
                  <button
                    type="button"
                    onClick={() => openConfirmation(u, 'delete_both')}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Remove user completely from both Auth and Database"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Delete Both</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-scale-up text-left">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
              actionType === 'clear_auth' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>
              {actionType === 'clear_auth' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </div>

            <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">
              {actionType === 'clear_auth' && 'Clear User Authentication?'}
              {actionType === 'delete_db' && 'Delete User Database Document?'}
              {actionType === 'delete_both' && 'Completely Purge User Account?'}
            </h3>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed mb-6">
              Target user: <strong className="text-gray-900">{selectedUser.name}</strong> ({selectedUser.email})<br />
              <span className="font-mono text-[10px] text-gray-400">UID: {selectedUser.id}</span>
              <br /><br />
              {actionType === 'clear_auth' && (
                <span className="text-amber-600 font-bold block">
                  ⚡ This will delete the user's authentication credentials from Firebase Auth so they can no longer log in.
                </span>
              )}
              {actionType === 'delete_db' && (
                <span className="text-rose-600 font-bold block">
                  🗑️ This will permanently delete the entire user document file from the database (`users/{selectedUser.id}`) along with all subcollections and associated user records.
                </span>
              )}
              {actionType === 'delete_both' && (
                <span className="text-red-600 font-bold block">
                  ⚠️ This action will completely purge the user from BOTH Firebase Authentication and the database collection. This cannot be undone.
                </span>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isProcessing}
                className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isProcessing}
                className={`px-5 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
                  actionType === 'clear_auth' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Action</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
