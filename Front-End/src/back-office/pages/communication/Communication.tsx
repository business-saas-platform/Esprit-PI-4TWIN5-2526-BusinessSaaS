import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBusinessContext } from '@/shared/contexts/BusinessContext';
import {
  Search, Plus, ChevronDown, Trash2, MoreHorizontal,
  Send, Smile, Paperclip, AtSign, Calendar, Mic,
  Video, Phone, Monitor, MicOff, VideoOff, PhoneOff,
  Hash, Users, Lock, Globe, X, Check, Clock,
  ChevronLeft, ChevronRight, Bell, Settings,
  UserPlus, CalendarDays, AlarmClock, Repeat,
  Pin, Reply, Forward, Zap, Eye, MicIcon, Square,
  MessageSquare, Sparkles, BellOff,
} from 'lucide-react';

const API_BASE = ((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '');
const SOCKET_URL = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ─── TYPES ────────────────────────────────────────────────
interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  isDefault: boolean;
  memberIds: string[];
  description?: string;
}
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  type: string;
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToContent?: string;
  replyToSender?: string;
  isPinned?: boolean;
  readBy?: string[];
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '💯'];
interface OnlinePeer { userId: string; userName: string; stream?: MediaStream; }
interface Meeting {
  id: string;
  title: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  channelId: string;
  channelName: string;
  attendees: string[];
  recurring?: 'none' | 'daily' | 'weekly';
  description?: string;
}

// ─── HELPERS ──────────────────────────────────────────────
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

function Avatar({ name, size = 'md', id }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; id?: string }) {
  const sz = { xs: 24, sm: 30, md: 36, lg: 48 }[size];
  const fs = { xs: 10, sm: 11, md: 13, lg: 16 }[size];
  const color = id ? getAvatarColor(id) : getAvatarColor(name);
  return (
    <div style={{ width: sz, height: sz, background: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: fs, flexShrink: 0, fontFamily: 'inherit' }}>
      {getInitials(name)}
    </div>
  );
}

function VideoTile({ stream, label, muted = false }: { stream: MediaStream | null; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div style={{ position: 'relative', background: '#111827', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {stream ? <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Avatar name={label} size="lg" />}
      <div style={{ position: 'absolute', bottom: 8, left: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{label}</div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────
function CalendarView({ meetings, onSchedule, channels }: { meetings: Meeting[]; onSchedule: (m: Meeting) => void; channels: Channel[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [form, setForm] = useState({ title: '', date: '', time: '10:00', duration: 30, channelId: '', description: '', recurring: 'none' as Meeting['recurring'] });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const getMeetingsForDay = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return meetings.filter(m => m.date === dateStr);
  };

  const handleDayClick = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSelectedDay(new Date(year, month, d));
    setForm(f => ({ ...f, date: dateStr }));
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.date || !form.channelId) return;
    const ch = channels.find(c => c.id === form.channelId);
    onSchedule({
      id: `meet-${Date.now()}`,
      title: form.title,
      date: form.date,
      time: form.time,
      duration: form.duration,
      channelId: form.channelId,
      channelName: ch?.name || '',
      attendees: ch?.memberIds || [],
      recurring: form.recurring,
      description: form.description,
    });
    setShowForm(false);
    setForm({ title: '', date: '', time: '10:00', duration: 30, channelId: '', description: '', recurring: 'none' });
  };

  const todayMeetings = meetings.filter(m => m.date === today.toISOString().slice(0, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>Calendar</h2>
          <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{todayMeetings.length} meetings today</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, date: today.toISOString().slice(0, 10) })); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{monthNames[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronRight size={16} /></button>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {dayNames.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>)}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dayMeetings = getMeetingsForDay(d);
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <button key={d} onClick={() => handleDayClick(d)}
                  style={{ minHeight: 56, padding: '4px 6px', background: isToday ? '#eef2ff' : '#fafafa', border: isToday ? '1.5px solid #6366f1' : '1px solid #f0f0f0', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#6366f1' : '#333', marginBottom: 3 }}>{d}</div>
                  {dayMeetings.slice(0, 2).map(m => (
                    <div key={m.id} style={{ fontSize: 10, background: '#6366f1', color: '#fff', borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{m.time} {m.title}</div>
                  ))}
                  {dayMeetings.length > 2 && <div style={{ fontSize: 10, color: '#6366f1' }}>+{dayMeetings.length - 2} more</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming meetings sidebar */}
        <div style={{ width: 220, borderLeft: '1px solid #f0f0f0', padding: '16px 14px', overflowY: 'auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Upcoming</p>
          {meetings.length === 0 ? (
            <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 24 }}>No meetings scheduled</p>
          ) : meetings.sort((a, b) => `${a.date}${a.time}` > `${b.date}${b.time}` ? 1 : -1).slice(0, 10).map(m => (
            <div key={m.id} style={{ marginBottom: 10, padding: '8px 10px', background: '#fafafa', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#111', margin: '0 0 2px' }}>{m.title}</p>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{m.date} · {m.time}</p>
              <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>#{m.channelName} · {m.duration}min</p>
              {m.recurring !== 'none' && <span style={{ fontSize: 10, background: '#eef2ff', color: '#6366f1', borderRadius: 4, padding: '1px 5px' }}>{m.recurring}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Schedule Meeting</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
            </div>

            {[
              { label: 'Title', type: 'text', key: 'title', placeholder: 'Meeting title...' },
              { label: 'Date', type: 'date', key: 'date', placeholder: '' },
              { label: 'Time', type: 'time', key: 'time', placeholder: '' },
            ].map(({ label, type, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Duration (minutes)</label>
              <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none' }}>
                {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Channel</label>
              <select value={form.channelId} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none' }}>
                <option value=''>Select channel...</option>
                {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Recurring</label>
              <select value={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.value as any }))}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none' }}>
                <option value='none'>Does not repeat</option>
                <option value='daily'>Daily</option>
                <option value='weekly'>Weekly</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Description</label>
              <textarea placeholder='Optional...' value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' }}>Cancel</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 12, background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CREATE CHANNEL MODAL ─────────────────────────────────
function CreateChannelModal({ onClose, onCreate, user }: { onClose: () => void; onCreate: (data: { name: string; type: 'public' | 'private'; description: string; memberIds: string[] }) => void; user: any; }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (type !== 'private') return;
    setLoadingMembers(true);
    fetch(`${API_BASE}/team-members`, {
      headers: { 
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        ...(user?.businessId ? { 'x-business-id': user.businessId } : {})
      }
    })
      .then(res => res.json())
      .then(data => setMembers(Array.isArray(data) ? data : data.data || []))
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
  }, [type, user?.businessId]);

  const toggleMember = (id: string) => {
    setMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 400, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Create Channel</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {(['public', 'private'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: type === t ? '#fff' : 'transparent', color: type === t ? '#6366f1' : '#777', boxShadow: type === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s' }}>
              {t === 'public' ? <Globe size={13} /> : <Lock size={13} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Channel Name</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <span style={{ padding: '0 10px', color: '#aaa', fontSize: 14 }}>#</span>
            <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder='channel-name' style={{ flex: 1, padding: '9px 8px 9px 0', border: 'none', fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Description <span style={{ fontWeight: 400, color: '#bbb' }}>(optional)</span></label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder='What is this channel for?'
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {type === 'private' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Select Members</label>
            <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4 }}>
              {loadingMembers ? (
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 10 }}>Loading members...</p>
              ) : members.length === 0 ? (
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 10 }}>No team members found.</p>
              ) : members.filter(m => m.userId !== user?.id).map(m => {
                const uid = m.userId || m.id;
                const isSelected = memberIds.includes(uid);
                return (
                  <button key={uid} onClick={() => toggleMember(uid)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: isSelected ? '#eef2ff' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? '#6366f1' : '#ccc'}`, background: isSelected ? '#6366f1' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <Check size={12} color='#fff' />}
                    </div>
                    <Avatar name={m.name} size="xs" id={uid} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' }}>Cancel</button>
          <button onClick={() => name.trim() && onCreate({ name: name.trim(), type, description, memberIds })}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 12, background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Create Channel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD MEMBER MODAL ─────────────────────────────────────
function AddMemberModal({ channel, onClose, onAdd, user, currentBusinessId }: { channel: Channel; onClose: () => void; onAdd: (channelId: string, memberId: string) => void; user: any; currentBusinessId: string | null; }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${API_BASE}/team-members`, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {})
          }
        });
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const availableMembers = members.filter(m => !channel.memberIds?.includes(m.userId || m.id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: 340, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Add Member to #{channel.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16, border: '1px solid #eee', borderRadius: 8, padding: 4 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: 10 }}>Loading members...</p>
          ) : availableMembers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: 10 }}>All team members are already in this channel.</p>
          ) : (
            availableMembers.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f9f9f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={m.name} size="sm" id={m.userId || m.id} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{m.email}</div>
                  </div>
                </div>
                <button onClick={() => { onAdd(channel.id, m.userId || m.id); onClose(); }} style={{ padding: '4px 10px', background: '#eef2ff', color: '#6366f1', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>Add</button>
              </div>
            ))
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────
export function Communication() {
  const { user } = useAuth();
  const { currentBusinessId } = useBusinessContext();

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View
  const [activeView, setActiveView] = useState<'chat' | 'calendar'>('chat');
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Modals
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [channelMenuId, setChannelMenuId] = useState<string | null>(null);

  // Call state
  const [inCall, setInCall] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [peers, setPeers] = useState<Map<string, OnlinePeer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // ── NEW FEATURE STATE ──────────────────────────────
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, { status: string; customText?: string }>>({});
  const [myPresence, setMyPresence] = useState<string>('online');
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiTasks, setAiTasks] = useState<{description: string, assignee: string, deadline: string}[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [todos, setTodos] = useState<{id: string, description: string, isCompleted: boolean, deadline: string}[]>([]);
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set());
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  
  // New AI states
  const [translations, setTranslations] = useState<Record<string, {text: string, loading: boolean}>>({});
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // ── Connect socket ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const socket = io(`${SOCKET_URL}/communication`, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('connect_error', (err) => console.error('Socket connection error:', err));
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });
    socket.on('online:list', (ids: string[]) => setOnlineUserIds(ids));
    socket.on('user:online', ({ userId }: any) => setOnlineUserIds(p => [...new Set([...p, userId])]));
    socket.on('user:offline', ({ userId }: any) => setOnlineUserIds(p => p.filter(id => id !== userId)));
    socket.on('message:new', (msg: Message) => setMessages(p => [...p, msg]));
    socket.on('message:updated', (update: { id: string; reactions: Record<string, string[]> }) => {
      setMessages(p => p.map(m => m.id === update.id ? { ...m, reactions: update.reactions } : m));
    });
    socket.on('message:read-update', ({ messageIds, userId }: any) => {
      setMessages(p => p.map(m => messageIds.includes(m.id) ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] } : m));
    });
    socket.on('typing:start', ({ userName }: any) => setTypingUsers(p => [...new Set([...p, userName])]));
    socket.on('typing:stop', ({ userId }: any) => setTypingUsers(p => p.filter(u => u !== userId)));
    socket.on('call:invite', (data: any) => setIncomingCall(data));
    socket.on('presence:all', (map: Record<string, any>) => setPresenceMap(map));
    socket.on('presence:changed', ({ userId, status, customText }: any) => {
      setPresenceMap(p => ({ ...p, [userId]: { status, customText } }));
    });
    socket.on('call:peer-joined', async ({ userId, userName, callId: incomingCallId }: any) => {
      if (!localStreamRef.current) return;
      const pc = createPC(userId, userName, socket, incomingCallId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetId: userId, callId: incomingCallId, offer });
    });
    socket.on('webrtc:offer', async ({ from, fromName, offer, callId: incomingCallId }: any) => {
      if (!localStreamRef.current) return;
      const pc = createPC(from, fromName, socket, incomingCallId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetId: from, callId: incomingCallId, answer });
    });
    socket.on('webrtc:answer', async ({ from, answer }: any) => {
      await peerConnections.current.get(from)?.setRemoteDescription(answer);
    });
    socket.on('webrtc:ice', async ({ from, candidate }: any) => {
      await peerConnections.current.get(from)?.addIceCandidate(candidate);
    });
    socket.on('call:peer-left', ({ userId }: any) => {
      peerConnections.current.get(userId)?.close();
      peerConnections.current.delete(userId);
      setPeers(p => { const n = new Map(p); n.delete(userId); return n; });
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const createPC = useCallback((userId: string, userName: string, socket: Socket, currentCallId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    pc.ontrack = (e) => {
      setPeers(p => { const n = new Map(p); n.set(userId, { userId, userName, stream: e.streams[0] }); return n; });
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc:ice', { targetId: userId, callId: currentCallId, candidate: e.candidate });
    };
    peerConnections.current.set(userId, pc);
    setPeers(p => { const n = new Map(p); n.set(userId, { userId, userName }); return n; });
    return pc;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!currentBusinessId || !token) return;
    let cancelled = false;
    fetch(`${API_BASE}/communication/channels`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {})
      },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        const list: Channel[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const valid = list.filter(ch => ch?.id && ch?.name);
        setChannels(valid);
        if (valid.length > 0) joinChannel(valid[0]);
      })
      .catch(err => console.warn('Failed to load channels:', err));
    return () => { cancelled = true; };
  }, [currentBusinessId]);

  const joinChannel = useCallback((channel: Channel) => {
    setActiveChannel(channel);
    setMessages([]);
    setActiveView('chat');
    setReplyTo(null);
    setShowPinned(false);
    setAiSummary(null);
    socketRef.current?.emit('channel:join', { channelId: channel.id });
    socketRef.current?.on('channel:history', (msgs: Message[]) => {
      setMessages(msgs);
      socketRef.current?.off('channel:history');
      // Mark as read
      const unread = msgs.filter(m => m.senderId !== user?.id && !m.readBy?.includes(user?.id || ''));
      if (unread.length > 0) {
        socketRef.current?.emit('message:read', { messageIds: unread.map(m => m.id), channelId: channel.id });
      }
    });
    // Load pinned
    fetch(`${API_BASE}/communication/channels/${channel.id}/pinned`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
    }).then(r => r.json()).then(data => setPinnedMessages(Array.isArray(data) ? data : [])).catch(() => {});
  }, [user?.id, currentBusinessId]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !activeChannel) return;
    const payload: any = { channelId: activeChannel.id, content: input.trim(), senderName: user?.name || 'User' };
    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToContent = replyTo.content.slice(0, 100);
      payload.replyToSender = replyTo.senderName;
    }
    socketRef.current?.emit('message:send', payload);
    setInput('');
    setReplyTo(null);
  }, [input, activeChannel, user?.name, replyTo]);

  const uploadFile = useCallback(async (file: File) => {
    if (!activeChannel) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/communication/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        socketRef.current?.emit('message:send', { channelId: activeChannel.id, content: data.url, type: 'file' });
      }
    } catch (err) {
      console.error('File upload error:', err);
    }
  }, [activeChannel]);

  // ── Reactions
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!activeChannel) return;
    socketRef.current?.emit('message:react', { messageId, emoji, channelId: activeChannel.id });
    setShowEmojiPicker(null);
  }, [activeChannel]);

  // ── Search
  const handleSearch = useCallback(async (q: string) => {
    setSearchTerm(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_BASE}/communication/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch { setSearchResults([]); }
  }, [currentBusinessId]);

  // ── Pin
  const togglePin = useCallback(async (msgId: string) => {
    try {
      const res = await fetch(`${API_BASE}/communication/messages/${msgId}/pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const updated = await res.json();
      setMessages(p => p.map(m => m.id === msgId ? { ...m, isPinned: updated.isPinned } : m));
      if (updated.isPinned) setPinnedMessages(p => [updated, ...p]);
      else setPinnedMessages(p => p.filter(m => m.id !== msgId));
    } catch (e) { console.error(e); }
  }, [currentBusinessId]);

  // ── Voice Recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch(`${API_BASE}/communication/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            body: formData,
          });
          const data = await res.json();
          if (data.url && activeChannel) {
            socketRef.current?.emit('message:send', { channelId: activeChannel.id, content: data.url, type: 'voice' });
          }
        } catch (err) { console.error(err); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) { console.error('Mic access denied', err); }
  }, [activeChannel]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Forward
  const forwardMessage = useCallback((targetChannelId: string) => {
    if (!forwardingMsg) return;
    socketRef.current?.emit('message:forward', { messageId: forwardingMsg.id, targetChannelId });
    setForwardingMsg(null);
  }, [forwardingMsg]);

  // ── Presence
  const updatePresence = useCallback((status: string) => {
    setMyPresence(status);
    socketRef.current?.emit('presence:update', { status });
    setShowPresenceMenu(false);
  }, []);

  // ── AI Summarize
  const summarizeChannel = useCallback(async () => {
    if (!activeChannel) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/communication/channels/${activeChannel.id}/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const data = await res.json();
      setAiSummary(data.summary || 'No summary available.');
    } catch { setAiSummary('Failed to generate summary.'); }
    finally { setSummaryLoading(false); }
  }, [activeChannel, currentBusinessId]);

  // ── AI Extract Tasks
  const extractTasks = useCallback(async () => {
    if (!activeChannel) return;
    setTasksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/communication/channels/${activeChannel.id}/extract-tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const data = await res.json();
      setAiTasks(data.tasks || []);
    } catch (err) {
      console.error("Extract tasks failed:", err);
      setAiTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [activeChannel, currentBusinessId]);

  // ── TODOS
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/communication/todos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const data = await res.json();
      setTodos(data);
    } catch (err) { console.error('Fetch todos failed', err); }
  }, [currentBusinessId]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const saveTodo = async (description: string, deadline?: string) => {
    try {
      const res = await fetch(`${API_BASE}/communication/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
        body: JSON.stringify({ description, deadline, sourceChannelId: activeChannel?.id }),
      });
      const newTodo = await res.json();
      setTodos(prev => [newTodo, ...prev]);
    } catch (err) { console.error('Save todo failed', err); }
  };

  const toggleTodoCompletion = async (id: string) => {
    try {
      await fetch(`${API_BASE}/communication/todos/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
    } catch (err) { console.error('Toggle todo failed', err); }
  };

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`${API_BASE}/communication/todos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error('Delete todo failed', err); }
  };

  // ── AI Tone Enhancer
  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhanceTone = useCallback(async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch(`${API_BASE}/communication/enhance-tone`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`, 
          ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) 
        },
        body: JSON.stringify({ text: input.trim(), tone: 'professional' })
      });
      const data = await res.json();
      if (data.enhanced) setInput(data.enhanced);
    } catch (err) {
      console.error('Enhance tone failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  }, [input, currentBusinessId, isEnhancing]);

  // ── AI Translate
  const translateMsg = async (msgId: string, text: string) => {
    if (translations[msgId]?.loading || translations[msgId]?.text) {
      // Toggle off if already translated
      if (translations[msgId]?.text) {
        setTranslations(prev => { const next = {...prev}; delete next[msgId]; return next; });
      }
      return;
    }
    setTranslations(prev => ({ ...prev, [msgId]: { text: '', loading: true } }));
    try {
      const res = await fetch(`${API_BASE}/communication/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
        body: JSON.stringify({ text, language: 'French' }) // Default to French for this demo
      });
      const data = await res.json();
      setTranslations(prev => ({ ...prev, [msgId]: { text: data.translated, loading: false } }));
    } catch {
      setTranslations(prev => { const next = {...prev}; delete next[msgId]; return next; });
    }
  };

  // ── AI Smart Replies
  const fetchSmartReplies = async () => {
    if (!activeChannel || repliesLoading) return;
    setRepliesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/communication/channels/${activeChannel.id}/smart-replies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {}) },
      });
      const data = await res.json();
      setSmartReplies(data.replies || []);
    } catch { setSmartReplies([]); }
    finally { setRepliesLoading(false); }
  };

  // ── Mute/Unmute channel
  const toggleMute = useCallback((channelId: string) => {
    setMutedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }, []);

  const handleTyping = (val: string) => {
    setInput(val);
    if (!activeChannel) return;
    socketRef.current?.emit('typing:start', { channelId: activeChannel.id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { channelId: activeChannel.id });
    }, 2000);
  };

  const handleCreateChannel = async (data: { name: string; type: 'public' | 'private'; description: string; memberIds: string[] }) => {
    try {
      const res = await fetch(`${API_BASE}/communication/channels`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {})
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) { console.error('Create channel failed:', res.status, await res.text()); return; }
      const raw = await res.json();
      if (!raw?.id || !raw?.name) { console.error('Unexpected response:', raw); return; }
      const ch: Channel = { type: 'public', memberIds: [], isDefault: false, ...raw };
      setChannels(p => [...p, ch]);
      setShowCreateChannel(false);
      joinChannel(ch);
    } catch (err) {
      console.error('Create channel error:', err);
    }
  };

  const handleAddMember = async (channelId: string, memberId: string) => {
    const ch = channels.find(c => c.id === channelId);
    if (!ch) return;
    const updated = { ...ch, memberIds: [...(ch.memberIds || []), memberId] };
    
    // Call PATCH endpoint to persist
    try {
      await fetch(`${API_BASE}/communication/channels/${channelId}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          ...(currentBusinessId ? { 'x-business-id': currentBusinessId } : {})
        },
        body: JSON.stringify({ memberId })
      });
      // Optimistic update
      setChannels(p => p.map(c => c.id === channelId ? updated : c));
      if (activeChannel?.id === channelId) setActiveChannel(updated);
    } catch (err) {
      console.error('Failed to add member', err);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    await fetch(`${API_BASE}/communication/channels/${channelId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    setChannels(p => p.filter(c => c.id !== channelId));
    if (activeChannel?.id === channelId) {
      const remaining = channels.filter(c => c.id !== channelId);
      setActiveChannel(remaining[0] || null);
    }
    setChannelMenuId(null);
  };

  const startCall = useCallback(async (type: 'video' | 'audio' = 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    const id = `call-${Date.now()}`;
    setCallId(id);
    setInCall(true);
    socketRef.current?.emit('call:join', { callId: id });
    socketRef.current?.emit('call:invite', { channelId: activeChannel?.id, callId: id, type });
  }, [activeChannel]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const isVideo = incomingCall.type === 'video';
    const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setCallId(incomingCall.callId);
    setInCall(true);
    socketRef.current?.emit('call:join', { callId: incomingCall.callId });
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    socketRef.current?.emit('call:leave', { callId });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    localStreamRef.current = null;
    setLocalStream(null);
    setPeers(new Map());
    setInCall(false);
    setCallId(null);
    setIsSharingScreen(false);
  }, [callId]);

  const toggleAudio = () => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setIsAudioMuted(m => !m); };
  const toggleVideo = () => { localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setIsVideoOff(v => !v); };
  const toggleScreenShare = async () => {
    if (!isSharingScreen) {
      const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      screenStreamRef.current = screen;
      setIsSharingScreen(true);
      const track = screen.getVideoTracks()[0];
      peerConnections.current.forEach(pc => { const s = pc.getSenders().find(s => s.track?.kind === 'video'); s?.replaceTrack(track); });
      socketRef.current?.emit('screen:share', { callId, sharing: true });
      track.onended = stopScreenShare;
    } else { stopScreenShare(); }
  };
  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) peerConnections.current.forEach(pc => { const s = pc.getSenders().find(s => s.track?.kind === 'video'); s?.replaceTrack(camTrack); });
    socketRef.current?.emit('screen:share', { callId, sharing: false });
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const peersArray = Array.from(peers.values());
  const filteredChannels = channels.filter(ch => ch?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const publicChannels = filteredChannels.filter(ch => !ch.type || ch.type === 'public');
  const privateChannels = filteredChannels.filter(ch => ch.type === 'private');
  const dmChannels = filteredChannels.filter(ch => ch.type === 'dm');

  // ── STYLES ─────────────────────────────────────────────
  const s = {
    root: { display: 'flex', height: 'calc(100vh - 4rem)', background: '#f5f6fa', borderRadius: 18, overflow: 'hidden', border: '1px solid #e8e8ec', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', fontFamily: "'Inter', system-ui, sans-serif" } as React.CSSProperties,
    sidebar: { width: 256, background: '#1e1f2e', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const, minWidth: 0 },
  };

  const btnBase = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties;

  return (
    <div style={s.root}>

      {/* ── DARK SIDEBAR ── */}
      <div style={s.sidebar}>
        {/* Workspace header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>Workspace</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#34d399' : '#f87171' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={13} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search channels…'
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '7px 10px 7px 28px', fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: '8px 8px 0' }}>
          {[
            { icon: <Hash size={14} />, label: 'Channels', view: 'chat' as const },
            { icon: <Check size={14} />, label: 'To-Do List', view: 'todos' as const },
            { icon: <CalendarDays size={14} />, label: 'Calendar', view: 'calendar' as const },
          ].map(item => (
            <button key={item.view} onClick={() => setActiveView(item.view as any)}
              style={{ ...btnBase, width: '100%', justifyContent: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, background: activeView === item.view ? 'rgba(99,102,241,0.25)' : 'none', color: activeView === item.view ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Channel sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {/* Public */}
          <div style={{ padding: '10px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Public</span>
            <button onClick={() => setShowCreateChannel(true)} style={{ ...btnBase, color: 'rgba(255,255,255,0.35)', width: 18, height: 18 }}><Plus size={12} /></button>
          </div>
          {publicChannels.map(ch => (
            <ChannelItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} onlineCount={ch.memberIds?.filter(id => onlineUserIds.includes(id)).length}
              menuOpen={channelMenuId === ch.id} onMenuToggle={() => setChannelMenuId(channelMenuId === ch.id ? null : ch.id)}
              onJoin={() => joinChannel(ch)} onDelete={() => handleDeleteChannel(ch.id)}
              onAddMember={() => { setShowAddMember(true); setChannelMenuId(null); }} isDefault={ch.isDefault} />
          ))}

          {/* Private */}
          {privateChannels.length > 0 && (
            <>
              <div style={{ padding: '10px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Private</span>
              </div>
              {privateChannels.map(ch => (
                <ChannelItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} onlineCount={ch.memberIds?.filter(id => onlineUserIds.includes(id)).length}
                  menuOpen={channelMenuId === ch.id} onMenuToggle={() => setChannelMenuId(channelMenuId === ch.id ? null : ch.id)}
                  onJoin={() => joinChannel(ch)} onDelete={() => handleDeleteChannel(ch.id)}
                  onAddMember={() => { setShowAddMember(true); setChannelMenuId(null); }} isDefault={ch.isDefault} />
              ))}
            </>
          )}

          {/* Direct Messages (Including AI Copilot) */}
          {dmChannels.length > 0 && (
            <>
              <div style={{ padding: '10px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Direct Messages</span>
              </div>
              {dmChannels.map(ch => (
                <ChannelItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} onlineCount={ch.memberIds?.filter(id => onlineUserIds.includes(id)).length}
                  menuOpen={channelMenuId === ch.id} onMenuToggle={() => setChannelMenuId(channelMenuId === ch.id ? null : ch.id)}
                  onJoin={() => joinChannel(ch)} onDelete={() => handleDeleteChannel(ch.id)}
                  onAddMember={() => { setShowAddMember(true); setChannelMenuId(null); }} isDefault={ch.isDefault} />
              ))}
            </>
          )}
        </div>

        {/* User footer */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 9, position: 'relative' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPresenceMenu(!showPresenceMenu)}>
            <Avatar name={user?.name ?? 'U'} size="sm" id={user?.id} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '2px solid #1e1f2e',
              background: myPresence === 'online' ? '#34d399' : myPresence === 'away' ? '#f59e0b' : myPresence === 'busy' ? '#ef4444' : '#9ca3af' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'User'}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'capitalize' }}>{myPresence}</p>
          </div>
          {showPresenceMenu && (
            <div style={{ position: 'absolute', bottom: '100%', left: 8, marginBottom: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: 6, minWidth: 160, zIndex: 60 }}>
              {(['online', 'away', 'busy', 'dnd'] as const).map(st => (
                <button key={st} onClick={() => updatePresence(st)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: myPresence === st ? '#f0f0ff' : 'none', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 12, color: '#333', textTransform: 'capitalize' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st === 'online' ? '#34d399' : st === 'away' ? '#f59e0b' : st === 'busy' ? '#ef4444' : '#9ca3af' }} />
                  {st === 'dnd' ? 'Do Not Disturb' : st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={s.main}>
        {activeView === 'calendar' ? (
          <CalendarView meetings={meetings} channels={channels} onSchedule={m => setMeetings(p => [...p, m])} />
        ) : (activeView as any) === 'todos' ? (
          <div style={{ flex: 1, background: '#fafafa', padding: 40, overflowY: 'auto' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Check size={24} color="#6366f1" /> My To-Do List
              </h2>
              
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <input id="newTodoInput" placeholder="Add a new task..." 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      saveTodo((e.target as any).value);
                      (e.target as any).value = '';
                    }
                  }}
                  style={{ flex: 1, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todos.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '12px 16px', borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <button onClick={() => toggleTodoCompletion(t.id)} style={{ ...btnBase, width: 22, height: 22, borderRadius: 6, border: t.isCompleted ? 'none' : '2px solid #cbd5e1', background: t.isCompleted ? '#10b981' : '#fff', color: '#fff' }}>
                      {t.isCompleted && <Check size={14} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, color: t.isCompleted ? '#9ca3af' : '#334155', textDecoration: t.isCompleted ? 'line-through' : 'none', fontWeight: 500 }}>{t.description}</p>
                      {t.deadline && t.deadline !== 'None' && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>📅 {t.deadline}</p>}
                    </div>
                    <button onClick={() => deleteTodo(t.id)} style={{ ...btnBase, color: '#9ca3af' }}><Trash2 size={16} /></button>
                  </div>
                ))}
                {todos.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <Check size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p style={{ margin: 0 }}>Your to-do list is empty. Go extract some tasks from your chats!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeChannel && (
                  <>
                    {activeChannel.type === 'private' ? <Lock size={15} color='#6366f1' /> : <Hash size={15} color='#6366f1' />}
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{activeChannel.name}</span>
                    {activeChannel.description && <span style={{ fontSize: 12, color: '#aaa', borderLeft: '1px solid #e5e7eb', paddingLeft: 10 }}>{activeChannel.description}</span>}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {activeChannel && (
                  <>
                    <button onClick={() => setShowAddMember(true)}
                      style={{ ...btnBase, gap: 5, padding: '6px 12px', background: '#f4f4f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#555' }}>
                      <UserPlus size={13} /> Add Member
                    </button>
                    <div style={{ width: 1, height: 20, background: '#f0f0f0', margin: '0 2px' }} />
                    <button onClick={() => setSearchOpen(!searchOpen)} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: searchOpen ? '#eef2ff' : '#f4f4f5', color: searchOpen ? '#6366f1' : '#555' }} title='Search messages'><Search size={14} /></button>
                    <button onClick={() => setShowPinned(!showPinned)} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: showPinned ? '#eef2ff' : '#f4f4f5', color: showPinned ? '#6366f1' : '#555' }} title='Pinned messages'><Pin size={14} /></button>
                    <button onClick={summarizeChannel} disabled={summaryLoading} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: '#f4f4f5', color: '#555' }} title='AI Summarize'><Sparkles size={14} /></button>
                    <button onClick={extractTasks} disabled={tasksLoading} style={{ ...btnBase, padding: '0 10px', height: 34, borderRadius: 9, background: '#eef2ff', color: '#6366f1', fontSize: 12, fontWeight: 600 }} title='Extract Tasks'><Check size={14} style={{ marginRight: 4 }} /> Extract Tasks</button>
                    <button onClick={() => toggleMute(activeChannel.id)} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: mutedChannels.has(activeChannel.id) ? '#fef2f2' : '#f4f4f5', color: mutedChannels.has(activeChannel.id) ? '#ef4444' : '#555' }} title={mutedChannels.has(activeChannel.id) ? 'Unmute' : 'Mute'}>{mutedChannels.has(activeChannel.id) ? <BellOff size={14} /> : <Bell size={14} />}</button>
                    {!inCall && (
                      <>
                        <button onClick={() => startCall('audio')} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: '#f4f4f5', color: '#555' }} title='Audio call'><Phone size={14} /></button>
                        <button onClick={() => startCall('video')} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: '#f4f4f5', color: '#555' }} title='Video call'><Video size={14} /></button>
                      </>
                    )}
                    <button onClick={() => setActiveView('calendar')} style={{ ...btnBase, width: 34, height: 34, borderRadius: 9, background: '#f4f4f5', color: '#555' }} title='Schedule meeting'><Calendar size={14} /></button>
                  </>
                )}
              </div>
            </div>

            {/* Video call */}
            {inCall && (
              <div style={{ background: '#0f1117', padding: '16px 20px', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: peersArray.length === 0 ? '320px' : peersArray.length === 1 ? '1fr 1fr' : 'repeat(3,1fr)', gap: 10, justifyContent: 'center' }}>
                  <VideoTile stream={isSharingScreen ? screenStreamRef.current : localStream} label={`${user?.name ?? 'You'} (You)`} muted />
                  {peersArray.map(peer => <VideoTile key={peer.userId} stream={peer.stream ?? null} label={peer.userName} />)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
                  {[
                    { fn: toggleAudio, active: isAudioMuted, icon: isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />, label: 'Audio' },
                    { fn: toggleVideo, active: isVideoOff, icon: isVideoOff ? <VideoOff size={15} /> : <Video size={15} />, label: 'Video' },
                    { fn: toggleScreenShare, active: isSharingScreen, icon: <Monitor size={15} />, label: 'Screen' },
                  ].map(({ fn, active, icon, label }) => (
                    <button key={label} onClick={fn} title={label}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: active ? '#dc2626' : '#374151', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {icon}
                    </button>
                  ))}
                  <button onClick={endCall} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PhoneOff size={15} />
                  </button>
                </div>
                {peersArray.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, margin: '8px 0 0' }}>Waiting for others to join…</p>}
              </div>
            )}

            {/* Search panel */}
            {searchOpen && (
              <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <Search size={14} color='#aaa' />
                <input value={searchTerm} onChange={e => handleSearch(e.target.value)} placeholder='Search messages…'
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#333', background: 'none' }} autoFocus />
                <button onClick={() => { setSearchOpen(false); setSearchTerm(''); setSearchResults([]); }} style={{ ...btnBase, color: '#aaa' }}><X size={14} /></button>
              </div>
            )}
            {searchOpen && searchResults.length > 0 && (
              <div style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', padding: '8px 20px', maxHeight: 200, overflowY: 'auto', flexShrink: 0 }}>
                {searchResults.map(r => (
                  <div key={r.id} style={{ padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}
                    onClick={() => { const ch = channels.find(c => c.id === (r as any).channelId); if (ch) { joinChannel(ch); setSearchOpen(false); } }}>
                    <Avatar name={r.senderName} size='xs' id={r.senderId} />
                    <span style={{ fontWeight: 600, color: '#333' }}>{r.senderName}:</span>
                    <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</span>
                    <span style={{ color: '#bbb', fontSize: 10 }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pinned messages panel */}
            {showPinned && pinnedMessages.length > 0 && (
              <div style={{ background: '#fefce8', borderBottom: '1px solid #fde68a', padding: '8px 20px', maxHeight: 160, overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Pin size={11} /> Pinned Messages</div>
                {pinnedMessages.map(p => (
                  <div key={p.id} style={{ padding: '4px 0', fontSize: 12, color: '#78350f', borderBottom: '1px solid #fde68a' }}>
                    <strong>{p.senderName}:</strong> {p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <div style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe', padding: '10px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={12} /> AI Summary</span>
                  <button onClick={() => setAiSummary(null)} style={{ ...btnBase, color: '#6366f1' }}><X size={12} /></button>
                </div>
                <p style={{ fontSize: 12, color: '#3730a3', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
              </div>
            )}
            {summaryLoading && (
              <div style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe', padding: '10px 20px', flexShrink: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#6366f1' }}>✨ Generating AI summary…</span>
              </div>
            )}

            {/* AI Tasks */}
            {aiTasks && (
              <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} /> Action Items Extracted</span>
                  <button onClick={() => setAiTasks(null)} style={{ ...btnBase, color: '#166534' }}><X size={14} /></button>
                </div>
                {aiTasks.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#15803d', margin: 0 }}>No tasks found in recent messages.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiTasks.map((t, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #86efac' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 500 }}>{t.description}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>👤 {t.assignee}</span>
                            <span style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>📅 {t.deadline}</span>
                          </div>
                        </div>
                        <button onClick={() => { saveTodo(t.description, t.deadline); setAiTasks(prev => prev?.filter((_, idx) => idx !== i) || null); }} 
                          style={{ ...btnBase, background: '#166534', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          Save to My Tasks
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tasksLoading && (
              <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '10px 20px', flexShrink: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#166534' }}>✨ Extracting tasks from chat…</span>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!activeChannel ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                  <Hash size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Select a channel</p>
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: '#bbb' }}>Choose from the sidebar</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    {activeChannel.type === 'private' ? <Lock size={24} color='#6366f1' /> : <Hash size={24} color='#6366f1' />}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#333', margin: 0 }}>Welcome to #{activeChannel.name}!</p>
                  <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>This is the beginning of the channel. Say hi!</p>
                </div>
              ) : messages.map((msg, i) => {
                const isOwn = msg.senderId === user?.id;
                const prevMsg = messages[i - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId ||
                  (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 5 * 60 * 1000;
                const reactionsEntries = Object.entries(msg.reactions || {});
                const isHovered = hoveredMsgId === msg.id;

                return (
                  <div key={msg.id} style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => { setHoveredMsgId(null); setShowEmojiPicker(null); }}>
                    
                    {/* Pin badge */}
                    {msg.isPinned && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#92400e', marginBottom: 2, paddingLeft: isOwn ? 0 : 40, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                        <Pin size={9} /> Pinned
                      </div>
                    )}

                    {/* Reply context */}
                    {msg.replyToContent && (
                      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', paddingLeft: isOwn ? 0 : 40, marginBottom: 2 }}>
                        <div style={{ fontSize: 11, color: '#888', background: '#f4f4f5', borderRadius: 8, padding: '3px 10px', borderLeft: '3px solid #6366f1', maxWidth: '50%' }}>
                          <span style={{ fontWeight: 600 }}>{msg.replyToSender}:</span> {msg.replyToContent}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', marginTop: showHeader ? 12 : 2 }}>
                      {showHeader && !isOwn ? <Avatar name={msg.senderName} size="sm" id={msg.senderId} /> : <div style={{ width: 30, flexShrink: 0 }} />}
                      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                        {showHeader && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '0 4px' }}>
                            {!isOwn && <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{msg.senderName}</span>}
                            <span style={{ fontSize: 10, color: '#bbb' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        <div style={{ padding: '9px 14px', borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isOwn ? '#6366f1' : '#fff', color: isOwn ? '#fff' : '#111', fontSize: 13, lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: isOwn ? 'none' : '1px solid #f0f0f0' }}>
                          {msg.type === 'file' ? (
                            <a href={`${SOCKET_URL}${msg.content}`} target="_blank" rel="noreferrer" style={{ color: isOwn ? '#e0e7ff' : '#6366f1', textDecoration: 'underline', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Paperclip size={13} /> {msg.content.split('/').pop()}
                            </a>
                          ) : msg.type === 'voice' ? (
                            <audio controls src={`${SOCKET_URL}${msg.content}`} style={{ height: 32, maxWidth: 220 }} />
                          ) : msg.content}

                          {/* Translation block */}
                          {translations[msg.id] && (
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}`, fontSize: 12 }}>
                              {translations[msg.id].loading ? (
                                <span style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : '#888', fontStyle: 'italic' }}>Translating...</span>
                              ) : (
                                <span style={{ color: isOwn ? '#e0e7ff' : '#4f46e5', fontWeight: 500 }}>{translations[msg.id].text}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reactions */}
                        {reactionsEntries.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4, padding: '0 4px' }}>
                            {reactionsEntries.map(([emoji, userIds]) => (
                              <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, border: (userIds as string[]).includes(user?.id || '') ? '1.5px solid #6366f1' : '1px solid #e5e7eb', background: (userIds as string[]).includes(user?.id || '') ? '#eef2ff' : '#fff', fontSize: 12, cursor: 'pointer' }}>
                                {emoji} <span style={{ fontSize: 10, color: '#666' }}>{(userIds as string[]).length}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Read receipts */}
                        {isOwn && msg.readBy && msg.readBy.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, padding: '0 4px' }}>
                            <Eye size={10} color='#bbb' />
                            <span style={{ fontSize: 9, color: '#bbb' }}>Seen by {msg.readBy.length - 1}</span>
                          </div>
                        )}

                        {!showHeader && <span style={{ fontSize: 10, color: '#ddd', marginTop: 2, padding: '0 4px' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                      {isOwn && showHeader && <Avatar name={user?.name ?? 'Me'} size="sm" id={user?.id} />}
                      {isOwn && !showHeader && <div style={{ width: 30, flexShrink: 0 }} />}
                    </div>

                    {/* Hover action toolbar */}
                    {isHovered && (
                      <div style={{ position: 'absolute', top: -14, right: isOwn ? undefined : 20, left: isOwn ? 20 : undefined, display: 'flex', gap: 2, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '3px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10 }}>
                        {QUICK_EMOJIS.slice(0, 4).map(e => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, fontSize: 14 }} title={e}>{e}</button>
                        ))}
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, color: '#888' }} title='More reactions'><Smile size={13} /></button>
                        <div style={{ width: 1, background: '#e5e7eb', margin: '2px 1px' }} />
                        <button onClick={() => setReplyTo(msg)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, color: '#888' }} title='Reply'><Reply size={13} /></button>
                        <button onClick={() => translateMsg(msg.id, msg.content)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, color: translations[msg.id] ? '#6366f1' : '#888' }} title='Translate'><Globe size={13} /></button>
                        <button onClick={() => togglePin(msg.id)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, color: msg.isPinned ? '#f59e0b' : '#888' }} title={msg.isPinned ? 'Unpin' : 'Pin'}><Pin size={13} /></button>
                        <button onClick={() => setForwardingMsg(msg)} style={{ ...btnBase, width: 28, height: 28, borderRadius: 6, color: '#888' }} title='Forward'><Forward size={13} /></button>
                      </div>
                    )}

                    {/* Extended emoji picker */}
                    {showEmojiPicker === msg.id && (
                      <div style={{ position: 'absolute', top: -48, right: isOwn ? undefined : 20, left: isOwn ? 20 : undefined, display: 'flex', gap: 2, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 11 }}>
                        {QUICK_EMOJIS.map(e => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{ ...btnBase, width: 30, height: 30, borderRadius: 6, fontSize: 16 }}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {typingUsers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 150, 300].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${d}ms` }} />)}
                  </div>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Replies and Input */}
            <div style={{ background: '#fff', borderTop: '1px solid #f0f0f0', padding: '12px 20px', flexShrink: 0 }}>
              
              {/* Smart Replies */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button onClick={fetchSmartReplies} disabled={repliesLoading} 
                  style={{ ...btnBase, background: '#f0f0ff', color: '#6366f1', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  <Sparkles size={12} style={{ marginRight: 4, animation: repliesLoading ? 'pulse 1s infinite' : 'none' }} /> 
                  {repliesLoading ? 'Thinking...' : 'Suggest Reply'}
                </button>
                {smartReplies.map((reply, i) => (
                  <button key={i} onClick={() => { setInput(reply); setSmartReplies([]); }}
                    style={{ ...btnBase, background: '#fff', color: '#4b5563', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 20, fontSize: 11, transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    {reply}
                  </button>
                ))}
              </div>

              {/* Reply preview */}
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 8, background: '#f0f0ff', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>
                  <Reply size={13} color='#6366f1' />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>{replyTo.senderName}</span>
                    <p style={{ fontSize: 11, color: '#666', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content.slice(0, 80)}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ ...btnBase, color: '#888' }}><X size={14} /></button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ flex: 1, background: '#f9f9fb', border: '1.5px solid #eaecf0', borderRadius: 14, padding: '10px 14px', transition: 'border .15s' }}>
                  <input value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={activeChannel ? `Message #${activeChannel.name}…` : 'Select a channel first'}
                    disabled={!activeChannel}
                    style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#222', resize: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                    {[{ icon: <Smile size={15} />, label: 'Emoji', action: () => {} }, { icon: <Paperclip size={15} />, label: 'Attach', action: () => fileInputRef.current?.click() }, { icon: <AtSign size={15} />, label: 'Mention', action: () => {} }].map(({ icon, label, action }) => (
                      <button key={label} title={label} onClick={action} style={{ ...btnBase, color: '#bbb' }}>{icon}</button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {/* AI Tone Enhancer */}
                      <button title='AI Tone Enhancer' onClick={enhanceTone} disabled={isEnhancing || !input.trim()}
                        style={{ ...btnBase, width: 30, height: 30, borderRadius: 8, background: '#f0f0ff', color: isEnhancing ? '#bbb' : '#6366f1' }}>
                        <Sparkles size={14} className={isEnhancing ? "animate-pulse" : ""} />
                      </button>
                      {/* Voice recording */}
                      <button title={isRecording ? 'Stop recording' : 'Voice message'}
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{ ...btnBase, width: 30, height: 30, borderRadius: 8, background: isRecording ? '#fef2f2' : '#f0f0ff', color: isRecording ? '#ef4444' : '#6366f1', animation: isRecording ? 'pulse 1.5s infinite' : 'none' }}>
                        {isRecording ? <Square size={12} /> : <Mic size={14} />}
                      </button>
                      <button title='Schedule message' onClick={() => setActiveView('calendar')}
                        style={{ ...btnBase, width: 30, height: 30, borderRadius: 8, background: '#f0f0ff', color: '#6366f1' }}>
                        <AlarmClock size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
                </div>
                <button onClick={sendMessage} disabled={!input.trim() || !activeChannel}
                  style={{ width: 42, height: 42, borderRadius: 13, background: input.trim() ? '#6366f1' : '#e5e7eb', border: 'none', color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' }}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} onCreate={handleCreateChannel} user={user} />}
      {showAddMember && activeChannel && <AddMemberModal channel={activeChannel} onClose={() => setShowAddMember(false)} onAdd={handleAddMember} user={user} currentBusinessId={currentBusinessId} />}

      {/* Forward modal */}
      {forwardingMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: 320, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Forward Message</h3>
              <button onClick={() => setForwardingMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12, background: '#f4f4f5', padding: '6px 10px', borderRadius: 8 }}>
              {forwardingMsg.content.slice(0, 60)}{forwardingMsg.content.length > 60 ? '…' : ''}
            </p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {channels.filter(c => c.id !== activeChannel?.id).map(ch => (
                <button key={ch.id} onClick={() => forwardMessage(ch.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 13, color: '#333', textAlign: 'left' as const }}>
                  {ch.type === 'private' ? <Lock size={12} color='#888' /> : <Hash size={12} color='#888' />}
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Incoming call */}
      {incomingCall && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: 300, textAlign: 'center', boxShadow: '0 32px 100px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Video size={30} color='#6366f1' />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>{incomingCall.callerName ?? 'Someone'}</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>Incoming {incomingCall.type} call…</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIncomingCall(null)} style={{ flex: 1, padding: '11px', borderRadius: 14, background: '#f4f4f5', border: 'none', color: '#555', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Decline</button>
              <button onClick={acceptCall} style={{ flex: 1, padding: '11px', borderRadius: 14, background: '#10b981', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CHANNEL LIST ITEM ────────────────────────────────────
function ChannelItem({ ch, active, onlineCount, menuOpen, onMenuToggle, onJoin, onDelete, onAddMember, isDefault }: {
  ch: Channel; active: boolean; onlineCount: number; menuOpen: boolean;
  onMenuToggle: () => void; onJoin: () => void; onDelete: () => void; onAddMember: () => void; isDefault: boolean;
}) {
  return (
    <div style={{ position: 'relative', margin: '1px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, background: active ? 'rgba(99,102,241,0.22)' : 'transparent', transition: 'background .12s' }}>
        <button onClick={onJoin} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left' as const }}>
          <span style={{ color: active ? '#a5b4fc' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{ch.type === 'private' ? <Lock size={12} /> : <Hash size={12} />}</span>
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#e0e7ff' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
          {onlineCount > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(52,211,153,0.7)', fontWeight: 600 }}>{onlineCount}</span>}
        </button>
        <button onClick={onMenuToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 6px', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', borderRadius: 6, opacity: menuOpen ? 1 : 0 }} className='channel-menu-btn'>
          <MoreHorizontal size={13} />
        </button>
      </div>
      {menuOpen && (
        <div style={{ position: 'absolute', left: '100%', top: 0, zIndex: 50, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '6px', minWidth: 160, marginLeft: 4 }}>
          <button onClick={onAddMember} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 13, color: '#333', textAlign: 'left' as const }}>
            <UserPlus size={13} /> Add Member
          </button>
          {!isDefault && (
            <button onClick={onDelete} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 13, color: '#ef4444', textAlign: 'left' as const }}>
              <Trash2 size={13} /> Delete Channel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
