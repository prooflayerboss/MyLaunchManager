import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { partner, workstreams, milestones, settings } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI features not configured. Please add ANTHROPIC_API_KEY to environment.' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const partnerLabel = settings?.partner_label || 'Partner';

    // Build context from available data
    const workstreamsContext = workstreams?.length > 0
      ? workstreams.map((w: any) => `- ${w.name} (Status: ${w.status}${w.due_date ? `, Due: ${w.due_date}` : ''})`).join('\n')
      : 'No workstreams defined';

    const milestonesContext = milestones?.length > 0
      ? milestones.map((m: any) => `- ${m.title}: ${m.target_date}`).join('\n')
      : 'No milestones defined';

    const today = new Date().toISOString().split('T')[0];
    const targetDate = partner.target_launch_date || null;

    const prompt = `You are a launch/program manager creating a project plan for ${partner.name}.

## Context
- ${partnerLabel} Name: ${partner.name}
- Status: ${partner.status}
- Target Launch Date: ${targetDate || 'Not set'}
- Today's Date: ${today}

## Existing Workstreams
${workstreamsContext}

## Existing Milestones
${milestonesContext}

---

Generate a detailed project plan with tasks organized by phases. The plan should be realistic and actionable.

RULES:
1. Create 15-25 tasks organized into 4-6 logical phases
2. Each task should have realistic start and end dates
3. If a target launch date is set, work backwards from it
4. If no target launch date, start from today and create a 12-week plan
5. Use the existing workstreams as phase names if they exist, otherwise create standard launch phases
6. Task durations should be realistic (most tasks 3-14 days)
7. Include typical launch activities: kickoff, requirements, design, build, testing, training, go-live prep, launch

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "task_id": "1",
    "phase": "Phase Name",
    "name": "Task Name",
    "description": "Brief description of the task",
    "owner": "",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "status": "not_started",
    "dependencies": [],
    "notes": ""
  }
]

Status must be one of: not_started, in_progress, blocked, complete
Dates must be in YYYY-MM-DD format.
Task IDs should be sequential numbers as strings ("1", "2", etc.)`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a project planning assistant. You ONLY output valid JSON arrays. No markdown, no explanations, no code blocks - just the raw JSON array.',
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const content = message.content[0];
    const responseText = content.type === 'text' ? content.text : '';

    // Parse the JSON response
    let tasks;
    try {
      // Clean up response - remove any markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      tasks = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI-generated plan. Please try again.' },
        { status: 500 }
      );
    }

    // Validate the structure
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'AI generated an invalid plan. Please try again.' },
        { status: 500 }
      );
    }

    // Ensure all required fields exist
    const validatedTasks = tasks.map((task: any, index: number) => ({
      task_id: task.task_id || String(index + 1),
      phase: task.phase || 'General',
      name: task.name || 'Untitled Task',
      description: task.description || null,
      owner: task.owner || null,
      start_date: task.start_date || today,
      end_date: task.end_date || today,
      status: ['not_started', 'in_progress', 'blocked', 'complete'].includes(task.status)
        ? task.status
        : 'not_started',
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      notes: task.notes || null,
    }));

    return NextResponse.json({ tasks: validatedTasks });
  } catch (error: any) {
    console.error('Error generating project plan:', error);
    return NextResponse.json(
      { error: `Failed to generate project plan: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
