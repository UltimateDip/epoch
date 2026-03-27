import React, { useState, useEffect } from 'react';
import { useSchedule } from './hooks/useSchedule';
import Dashboard from './components/Dashboard';
import EditorModal from './components/EditorModal';

function App() {
  const { schedule, loading, updateBlock, deleteBlock, resetToDefault, reorderBlocks } = useSchedule();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  // Auto-scroll logic port from vanilla
  useEffect(() => {
    if (!loading && schedule.length > 0) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (let i = 0; i < schedule.length; i++) {
        const block = schedule[i];
        const [startH, startM] = block.start.split(':').map(Number);
        const [endH, endM] = block.end.split(':').map(Number);
        
        let blockStartMins = startH * 60 + startM;
        let blockEndMins = endH * 60 + endM;
        
        if (blockEndMins < blockStartMins) {
            blockEndMins += 24 * 60; // Handle midnight crossing
        }
        
        let adjustedCurrentMins = currentMinutes;
        if (currentMinutes < blockStartMins && blockEndMins > 24 * 60 && startH >= 12) {
            adjustedCurrentMins += 24 * 60;
        }

        if (adjustedCurrentMins >= blockStartMins && adjustedCurrentMins < blockEndMins) {
            const el = document.getElementById(`block-${block.id}`);
            if (el) {
                el.classList.add('active-block-highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
        }
      }
    }
  }, [loading, schedule]);

  if (loading) return <div className="app-container" style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>Loading...</div>;

  return (
    <div className="container">
      <header className="header">
        <div className="header-glass">
            <h1>The Architecture of <span className="highlight">Performance</span></h1>
            <p className="subtitle">Strategic Blueprint for Senior Engineering Mastery</p>
        </div>
        <button 
          className="admin-toggle-btn primary-btn" 
          onClick={() => setIsAdmin(!isAdmin)}
          style={{position: 'absolute', top: '20px', right: '20px', zIndex: 100}}
        >
          {isAdmin ? 'View Schedule' : 'Edit Timetable'}
        </button>
      </header>
      
      <Dashboard 
        schedule={schedule} 
        isAdmin={isAdmin} 
        onEdit={(block) => setEditingBlock(block)}
        onDelete={deleteBlock}
        onReset={resetToDefault}
        onReorder={reorderBlocks}
        onAddNew={() => setEditingBlock({ id: '', start: '12:00', end: '13:00', phase: '', theme: 'row-focus', tasks: [] })}
      />

      {editingBlock && (
        <EditorModal 
          block={editingBlock} 
          onSave={(updatedBlock) => {
            updateBlock(updatedBlock);
            setEditingBlock(null);
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}

export default App;
