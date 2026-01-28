import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

interface ProjectTask {
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

const STATUS_COLORS: Record<string, string> = {
  complete: '22C55E',
  in_progress: '3B82F6',
  blocked: 'EF4444',
  not_started: '6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  complete: 'Complete',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  not_started: 'Not Started',
};

export async function POST(request: NextRequest) {
  try {
    const { tasks, partnerName } = await request.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'My Launch Manager';
    workbook.created = new Date();

    // Create Project Plan sheet
    const sheet = workbook.addWorksheet('Project Plan', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    // Define columns
    // A: ID, B: Phase, C: Task Name, D: Owner, E: Start Date, F: End Date, G: Status, H: Description, I: Dependencies, J: Notes
    sheet.columns = [
      { header: 'ID', key: 'task_id', width: 6 },
      { header: 'Phase', key: 'phase', width: 20 },
      { header: 'Task Name', key: 'name', width: 40 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Start Date', key: 'start_date', width: 12 },
      { header: 'End Date', key: 'end_date', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Dependencies', key: 'dependencies', width: 15 },
      { header: 'Notes', key: 'notes', width: 50 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E54D2E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Add data rows
    let currentPhase = '';
    tasks.forEach((task: ProjectTask, index: number) => {
      const row = sheet.addRow({
        task_id: task.task_id,
        phase: task.phase,
        name: task.name,
        description: task.description || '',
        owner: task.owner || '',
        start_date: task.start_date,
        end_date: task.end_date,
        status: STATUS_LABELS[task.status] || task.status,
        dependencies: task.dependencies?.join(', ') || '',
        notes: task.notes || '',
      });

      // Alternate row colors for readability
      const isEvenRow = index % 2 === 0;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFFFFF' : 'F9FAFB' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        };
      });

      // Color the status cell based on status
      const statusCell = row.getCell('status');
      const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.not_started;
      statusCell.font = { color: { argb: statusColor }, bold: true };

      // Add phase separator styling
      if (task.phase !== currentPhase) {
        currentPhase = task.phase;
        row.getCell('phase').font = { bold: true };
      }

      row.height = 24;
      row.alignment = { vertical: 'middle', wrapText: true };
    });

    // Add borders to all cells
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } },
        };
      });
    });

    // Create Gantt sheet
    const ganttSheet = workbook.addWorksheet('Gantt Chart', {
      views: [{ state: 'frozen', xSplit: 5, ySplit: 1 }],
    });

    // Find date range
    const dates = tasks.flatMap((t: ProjectTask) => [new Date(t.start_date), new Date(t.end_date)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Generate week columns
    const weeks: Date[] = [];
    const current = new Date(minDate);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday

    while (current <= maxDate) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    // Set up columns
    const ganttColumns: Partial<ExcelJS.Column>[] = [
      { header: 'ID', key: 'task_id', width: 6 },
      { header: 'Phase', key: 'phase', width: 18 },
      { header: 'Task Name', key: 'name', width: 32 },
      { header: 'Owner', key: 'owner', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    weeks.forEach((week, i) => {
      const weekStr = week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ganttColumns.push({ header: weekStr, key: `week_${i}`, width: 4 });
    });

    ganttSheet.columns = ganttColumns;

    // Style Gantt header
    const ganttHeaderRow = ganttSheet.getRow(1);
    ganttHeaderRow.font = { bold: true, size: 9 };
    ganttHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F3F4F6' },
    };
    ganttHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    ganttHeaderRow.height = 24;

    // Add Gantt rows
    tasks.forEach((task: ProjectTask, index: number) => {
      const rowData: Record<string, string> = {
        task_id: task.task_id,
        phase: task.phase || '',
        name: task.name,
        owner: task.owner || '',
        status: STATUS_LABELS[task.status] || task.status,
      };

      const row = ganttSheet.addRow(rowData);
      row.height = 22;

      // Color task bars
      const taskStart = new Date(task.start_date);
      const taskEnd = new Date(task.end_date);
      const barColor = STATUS_COLORS[task.status] || '3B82F6';

      weeks.forEach((week, weekIndex) => {
        const weekEnd = new Date(week);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const cell = row.getCell(`week_${weekIndex}`);

        // Check if task spans this week
        if (taskStart <= weekEnd && taskEnd >= week) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: barColor },
          };
        }
      });

      // Style status cell
      const statusCell = row.getCell('status');
      statusCell.font = { color: { argb: STATUS_COLORS[task.status] || '6B7280' }, bold: true, size: 9 };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    const fileName = `${partnerName || 'Project'}_Plan_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting project plan:', error);
    return NextResponse.json(
      { error: `Failed to export: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
