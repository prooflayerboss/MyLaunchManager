import { NextRequest, NextResponse } from 'next/server';

interface ParsedTask {
  task_id: string;
  phase: string;
  name: string;
  description: string;
  owner: string;
  start_date: string;
  end_date: string;
  status: string;
  dependencies: string[];
  notes: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Please upload a CSV file' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));

    // Find column indices
    const columnMap: Record<string, number> = {};
    const expectedColumns = ['task_id', 'phase', 'task_name', 'description', 'owner', 'start_date', 'end_date', 'status', 'dependencies', 'notes'];

    headers.forEach((header, index) => {
      // Handle common variations
      const normalized = header
        .replace('task_id', 'task_id')
        .replace('taskid', 'task_id')
        .replace('id', headers.includes('task_id') ? 'id' : 'task_id')
        .replace('task_name', 'name')
        .replace('taskname', 'name')
        .replace('name', 'name')
        .replace('start_date', 'start_date')
        .replace('startdate', 'start_date')
        .replace('start', headers.includes('start_date') ? 'start' : 'start_date')
        .replace('end_date', 'end_date')
        .replace('enddate', 'end_date')
        .replace('end', headers.includes('end_date') ? 'end' : 'end_date')
        .replace('dep', 'dependencies');

      columnMap[header] = index;
    });

    // Parse data rows
    const tasks: ParsedTask[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 3) continue; // Skip incomplete rows

      const getValue = (possibleHeaders: string[]): string => {
        for (const h of possibleHeaders) {
          const idx = headers.indexOf(h);
          if (idx !== -1 && values[idx]) {
            return values[idx];
          }
        }
        return '';
      };

      const taskId = getValue(['task_id', 'taskid', 'id']) || String(i);
      const phase = getValue(['phase', 'category', 'group']);
      const name = getValue(['task_name', 'taskname', 'name', 'title']);
      const description = getValue(['description', 'desc', 'details']);
      const owner = getValue(['owner', 'assignee', 'assigned_to', 'responsible']);
      const startDate = getValue(['start_date', 'startdate', 'start', 'begin']);
      const endDate = getValue(['end_date', 'enddate', 'end', 'due', 'due_date']);
      const status = getValue(['status', 'state']);
      const dependencies = getValue(['dependencies', 'dep', 'depends_on', 'blockers']);
      const notes = getValue(['notes', 'note', 'comments', 'comment']);

      // Parse dependencies - can be comma-separated numbers or "None"
      const parsedDeps = dependencies.toLowerCase() === 'none' || !dependencies
        ? []
        : dependencies.split(',').map(d => d.trim()).filter(d => d);

      // Normalize status
      let normalizedStatus = 'not_started';
      const statusLower = status.toLowerCase();
      if (statusLower.includes('complete') || statusLower.includes('done')) {
        normalizedStatus = 'complete';
      } else if (statusLower.includes('progress') || statusLower.includes('active')) {
        normalizedStatus = 'in_progress';
      } else if (statusLower.includes('block')) {
        normalizedStatus = 'blocked';
      }

      if (name) {
        tasks.push({
          task_id: taskId,
          phase,
          name,
          description,
          owner,
          start_date: startDate,
          end_date: endDate,
          status: normalizedStatus,
          dependencies: parsedDeps,
          notes,
        });
      }
    }

    // Extract unique phases for grouping
    const phases = [...new Set(tasks.map(t => t.phase).filter(p => p))];

    return NextResponse.json({
      tasks,
      phases,
      taskCount: tasks.length,
    });
  } catch (error: any) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json(
      { error: `Failed to parse CSV: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
