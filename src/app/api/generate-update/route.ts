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

    const notesContext = notesToUse?.length > 0
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

    // Different prompts for different update types
    const prompts: Record<UpdateType, string> = {
      sync_recap: `You are a launch/program manager. Generate a brief Slack message for your internal team channel after a sync meeting with ${partner.name}.

${baseContext}

---

Generate a SHORT Slack update (max 150 words) that:
- Uses a casual but professional tone suitable for internal Slack
- Starts with a brief one-liner summary (e.g., "Just wrapped sync with ${partner.name} 🤝")
- Highlights 2-3 key takeaways or updates from the most recent meeting
- Notes any blockers or needs from our side
- Lists immediate next steps or action items

Use emoji sparingly (1-2 max). Keep it scannable with bullet points. This is for your team, not the customer.`,

      eow_update: `You are a launch/program manager. Generate an end-of-week (EOW) Friday update for ${partner.name} to share in your team's Slack channel.

${baseContext}

---

Generate a Friday EOW update (max 250 words) in this format:

**${partner.name} - EOW Update**

📊 **Status:** [One line overall status]

**This Week:**
• [Key accomplishments, meetings, decisions]

**Blockers/Risks:**
• [Any issues needing attention]

**Next Week:**
• [Planned activities, upcoming milestones]

**Action Items:**
• [Outstanding items with owners if known]

Keep it concise and scannable. Use emoji headers for visual clarity. Focus on progress made this week and what's coming next.`,

      email_recap: `You are a launch/program manager. Draft a professional email recap to send to ${partner.name}'s team after your recent meeting.

${baseContext}

---

Generate a professional email recap that:
- Has a clear subject line suggestion at the top
- Thanks them for their time
- Summarizes the key discussion points and decisions made
- Lists agreed-upon action items with owners and due dates where discussed
- Notes any follow-up meetings or next steps
- Maintains a warm but professional tone
- Is suitable to send directly to the customer

Format:
**Subject:** [Suggested subject line]

[Email body]

Keep it under 300 words. This should be ready to copy-paste and send.`,

      status_summary: `You are a launch/program manager. Create a comprehensive current status summary for ${partner.name} based on all available information.

${baseContext}

---

Generate a detailed status summary (300-400 words) that provides a complete picture of where this ${partnerLabel.toLowerCase()} stands:

**Executive Summary**
[2-3 sentence overview of current state and trajectory]

**Timeline & Progress**
- Where are we in the launch journey?
- What percentage of workstreams are complete?
- Are we on track for the target launch date?

**Key Themes from Recent Discussions**
[Analyze meeting notes/transcripts to identify recurring themes, priorities, or concerns]

**Relationship Health**
- What's working well?
- What needs attention?
- Customer sentiment based on recent interactions

**Risk Assessment**
[Summary of current risks and mitigation status]

**Recommendations**
[2-3 specific recommendations based on the current state]

This is an internal document for strategic planning, so be candid and analytical.`,

      general: `You are a launch/program manager assistant. Generate a concise, professional status update for stakeholders based on the following ${partnerLabel.toLowerCase()} data.

${baseContext}

---

Generate a status update that:
1. Summarizes the current state and recent progress based on meeting notes/transcripts
2. Highlights key decisions made or discussions from recent meetings
3. Lists any blockers, risks, or concerns
4. Notes upcoming milestones or deadlines
5. Lists open action items that need attention

Keep it concise (under 300 words) and suitable for sharing in Slack or email. Use bullet points for readability. Focus on what's most important for stakeholders to know.

If there's substantive content in the meeting notes/transcripts, extract and summarize the key points. Don't just list titles - actually analyze the content.`
    };

    const prompt = prompts[updateType as UpdateType] || prompts.general;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
