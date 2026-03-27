import React from 'react';
import TaskList from './TaskList';

function TimeBlock({ block, isAdmin, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
    
    return (
        <tr className={`fade-in ${block.theme}`} id={`block-${block.id}`}>
            <td className="time-col">
                {block.start} - {block.end}
            </td>
            
            <td className="phase-col">
                {block.phase}
            </td>

            <td className="tasks-col">
                <TaskList tasks={block.tasks} />
                
                {isAdmin && (
                    <div className="actions-col" style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
                        <button className="icon-btn" onClick={onMoveUp} disabled={isFirst} title="Move Up">
                            <i className="fas fa-arrow-up"></i>
                        </button>
                        <button className="icon-btn" onClick={onMoveDown} disabled={isLast} title="Move Down">
                            <i className="fas fa-arrow-down"></i>
                        </button>
                        <button className="icon-btn edit" onClick={onEdit} title="Edit Block">
                            <i className="fas fa-pencil-alt"></i>
                        </button>
                        <button className="icon-btn delete" onClick={onDelete} title="Delete Block">
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

export default TimeBlock;
