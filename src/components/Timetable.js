import React, { useState, useEffect } from "react";
import Task from "./Task";
import "./Timetable.css";

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

// Funktion, um die aktuelle Zeit auf die nächste 15-Minuten-Einheit zu runden
const getRoundedCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    // Runde auf die nächste 15-Minuten-Einheit auf
    minutes = Math.ceil(minutes / 15) * 15;
    if (minutes === 60) {
        minutes = 0;
        hours = (hours + 1) % 24; // Falls Stunden überlaufen, auf 00 setzen
    }

    // Rückgabe im Format HH:MM
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};

const Timetable = ({ tasks, onTasksChange }) => {
    const [taskDescription, setTaskDescription] = useState("");
    const [startTime, setStartTime] = useState(getRoundedCurrentTime());
    const [duration, setDuration] = useState(15);

    const timeSlots = generateTimeSlots();

    const addTask = () => {
        const newTask = {
            id: Date.now(), // Verwende Zeitstempel als eindeutige ID
            description: taskDescription,
            startTime,
            duration,
        };
        onTasksChange([...tasks, newTask]);
        setTaskDescription("");
        setStartTime(getRoundedCurrentTime()); // Setze `startTime` zurück auf die aktuelle Zeit
        setDuration(15);
    };

    const deleteTask = (taskId) => {
        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        onTasksChange(updatedTasks);
    };

    const getTaskStyle = (task) => {
        const startIndex = timeSlots.indexOf(task.startTime);
        const taskHeight = (task.duration / 15) * 20; // 20px pro 15-Minuten-Block
        return {
            top: `${startIndex * 20}px`,
            height: `${taskHeight}px`,
        };
    };

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
                <input
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                />
                <button onClick={addTask}>Aufgabe hinzufügen</button>
            </div>

            <div className="timeline">
                {timeSlots.map((time) => (
                    <div key={time} className="time-slot">
                        <span>{time}</span>
                    </div>
                ))}
                {tasks.map((task) => (
                    <Task
                        key={task.id}
                        task={task}
                        getTaskStyle={getTaskStyle}
                        onDelete={deleteTask}
                    />
                ))}
            </div>
        </div>
    );
};

export default Timetable;
