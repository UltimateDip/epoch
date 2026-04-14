import React, { useState, useEffect } from 'react';
import { useSchedule } from './hooks/useSchedule';
import Dashboard from './components/Dashboard';
import EditorModal from './components/EditorModal';

function App() {
  const { schedule, loading, updateBlock, deleteBlock, resetToDefault, reorderBlocks } = useSchedule();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute active block and progress (L-to-R flow)
  const activeState = React.useMemo(() => {
    if (loading || !schedule.length) return { id: null, progress: 0 };

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    for (let i = 0; i < schedule.length; i++) {
      const block = schedule[i];
      const [startH, startM] = block.start.split(':').map(Number);
      const [endH, endM] = block.end.split(':').map(Number);
      
      let blockStartMins = startH * 60 + startM;
      let blockEndMins = endH * 60 + endM;
      
      if (blockEndMins <= blockStartMins) {
          blockEndMins += 24 * 60; // Handle midnight crossing
      }
      
      let adjustedCurrentMins = currentMinutes;
      if (currentMinutes < blockStartMins && blockEndMins > 1440) {
          adjustedCurrentMins += 24 * 60;
      }

      if (adjustedCurrentMins >= blockStartMins && adjustedCurrentMins < blockEndMins) {
          const totalDuration = blockEndMins - blockStartMins;
          const elapsed = adjustedCurrentMins - blockStartMins;
          const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
          
          return { id: block.id, progress };
      }
    }
    return { id: null, progress: 0 };
  }, [loading, schedule, currentTime]);

  // Auto-scroll logic 
  useEffect(() => {
    if (activeState.id) {
      const el = document.getElementById(`block-${activeState.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeState.id]);

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
        activeState={activeState}
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
