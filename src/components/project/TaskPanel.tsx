'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { Button, Input } from '@/components/ui';
import { X, Trash2, Calendar, User, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface TaskPanelProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export function TaskPanel({ task, onClose, onUpdate, onDelete }: TaskPanelProps) {
  const [formData, setFormData] = useState<Partial<Task>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        progress: task.progress,
        color: task.color,
      });
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    onUpdate({ ...task, ...formData });
  };

  const handleProgressChange = (value: number) => {
    setFormData(prev => ({ ...prev, progress: Math.max(0, Math.min(100, value)) }));
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Task Name */}
        <div>
          <Input
            label="Task Name"
            value={formData.name || ''}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter task name"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date || ''}
              onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Flag className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date || ''}
              onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Progress */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progress: {formData.progress || 0}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.progress || 0}
            onChange={e => handleProgressChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs text-gray-500">100%</span>
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={cn(
                  'w-8 h-8 rounded-full transition-transform hover:scale-110',
                  formData.color === color && 'ring-2 ring-offset-2 ring-gray-400'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Duration info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Duration</h3>
          {formData.start_date && formData.end_date && (
            <p className="text-sm text-gray-600">
              {Math.ceil(
                (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
              ) + 1} days
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
        <Button
          variant="ghost"
          onClick={() => onDelete(task.id)}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Task
        </Button>
      </div>
    </div>
  );
}
