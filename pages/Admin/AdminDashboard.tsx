
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_USERS, MOCK_SPRINTS, MOCK_PAYOUTS, MOCK_ROLES, MOCK_NOTIFICATIONS } from '../../services/mockData';
import { UserRole, Coach, Sprint, Payout, RoleDefinition, Permission, Participant } from '../../types';
import Button from '../../components/Button';

type Tab = 'coaches' | 'sprints' | 'payouts' | 'roles';

const AVAILABLE_PERMISSIONS: { id: Permission; label: string }[] = [
    { id: 'sprint:create', label: 'Create Sprints' },
    { id: 'sprint:edit', label: 'Edit Sprints' },
    { id: 'sprint:publish', label: 'Publish Sprints' },
    { id: 'sprint:delete', label: 'Delete Sprints' },
    { id: 'user:view', label: 'View Users' },
    { id: 'user:manage', label: 'Manage Users' },
    { id: 'role:manage', label: 'Manage Roles' },
    { id: 'analytics:view', label: 'View Analytics' },
    { id: 'community:moderate', label: 'Moderate Community' },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('sprints');
    const [roles, setRoles] = useState<RoleDefinition[]>(MOCK_ROLES);
    const [refreshKey, setRefreshKey] = useState(0); 
    
    // Create Role State
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [newRoleBase, setNewRoleBase] = useState<UserRole>(UserRole.COACH);
    const [newRolePermissions, setNewRolePermissions] = useState<Permission[]>([]);

    const [allCoaches, setAllCoaches] = useState<(Coach | Participant)[]>([]);

    useEffect(() => {
        const filtered = MOCK_USERS.filter(u => 
            u.role === UserRole.COACH || 
            (u.role === UserRole.PARTICIPANT && (u as Participant).hasCoachProfile)
        ) as (Coach | Participant)[];
        setAllCoaches(filtered);
    }, [refreshKey, activeTab]);

    const handleCoachStatusChange = (coachId: string, shouldApprove: boolean) => {
        const userIndex = MOCK_USERS.findIndex(u => u.id === coachId);
        if (userIndex !== -1) {
            const user = MOCK_USERS[userIndex];
            
            if (user.role === UserRole.COACH) {
                (user as Coach).approved = shouldApprove;
            } else if (user.role === UserRole.PARTICIPANT) {
                (user as Participant).coachApproved = shouldApprove;
            }

            MOCK_NOTIFICATIONS.unshift({
                id: `notif_admin_${Date.now()}`,
                type: 'announcement',
                text: shouldApprove 
                    ? "🎉 Congratulations! Your coach profile has been approved. You can now create and publish sprints."
                    : "⚠️ Your coach approval has been revoked. Please contact support for details.",
                timestamp: new Date().toISOString(),
                read: false
            });
            
            setRefreshKey(prev => prev + 1);
            alert(`Coach ${user.name} ${shouldApprove ? 'approved' : 'revoked'}!`);
        }
    };

    const togglePermission = (perm: Permission) => {
        if (newRolePermissions.includes(perm)) {
            setNewRolePermissions(newRolePermissions.filter(p => p !== perm));
        } else {
            setNewRolePermissions([...newRolePermissions, perm]);
        }
    };

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        const newRole: RoleDefinition = {
            id: `role_${Date.now()}`,
            name: newRoleName,
            description: newRoleDescription,
            baseRole: newRoleBase,
            permissions: newRolePermissions,
            isSystem: false
        };
        setRoles([...roles, newRole]);
        setIsCreatingRole(false);
        setNewRoleName('');
        setNewRoleDescription('');
        setNewRolePermissions([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 bg-gray-50/50 px-6">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                             <button 
                                onClick={() => setActiveTab('sprints')} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'sprints' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Sprints for Review
                            </button>
                            <button 
                                onClick={() => setActiveTab('coaches')} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'coaches' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Coaches & Applicants
                            </button>
                           
                            <button 
                                onClick={() => setActiveTab('payouts')} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payouts' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Payouts
                            </button>
                             <button 
                                onClick={() => setActiveTab('roles')} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Roles & Permissions
                            </button>
                        </nav>
                    </div>
                    
                    <div className="p-6">
                         {activeTab === 'sprints' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Coach</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {MOCK_SPRINTS.filter(s => s.approvalStatus === 'pending_approval').length > 0 ? MOCK_SPRINTS.filter(s => s.approvalStatus === 'pending_approval').map((sprint: Sprint) => {
                                            const coach = MOCK_USERS.find(u => u.id === sprint.coachId);
                                            
                                            return (
                                                <tr key={sprint.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sprint.title}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{coach?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">₦{sprint.price.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide bg-blue-100 text-blue-700'}`}>
                                                            Pending Approval
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Link to={`/admin/sprint/review/${sprint.id}`}>
                                                            <Button variant="secondary" className="text-xs px-3 py-1.5 shadow-sm border-gray-300">Review</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No sprints are currently pending review.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'coaches' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {allCoaches.length > 0 ? allCoaches.map(coach => {
                                            const customRole = MOCK_ROLES.find(r => r.id === coach.roleDefinitionId);
                                            const isApproved = coach.role === UserRole.COACH 
                                                ? (coach as Coach).approved 
                                                : (coach as Participant).coachApproved;

                                            const displayRole = coach.role === UserRole.PARTICIPANT ? 'Participant (Applicant)' : (customRole ? customRole.name : 'Standard Coach');

                                            return (
                                                <tr key={coach.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 overflow-hidden border border-gray-200">
                                                                <img src={coach.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-gray-900">{coach.name}</div>
                                                                <div className="text-xs text-gray-500">{coach.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{displayRole}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide ${isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {isApproved ? 'Approved' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {isApproved ? (
                                                            <Button variant="danger" onClick={() => handleCoachStatusChange(coach.id, false)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border-red-100 hover:bg-red-100">Revoke</Button>
                                                        ) : (
                                                            <Button onClick={() => handleCoachStatusChange(coach.id, true)} className="text-xs px-3 py-1.5 shadow-sm">Approve</Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No coaches found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-900">Custom User Roles</h3>
                                    <Button onClick={() => setIsCreatingRole(true)}>+ Create New Role</Button>
                                </div>

                                {isCreatingRole && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 animate-fade-in">
                                        <h4 className="font-bold text-gray-900 mb-4">Define New Role</h4>
                                        <form onSubmit={handleCreateRole}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Role Name</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                                                        value={newRoleName}
                                                        onChange={(e) => setNewRoleName(e.target.value)}
                                                        placeholder="e.g. Content Moderator"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Base Layout</label>
                                                    <select 
                                                        className="w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                        value={newRoleBase}
                                                        onChange={(e) => setNewRoleBase(e.target.value as UserRole)}
                                                    >
                                                        <option value={UserRole.COACH}>Coach (Dashboard Layout)</option>
                                                        <option value={UserRole.PARTICIPANT}>Participant (App Layout)</option>
                                                        <option value={UserRole.ADMIN}>Admin (System Layout)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    value={newRoleDescription}
                                                    onChange={(e) => setNewRoleDescription(e.target.value)}
                                                    placeholder="What is this role for?"
                                                    required
                                                />
                                            </div>
                                            <div className="mb-6">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Permissions</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                                        <label key={perm.id} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={newRolePermissions.includes(perm.id)}
                                                                onChange={() => togglePermission(perm.id)}
                                                                className="rounded text-primary focus:ring-primary w-4 h-4"
                                                            />
                                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button type="submit">Save Role</Button>
                                                <Button type="button" variant="secondary" onClick={() => setIsCreatingRole(false)} className="bg-gray-100 border-gray-200">Cancel</Button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {roles.map(role => (
                                        <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative group hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-lg text-gray-900">{role.name}</h4>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.baseRole === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : role.baseRole === UserRole.COACH ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                        Base: {role.baseRole}
                                                    </span>
                                                </div>
                                                {role.isSystem && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">SYSTEM</span>}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                                            
                                            <div className="mb-4">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capabilities</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {role.permissions.length > 0 ? role.permissions.map(perm => (
                                                        <span key={perm} className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-600">
                                                            {perm.split(':')[1]}
                                                        </span>
                                                    )) : <span className="text-xs text-gray-400 italic">No specific permissions</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="border-t pt-4 flex gap-4">
                                                <button className="text-sm font-medium text-primary hover:underline">Edit</button>
                                                {!role.isSystem && <button className="text-sm font-medium text-red-500 hover:underline">Delete</button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        {activeTab === 'payouts' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Coach</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {MOCK_PAYOUTS.length > 0 ? MOCK_PAYOUTS.map((payout: Payout) => {
                                            const coach = MOCK_USERS.find(c => c.id === payout.coachId);
                                            return (
                                                <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{coach?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">₦{payout.amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(payout.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${payout.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {payout.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No payouts found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                  animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
