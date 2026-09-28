import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Check, Crown, ShieldCheck, Sparkles, Zap, Loader2, Calendar, CreditCard } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

interface PlanCardProps {
  plan: any;
  billingCycle: 'monthly' | 'yearly';
  user: any;
  profile: any;
  onSuccess: (plan: any) => Promise<void>;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, billingCycle, user, profile, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const amount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  
  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: amount * 100, // Convert to kobo
    publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_800faa4f92a07a8ae5ee7696637bb6a963d97798',
    currency: 'NGN',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = async () => {
    if (plan.active) return;
    
    if (plan.id === 'free') {
      setLoading(true);
      try {
        await onSuccess(plan);
      } finally {
        setLoading(false);
      }
      return;
    }

    const paymentSuccess = async (reference: any) => {
      setLoading(true);
      try {
        await onSuccess(plan);
      } finally {
        setLoading(false);
      }
    };

    const onClose = () => console.log('Payment closed');

    initializePayment({ onSuccess: paymentSuccess, onClose });
  };

  return (
    <div 
      className={`relative rounded-3xl p-8 border border-gray-100 transition-all duration-300 hover:scale-105 flex flex-col ${
        plan.highlight ? 'bg-gray-900 text-white ring-4 ring-emerald-500/20' : 'bg-white text-gray-900'
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-black flex items-center">
          <Crown className="w-4 h-4 mr-2" />
          BEST VALUE
        </div>
      )}

      <div className="space-y-6 flex-1">
        <div>
          <h3 className="text-2xl font-black">{plan.name}</h3>
          <div className="flex items-baseline mt-2">
            <span className="text-4xl font-black">
              ₦{(billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice).toLocaleString()}
            </span>
            <span className="text-gray-500 ml-1 font-bold">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        </div>

        <ul className="space-y-4 py-6 border-y border-gray-100/10">
          {plan.features.map((feature: string) => (
            <li key={feature} className="flex items-start gap-3">
              <div className="bg-emerald-100 p-1 rounded-full shrink-0 mt-1">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="font-medium text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handlePayment}
        disabled={plan.active || loading}
        className={`w-full mt-8 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center ${
          plan.active 
            ? 'bg-gray-100 text-gray-400 cursor-default' 
            : plan.highlight 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : plan.button}
      </button>
    </div>
  );
}

export function Subscription() {
  const { user, profile } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: ['Basic Job Search', 'CV Upload', '3 AI Matches/day'],
      button: profile?.subscription === 'free' ? 'Current Plan' : 'Switch to Free',
      active: profile?.subscription === 'free',
      color: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      id: 'basic',
      name: 'Basic',
      monthlyPrice: 2500,
      yearlyPrice: 25000,
      features: ['Unlimited AI Matches', 'Tailored Resume (5/mo)', 'Tailored Cover Letter (5/mo)', 'Priority Job Alerts'],
      button: profile?.subscription === 'basic' ? 'Current Plan' : 'Upgrade to Basic',
      active: profile?.subscription === 'basic',
      color: 'bg-emerald-600',
      textColor: 'text-white',
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 5000,
      yearlyPrice: 50000,
      features: ['Everything in Basic', 'Unlimited Resumes & Letters', 'Auto Apply AI Agent', 'Direct Recruiter Access', '24/7 Priority Support'],
      button: profile?.subscription === 'premium' ? 'Current Plan' : 'Upgrade to Premium',
      active: profile?.subscription === 'premium',
      color: 'bg-gray-900',
      textColor: 'text-white',
      highlight: true,
    },
  ];

  const handleSuccess = async (plan: any) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          subscription: plan.id,
          billingCycle: billingCycle,
          updatedAt: Timestamp.now(),
        });
        alert(`Subscription to ${plan.name} successful!`);
        window.location.reload();
      } catch (error) {
        console.error('Subscription update error:', error);
        alert('Payment successful, but failed to update profile. Please contact support.');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <h2 className="text-5xl font-black text-gray-900 tracking-tight">Elevate Your Career</h2>
        <p className="text-gray-500 text-xl font-medium max-w-2xl mx-auto">
          Choose the plan that fits your professional goals and let our AI agents handle the rest.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={`font-bold ${billingCycle === 'monthly' ? 'text-emerald-600' : 'text-gray-400'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-16 h-8 bg-emerald-100 rounded-full relative p-1 transition-all"
          >
            <div className={`w-6 h-6 bg-emerald-600 rounded-full transition-all ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`} />
          </button>
          <span className={`font-bold ${billingCycle === 'yearly' ? 'text-emerald-600' : 'text-gray-400'}`}>
            Yearly <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <PlanCard 
            key={plan.id} 
            plan={plan} 
            billingCycle={billingCycle} 
            user={user} 
            profile={profile}
            onSuccess={handleSuccess}
          />
        ))}
      </div>

      <div className="bg-emerald-50 rounded-3xl p-10 border border-emerald-100 flex flex-col md:flex-row items-center gap-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <ShieldCheck className="w-12 h-12 text-emerald-600" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-black text-gray-900 mb-2">Secure Payments with Paystack</h4>
          <p className="text-gray-600 font-medium">
            We use industry-standard encryption to protect your payment information. 
            Subscriptions are billed in Naira (NGN) and can be cancelled at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
