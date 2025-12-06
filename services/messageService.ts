import { supabase } from './supabaseClient';
import { Message, Notification } from '../types';

export const messageService = {
    // Send a message to a course
    async sendMessage(courseId: string, title: string, content: string) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        // 1. Insert the message
        const { data: message, error: msgError } = await supabase
            .from('messages')
            .insert([
                {
                    course_id: courseId,
                    sender_id: userData.user.id,
                    title,
                    content,
                },
            ])
            .select()
            .single();

        if (msgError) throw msgError;

        // 2. Create notifications for all students in the course
        // First, get all students enrolled in the course
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('student_uid')
            .eq('course_id', courseId);

        if (enrollError) throw enrollError;

        if (enrollments && enrollments.length > 0) {
            const notifications = enrollments.map((enrollment) => ({
                user_id: enrollment.student_uid,
                title: `New Announcement: ${title}`,
                message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                type: 'info',
            }));

            const { error: notifyError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (notifyError) console.error('Error sending notifications:', notifyError);
        }

        return message;
    },

    // Get messages for a course (for students)
    async getCourseMessages(courseId: string) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[]; // Type casting needed due to snake_case -> camelCase mapping if not handled globally
    },

    // Get notifications for the current user
    async getNotifications() {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            isRead: n.is_read,
            type: n.type,
            createdAt: n.created_at
        })) as Notification[];
    },

    // Mark notification as read
    async markNotificationRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    }
};
