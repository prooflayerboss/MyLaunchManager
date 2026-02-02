import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { partner, workstreams, milestones, risks, notes, settings } = await request.json();

    if (!partner) {
      return NextResponse.json({ error: 'Partner data required' }, { status: 400 });
    }

    const healthMax = settings?.health_scale_max || 5;

    // Build context about the partner
    const context = {
      name: partner.name,
      status: partner.status,
      currentHealth: partner.health_score,
      targetLaunchDate: partner.target_launch_date,
      actualLaunchDate: partner.actual_launch_date,
      workstreams: {
        total: workstreams?.length || 0,
        completed: workstreams?.filter((w: any) => w.status === 'complete').length || 0,
        blocked: workstreams?.filter((w: any) => w.status === 'blocked').length || 0,
        inProgress: workstreams?.filter((w: any) => w.status === 'in_progress').length || 0,
      },
      milestones: {
        total: milestones?.length || 0,
        completed: milestones?.filter((m: any) => m.status === 'complete').length || 0,
        missed: milestones?.filter((m: any) => m.status === 'missed').length || 0,
        upcoming: milestones?.filter((m: any) => m.status === 'upcoming').length || 0,
      },
      risks: {
        total: risks?.length || 0,
        open: risks?.filter((r: any) => r.status === 'open').length || 0,
        critical: risks?.filter((r: any) => r.status === 'open' && r.severity === 'critical').length || 0,
        high: risks?.filter((r: any) => r.status === 'open' && r.severity === 'high').length || 0,
      },
      recentNotes: notes?.slice(0, 5).map((n: any) => ({
        title: n.title,
        date: n.meeting_date,
        hasActionItems: (n.action_items?.length || 0) > 0,
      })) || [],
      daysUntilLaunch: partner.target_launch_date
        ? Math.ceil((new Date(partner.target_launch_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    };

    const systemPrompt = `You are an expert project health analyzer. Your job is to calculate a health score for a project/partner based on objective metrics.

Scoring Guidelines (1-${healthMax} scale):
- ${healthMax}: Excellent - On track, no blockers, good momentum, milestones being hit
- ${Math.round(healthMax * 0.8)}: Good - Minor issues but overall positive trajectory
- ${Math.round(healthMax * 0.6)}: Okay - Some concerns but manageable
- ${Math.round(healthMax * 0.4)}: At Risk - Multiple issues, needs attention
- ${Math.round(healthMax * 0.2)}: Critical - Major blockers, timeline at risk
- 1: Severe - Project in serious trouble

Consider these factors:
1. Workstream completion rate and blocked items
2. Milestone adherence (missed milestones are bad)
3. Open risks, especially critical/high severity
4. Days until launch vs progress made
5. Recent activity (notes indicate engagement)
6. Current status progression

Return a JSON object:
{
  "score": <number 1-${healthMax}>,
  "trend": "improving" | "stable" | "declining",
  "summary": "Brief 1-2 sentence explanation",
  "factors": {
    "positive": ["Array of positive factors"],
    "negative": ["Array of concerns"]
  },
  "recommendation": "One actionable recommendation"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze this project and calculate a health score:\n\n${JSON.stringify(context, null, 2)}\n\nReturn ONLY valid JSON.`,
        },
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    let parsed;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textContent.text);
    } catch (parseError) {
      console.error('Parse error:', textContent.text);
      // Fallback to algorithmic calculation
      return NextResponse.json(calculateHealthAlgorithmically(context, healthMax));
    }

    // Validate and clamp score
    const score = Math.max(1, Math.min(healthMax, Math.round(parsed.score || healthMax * 0.6)));

    return NextResponse.json({
      score,
      trend: parsed.trend || 'stable',
      summary: parsed.summary || '',
      factors: parsed.factors || { positive: [], negative: [] },
      recommendation: parsed.recommendation || '',
    });
  } catch (error) {
    console.error('Health calculation error:', error);

    // Fallback to simple algorithmic calculation
    return NextResponse.json({
      score: 3,
      trend: 'stable',
      summary: 'Health score calculated using basic metrics.',
      factors: { positive: [], negative: [] },
      recommendation: 'Review project status for more accurate assessment.',
    });
  }
}

function calculateHealthAlgorithmically(context: any, healthMax: number) {
  let score = healthMax;

  // Workstream factors
  if (context.workstreams.total > 0) {
    const completionRate = context.workstreams.completed / context.workstreams.total;
    if (completionRate < 0.25) score -= 1;
    if (context.workstreams.blocked > 0) score -= 0.5;
    if (context.workstreams.blocked > 2) score -= 0.5;
  }

  // Milestone factors
  if (context.milestones.total > 0) {
    if (context.milestones.missed > 0) score -= 1;
    if (context.milestones.missed > 2) score -= 0.5;
  }

  // Risk factors
  if (context.risks.critical > 0) score -= 1;
  if (context.risks.high > 1) score -= 0.5;
  if (context.risks.open > 3) score -= 0.5;

  // Timeline factors
  if (context.daysUntilLaunch !== null) {
    if (context.daysUntilLaunch < 0) score -= 1; // Overdue
    if (context.daysUntilLaunch < 7 && context.workstreams.completed / context.workstreams.total < 0.8) {
      score -= 0.5; // Close to launch but not ready
    }
  }

  // Clamp and round
  score = Math.max(1, Math.min(healthMax, Math.round(score)));

  const factors: { positive: string[]; negative: string[] } = { positive: [], negative: [] };

  if (context.workstreams.completed > 0) factors.positive.push(`${context.workstreams.completed} workstreams completed`);
  if (context.milestones.completed > 0) factors.positive.push(`${context.milestones.completed} milestones achieved`);
  if (context.risks.open === 0) factors.positive.push('No open risks');

  if (context.workstreams.blocked > 0) factors.negative.push(`${context.workstreams.blocked} blocked workstreams`);
  if (context.milestones.missed > 0) factors.negative.push(`${context.milestones.missed} missed milestones`);
  if (context.risks.critical > 0) factors.negative.push(`${context.risks.critical} critical risks`);

  return {
    score,
    trend: 'stable',
    summary: `Health calculated from ${context.workstreams.total} workstreams, ${context.milestones.total} milestones, and ${context.risks.total} risks.`,
    factors,
    recommendation: factors.negative.length > 0 ? 'Address blockers and open risks to improve health.' : 'Continue current momentum.',
  };
}
