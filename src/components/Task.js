import React, { useState, useEffect, useRef } from "react";
import interact from "interactjs";
import "./Task.css";

const Task = ({ task, onDelete, onEdit, onUpdateTime }) => {
    const taskRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(task.description);
    const [editedDuration, setEditedDuration] = useState(task.duration);

    useEffect(() => {
        if (taskRef.current) {
            interact(taskRef.current)
                .draggable({
                    modifiers: [
                        interact.modifiers.snap({
                            targets: [interact.snappers.grid({ x: 0, y: 20 })], // Snap in 20px-Schritten (15 Minuten)
                            range: Infinity,
                            relativePoints: [{ x: 0, y: 0 }],
                        }),
                        interact.modifiers.restrict({
                            restriction: "parent",
                            endOnly: true,
                        }),
                    ],
                    listeners: {
                        move(event) {
                            const { y } = event.delta;
                            const currentTop = parseFloat(taskRef.current.style.top) || 0;
                            const newTop = currentTop + y;
                            taskRef.current.style.top = `${newTop}px`;

                            // Berechne die neue Startzeit basierend auf der `top`-Position
                            const minutesFromTop = newTop / 20 * 15; // 20px pro 15-Minuten-Slot
                            const newStartHour = Math.floor(minutesFromTop / 60);
                            const newStartMinute = minutesFromTop % 60;
                            const formattedStartTime = `${newStartHour.toString().padStart(2, "0")}:${newStartMinute
                                .toString()
                                .padStart(2, "0")}`;

                            onUpdateTime(task.id, formattedStartTime);
                        },
                    },
                })
                .resizable({
                    edges: { top: false, left: false, bottom: true, right: false },
                    modifiers: [
                        interact.modifiers.snap({
                            targets: [interact.snappers.grid({ x: 0, y: 20 })], // Snap bei der Größenänderung
                            range: Infinity,
                            relativePoints: [{ x: 0, y: 0 }],
                        }),
                        interact.modifiers.restrictSize({
                            min: { height: 20 }, // Minimumhöhe eines 15-Minuten-Slots
                            max: { height: 1920 }, // Höchstens 24 Stunden
                        }),
                    ],
                    listeners: {
                        move(event) {
                            const { height } = event.rect;
                            taskRef.current.style.height = `${height}px`;

                            // Berechne die Dauer basierend auf der neuen Höhe
                            const newDuration = Math.round(height / 20) * 15;
                            onEdit(task.id, editedDescription, newDuration);
                        },
                    },
                });
        }
    }, [taskRef, onEdit, onUpdateTime, task.id, editedDescription]);

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        onEdit(task.id, editedDescription, editedDuration);
        setIsEditing(false);
    };

    return (
        <div ref={taskRef} className={`task time-${task.startTime.replace(":", "")} duration-${task.duration}`}>
            {isEditing ? (
                <div className="task-edit">
                    <input
                        type="text"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                    />
                    <button onClick={handleSaveClick} className="save-button">
                        Speichern
                    </button>
                </div>
            ) : (
                <div className="task-content">
                    <span>{task.description}</span>
                    <button onClick={handleEditClick} className="edit-button">
                        Bearbeiten
                    </button>
                    <button onClick={() => onDelete(task.id)} className="delete-button">
                        Löschen
                    </button>
                </div>
            )}
        </div>
    );
};

export default Task;
