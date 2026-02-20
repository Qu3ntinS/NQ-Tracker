import React, { useState } from "react";
import Task from "./Task";
import "./Timetable.css";

// Generiert Zeitoptionen in Minuten und Stunden bis zu 24 Stunden
const generateDurationOptions = () => {
    const options = [];
    for (let i = 15; i <= 1440; i += 15) { // bis zu 1440 Minuten (24 Stunden) in 15-Minuten-Schritten
        if (i < 60) {
            options.push({ label: `${i} min`, value: i });
        } else {
            const hours = Math.floor(i / 60);
            const minutes = i % 60;
            const label = minutes === 0 ? `${hours}h` : `${hours}:${minutes}h`;
            options.push({ label, value: i });
        }
    }
    return options;
};

const generateTimeSlots = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 15) {
            const timeString = `${hour.toString().padStart(2, "0")}:${min
                .toString()
                .padStart(2, "0")}`;
            times.push(timeString);
        }
    }
    return times;
};

const getRoundedCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    minutes = Math.ceil(minutes / 15) * 15;
    if (minutes === 60) {
        minutes = 0;
        hours = (hours + 1) % 24;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};

const SLOT_HEIGHT = 40; // Timetable-Zoom (größer = bessere Greifbarkeit)
const TASK_GAP = 6; // kleiner Abstand zwischen überlappenden Tasks

const Timetable = ({ tasks, onTasksChange }) => {
    const [taskDescription, setTaskDescription] = useState("");
    const [startTime, setStartTime] = useState(getRoundedCurrentTime());
    const [duration, setDuration] = useState(15);

    const timeSlots = generateTimeSlots();
    const durationOptions = generateDurationOptions();

    const addTask = () => {
        const newTask = {
            id: Date.now(),
            description: taskDescription,
            startTime,
            duration,
        };
        onTasksChange([...tasks, newTask]);
        setTaskDescription("");
        setStartTime(getRoundedCurrentTime());
        setDuration(15);
    };

    const deleteTask = (taskId) => {
        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        onTasksChange(updatedTasks);
    };

    const editTask = (taskId, newDescription, newDuration) => {
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, description: newDescription, duration: newDuration } : task
        );
        onTasksChange(updatedTasks);
    };

    const computeLayout = () => {
        const placed = [];
        const layout = new Map();

        const sorted = [...tasks].sort((a, b) => {
            const aIdx = timeSlots.indexOf(a.startTime);
            const bIdx = timeSlots.indexOf(b.startTime);
            if (aIdx !== bIdx) return aIdx - bIdx;
            return b.duration - a.duration;
        });

        for (const task of sorted) {
            const startIndex = timeSlots.indexOf(task.startTime);
            const height = (task.duration / 15) * SLOT_HEIGHT;
            const baseTop = startIndex * SLOT_HEIGHT;
            const baseBottom = baseTop + height;

            let top = baseTop;
            let hasOverlap = true;

            while (hasOverlap) {
                const overlaps = placed.filter(
                    (p) => top < p.top + p.height && top + height > p.top
                );

                if (!overlaps.length) {
                    hasOverlap = false;
                } else {
                    const maxBottom = Math.max(...overlaps.map((p) => p.top + p.height));
                    top = Math.max(top, maxBottom + TASK_GAP);
                }
            }

            placed.push({ id: task.id, baseTop, baseBottom, top, height });
            layout.set(task.id, { top: `${top}px`, height: `${height}px` });
        }

        const baseHeight = timeSlots.length * SLOT_HEIGHT;
        const maxPlacedBottom = placed.length
            ? Math.max(...placed.map((p) => p.top + p.height))
            : baseHeight;

        return { layout, timelineHeight: Math.max(baseHeight, maxPlacedBottom + TASK_GAP) };
    };

    const { layout: taskLayout, timelineHeight } = computeLayout();

    const getTaskStyle = (task) => taskLayout.get(task.id) || {};

    return (
        <div className="timetable-container">
            <div className="form-container">
                <input
                    type="text"
                    placeholder="Task Beschreibung"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                />
                <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                >
                    {timeSlots.map((time) => (
                        <option key={time} value={time}>
                            {time}
                        </option>
                    ))}
                </select>
                <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                >
                    {durationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button onClick={addTask}>Aufgabe hinzufügen</button>
            </div>

            <div className="timeline" style={{ height: `${timelineHeight}px` }}>
                {timeSlots.map((time) => (
                    <div key={time} className="time-slot" style={{ height: `${SLOT_HEIGHT}px` }}>
                        <span>{time}</span>
                    </div>
                ))}
                {tasks.map((task) => (
                    <Task
                        key={task.id}
                        task={task}
                        getTaskStyle={getTaskStyle}
                        onDelete={deleteTask}
                        onEdit={editTask}
                    />
                ))}
            </div>
        </div>
    );
};

export default Timetable;
