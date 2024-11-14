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

    const getTaskStyle = (task) => {
        const startIndex = timeSlots.indexOf(task.startTime);
        const taskHeight = (task.duration / 15) * 20;
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
                        onEdit={editTask}
                    />
                ))}
            </div>
        </div>
    );
};

export default Timetable;
