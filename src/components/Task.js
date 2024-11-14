import React from "react";
import "./Task.css";

const Task = ({ task, getTaskStyle, onDelete }) => {
    return (
        <div className="task" style={getTaskStyle(task)} title={task.description}>
            <div className="task-content">
                <span>{task.description}</span>
                <button onClick={() => onDelete(task.id)} className="delete-button">
                    Löschen
                </button>
            </div>
        </div>
    );
};

export default Task;
