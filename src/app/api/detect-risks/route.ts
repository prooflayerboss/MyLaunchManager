import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { partner, workstreams, milestones, notes, existingRisks, settings } = await request.json();

    if (!partner) {
      return NextResponse.json({ error: 'Partner data required' }, { status: 400 });
    }

    // Build context for risk analysis
    const context = {
      partnerName: partner.name,
      status: partner.status,
      targetLaunchDate: partner.target_launch_date,
      daysUntilLaunch: partner.target_launch_date
        ? Math.ceil((new Date(partner.target_launch_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      workstreams: workstreams?.map((w: any) => ({
        name: w.name,
        status: w.status,
        dueDate: w.due_date,
        notes: w.notes,
      })) || [],
      milestones: milestones?.map((m: any) => ({
        title: m.title,
        targetDate: m.target_date,
        status: m.status,
      })) || [],
      recentNotes: notes?.slice(0, 5).map((n: any) => ({
        title: n.title,
        date: n.meeting_date,
        summary: n.summary,
        actionItems: n.action_items?.filter((ai: any) => !ai.complete).map((ai: any) => ai.item) || [],
        decisions: n.decisions || [],
      })) || [],
      existingRisks: existingRisks?.filter((r: any) => r.status === 'open').map((r: any) => r.title) || [],
    };

    const systemPrompt = `You are an expert project risk analyst. Your job is to identify potential risks that may not have been explicitly documented.

Analyze the project data and identify NEW risks that aren't already tracked. Look for:
1. Timeline risks (tight deadlines, missed milestones)
2. Resource risks (blocked workstreams, overwhelmed teams)
3. Dependency risks (waiting on external parties)
4. Scope risks (unclear requirements, scope creep indicators)
5. Communication risks (infrequent meetings, unclear decisions)
6. Technical risks (integration issues, complexity)

Return a JSON object:
{
  "detectedRisks": [
    {
      "title": "Brief risk title",
      "description": "Detailed explanation of the risk",
      "severity": "low" | "medium" | "high" | "critical",
      "category": "timeline" | "resource" | "dependency" | "scope" | "communication" | "technical" | "other",
      "evidence": "What in the data suggests this risk",
      "mitigation": "Suggested mitigation approach"
    }
  ],
  "overallRiskLevel": "low" | "medium" | "high",
  "summary": "1-2 sentence overall risk assessment"
}

Rules:
- Only identify risks that are NOT already in existingRisks
- Be specific - vague risks aren't helpful
- Base severity on potential impact and likelihood
- If no significant risks are detected, return an empty array
- Maximum 5 risks`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyze this project for potential risks:\n\n${JSON.stringify(context, null, 2)}\n\nReturn ONLY valid JSON.`,
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
      return NextResponse.json({
        detectedRisks: [],
        overallRiskLevel: 'low',
        summary: 'Unable to analyze risks. Please review project manually.',
      });
    }

    // Validate and sanitize response
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const validCategories = ['timeline', 'resource', 'dependency', 'scope', 'communication', 'technical', 'other'];

    const sanitizedRisks = (parsed.detectedRisks || [])
      .slice(0, 5)
      .map((risk: any) => ({
        title: risk.title || 'Unnamed Risk',
        description: risk.description || '',
        severity: validSeverities.includes(risk.severity) ? risk.severity : 'medium',
        category: validCategories.includes(risk.category) ? risk.category : 'other',
        evidence: risk.evidence || '',
        mitigation: risk.mitigation || '',
      }));

    return NextResponse.json({
      detectedRisks: sanitizedRisks,
      overallRiskLevel: ['low', 'medium', 'high'].includes(parsed.overallRiskLevel) ? parsed.overallRiskLevel : 'medium',
      summary: parsed.summary || `Detected ${sanitizedRisks.length} potential risks.`,
    });
  } catch (error) {
    console.error('Risk detection error:', error);

    if (error instanceof Anthropic.APIError && error.status === 401) {
      return NextResponse.json(
        { error: 'AI service not configured. Please add ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze risks. Please try again.' },
      { status: 500 }
    );
  }
}
