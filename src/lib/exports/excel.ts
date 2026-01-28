import ExcelJS from 'exceljs';
import { Task, Milestone } from '@/types';
import { format, parseISO, differenceInDays } from 'date-fns';

export async function exportToExcel(
  tasks: Task[],
  milestones: Milestone[],
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ChartSimple';
  workbook.created = new Date();

  // Tasks sheet
  const tasksSheet = workbook.addWorksheet('Tasks', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Set up columns with styling
  tasksSheet.columns = [
    { header: 'Task Name', key: 'name', width: 35 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'End Date', key: 'endDate', width: 15 },
    { header: 'Duration (days)', key: 'duration', width: 15 },
    { header: 'Progress', key: 'progress', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Style header row
  const headerRow = tasksSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '3B82F6' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  // Add task data
  tasks.forEach((task, index) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);
    const duration = differenceInDays(endDate, startDate) + 1;

    let status: string;
    if (task.progress === 100) {
      status = 'Complete';
    } else if (task.progress > 0) {
      status = 'In Progress';
    } else {
      status = 'Not Started';
    }

    const row = tasksSheet.addRow({
      name: task.name,
      startDate: format(startDate, 'MMM d, yyyy'),
      endDate: format(endDate, 'MMM d, yyyy'),
      duration,
      progress: `${task.progress}%`,
      status,
    });

    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F9FAFB' },
      };
    }

    // Color the progress cell based on value
    const progressCell = row.getCell('progress');
    if (task.progress === 100) {
      progressCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D1FAE5' },
      };
    } else if (task.progress > 0) {
      progressCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FEF3C7' },
      };
    }

    // Color status cell
    const statusCell = row.getCell('status');
    if (status === 'Complete') {
      statusCell.font = { color: { argb: '059669' } };
    } else if (status === 'In Progress') {
      statusCell.font = { color: { argb: 'D97706' } };
    } else {
      statusCell.font = { color: { argb: '6B7280' } };
    }

    row.alignment = { vertical: 'middle' };
    row.height = 25;
  });

  // Add borders to all cells
  tasksSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } },
      };
    });
  });

  // Milestones sheet (if any)
  if (milestones.length > 0) {
    const milestonesSheet = workbook.addWorksheet('Milestones', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    milestonesSheet.columns = [
      { header: 'Milestone', key: 'name', width: 35 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    const msHeaderRow = milestonesSheet.getRow(1);
    msHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    msHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F59E0B' },
    };
    msHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    msHeaderRow.height = 30;

    milestones.forEach((milestone, index) => {
      const row = milestonesSheet.addRow({
        name: milestone.name,
        date: format(parseISO(milestone.date), 'MMM d, yyyy'),
      });

      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F9FAFB' },
        };
      }

      row.alignment = { vertical: 'middle' };
      row.height = 25;
    });

    milestonesSheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } },
        };
      });
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
