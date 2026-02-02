'use client';

import { useState } from 'react';
import { Check, Zap, Users, Building2, Sparkles } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      'Up to 3 active projects',
      'Basic project tracking',
      'Gantt chart view',
      'CSV import/export',
      'Email support',
    ],
    limits: {
      projects: 3,
      teamMembers: 1,
      aiGenerations: 10,
    },
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    description: 'For growing teams',
    features: [
      'Unlimited projects',
      'AI-powered updates & summaries',
      'Project plan generation',
      'Custom templates',
      'Priority support',
      'Advanced analytics',
      'Client portal access',
    ],
    limits: {
      projects: -1,
      teamMembers: 1,
      aiGenerations: 100,
    },
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 79,
    description: 'For collaborative teams',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Team collaboration',
      'Role-based permissions',
      'Activity feed',
      'Comments & mentions',
      'Shared templates',
      'API access',
    ],
    limits: {
      projects: -1,
      teamMembers: 10,
      aiGenerations: 500,
    },
    cta: 'Upgrade to Team',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'For large organizations',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO / SAML',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Custom branding',
      'On-premise option',
    ],
    limits: {
      projects: -1,
      teamMembers: -1,
      aiGenerations: -1,
    },
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const currentPlan = 'free'; // TODO: Get from user settings

  const getPrice = (basePrice: number | null) => {
    if (basePrice === null) return 'Custom';
    if (basePrice === 0) return 'Free';
    const price = billingPeriod === 'yearly' ? Math.round(basePrice * 0.8) : basePrice;
    return `$${price}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Choose Your Plan
        </h1>
        <p className="max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Start free and upgrade as you grow. All plans include a 14-day free trial of Pro features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-10">
        <span
          className={`text-sm font-medium ${billingPeriod === 'monthly' ? '' : 'opacity-50'}`}
          style={{ color: 'var(--text-primary)' }}
        >
          Monthly
        </span>
        <button
          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-14 h-7 rounded-full transition-colors"
          style={{ background: billingPeriod === 'yearly' ? 'var(--accent)' : 'var(--border)' }}
        >
          <div
            className="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: billingPeriod === 'yearly' ? 'translateX(28px)' : 'translateX(4px)' }}
          />
        </button>
        <span
          className={`text-sm font-medium ${billingPeriod === 'yearly' ? '' : 'opacity-50'}`}
          style={{ color: 'var(--text-primary)' }}
        >
          Yearly
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            Save 20%
          </span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl transition-all ${plan.popular ? 'ring-2 ring-[#E54D2E]' : ''}`}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {plan.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {getPrice(plan.price)}
                </span>
                {plan.price !== null && plan.price > 0 && (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    /month
                  </span>
                )}
              </div>

              <button
                disabled={isCurrentPlan}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                style={{
                  background: plan.popular ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: plan.popular ? 'white' : 'var(--text-primary)',
                  border: plan.popular ? 'none' : '1px solid var(--border)',
                }}
              >
                {isCurrentPlan ? 'Current Plan' : plan.cta}
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
          Frequently Asked Questions
        </h2>
        <div className="max-w-2xl mx-auto space-y-4">
          <FAQItem
            question="Can I switch plans at any time?"
            answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences."
          />
          <FAQItem
            question="What happens to my data if I downgrade?"
            answer="Your data is always safe. If you downgrade to a plan with fewer project limits, you won't lose any data, but you'll need to archive some projects to stay within limits."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund."
          />
          <FAQItem
            question="How does the AI generation limit work?"
            answer="AI generations include features like status updates, meeting summaries, and project plan generation. The counter resets monthly."
          />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--accent-soft), #8B5CF620)' }}>
        <Sparkles className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Not sure which plan is right for you?
        </h3>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Book a demo and we'll help you find the perfect fit for your team.
        </p>
        <button
          className="px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Schedule a Demo
        </button>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{question}</span>
        <span
          className="text-xl transition-transform"
          style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{answer}</p>
        </div>
      )}
    </div>
  );
}
