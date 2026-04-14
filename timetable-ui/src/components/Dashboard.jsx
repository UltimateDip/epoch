import React from 'react';
import TimeBlock from './TimeBlock';

function Dashboard({ schedule, isAdmin, activeState, onEdit, onDelete, onReset, onReorder, onAddNew }) {

    const moveBlock = (index, direction) => {
        const newSchedule = [...schedule];
        if (direction === 'up' && index > 0) {
            [newSchedule[index - 1], newSchedule[index]] = [newSchedule[index], newSchedule[index - 1]];
            onReorder(newSchedule);
        } else if (direction === 'down' && index < newSchedule.length - 1) {
            [newSchedule[index], newSchedule[index + 1]] = [newSchedule[index + 1], newSchedule[index]];
            onReorder(newSchedule);
        }
    };

    return (
        <main className="dashboard">
            {!isAdmin ? (
                <div className="timetable-wrapper">
                    <table id="timetable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Phase</th>
                                <th>Directives & Development</th>
                            </tr>
                        </thead>
                        <tbody id="timetable-body">
                             {schedule.map((block, index) => (
                                <TimeBlock 
                                    key={block.id} 
                                    block={block} 
                                    isAdmin={false}
                                    isActive={activeState.id === block.id}
                                    progress={activeState.id === block.id ? activeState.progress : 0}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="admin-wrapper">
                    <div className="admin-blocks-list">
                        {schedule.map((block, index) => (
                            <div className="admin-block-card" key={block.id} style={{borderLeftColor: `var(--accent-${block.theme.split('-')[1]})`}}>
                                <div className="admin-block-info">
                                    <span className="admin-block-time">{block.start} - {block.end}</span>
                                    <span className="admin-block-phase">{block.phase}</span>
                                </div>
                                <div className="admin-block-controls">
                                    <button className="icon-btn" onClick={() => moveBlock(index, 'up')} disabled={index === 0}>
                                        <i className="fas fa-arrow-up"></i>
                                    </button>
                                    <button className="icon-btn" onClick={() => moveBlock(index, 'down')} disabled={index === schedule.length - 1}>
                                        <i className="fas fa-arrow-down"></i>
                                    </button>
                                    <button className="icon-btn edit" onClick={() => onEdit(block)}>
                                        <i className="fas fa-pencil-alt"></i>
                                    </button>
                                    <button className="icon-btn delete" onClick={() => onDelete(block.id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="admin-actions">
                    <button className="primary-btn" onClick={onAddNew}>
                        <i className="fas fa-plus"></i> Add New Block
                    </button>
                    <button className="danger-btn" onClick={onReset}>
                        <i className="fas fa-undo"></i> Reset to Default
                    </button>
                </div>
            )}
        </main>
    );
}

export default Dashboard;
