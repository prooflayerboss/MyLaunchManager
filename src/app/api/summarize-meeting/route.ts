import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { transcript, context } = await request.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a meeting transcript with at least 50 characters.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert meeting note analyzer. Your job is to extract structured information from meeting transcripts and notes.

You must return a JSON object with the following structure:
{
  "title": "Brief meeting title (max 60 chars)",
  "summary": "2-4 sentence executive summary of the meeting",
  "key_points": ["Array of 3-7 key discussion points"],
  "action_items": [
    {
      "item": "Description of the action item",
      "owner": "Person responsible (or 'TBD' if unclear)",
      "due_date": "Date in YYYY-MM-DD format if mentioned, or null"
    }
  ],
  "decisions": ["Array of decisions made during the meeting"],
  "risks_concerns": ["Array of risks or concerns raised"],
  "next_steps": ["Array of agreed next steps"],
  "attendees": ["Array of people who attended, if mentioned"]
}

Rules:
- Extract ONLY information that is explicitly stated or strongly implied in the transcript
- Do NOT make up or assume information
- For action items, extract the owner if clearly assigned, otherwise use "TBD"
- Keep the summary concise and factual
- If certain sections have no relevant content, use empty arrays
- Dates should be in YYYY-MM-DD format when specified`;

    const userPrompt = `${context ? `Context about this ${context.partnerLabel || 'partner'}: ${context.partnerName || 'Unknown'}\n\n` : ''}Please analyze this meeting transcript and extract structured notes:

<transcript>
${transcript}
</transcript>

Return ONLY valid JSON, no other text.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    let parsed;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(textContent.text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        { error: 'Failed to parse meeting summary. Please try again.' },
        { status: 500 }
      );
    }

    // Validate required fields
    const result = {
      title: parsed.title || 'Meeting Notes',
      summary: parsed.summary || '',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items.map((item: any) => ({
            id: crypto.randomUUID(),
            item: item.item || item.description || '',
            owner: item.owner || 'TBD',
            due_date: item.due_date || null,
            complete: false,
          }))
        : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      risks_concerns: Array.isArray(parsed.risks_concerns) ? parsed.risks_concerns : [],
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Meeting summary error:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'AI service not configured. Please add ANTHROPIC_API_KEY.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to summarize meeting. Please try again.' },
      { status: 500 }
    );
  }
}
