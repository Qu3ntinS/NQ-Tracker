import React, { useState, useEffect } from "react";
import Task from "./Task";
import interact from "interactjs";
import "./Timetable.css";

// Generiert die 15-Minuten-Zeit-Slots für die Timeline
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

const Timetable = ({ tasks, onTasksChange }) => {
    const [newTask, setNewTask] = useState(null); // Temporärer Task während des Ziehens
    const [hoveredTimeSlot, setHoveredTimeSlot] = useState(null); // Time-Slot Hover-Effekt
    const timeSlots = generateTimeSlots();

    // Funktion, die aufgerufen wird, wenn ein Task verschoben wird
    const onUpdateTime = (taskId, newStartTime) => {
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, startTime: newStartTime } : task
        );
        onTasksChange(updatedTasks);
    };

    const addTask = (description) => {
        const task = {
            id: Date.now(),
            description,
            startTime: newTask.startTime,
            duration: newTask.duration,
        };
        onTasksChange([...tasks, task]);
        setNewTask(null); // Entferne temporären Task nach Erstellung
    };

    const cancelNewTask = () => {
        setNewTask(null); // Abbrechen der Task-Erstellung
    };

    useEffect(() => {
        interact(".timeline")
            .draggable({
                modifiers: [
                    interact.modifiers.snap({
                        targets: [interact.snappers.grid({ x: 0, y: 20 })],
                        range: Infinity,
                        relativePoints: [{ x: 0, y: 0 }],
                    }),
                ],
                listeners: {
                    start(event) {
                        const startY = Math.floor((event.clientY - event.target.getBoundingClientRect().top) / 20) * 20;
                        const startMinutes = Math.floor(startY / 20) * 15;
                        const startHour = Math.floor(startMinutes / 60);
                        const startMinute = startMinutes % 60;
                        const formattedStartTime = `${startHour.toString().padStart(2, "0")}:${startMinute
                            .toString()
                            .padStart(2, "0")}`;

                        setNewTask({ startTime: formattedStartTime, duration: 15, top: startY });
                    },
                    move(event) {
                        if (newTask) {
                            const newHeight = Math.max(Math.round((newTask.top + event.clientY - event.clientY0) / 20) * 20, 20);
                            const newDuration = Math.max((newHeight / 20) * 15, 15);
                            setNewTask({ ...newTask, duration: newDuration });
                        }
                    },
                    end() {
                        if (newTask) {
                            setNewTask({ ...newTask, editing: true });
                        }
                    },
                },
            });
    }, [newTask, tasks, onTasksChange]);

    const deleteTask = (taskId) => {
        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        onTasksChange(updatedTasks);
    };

    const editTask = (taskId, newDescription, newDuration) => {
        const updatedTasks = tasks.map((task) =>
            task.id === taskId
                ? { ...task, description: newDescription, duration: newDuration }
                : task
        );
        onTasksChange(updatedTasks);
    };

    return (
        <div className="timetable-container">
            <div className="timeline">
                {timeSlots.map((time, index) => (
                    <div
                        key={index}
                        className={`time-slot ${index % 4 === 0 ? 'hour-marker' : ''} ${hoveredTimeSlot === index ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredTimeSlot(index)}
                        onMouseLeave={() => setHoveredTimeSlot(null)}
                    >
                        <span>{time}</span>
                    </div>
                ))}

                {newTask && (
                    <div
                        className="task editing"
                        style={{
                            top: `${newTask.top}px`,
                            height: `${(newTask.duration / 15) * 20}px`,
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Beschreibung hinzufügen"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addTask(e.target.value);
                                } else if (e.key === 'Escape') {
                                    cancelNewTask();
                                }
                            }}
                            className="task-input"
                        />
                        <div className="task-controls">
              <span className="task-duration">
                Dauer: {(newTask.duration / 60).toFixed(2)} Std
              </span>
                            <button onClick={() => addTask(document.querySelector('.task-input').value)}>Bestätigen</button>
                            <button onClick={cancelNewTask}>Abbrechen</button>
                        </div>
                    </div>
                )}

                {tasks.map((task) => (
                    <Task
                        key={task.id}
                        task={task}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onUpdateTime={onUpdateTime} // Übergibt die Funktion onUpdateTime an Task-Komponente
                    />
                ))}
            </div>
        </div>
    );
};

export default Timetable;
