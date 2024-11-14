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
    const timeSlots = generateTimeSlots();

    useEffect(() => {
        // Initialisiere Interact.js für das Erstellen durch Ziehen auf der Timeline
        interact(".timeline")
            .draggable({
                modifiers: [
                    interact.modifiers.snap({
                        targets: [interact.snappers.grid({ x: 0, y: 20 })], // Snap alle 20px für 15 Minuten
                        range: Infinity,
                        relativePoints: [{ x: 0, y: 0 }],
                    }),
                ],
                listeners: {
                    start(event) {
                        // Berechne die Startzeit basierend auf der y-Position des Ziehens
                        const startY = event.clientY - event.target.getBoundingClientRect().top;
                        const startMinutes = Math.floor(startY / 20) * 15;
                        const startHour = Math.floor(startMinutes / 60);
                        const startMinute = startMinutes % 60;
                        const formattedStartTime = `${startHour.toString().padStart(2, "0")}:${startMinute
                            .toString()
                            .padStart(2, "0")}`;

                        // Erstelle temporären Task mit einer Anfangsdauer von 15 Minuten
                        setNewTask({ startTime: formattedStartTime, duration: 15, top: startY });
                    },
                    move(event) {
                        // Dynamisches Erweitern des Tasks beim Ziehen
                        if (newTask) {
                            const newHeight = (newTask.duration / 15) * 20 + event.dy;
                            const newDuration = Math.max(Math.round(newHeight / 20) * 15, 15); // Dauer in 15-Minuten-Schritten
                            setNewTask({ ...newTask, duration: newDuration });
                        }
                    },
                    end(event) {
                        // Eingabeaufforderung für die Beschreibung nach dem Loslassen
                        if (newTask) {
                            const description = prompt("Gib eine Beschreibung für den Task ein:");
                            if (description) {
                                const task = {
                                    id: Date.now(),
                                    description,
                                    startTime: newTask.startTime,
                                    duration: newTask.duration,
                                };
                                onTasksChange([...tasks, task]);
                            }
                            setNewTask(null); // Entferne temporären Task nach Erstellung
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
                {/* Zeit-Slots für die Timeline */}
                {timeSlots.map((time, index) => (
                    <div key={index} className={`time-slot ${index % 4 === 0 ? 'hour-marker' : ''}`}>
                        <span>{time}</span>
                    </div>
                ))}

                {/* Temporärer Task während des Ziehens */}
                {newTask && (
                    <div
                        className="task"
                        style={{
                            top: `${newTask.top}px`,
                            height: `${(newTask.duration / 15) * 20}px`,
                            backgroundColor: "#ddd",
                        }}
                    >
                        Temporärer Task
                    </div>
                )}

                {/* Aufgaben auf der Timeline anzeigen */}
                {tasks.map((task) => (
                    <Task
                        key={task.id}
                        task={task}
                        onDelete={deleteTask}
                        onEdit={editTask}
                    />
                ))}
            </div>
        </div>
    );
};

export default Timetable;
