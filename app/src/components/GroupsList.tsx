import { useState, useEffect } from 'react';
import { Calendar, Users, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import GroupDetailsModal from './GroupDetailsModal';

interface GroupsListProps {
    coachId?: string;
    showAll?: boolean;
    onEdit?: (group: any) => void;
    onGroupClick?: (group: any) => void;
}

export default function GroupsList({ coachId, showAll = false, onEdit, onGroupClick }: GroupsListProps) {
    const { t, i18n } = useTranslation();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    useEffect(() => {
        let channel: any;

        const fetchGroups = async (silent = false) => {
            if (!silent) setLoading(true);
            let query = supabase
                .from('training_groups')
                .select(`
                    *,
                    coaches(full_name, role),
                    students(id, full_name, birth_date)
                `);

            if (!showAll && coachId) {
                query = query.eq('coach_id', coachId);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching groups:', error);
            } else {
                // Filter out groups where the coach is a 'reception' or 'cleaner' 
                // but keep everything else (especially roles like 'coach' or 'head_coach')
                const filtered = (data || []).filter(group => {
                    const coachRole = group.coaches?.role?.toLowerCase().trim();
                    return coachRole !== 'reception' && coachRole !== 'receptionist' && coachRole !== 'cleaner';
                });
                setGroups(filtered);
            }
            setLoading(false);

            // Realtime for specifically filtered or all groups
            const channelName = showAll ? 'all_groups_realtime' : `coach_groups_${coachId}`;
            channel = supabase.channel(channelName)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'training_groups',
                    ...(showAll ? {} : { filter: `coach_id=eq.${coachId}` })
                }, () => {
                    fetchGroups(true);
                })
                .subscribe();
        };

        fetchGroups();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [coachId, showAll]);

    const parseSchedule = (scheduleKey: string) => {
        if (!scheduleKey) return [];
        return scheduleKey.split('|').map(s => {
            const parts = s.split(':');
            if (parts.length >= 5) {
                // New format: day:startH:startM:endH:endM
                return {
                    day: parts[0],
                    startTime: `${parts[1]}:${parts[2]}`,
                    endTime: `${parts[3]}:${parts[4]}`
                };
            }
            // Legacy format: day:startTime:endTime
            return { day: parts[0], startTime: parts[1], endTime: parts[2] };
        });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr || timeStr.toLowerCase().includes('undefined')) return '';
        const parts = timeStr.split(':');
        if (parts.length < 1) return '';

        let hour = parseInt(parts[0]);
        let minute = parts[1] || '00';

        if (isNaN(hour)) return '';

        const ampm = hour >= 12 ? (i18n.language === 'ar' ? 'م' : 'PM') : (i18n.language === 'ar' ? 'ص' : 'AM');
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minute} ${ampm}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/5 flex items-center justify-center text-white/20">
                        <Users className="w-10 h-10" />
                    </div>
                    <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No groups found</p>
                </div>
            ) : groups.map((group) => {
                const schedules = parseSchedule(group.schedule_key);
                return (
                    <div
                        key={group.id}
                        onClick={() => {
                            if (onGroupClick) {
                                onGroupClick(group);
                            } else {
                                setSelectedGroup(group);
                            }
                        }}
                        className="group relative glass-card p-6 rounded-[2rem] border border-white/10 hover:border-accent/40 transition-all duration-500 cursor-pointer overflow-hidden active:scale-95"
                    >
                        {/* Interactive Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-accent/10 rounded-2xl text-accent border border-accent/20 group-hover:scale-110 transition-transform duration-500">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 shadow-inner">
                                    <Users className="w-3.5 h-3.5 text-white/30" />
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{group.students?.length || 0}</span>
                                </div>
                            </div>

                            <h3 className="font-black text-white text-lg tracking-tighter mb-4 uppercase group-hover:text-accent transition-colors">
                                {group.name}
                            </h3>

                            <div className="space-y-2.5">
                                {schedules.map((s, idx) => {
                                    const fStart = formatTime(s.startTime);
                                    const fEnd = formatTime(s.endTime);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mt-0.5">{s.day}</span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-white/40 tracking-tight">
                                                {fStart} - {fEnd}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">
                                    {group.coaches?.full_name ? `Coach ${group.coaches.full_name.split(' ')[0]}` : 'Details'}
                                </p>
                                <ChevronRight className="w-4 h-4 text-accent transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </div>
                );
            })}
            {selectedGroup && (
                <GroupDetailsModal
                    group={selectedGroup}
                    onClose={() => setSelectedGroup(null)}
                    onEdit={onEdit ? () => {
                        onEdit(selectedGroup);
                        setSelectedGroup(null);
                    } : undefined}
                />
            )}
        </div>
    );
}
