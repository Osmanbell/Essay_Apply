import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  FileUp, 
  Settings as SettingsIcon, 
  Bell, 
  User, 
  LogOut, 
  BriefcaseBusiness,
  CreditCard,
  Menu,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { JobFeed } from './components/JobFeed';
import { CVUpload } from './components/CVUpload';
import { Subscription } from './components/Subscription';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { Settings } from './components/Settings';
import { JobTicker } from './components/JobTicker';
import { ProfileSetup } from './components/ProfileSetup';
import { useAuth } from './AuthContext';

export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const cvProfile = profile?.cvProfile || null;
  const isAdmin = profile?.subscription === 'admin' || user?.email === 'husmanbell@gmail.com';
  const userSubscription = isAdmin ? 'premium' : profile?.subscription || 'free';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  // Allow unauthenticated users to see the job feed
  const isAuthRequired = activeTab !== 'jobs';
  if (!user && isAuthRequired) {
    return <Login />;
  }

  if (user && !profile?.profileComplete && !cvProfile) {
    return <ProfileSetup />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Search', icon: Search },
    { id: 'cv', label: 'CV Analysis', icon: FileUp },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'jobs':
        return <JobFeed cvProfile={cvProfile || profile?.cvProfile} />;
      case 'cv':
        return <CVUpload onProfileUpdate={() => {}} />;
      case 'subscription':
        return <Subscription />;
      case 'admin':
        return isAdmin ? <AdminDashboard /> : <Dashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const recentActivities = [
    { id: 1, text: 'New job match: Senior AI Engineer at Google', time: '5m ago', type: 'match' },
    { id: 2, text: 'Application viewed by Interswitch HR', time: '2h ago', type: 'view' },
    { id: 3, text: 'CV Analysis complete: 92% optimization score', time: '5h ago', type: 'cv' },
    { id: 4, text: 'Subscription upgraded to Premium', time: '1d ago', type: 'billing' },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-white border-r border-gray-100 transition-all duration-300 flex flex-col fixed h-full z-50`}>
        <div className="p-8 flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shrink-0">
            <BriefcaseBusiness className="w-8 h-8 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">EasyApply</h1>
              <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest leading-tight">Your best Autonomous<br/>job Agent</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black transition-all group ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              <item.icon className={`w-6 h-6 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'}`} />
              {isSidebarOpen && <span className="animate-in fade-in duration-300">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {user ? (
            <button 
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all group"
            >
              <LogOut className="w-6 h-6 shrink-0 text-gray-400 group-hover:text-red-600" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all group"
            >
              <User className="w-6 h-6 shrink-0" />
              {isSidebarOpen && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-80' : 'ml-24'}`}>
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-12 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {isSidebarOpen ? <X className="w-6 h-6 text-gray-500" /> : <Menu className="w-6 h-6 text-gray-500" />}
            </button>
            <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-8">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-6 h-6 text-gray-500" />
                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-gray-900">Recent Activity</h3>
                    <button className="text-emerald-600 text-xs font-bold uppercase tracking-widest">Mark all as read</button>
                  </div>
                  <div className="space-y-4">
                    {recentActivities.map(activity => (
                      <div key={activity.id} className="flex gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{activity.text}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 py-3 bg-gray-50 text-gray-500 rounded-xl text-sm font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                    View All Notifications
                  </button>
                </div>
              )}
            </div>
            
            {/* User Menu */}
            <div className="flex items-center gap-4 pl-8 border-l border-gray-100 relative">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-900">{profile?.displayName || user?.email || 'Guest'}</p>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{userSubscription} Plan</p>
              </div>
              <button 
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-emerald-50 hover:border-emerald-200 transition-all"
              >
                {profile?.photoURL || user?.photoURL ? (
                  <img src={profile?.photoURL || user?.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-emerald-600" />
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-16 w-72 bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 z-50">
                  {user ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                          {profile?.photoURL || user?.photoURL ? (
                            <img src={profile?.photoURL || user?.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <User className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-black text-gray-900 truncate">{profile?.displayName || user?.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Current Plan</span>
                          <span className="text-xs font-black text-emerald-600 bg-white px-2 py-1 rounded-lg shadow-sm">{userSubscription}</span>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('subscription');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-emerald-600 transition-all"
                        >
                          <Zap className="w-4 h-4 text-emerald-400" />
                          Upgrade Plan
                        </button>
                      </div>

                      <div className="space-y-1">
                        <button 
                          onClick={() => {
                            setActiveTab('settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl text-sm font-bold transition-all"
                        >
                          <SettingsIcon className="w-4 h-4" />
                          Account Settings
                        </button>
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <p className="text-gray-500 font-medium">Sign in to access all features</p>
                      <button 
                        onClick={() => setActiveTab('dashboard')}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all"
                      >
                        Get Started
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-12 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      <JobTicker />
    </div>
  );
}
