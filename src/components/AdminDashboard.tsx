import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Search,
  Filter,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, addDoc, Timestamp, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

export function AdminDashboard() {
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const [searchStatus, setSearchStatus] = useState({ status: 'checking', count: 0 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      // Add to Firestore invitations collection
      await addDoc(collection(db, 'invitations'), {
        email: inviteEmail,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (error) {
      console.error("Error inviting user:", error);
      alert("Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  };
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalApplications: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    successRate: 0,
    failedEmails: 0
  });

  const handleIngestJobs = async () => {
    setIngesting(true);
    setIngestSuccess(false);
    try {
      // Step 1: Setup/Update Index Schema
      console.log("Setting up index schema...");
      const setupResponse = await fetch('/api/admin/setup-index', { method: 'POST' });
      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || "Failed to setup index schema");
      }

      // Step 2: Ingest Jobs
      console.log("Ingesting jobs...");
      const response = await fetch('/api/admin/ingest-jobs', { method: 'POST' });
      if (response.ok) {
        setIngestSuccess(true);
        // Refresh status
        const statusRes = await fetch('/api/admin/search-status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSearchStatus(statusData);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to ingest jobs");
      }
    } catch (error: any) {
      console.error("Ingestion failed:", error);
      alert(`Ingestion failed: ${error.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Stats (users, apps, search status)
        const statusRes = await fetch('/api/admin/search-status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSearchStatus(statusData);
        }

        // Fetch Users
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, orderBy('createdAt', 'desc'), limit(10));
        const usersSnapshot = await getDocs(qUsers);
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().displayName || 'Unknown',
          email: doc.data().email || 'No email',
          plan: doc.data().subscription || 'Free',
          status: doc.data().status || 'Active',
          joined: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
        }));
        setRecentUsers(users);

        // Fetch Recent Applications
        const appsRef = collectionGroup(db, 'applications');
        const qApps = query(appsRef, orderBy('appliedAt', 'desc'), limit(50));
        const appsSnapshot = await getDocs(qApps);
        const appsList = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setRecentApps(appsList);

        // Calculate Dynamic Stats
        const allUsers = await getDocs(collection(db, 'users'));
        const standardCount = allUsers.docs.filter(d => d.data().subscription === 'standard').length;
        const premiumCount = allUsers.docs.filter(d => d.data().subscription === 'premium').length;
        const failedCount = appsList.filter(a => a.deliveryStatus === 'failed' || a.status === 'failed').length;
        
        const monthlyRevenue = (standardCount * 19.99) + (premiumCount * 39.99);
        setStats({
          totalUsers: allUsers.size,
          activeSubscriptions: standardCount + premiumCount,
          totalApplications: appsList.length,
          monthlyRevenue,
          yearlyRevenue: monthlyRevenue * 12,
          successRate: appsList.length > 0 ? Math.round(((appsList.length - failedCount) / appsList.length) * 100) : 100,
          failedEmails: failedCount
        });

        // Fetch Invitations
        const inviteRef = collection(db, 'invitations');
        const qInvites = query(inviteRef, orderBy('createdAt', 'desc'), limit(10));
        const inviteSnapshot = await getDocs(qInvites);
        setInvitations(inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const revenueStats = [
    { label: 'Monthly Revenue', value: stats.monthlyRevenue, change: '+12.5%', trend: 'up' },
    { label: 'Yearly Revenue', value: stats.yearlyRevenue, change: '+8.2%', trend: 'up' },
    { label: 'Avg. Revenue Per User', value: 3427, change: '-2.1%', trend: 'down' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} color="bg-blue-500" />
        <StatCard label="Active Subs" value={stats.activeSubscriptions.toLocaleString()} icon={CreditCard} color="bg-emerald-500" />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle2} color="bg-emerald-600" />
        <StatCard label="Est. Revenue" value={`$${stats.monthlyRevenue.toFixed(2)}`} icon={TrendingUp} color="bg-orange-500" />
      </div>

      {/* Revenue Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {revenueStats.map((rev) => (
          <div key={rev.label} className="bg-white p-8 rounded-3xl border border-gray-100">
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mb-2">{rev.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-gray-900">₦{rev.value.toLocaleString()}</h3>
              <div className={`flex items-center gap-1 font-bold text-sm ${rev.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {rev.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {rev.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900">User Management</h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 w-64"
                />
              </div>
              <button className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <Filter className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Plan</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Joined</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        user.plan === 'Premium' ? 'bg-gray-900 text-white' : 
                        user.plan === 'Basic' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <span className="text-sm font-bold text-gray-700">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500 font-medium">{user.joined}</td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Usage */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Invite User
            </h3>
          </div>
          <div className="space-y-4 mb-8">
            <input 
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
            <button 
              onClick={handleInvite}
              disabled={inviting}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700 transition-all"
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Recent Invitations</h4>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="truncate pr-4">
                    <p className="text-sm font-bold text-gray-900 truncate">{invite.email}</p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {new Date(invite.createdAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    invite.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    invite.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {invite.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Usage */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              Usage Insights
            </h3>
            <button 
              onClick={handleIngestJobs}
              disabled={ingesting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                searchStatus.count > 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {ingesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : searchStatus.count > 0 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {ingesting ? 'Ingesting...' : searchStatus.count > 0 ? `${searchStatus.count} Jobs Active` : 'Sync Azure Search'}
            </button>
          </div>
          <div className="space-y-8">
            <UsageMetric label="AI Resume Generations" value="1,240" percentage={85} color="bg-emerald-500" />
            <UsageMetric label="Auto Applications" value="850" percentage={62} color="bg-blue-500" />
            <UsageMetric label="Cover Letter Tailoring" value="2,100" percentage={94} color="bg-purple-500" />
            <UsageMetric label="CV Profile Analysis" value="3,400" percentage={78} color="bg-orange-500" />
          </div>

          <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-sm font-bold text-emerald-800 mb-2">Pro Tip</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Premium users are 4x more likely to get interview invites. Consider running a promotion for Basic users to upgrade.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900">Live Application & Email Monitor</h3>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-black text-[10px] uppercase tracking-widest animate-pulse">
            Live Monitoring Active
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                <th className="px-8 py-4">Job / Company</th>
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Delivery Status</th>
                <th className="px-8 py-4">Conf. Sent</th>
                <th className="px-8 py-4">Applied At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-bold text-gray-900">{app.jobTitle}</p>
                      <p className="text-xs text-gray-500">{app.company}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-gray-700">{app.userEmail || 'User'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${app.deliveryStatus === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-black uppercase">{app.deliveryStatus || 'delivered'}</span>
                    </div>
                    {app.messageId && <p className="text-[10px] text-gray-400 mt-1 font-mono">{app.messageId}</p>}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${app.provider === 'ACS' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {app.provider || 'Graph'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-500 font-medium">
                    {app.appliedAt ? new Date(app.appliedAt.seconds * 1000).toLocaleString() : 'Just now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className={`${color} p-4 rounded-2xl text-white`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-3xl font-black text-gray-900 tracking-tight">{value}</span>
      </div>
      <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{label}</p>
    </div>
  );
}

function UsageMetric({ label, value, percentage, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
