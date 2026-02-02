'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tag } from '@/types';
import { X, Plus, Tag as TagIcon, Check } from 'lucide-react';

interface TagsInputProps {
  partnerId: string;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280',
];

export function TagsInput({ partnerId, selectedTags, onTagsChange }: TagsInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch all tags
  useEffect(() => {
    const fetchTags = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (data) {
        setAllTags(data);
      }
    };
    fetchTags();
  }, [supabase]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name: newTagName.trim(),
        color: selectedColor,
      })
      .select()
      .single();

    if (data && !error) {
      setAllTags([...allTags, data]);
      // Also add to selected
      handleToggleTag(data);
      setNewTagName('');
      setSelectedColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    }

    setCreating(false);
  };

  const handleToggleTag = async (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);

    if (isSelected) {
      // Remove tag
      await supabase
        .from('partner_tags')
        .delete()
        .eq('partner_id', partnerId)
        .eq('tag_id', tag.id);

      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // Add tag
      await supabase
        .from('partner_tags')
        .insert({
          partner_id: partnerId,
          tag_id: tag.id,
        });

      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = async (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase
      .from('partner_tags')
      .delete()
      .eq('partner_id', partnerId)
      .eq('tag_id', tag.id);

    onTagsChange(selectedTags.filter(t => t.id !== tag.id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: `${tag.color}20`, color: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => handleRemoveTag(tag, e)}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          <Plus className="w-3 h-3" />
          Add tag
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-64 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          {/* Create New Tag */}
          <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="flex-1 px-2 py-1.5 rounded text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creating}
                className="px-2 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {creating ? '...' : 'Add'}
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${selectedColor === color ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          {/* Existing Tags */}
          <div className="max-h-48 overflow-y-auto">
            {allTags.length === 0 ? (
              <p className="p-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                No tags yet. Create one above!
              </p>
            ) : (
              <div className="p-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag)}
                      className="w-full flex items-center justify-between p-2 rounded-lg transition-colors"
                      style={{ background: isSelected ? 'var(--bg-secondary)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: tag.color }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {tag.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
