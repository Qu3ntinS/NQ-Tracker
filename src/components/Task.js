import React, { useEffect, useRef } from "react";
import interact from "interactjs";
import "./Task.css";

const Task = ({ task, onDelete, onEdit, onUpdateTime }) => {
    const taskRef = useRef(null);

    useEffect(() => {
        if (taskRef.current) {
            interact(taskRef.current)
                .draggable({
                    modifiers: [
                        interact.modifiers.snap({
                            targets: [interact.snappers.grid({ x: 0, y: 20 })], // Snap auf 15-Minuten-Schritte (20px)
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

                            // Berechne die neue Startzeit basierend auf der neuen `top`-Position
                            const minutesFromTop = Math.round(newTop / 20) * 15; // 15-Minuten-Schritte
                            const newStartHour = Math.floor(minutesFromTop / 60);
                            const newStartMinute = minutesFromTop % 60;
                            const formattedStartTime = `${newStartHour.toString().padStart(2, "0")}:${newStartMinute
                                .toString()
                                .padStart(2, "0")}`;

                            // Aktualisiere die Startzeit des Tasks
                            onUpdateTime(task.id, formattedStartTime);
                        },
                    },
                });
        }
    }, [task, onUpdateTime]);

    return (
        <div
            ref={taskRef}
            className="task"
            style={{
                top: `${parseInt(task.startTime.split(":")[0]) * 80 +
                (parseInt(task.startTime.split(":")[1]) / 15) * 20}px`,
                height: `${(task.duration / 15) * 20}px`,
            }}
        >
            <div className="task-content">
                <span>{task.description}</span>
                <button onClick={() => onDelete(task.id)}>Löschen</button>
            </div>
        </div>
    );
};

export default Task;
