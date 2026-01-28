import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type UpdateType = 'sync_recap' | 'eow_update' | 'email_recap' | 'status_summary' | 'general';

export async function POST(request: NextRequest) {
  try {
    const { partner, notes, workstreams, risks, milestones, settings, updateType = 'general', selectedNoteId } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not found in environment');
      return NextResponse.json(
        { error: 'AI features not configured. Please add ANTHROPIC_API_KEY to environment.' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const partnerLabel = settings?.partner_label || 'Partner';
    const workstreamLabel = settings?.workstream_label || 'Workstream';

    // Format notes - for email recap, focus on the selected note
    const notesToUse = selectedNoteId
      ? notes?.filter((n: any) => n.id === selectedNoteId)
      : notes;

    // Check if we have meaningful content to work with
    const hasNotes = notesToUse?.length > 0;
    const hasNotesWithContent = notesToUse?.some((n: any) => n.summary || n.raw_content);
    const hasWorkstreams = workstreams?.length > 0;
    const hasRisks = risks?.filter((r: any) => r.status === 'open')?.length > 0;
    const hasMilestones = milestones?.length > 0;

    // For update types that require meeting data, block if no notes exist
    const requiresNotes = ['sync_recap', 'eow_update', 'email_recap'].includes(updateType);

    if (requiresNotes && !hasNotesWithContent) {
      return NextResponse.json(
        {
          error: 'No meeting notes or transcripts found. Please add notes in the Notes tab before generating this update type.',
          noData: true
        },
        { status: 400 }
      );
    }

    // For status summary, we need at least some data
    if (updateType === 'status_summary' && !hasNotesWithContent && !hasWorkstreams && !hasRisks && !hasMilestones) {
      return NextResponse.json(
        {
          error: 'Not enough data to generate a status summary. Please add meeting notes, workstreams, risks, or milestones first.',
          noData: true
        },
        { status: 400 }
      );
    }

    const notesContext = hasNotes
      ? notesToUse.map((n: any) => `
### ${n.title} (${n.meeting_date})
${n.summary ? `Summary: ${n.summary}` : ''}
${n.raw_content ? `\nTranscript/Notes:\n${n.raw_content.substring(0, 4000)}${n.raw_content.length > 4000 ? '...' : ''}` : ''}
${n.action_items?.length > 0 ? `\nAction Items:\n${n.action_items.map((ai: any) => `- ${ai.item} (Owner: ${ai.owner || 'Unassigned'}${ai.complete ? ' - DONE' : ''})`).join('\n')}` : ''}
`).join('\n')
      : 'No meeting notes recorded yet.';

    const workstreamsContext = workstreams?.length > 0
      ? workstreams.map((w: any) => `- ${w.name}: ${w.status.replace('_', ' ')}${w.due_date ? ` (Due: ${w.due_date})` : ''}${w.notes ? ` - ${w.notes}` : ''}`).join('\n')
      : 'No workstreams defined yet.';

    const risksContext = risks?.filter((r: any) => r.status === 'open')?.length > 0
      ? risks.filter((r: any) => r.status === 'open').map((r: any) => `- [${r.severity.toUpperCase()}] ${r.title}${r.description ? `: ${r.description}` : ''}${r.mitigation_plan ? ` (Mitigation: ${r.mitigation_plan})` : ''}`).join('\n')
      : 'No open risks.';

    const milestonesContext = milestones?.length > 0
      ? milestones.map((m: any) => `- ${m.title}: ${m.target_date} (${m.status})`).join('\n')
      : 'No milestones defined.';

    // Base context for all prompts
    const baseContext = `## ${partnerLabel} Information
- Name: ${partner.name}
- Status: ${partner.status}
- Health Score: ${partner.health_score}/5
- Target Launch Date: ${partner.target_launch_date || 'Not set'}
- Primary Contact: ${partner.primary_contact_name || 'Not set'}

## ${workstreamLabel}s
${workstreamsContext}

## Meeting Notes & Transcripts
${notesContext}

## Open Risks
${risksContext}

## Milestones
${milestonesContext}`;

    // Anti-hallucination guardrail - added to all prompts
    const noHallucinationRule = `
CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information explicitly provided in the data above. DO NOT invent, assume, or hallucinate any details.
2. If specific information is not provided (dates, names, decisions, action items), do NOT make it up.
3. Only reference meetings, discussions, or decisions that are explicitly documented in the notes/transcripts.
4. If the data is sparse, keep your output brief and factual rather than padding with invented details.
5. Never invent quotes, specific dates, or commitments that aren't in the provided data.
`;

    // Different prompts for different update types
    const prompts: Record<UpdateType, string> = {
      sync_recap: `You are a launch/program manager. Generate a brief Slack message for your internal team channel after a sync meeting with ${partner.name}.

${baseContext}

---
${noHallucinationRule}

Generate a SHORT Slack update (max 150 words) that:
- Uses a casual but professional tone suitable for internal Slack
- Starts with a brief one-liner summary (e.g., "Just wrapped sync with ${partner.name} 🤝")
- Highlights 2-3 key takeaways or updates from the most recent meeting notes
- Notes any blockers or needs from our side (only if mentioned in the notes)
- Lists immediate next steps or action items (only those explicitly documented)

Use emoji sparingly (1-2 max). Keep it scannable with bullet points. This is for your team, not the customer.`,

      eow_update: `You are a launch/program manager. Generate an end-of-week (EOW) Friday update for ${partner.name} to share in your team's Slack channel.

${baseContext}

---
${noHallucinationRule}

Generate a Friday EOW update (max 250 words) in this format:

**${partner.name} - EOW Update**

📊 **Status:** [One line overall status based on documented data]

**This Week:**
• [Key accomplishments, meetings, decisions - ONLY from the provided notes]

**Blockers/Risks:**
• [Any issues documented in notes or risks section - say "None documented" if none]

**Next Week:**
• [Planned activities from notes or milestones - say "To be determined" if not documented]

**Action Items:**
• [Outstanding items with owners - ONLY those explicitly listed in the data]

Keep it concise and scannable. Use emoji headers for visual clarity. Only include information that is explicitly documented.`,

      email_recap: `You are a launch/program manager. Draft a professional email recap to send to ${partner.name}'s team after your recent meeting.

${baseContext}

---
${noHallucinationRule}

Generate a professional email recap that:
- Has a clear subject line suggestion at the top
- Thanks them for their time
- Summarizes ONLY the key discussion points and decisions that are documented in the notes
- Lists ONLY agreed-upon action items that are explicitly documented with owners
- Notes any follow-up meetings or next steps that were explicitly discussed
- Maintains a warm but professional tone
- Is suitable to send directly to the customer

Format:
**Subject:** [Suggested subject line]

[Email body]

Keep it under 300 words. Only include facts from the meeting notes. Do not invent any details.`,

      status_summary: `You are a launch/program manager. Create a comprehensive current status summary for ${partner.name} based on all available information.

${baseContext}

---
${noHallucinationRule}

Generate a detailed status summary (300-400 words) that provides a complete picture of where this ${partnerLabel.toLowerCase()} stands. ONLY use information provided above.

**Executive Summary**
[2-3 sentence overview based ONLY on documented data]

**Timeline & Progress**
- Where are we in the launch journey? (based on workstream statuses)
- What percentage of workstreams are complete? (calculate from actual data)
- Are we on track for the target launch date? (only if date is set)

**Key Themes from Recent Discussions**
[Analyze ONLY documented meeting notes/transcripts - if none exist, state "No meeting notes documented"]

**Relationship Health**
- Health score: ${partner.health_score}/5
- Based on documented interactions only

**Risk Assessment**
[Summary of DOCUMENTED risks only - if none, state "No risks documented"]

**Recommendations**
[Only make recommendations that can be supported by the documented data]

This is an internal document. Be factual and only reference documented information.`,

      general: `You are a launch/program manager assistant. Generate a concise, professional status update for stakeholders based on the following ${partnerLabel.toLowerCase()} data.

${baseContext}

---
${noHallucinationRule}

Generate a status update that:
1. Summarizes the current state based ONLY on documented information
2. Highlights key decisions made or discussions - ONLY those documented in the notes
3. Lists any blockers or risks that are explicitly documented
4. Notes upcoming milestones or deadlines from the documented data
5. Lists ONLY action items that are explicitly documented

Keep it concise (under 300 words) and suitable for sharing in Slack or email. Use bullet points for readability.

IMPORTANT: If sections have no documented data, either skip them or note "Not documented". Never invent or assume details that aren't in the provided data.`
    };

    const prompt = prompts[updateType as UpdateType] || prompts.general;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are a helpful assistant that ONLY uses information explicitly provided. You NEVER invent, hallucinate, or assume details that are not in the provided data. If information is missing, you acknowledge it rather than making it up.',
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = message.content[0];
    const generatedText = content.type === 'text' ? content.text : '';

    return NextResponse.json({ update: generatedText });
  } catch (error: any) {
    console.error('Error generating update:', error);
    return NextResponse.json(
      { error: `Failed to generate update: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
