import React, { useState, useEffect } from 'react';

function EditorModal({ block, onSave, onClose }) {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [phase, setPhase] = useState('');
    const [theme, setTheme] = useState('row-focus');
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        if (block) {
            setStart(block.start || '');
            setEnd(block.end || '');
            setPhase(block.phase || '');
            setTheme(block.theme || 'row-focus');
            
            const tasksArray = Array.isArray(block.tasks) ? block.tasks : (block.tasks ? block.tasks.split('\n') : []);
            setTasks([...tasksArray]);
        }
    }, [block]);

    const handleTaskChange = (index, value) => {
        const newTasks = [...tasks];
        newTasks[index] = value;
        setTasks(newTasks);
    };

    const handleAddTask = () => {
        setTasks([...tasks, '']);
    };

    const handleRemoveTask = (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
    };

    const handleMoveTask = (index, direction) => {
        const newTasks = [...tasks];
        if (direction === 'up' && index > 0) {
            [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
        } else if (direction === 'down' && index < newTasks.length - 1) {
            [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
        }
        setTasks(newTasks);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const filteredTasks = tasks.map(t => t.trim()).filter(t => t !== '');
        
        onSave({
            ...block,
            start,
            end,
            phase,
            theme,
            tasks: filteredTasks
        });
    };

    return (
        <div className="modal show" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{block.id ? 'Edit Time Block' : 'New Time Block'}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <form id="edit-form" onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <input type="hidden" value={block.id || ''} />
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Time</label>
                                <input type="time" required value={start} onChange={e => setStart(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input type="time" required value={end} onChange={e => setEnd(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Phase Header (e.g., 🚀 Ignition)</label>
                            <input type="text" placeholder="Emoji + Text" value={phase} onChange={e => setPhase(e.target.value)} />
                        </div>
                        
                        <div className="form-group">
                            <label>Color Theme</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)}>
                                <option value="row-ignition">Ignition (Yellow/Orange)</option>
                                <option value="row-focus">Focus (Blue/Purple)</option>
                                <option value="row-office">Office Core (Green/Teal)</option>
                                <option value="row-evening">Evening (Indigo/Pink)</option>
                                <option value="row-shutdown">Shutdown (Dark Slate)</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Tasks / Bullet Points (use **bold** for emphasis)</label>
                            <div id="task-rows-container">
                                {tasks.map((task, index) => (
                                    <div className="task-input-row" key={index}>
                                        <input 
                                            type="text" 
                                            placeholder="Enter task detail..." 
                                            value={task} 
                                            onChange={e => handleTaskChange(index, e.target.value)} 
                                        />
                                        <div className="task-input-controls">
                                            <button type="button" className="icon-btn" onClick={() => handleMoveTask(index, 'up')} disabled={index === 0}>
                                                <i className="fas fa-chevron-up"></i>
                                            </button>
                                            <button type="button" className="icon-btn" onClick={() => handleMoveTask(index, 'down')} disabled={index === tasks.length - 1}>
                                                <i className="fas fa-chevron-down"></i>
                                            </button>
                                            <button type="button" className="icon-btn delete" onClick={() => handleRemoveTask(index)}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="secondary-btn" onClick={handleAddTask} style={{width: '100%', marginTop: '10px', justifyContent: 'center'}}>
                                <i className="fas fa-plus-circle"></i> Add Task
                            </button>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditorModal;
