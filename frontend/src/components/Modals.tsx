import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './Modals.css';

interface ModalsProps {
  isOpen: string | null;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
  selectedTask?: any;
  setModalOpen?: (v: string | null) => void;
}

const PROJECT_COLORS = ['#e8ff47','#3fa4ff','#ff6b35','#ff3fa4','#2ecc71','#a855f7','#14b8a6'];

export default function Modals({ isOpen, onClose, user, onSuccess, selectedTask, setModalOpen }: ModalsProps) {
  // Project state
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projEmoji, setProjEmoji] = useState('🚀');
  const [projColor, setProjColor] = useState(PROJECT_COLORS[0]);
  const [projDeadline, setProjDeadline] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const EMOJI_OPTIONS = ['🚀', '📁', '📱', '🎨', '📊', '⚙️'];

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDue, setTaskDue] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(user.id);

  useEffect(() => {
    if (isOpen) {
      api.get('/users').then(res => setUsers(res.data)).catch(() => {});
      api.get('/projects').then(res => {
        setProjects(res.data);
        if (res.data.length > 0 && !selectedTask) setSelectedProject(res.data[0].id);
      }).catch(() => {});
    }

    if (isOpen === 'task' && selectedTask) {
      setTaskTitle(selectedTask.title || '');
      setTaskDesc(selectedTask.description || '');
      setTaskStatus(selectedTask.status || 'todo');
      setTaskPriority(selectedTask.priority || 'medium');
      setTaskDue(selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '');
      setSelectedProject(selectedTask.projectId || '');
      setTaskAssignee(selectedTask.assigneeId || user.id);
    } else if (isOpen === 'task' && !selectedTask) {
      setTaskTitle('');
      setTaskDesc('');
      setTaskStatus('todo');
      setTaskPriority('medium');
      setTaskDue('');
      setTaskAssignee(user.id);
    }
  }, [isOpen, selectedTask]);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      alert(`Task marked as ${newStatus}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update task: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProject = async () => {
    if (!projName.trim()) {
      alert('Project name is required');
      return;
    }
    try {
      await api.post('/projects', {
        name: projName,
        description: projDesc,
        emoji: projEmoji,
        color: projColor,
        deadline: projDeadline || null,
        members: selectedMembers
      });
      onSuccess();
      onClose();
      // Clear state
      setProjName('');
      setProjDesc('');
      setProjEmoji('🚀');
      setProjDeadline('');
      setSelectedMembers([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save project');
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      alert('Task title is required');
      return;
    }
    try {
      if (selectedTask) {
        await api.put(`/tasks/${selectedTask.id}`, {
          title: taskTitle,
          description: taskDesc,
          status: taskStatus,
          priority: taskPriority,
          dueDate: taskDue || null,
          projectId: selectedProject || null,
          assigneeId: taskAssignee
        });
      } else {
        await api.post('/tasks', {
          title: taskTitle,
          description: taskDesc,
          status: taskStatus,
          priority: taskPriority,
          dueDate: taskDue || null,
          projectId: selectedProject || null,
          assigneeId: taskAssignee
        });
      }
      onSuccess();
      onClose();
      // Clear state
      setTaskTitle('');
      setTaskDesc('');
      setTaskStatus('todo');
      setTaskPriority('medium');
      setTaskDue('');
      setTaskAssignee(user.id);
    } catch (err) {
      console.error(err);
      alert('Failed to save task');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {isOpen === 'project' && (
          <>
            <div className="modal-header">
              <div className="modal-title">New Project</div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Project Name</label><input type="text" value={projName} onChange={e => setProjName(e.target.value)} placeholder="e.g. Website Redesign" /></div>
              <div className="form-group"><label>Description</label><textarea rows={3} value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="What's this project about?"></textarea></div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map(c => (
                    <div 
                      key={c} 
                      onClick={() => setProjColor(c)}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer', border: projColor === c ? '2px solid #fff' : '2px solid transparent' }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Emoji Icon</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {EMOJI_OPTIONS.map(e => (
                    <div 
                      key={e} 
                      onClick={() => setProjEmoji(e)}
                      style={{ 
                        width: '40px', height: '40px', background: 'var(--card)', borderRadius: '10px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', 
                        cursor: 'pointer', border: projEmoji === e ? '2px solid var(--accent)' : '1px solid var(--border2)',
                        transition: 'all .2s'
                      }}
                    >
                      {e}
                    </div>
                  ))}
                </div>
              </div>
              {user.role === 'admin' && (
                <div className="form-group"><label>Add Members</label>
                  <div className="member-selection-list" style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--card)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border2)' }}>
                    {users.filter(u => u.id !== user.id && u.role !== 'admin').map(u => {
                      const isAdded = selectedMembers.includes(u.id);
                      return (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', background: isAdded ? 'var(--accent)15' : 'transparent', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: u.color, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{u.name[0]}</div>
                            <span style={{ fontSize: '13px' }}>{u.name}</span>
                          </div>
                          <button 
                            className={`btn btn-sm ${isAdded ? 'btn-ghost' : 'btn-primary'}`} 
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                            onClick={() => {
                              if (isAdded) {
                                setSelectedMembers(prev => prev.filter(id => id !== u.id));
                              } else {
                                setSelectedMembers(prev => [...prev, u.id]);
                              }
                            }}
                          >
                            {isAdded ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="form-group"><label>Deadline</label><input type="date" value={projDeadline} onChange={e => setProjDeadline(e.target.value)} /></div>
              <button className="btn btn-primary btn-full" onClick={handleSaveProject}>Save Project</button>
            </div>
          </>
        )}

        {isOpen === 'task' && (
          <>
            <div className="modal-header">
              <div className="modal-title">{selectedTask ? 'Edit Task' : 'New Task'}</div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Task Title</label><input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Design landing page" /></div>
              <div className="form-group"><label>Description</label><textarea rows={2} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Details..."></textarea></div>
              <div className="form-group">
                <label>Project</label>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              {user.role === 'admin' && (
                <div className="form-group">
                  <label>Assignee</label>
                  <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                    <option value={user.id}>Me ({user.name})</option>
                    {selectedProject 
                      ? projects.find(p => p.id === selectedProject)?.members.map((m: any) => m.userId !== user.id && (
                          <option key={m.userId} value={m.userId}>{m.user.name}</option>
                        ))
                      : users.map(u => u.id !== user.id && (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                    }
                  </select>
                </div>
              )}
              <div className="form-group"><label>Due Date</label><input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} /></div>
              <button className="btn btn-primary btn-full" onClick={handleSaveTask}>Save Task</button>
            </div>
          </>
        )}

        {isOpen === 'taskDetail' && selectedTask && (
          <>
            <div className="modal-header">
              <div className="modal-title">{selectedTask.title}</div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className={`priority-badge p-${selectedTask.priority}`} style={{ fontSize: '10px' }}>{selectedTask.priority.toUpperCase()} PRIORITY</span>
                <span className="chip chip-inactive" style={{ textTransform: 'capitalize' }}>{selectedTask.status}</span>
                {selectedTask.dueDate && new Date(selectedTask.dueDate) < new Date() && selectedTask.status !== 'done' && (
                  <span className="overdue-tag" style={{ fontSize: '10px', fontWeight: 'bold' }}>⚠️ OVERDUE</span>
                )}
              </div>
              
              <div style={{ padding: '16px', background: 'var(--card)', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', marginBottom: '20px' }}>
                {selectedTask.description || 'No description provided.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginBottom: '24px' }}>
                <div>
                  <div style={{ color: 'var(--muted2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Project</div>
                  <div style={{ fontWeight: 600 }}>📁 {projects.find(p => p.id === selectedTask.projectId)?.name || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Assignee</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(() => {
                      let assignedUser = null;
                      if (selectedTask.assigneeId === user.id) {
                        assignedUser = user;
                      } else {
                        const proj = projects.find(p => p.id === selectedTask.projectId);
                        assignedUser = proj?.members?.find((m: any) => m.userId === selectedTask.assigneeId)?.user;
                        if (!assignedUser && user.role === 'admin') {
                          assignedUser = users.find(u => u.id === selectedTask.assigneeId);
                        }
                      }
                      
                      if (!assignedUser) {
                        return <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Unassigned</span>;
                      }

                      return (
                        <>
                          <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: assignedUser.color || 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                            {assignedUser.name[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{assignedUser.name}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Due Date</div>
                  <div style={{ fontWeight: 600, color: selectedTask.dueDate && new Date(selectedTask.dueDate) < new Date() ? 'var(--red)' : 'var(--text)' }}>
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Created</div>
                  <div style={{ fontWeight: 600 }}>{new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px', flexWrap: 'wrap' }}>
                {(user.role === 'admin' || selectedTask.creatorId === user.id) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen?.('task')}>Edit Task</button>
                )}
                
                {(user.role === 'admin' || selectedTask.creatorId === user.id || selectedTask.assigneeId === user.id) && (
                  <>
                    {selectedTask.status !== 'done' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateTaskStatus(selectedTask.id, 'done')}>Mark Done ✓</button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateTaskStatus(selectedTask.id, 'todo')}>Re-open</button>
                    )}
                    {selectedTask.status === 'todo' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateTaskStatus(selectedTask.id, 'inprogress')}>Start →</button>
                    )}
                  </>
                )}

                {(user.role === 'admin' || selectedTask.creatorId === user.id) && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(selectedTask.id)}>Delete</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
