/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Task, TaskTags, SubTask, AppSettings } from '../types';
import { SAMPLE_TASKS, DEFAULT_TAG_CATEGORIES } from '../constants';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    userName: '해야지러',
    playSounds: true,
    urgencyNotification: true,
    customTags: DEFAULT_TAG_CATEGORIES
  });

  // Reference to hold live ticking intervals
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const savedTasks = localStorage.getItem('haeyaji_tasks');
    const savedActiveTaskId = localStorage.getItem('haeyaji_active_task_id');
    const savedSettings = localStorage.getItem('haeyaji_settings');

    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error('Failed to parse tasks', e);
        setTasks(SAMPLE_TASKS);
      }
    } else {
      // First initiation: load premium sample tasks so the app is filled beautifully
      setTasks(SAMPLE_TASKS);
      localStorage.setItem('haeyaji_tasks', JSON.stringify(SAMPLE_TASKS));
    }

    if (savedActiveTaskId) {
      setActiveTaskId(savedActiveTaskId);
    }

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.customTags || parsed.customTags.length === 0) {
          parsed.customTags = DEFAULT_TAG_CATEGORIES;
        } else {
          // Dynamic migration/fix of old '미뤄둔 장례시점' string loaded from user's localStorage
          parsed.customTags = parsed.customTags.map((cat: any) => {
            if (cat.id === 'createdWhen' && (cat.label.includes('미뤄둔 장례시점') || cat.label.includes('미뤄둔 장례 시점'))) {
              return {
                ...cat,
                label: '발생 시점 (시점)'
              };
            }
            return cat;
          });
        }
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    } else {
      const defaultSettings = {
        userName: '해야지러',
        playSounds: true,
        urgencyNotification: true,
        customTags: DEFAULT_TAG_CATEGORIES
      };
      setSettings(defaultSettings);
      localStorage.setItem('haeyaji_settings', JSON.stringify(defaultSettings));
    }
  }, []);

  // 2. Persistent saves upon state changes
  const saveTasksToLocalStorage = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('haeyaji_tasks', JSON.stringify(newTasks));
  };

  const saveSettingsToLocalStorage = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('haeyaji_settings', JSON.stringify(newSettings));
  };

  // 3. Ticking / count-up timer is completely disabled as per user instruction.
  // Instead, the application now supports manual activity statement recording with timestamps and calculated duration on completion.

  // 4. State API Action Methods

  // Reset ALL data to active samples
  const resetToSamples = () => {
    saveTasksToLocalStorage(SAMPLE_TASKS);
    setActiveTaskId(null);
    localStorage.removeItem('haeyaji_active_task_id');
  };

  // Import raw JSON data
  const importRawData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        saveTasksToLocalStorage(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const addTask = (title: string, description: string, tags: TaskTags, subtaskTitles: string[], customCreatedAt?: string) => {
    const newSub: SubTask[] = subtaskTitles
      .filter((t) => t.trim() !== '')
      .map((t, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: t.trim(),
        completed: false
      }));

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      createdAt: customCreatedAt || new Date().toISOString(),
      status: 'pending',
      timeSpent: 0,
      tags,
      subtasks: newSub,
      cheersCount: 0
    };

    const updated = [newTask, ...tasks];
    saveTasksToLocalStorage(updated);
  };

  const updateTask = (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    saveTasksToLocalStorage(updated);
  };

  const deleteTask = (id: string) => {
    if (activeTaskId === id) {
      setActiveTaskId(null);
      localStorage.removeItem('haeyaji_active_task_id');
    }
    const updated = tasks.filter((t) => t.id !== id);
    saveTasksToLocalStorage(updated);
  };

  const startTask = (id: string) => {
    // If there is another task active, pause it first
    let tempTasks = [...tasks];
    if (activeTaskId && activeTaskId !== id) {
      tempTasks = tempTasks.map((t) =>
        t.id === activeTaskId ? { ...t, status: 'pending' as const } : t
      );
    }

    const updated = tempTasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: 'active' as const,
          startedAt: t.startedAt || new Date().toISOString()
        };
      }
      return t;
    });

    setActiveTaskId(id);
    localStorage.setItem('haeyaji_active_task_id', id);
    saveTasksToLocalStorage(updated);
  };

  const pauseTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, status: 'pending' as const };
      }
      return t;
    });
    setActiveTaskId(null);
    localStorage.removeItem('haeyaji_active_task_id');
    saveTasksToLocalStorage(updated);
  };

  const completeTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        // Automatically complete all unfinished subtasks if user hits overall done
        const resolvedSubtasks = t.subtasks.map((st) =>
          !st.completed ? { ...st, completed: true, completedAt: new Date().toISOString() } : st
        );
        return {
          ...t,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          subtasks: resolvedSubtasks
        };
      }
      return t;
    });

    if (activeTaskId === id) {
      setActiveTaskId(null);
      localStorage.removeItem('haeyaji_active_task_id');
    }
    saveTasksToLocalStorage(updated);
  };

  const abandonTask = (id: string, reason: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: 'abandoned' as const,
          abandonedAt: new Date().toISOString(),
          abandonReason: reason || '의지 소모로 일시 중단'
        };
      }
      return t;
    });

    if (activeTaskId === id) {
      setActiveTaskId(null);
      localStorage.removeItem('haeyaji_active_task_id');
    }
    saveTasksToLocalStorage(updated);
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            const nextVal = !st.completed;
            return {
              ...st,
              completed: nextVal,
              completedAt: nextVal ? new Date().toISOString() : undefined,
              startedAt: nextVal ? st.startedAt : undefined,
              isPaused: false,
              durationSpent: nextVal ? st.durationSpent : undefined
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const startSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              startedAt: new Date().toISOString(),
              isPaused: false
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const pauseSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              isPaused: true
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const resumeSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              isPaused: false
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const cancelSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              completed: false,
              startedAt: undefined,
              completedAt: undefined,
              isPaused: false,
              durationSpent: undefined
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const updateSubtaskTitle = (taskId: string, subtaskId: string, newTitle: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              title: newTitle.trim()
            };
          }
          return st;
        });
        return { ...t, subtasks: nextSub };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const completeSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        let addedDuration = 0;
        const nextSub = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            const completedAt = new Date().toISOString();
            let durationSpent = undefined;
            if (st.startedAt) {
              const startMs = new Date(st.startedAt).getTime();
              const endMs = new Date(completedAt).getTime();
              durationSpent = Math.max(0, Math.round((endMs - startMs) / 1000));
              addedDuration = durationSpent;
            }
            return {
              ...st,
              completed: true,
              completedAt,
              durationSpent,
              isPaused: false
            };
          }
          return st;
        });
        return { 
          ...t, 
          subtasks: nextSub,
          timeSpent: t.timeSpent + addedDuration
        };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const addSubtaskToTask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const newSt: SubTask = {
          id: `sub-${Date.now()}`,
          title: title.trim(),
          completed: false
        };
        return { ...t, subtasks: [...t.subtasks, newSt] };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const removeSubtaskFromTask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const cheerTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, cheersCount: t.cheersCount + 1 };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const startActivityLog = (taskId: string, activityText: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const logs = t.actionLogs || [];
        const newLog = {
          id: `log-${Date.now()}`,
          activityText: activityText.trim(),
          startedAt: new Date().toISOString()
        };
        return {
          ...t,
          actionLogs: [...logs, newLog]
        };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  const endActivityLog = (taskId: string, logId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const logs = t.actionLogs || [];
        let addedDuration = 0;
        const nextLogs = logs.map((log) => {
          if (log.id === logId && !log.endedAt) {
            const endedAt = new Date().toISOString();
            const startMs = new Date(log.startedAt).getTime();
            const endMs = new Date(endedAt).getTime();
            const durationSpent = Math.max(0, Math.round((endMs - startMs) / 1000));
            addedDuration = durationSpent;
            return {
              ...log,
              endedAt,
              durationSpent
            };
          }
          return log;
        });
        return {
          ...t,
          timeSpent: t.timeSpent + addedDuration,
          actionLogs: nextLogs
        };
      }
      return t;
    });
    saveTasksToLocalStorage(updated);
  };

  return {
    tasks,
    activeTaskId,
    activeTask: tasks.find((t) => t.id === activeTaskId) || null,
    settings,
    saveSettings: saveSettingsToLocalStorage,
    addTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    completeTask,
    abandonTask,
    toggleSubtask,
    startSubtask,
    pauseSubtask,
    resumeSubtask,
    cancelSubtask,
    updateSubtaskTitle,
    completeSubtask,
    addSubtaskToTask,
    removeSubtaskFromTask,
    cheerTask,
    startActivityLog,
    endActivityLog,
    resetToSamples,
    importRawData
  };
}
