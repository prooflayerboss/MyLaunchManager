'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types';
import {
  Bell, MessageSquare, UserPlus, AlertTriangle, Calendar,
  CheckCircle, Activity, Settings, X, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function NotificationsDropdown() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, archiveNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'team_invite':
        return <UserPlus className="w-4 h-4" />;
      case 'risk_alert':
        return <AlertTriangle className="w-4 h-4" />;
      case 'due_date':
      case 'milestone_reminder':
        return <Calendar className="w-4 h-4" />;
      case 'status_change':
      case 'health_change':
        return <Activity className="w-4 h-4" />;
      case 'assignment':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'risk_alert':
        return '#EF4444';
      case 'mention':
      case 'comment':
        return '#3B82F6';
      case 'team_invite':
        return '#8B5CF6';
      case 'due_date':
      case 'milestone_reminder':
        return '#F59E0B';
      case 'health_change':
        return '#22C55E';
      default:
        return 'var(--text-muted)';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#EF4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium"
                style={{ color: 'var(--accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-3 p-4 transition-colors cursor-pointer group ${!notification.read_at ? 'bg-[var(--accent-soft)]' : ''}`}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${getNotificationColor(notification.type)}20`, color: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {notification.action_url ? (
                        <Link href={notification.action_url} onClick={() => setIsOpen(false)}>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {notification.title}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {notification.title}
                        </p>
                      )}
                      {notification.body && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read_at && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveNotification(notification.id);
                        }}
                        className="p-1 rounded hover:bg-gray-100"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read_at && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 text-center" style={{ borderTop: '1px solid var(--border)' }}>
              <Link
                href="/notifications"
                className="text-sm font-medium"
                style={{ color: 'var(--accent)' }}
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
