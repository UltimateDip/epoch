import React from 'react';

function TaskList({ tasks }) {
    const tasksArray = Array.isArray(tasks) ? tasks : (tasks ? tasks.split('\n') : []);
    
    if (tasksArray.length === 0) return null;

    // Convert string array to HTML elements formatting **bold**
    const renderTaskText = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <ul className="task-list">
            {tasksArray.map((task, index) => (
                <li key={index} className="task-item">
                    {renderTaskText(task)}
                </li>
            ))}
        </ul>
    );
}

export default TaskList;
