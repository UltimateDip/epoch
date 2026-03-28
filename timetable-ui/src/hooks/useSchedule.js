import { useState, useEffect, useCallback } from 'react';

const defaultBlocks = [
    {
        id: 1,
        start: "07:30",
        end: "08:00",
        phase: "🚀 Ignition",
        theme: "row-ignition",
        tasks: [
            "Wake up and hydration",
            "Identification of **Top 3** daily goals"
        ]
    }
];

export function useSchedule() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSchedule = useCallback(async () => {
        try {
            const res = await fetch('/data');
            if (res.ok) {
                const data = await res.json();
                setSchedule(data);
            } else {
                setSchedule(defaultBlocks);
                saveToServer(defaultBlocks);
            }
        } catch (e) {
            setSchedule(defaultBlocks);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const saveToServer = async (newSchedule, previousSchedule) => {
        try {
            const token = window.EPOCH_TOKEN;
            const res = await fetch('/data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Epoch-Auth': token
                },
                body: JSON.stringify(newSchedule)
            });
            if (!res.ok) throw new Error('Server rejected save');
        } catch (e) {
            console.error("Failed to save schedule. Rolling back...", e);
            if (previousSchedule) {
                setSchedule(previousSchedule);
            }
        }
    };

    const updateBlock = (updatedBlock) => {
        const previousSchedule = [...schedule];
        const newSchedule = schedule.map(block => 
            block.id === updatedBlock.id ? updatedBlock : block
        );
        // If it's a new block not found
        if (!schedule.find(b => b.id === updatedBlock.id)) {
            newSchedule.push(updatedBlock);
            newSchedule.sort((a, b) => a.start.localeCompare(b.start));
        }
        setSchedule(newSchedule);
        saveToServer(newSchedule, previousSchedule);
    };

    const deleteBlock = (id) => {
        const previousSchedule = [...schedule];
        const newSchedule = schedule.filter(block => block.id !== id);
        setSchedule(newSchedule);
        saveToServer(newSchedule, previousSchedule);
    };

    const resetToDefault = () => {
        const previousSchedule = [...schedule];
        setSchedule(defaultBlocks);
        saveToServer(defaultBlocks, previousSchedule);
    };

    const reorderBlocks = (newSchedule) => {
        const previousSchedule = [...schedule];
        setSchedule(newSchedule);
        saveToServer(newSchedule, previousSchedule);
    };

    return {
        schedule,
        loading,
        updateBlock,
        deleteBlock,
        resetToDefault,
        reorderBlocks
    };
}
