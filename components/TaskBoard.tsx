"use client";

import { useState } from "react";
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  assigneeId?: string | null;
  dueDate?: Date | null;
}

const columns: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "לביצוע" },
  { id: "IN_PROGRESS", label: "בתהליך" },
  { id: "DONE", label: "הושלם" },
];

export default function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [items, setItems] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for better performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires dragging 8px before activating
      },
    })
  );

  function onDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? String(over.id) : null);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;

    // Optimistic update
    setItems((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // Persist to server
    try {
      await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      // Revert on error
      setItems(initialTasks);
    }
  }

  const activeTask = activeId ? items.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
      collisionDetection={closestCorners}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={items.filter((t) => t.status === col.id)}
            isOver={overId === col.id}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ id, label, tasks, isOver }: { id: TaskStatus; label: string; tasks: Task[]; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  
  const columnColors: Record<TaskStatus, { bg: string; badge: string; badgeText: string }> = {
    TODO: { bg: "bg-[#f5f6f8]", badge: "bg-[#c4c4fc]", badgeText: "text-[#5559df]" },
    IN_PROGRESS: { bg: "bg-[#fff4e6]", badge: "bg-[#fdab3d]", badgeText: "text-white" },
    DONE: { bg: "bg-[#e6f9f2]", badge: "bg-[#00c875]", badgeText: "text-white" },
  };

  return (
    <div
      ref={setNodeRef}
      className={`${columnColors[id].bg} rounded-2xl p-4 min-h-[600px] border-2 shadow-sm transition-all duration-200 ${
        isOver 
          ? "border-[#6961e0] shadow-lg ring-2 ring-[#6961e0] ring-opacity-30 scale-[1.02]" 
          : "border-[#e6e9ef]"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base text-[#323338]">{label}</h3>
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${columnColors[id].badge} ${columnColors[id].badgeText}`}>
          {tasks.length}
        </span>
      </div>
      
      {/* Drop indicator when hovering over empty or at the top */}
      {isOver && tasks.length === 0 && (
        <div className="mb-3 h-[100px] border-2 border-dashed border-[#6961e0] rounded-xl bg-[#6961e0] bg-opacity-5 flex items-center justify-center">
          <span className="text-[#6961e0] text-sm font-medium">שחרר כאן</span>
        </div>
      )}
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="text-center py-12 text-[#676879] text-sm">
            גרור משימות לכאן
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isDragOverlay }: { task: Task; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  // For overlay, use a slightly different style with fixed width
  if (isDragOverlay) {
    return (
      <div className="bg-white rounded-xl border-2 border-[#6961e0] shadow-2xl p-4 cursor-grabbing rotate-2 w-[280px] md:w-[320px]">
        <h4 className="font-medium text-[#323338] mb-2 text-sm">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-[#676879] mb-3 line-clamp-2">{task.description}</p>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-xs text-[#676879] mt-3 pt-3 border-t border-[#e6e9ef]">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(task.dueDate).toLocaleDateString("he-IL")}
          </div>
        )}
      </div>
    );
  }

  // Hide the original card completely when dragging
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="opacity-0"
      >
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="bg-gradient-to-br from-white to-[#fafbfc] rounded-xl border border-[#e6e9ef] p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#6961e0] transition-shadow touch-none"
    >
      <h4 className="font-medium text-[#323338] mb-2 text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-[#676879] mb-3 line-clamp-2">{task.description}</p>
      )}
      {task.dueDate && (
        <div className="flex items-center gap-1.5 text-xs text-[#676879] mt-3 pt-3 border-t border-[#e6e9ef]">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(task.dueDate).toLocaleDateString("he-IL")}
        </div>
      )}
    </div>
  );
}
