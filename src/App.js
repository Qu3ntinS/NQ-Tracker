import React, { useState, useEffect } from "react";
import Timetable from "./components/Timetable";
import "./App.css";

const App = () => {
  // Startdatum auf das heutige Datum setzen
  const [selectedDay, setSelectedDay] = useState(
      new Date().toISOString().split("T")[0]
  );
  const [timetables, setTimetables] = useState({});

  // 1. Lade gespeicherte Daten aus `localStorage` beim ersten Rendern
  useEffect(() => {
    const savedTimetables = localStorage.getItem("timetables");
    if (savedTimetables) {
      setTimetables(JSON.parse(savedTimetables));
    }
  }, []);

  // 2. Speichere Änderungen in `localStorage`, wenn `timetables` aktualisiert wird
  useEffect(() => {
    if (Object.keys(timetables).length > 0) {
      localStorage.setItem("timetables", JSON.stringify(timetables));
    }
  }, [timetables]);

  // Funktion zum Wechseln des Tages
  const handleDayChange = (event) => {
    setSelectedDay(event.target.value);
  };

  // Funktion zum Aktualisieren der Aufgaben eines bestimmten Tages
  const updateTasksForDay = (tasks) => {
    setTimetables((prevTimetables) => ({
      ...prevTimetables,
      [selectedDay]: tasks,
    }));
  };

  return (
      <div className="App">
        <h1>Timetable Tracker mit localStorage-Unterstützung</h1>
        <div className="day-selector">
          <input
              type="date"
              value={selectedDay}
              onChange={handleDayChange}
          />
        </div>
        <Timetable
            tasks={timetables[selectedDay] || []}
            onTasksChange={updateTasksForDay}
        />
      </div>
  );
};

export default App;
