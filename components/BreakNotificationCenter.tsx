'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Coffee, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from './SharedUI';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: Date;
    type: 'breakIn' | 'breakOff';
}

export const BreakNotificationCenter: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationShownRef = useRef<{ breakIn: boolean; breakOff: boolean }>({ breakIn: false, breakOff: false });
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

        // Create audio element for notification sound
        useEffect(() => {
            // Create a beep sound using Web Audio API
            const createBeepSound = (frequency: number = 800, duration: number = 0.3) => {
                try {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);
                } catch (error) {
                    console.error('Error playing sound:', error);
                }
            };

            // Store function for later use with different frequencies for different notification types
            (window as any).playNotificationSound = (type: 'breakIn' | 'breakOff' = 'breakIn') => {
                const frequency = type === 'breakIn' ? 800 : 600;
                createBeepSound(frequency, 0.4);
                // Play twice for better attention
                setTimeout(() => createBeepSound(frequency, 0.4), 200);
            };
        }, []);

    useEffect(() => {
        if (!user) return;

        // Request notification permission
        const requestPermission = async () => {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
            }
        };
        requestPermission();

        // Function to parse time string
        const parseTime = (timeStr: string): Date | null => {
            if (!timeStr) return null;
            try {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
            } catch {
                return null;
            }
        };

        // Function to format time
        const formatTime = (timeStr: string): string => {
            if (!timeStr) return '';
            try {
                const [h, m] = timeStr.split(':').map(Number);
                const date = new Date();
                date.setHours(h, m);
                return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch {
                return timeStr;
            }
        };

        // Function to play sound
        const playSound = (type: 'breakIn' | 'breakOff') => {
            if ((window as any).playNotificationSound) {
                (window as any).playNotificationSound(type);
            }
        };

        // Function to add notification to history
        const addNotification = (title: string, message: string, type: 'breakIn' | 'breakOff') => {
            const newNotification: NotificationItem = {
                id: Date.now().toString(),
                title,
                message,
                time: new Date(),
                type
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
            setUnreadCount(prev => prev + 1);
        };

        // Function to show notification
        const showNotification = (title: string, body: string, type: 'breakIn' | 'breakOff') => {
            console.log('🔔 showNotification called:', { title, body, type, permission: Notification.permission });
            
            // Play sound first
            playSound(type);
            console.log('🔊 Sound played');

            // Add to notification history
            addNotification(title, body, type);
            console.log('📝 Added to notification history');

            // Show browser notification
            if (!('Notification' in window)) {
                console.log('❌ Browser does not support notifications');
                return;
            }

            if (Notification.permission === 'granted') {
                try {
                    console.log('✅ Creating browser notification');
                    const notification = new Notification(title, {
                        body,
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png',
                        tag: `break-${type}-${Date.now()}`, // Unique tag
                        requireInteraction: false,
                        silent: false,
                    });

                    console.log('✅ Browser notification created successfully');

                    notification.onclick = () => {
                        window.focus();
                        setIsOpen(true);
                        notification.close();
                    };

                    notification.onerror = (error) => {
                        console.error('❌ Notification error:', error);
                    };

                    setTimeout(() => {
                        notification.close();
                    }, 15000);
                } catch (error) {
                    console.error('❌ Error creating notification:', error);
                }
            } else if (Notification.permission === 'default') {
                console.log('⚠️ Requesting notification permission');
                Notification.requestPermission().then(permission => {
                    console.log('Permission result:', permission);
                    if (permission === 'granted') {
                        showNotification(title, body, type);
                    }
                });
            } else {
                console.log('❌ Notification permission denied:', Notification.permission);
            }
        };

        // Function to check break times
        const checkBreakTimes = () => {
            if (!user?.break_in || !user?.break_off) return;

            const now = new Date();
            const breakInTime = parseTime(user.break_in);
            const breakOffTime = parseTime(user.break_off);

            if (!breakInTime || !breakOffTime) return;

            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const breakInMinutes = breakInTime.getHours() * 60 + breakInTime.getMinutes();
            const breakOffMinutes = breakOffTime.getHours() * 60 + breakOffTime.getMinutes();

            // Debug logging
            console.log('Break time check:', {
                current: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                breakIn: user.break_in,
                breakOff: user.break_off,
                nowMinutes,
                breakInMinutes,
                breakOffMinutes,
                diffIn: nowMinutes - breakInMinutes,
                diffOff: nowMinutes - breakOffMinutes,
                notificationPermission: Notification.permission,
                breakInFlag: notificationShownRef.current.breakIn,
                breakOffFlag: notificationShownRef.current.breakOff
            });

            // Check break in (at time or up to 15 minutes after - wider window)
            const breakInWindowStart = breakInMinutes;
            const breakInWindowEnd = breakInMinutes + 15;
            
            if (nowMinutes >= breakInWindowStart && nowMinutes <= breakInWindowEnd) {
                if (!notificationShownRef.current.breakIn) {
                    console.log('✅ Triggering break in notification - Time matched!');
                    showNotification(
                        'Break Time Started! ☕',
                        `Your break time has started. Break window: ${formatTime(user.break_in)} - ${formatTime(user.break_off)}`,
                        'breakIn'
                    );
                    notificationShownRef.current.breakIn = true;
                }
            } else if (nowMinutes > breakInWindowEnd) {
                // Reset flag if we're well past the break in window
                if (notificationShownRef.current.breakIn) {
                    console.log('Resetting break in flag');
                }
                notificationShownRef.current.breakIn = false;
            } else {
                // Before break in time
                notificationShownRef.current.breakIn = false;
            }

            // Check break off (at time or up to 15 minutes after - wider window)
            const breakOffWindowStart = breakOffMinutes;
            const breakOffWindowEnd = breakOffMinutes + 15;
            
            if (nowMinutes >= breakOffWindowStart && nowMinutes <= breakOffWindowEnd) {
                if (!notificationShownRef.current.breakOff) {
                    console.log('✅ Triggering break off notification - Time matched!');
                    showNotification(
                        'Break Time Ending! ⏰',
                        `Your break time is ending. Please return to work. Break ends at ${formatTime(user.break_off)}`,
                        'breakOff'
                    );
                    notificationShownRef.current.breakOff = true;
                }
            } else if (nowMinutes > breakOffWindowEnd) {
                // Reset flag if we're well past the break off window
                if (notificationShownRef.current.breakOff) {
                    console.log('Resetting break off flag');
                }
                notificationShownRef.current.breakOff = false;
            } else {
                // Before break off time
                notificationShownRef.current.breakOff = false;
            }
        };

        // Check immediately
        checkBreakTimes();

        // Check every 5 seconds for accurate timing
        checkIntervalRef.current = setInterval(checkBreakTimes, 5000);
        
        // Also check when page becomes visible (in case user was away)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                checkBreakTimes();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Cleanup
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [user]);

    // Reset flags at midnight
    useEffect(() => {
        const resetAtMidnight = () => {
            notificationShownRef.current = { breakIn: false, breakOff: false };
        };

        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const msUntilMidnight = midnight.getTime() - now.getTime();

        const timeout = setTimeout(() => {
            resetAtMidnight();
            setInterval(resetAtMidnight, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);

        return () => clearTimeout(timeout);
    }, []);

    const handleNotificationClick = () => {
        setIsOpen(true);
        setUnreadCount(0);
    };

    const formatNotificationTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <button
                onClick={handleNotificationClick}
                className="relative p-2 hover:bg-zinc-100 rounded-xl transition-all"
                title="Break Notifications"
            >
                <Bell size={20} className="text-zinc-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Break Notifications">
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell size={48} className="mx-auto text-zinc-300 mb-4" />
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 rounded-2xl border-2 ${
                                        notif.type === 'breakIn'
                                            ? 'bg-emerald-50 border-emerald-100'
                                            : 'bg-amber-50 border-amber-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            notif.type === 'breakIn' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}>
                                            {notif.type === 'breakIn' ? (
                                                <Coffee size={20} className="text-white" />
                                            ) : (
                                                <Clock size={20} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-black uppercase tracking-tight mb-1">
                                                {notif.title}
                                            </h4>
                                            <p className="text-[10px] font-bold text-zinc-600 mb-2">
                                                {notif.message}
                                            </p>
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                                {formatNotificationTime(notif.time)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};
