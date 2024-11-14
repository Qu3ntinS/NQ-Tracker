import React, { useState } from "react";
import "./Task.css";

// Funktion zur Formatierung der Daueranzeige
const formatDuration = (minutes) => {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}:${remainingMinutes}h`;
};

// Daueroptionen bis zu 24 Stunden in 15-Minuten-Schritten
const generateDurationOptions = () => {
    const options = [];
    for (let i = 15; i <= 1440; i += 15) {
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

const Task = ({ task, getTaskStyle, onDelete, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(task.description);
    const [editedDuration, setEditedDuration] = useState(task.duration);

    const durationOptions = generateDurationOptions();

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        onEdit(task.id, editedDescription, editedDuration);
        setIsEditing(false);
    };

    return (
        <div className="task" style={getTaskStyle(task)}>
            {isEditing ? (
                <div className="task-edit">
                    <input
                        type="text"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                    />
                    <select
                        value={editedDuration}
                        onChange={(e) => setEditedDuration(parseInt(e.target.value, 10))}
                    >
                        {durationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleSaveClick} className="save-button">
                        Speichern
                    </button>
                </div>
            ) : (
                <div className="task-content">
                    <span>{task.description}</span>
                    <span className="task-duration">{formatDuration(task.duration)}</span>
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
