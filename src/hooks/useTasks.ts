/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import { Task, TaskTags, SubTask, AppSettings } from '../types';
import { SAMPLE_TASKS, DEFAULT_TAG_CATEGORIES } from '../constants';

// Configure localforage for IndexedDB storage
localforage.config({
  name: 'haeyaji_app',
  storeName: 'haeyaji_store',
  description: '야해야지 해야지러들을 위한 안전한 IndexedDB 저장소'
});

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    customTags: DEFAULT_TAG_CATEGORIES
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Reference to hold live ticking intervals
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial async load from IndexedDB with transparent localStorage migration
  useEffect(() => {
    async function loadInitialData() {
      try {
        const savedTasks = await localforage.getItem<Task[]>('haeyaji_tasks');
        const savedActiveTaskId = await localforage.getItem<string | null>('haeyaji_active_task_id');
        const savedSettings = await localforage.getItem<AppSettings>('haeyaji_settings');

        let finalTasks: Task[] = SAMPLE_TASKS;
        let finalActiveTaskId: string | null = null;
        let finalSettings: AppSettings = {
          customTags: DEFAULT_TAG_CATEGORIES
        };

        // --- Tasks Loading / Migration ---
        if (savedTasks) {
          finalTasks = savedTasks;
        } else {
          const oldTasksStr = localStorage.getItem('haeyaji_tasks');
          if (oldTasksStr) {
            try {
              finalTasks = JSON.parse(oldTasksStr);
              await localforage.setItem('haeyaji_tasks', finalTasks);
            } catch (e) {
              console.error('Failed to parse legacy tasks during migration', e);
            }
          } else {
            await localforage.setItem('haeyaji_tasks', SAMPLE_TASKS);
          }
        }

        // --- Active Task Loading / Migration ---
        if (savedActiveTaskId !== null) {
          finalActiveTaskId = savedActiveTaskId;
        } else {
          const oldActiveTaskId = localStorage.getItem('haeyaji_active_task_id');
          if (oldActiveTaskId) {
            finalActiveTaskId = oldActiveTaskId;
            await localforage.setItem('haeyaji_active_task_id', oldActiveTaskId);
          }
        }

        // --- Settings Loading / Migration ---
        if (savedSettings) {
          finalSettings = savedSettings;
        } else {
          const oldSettingsStr = localStorage.getItem('haeyaji_settings');
          if (oldSettingsStr) {
            try {
              finalSettings = JSON.parse(oldSettingsStr);
              await localforage.setItem('haeyaji_settings', finalSettings);
            } catch (e) {
              console.error('Failed to parse legacy settings during legacy migration', e);
            }
          } else {
            await localforage.setItem('haeyaji_settings', finalSettings);
          }
        }

        // Ensure customTags is aligned and sanitized
        if (!finalSettings.customTags || finalSettings.customTags.length === 0) {
          finalSettings.customTags = DEFAULT_TAG_CATEGORIES;
        } else {
          finalSettings.customTags = finalSettings.customTags.map((cat: any) => {
            if (cat.id === 'createdWhen' && (cat.label.includes('미뤄둔 장례시점') || cat.label.includes('미뤄둔 장례 시점'))) {
              return {
                ...cat,
                label: '발생 시점 (시점)'
              };
            }
            return cat;
          });
        }

        setTasks(finalTasks);
        setActiveTaskId(finalActiveTaskId);
        setSettings(finalSettings);
      } catch (err) {
        console.error('Error during useTasks localforage initialization', err);
        setTasks(SAMPLE_TASKS);
      } finally {
        setIsInitialized(true);
      }
    }

    loadInitialData();
  }, []);

  // 2. Persistent saves upon state changes utilizing localforage
  const saveTasksToLocalForage = (newTasks: Task[]) => {
    setTasks(newTasks);
    localforage.setItem('haeyaji_tasks', newTasks).catch((err) => {
      console.error('Failed localforage tasks save', err);
    });
  };

  const saveSettingsToLocalForage = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localforage.setItem('haeyaji_settings', newSettings).catch((err) => {
      console.error('Failed localforage settings save', err);
    });
  };

  // 3. Ticking / count-up timer is completely disabled as per user instruction.
  // Instead, the application now supports manual activity statement recording with timestamps and calculated duration on completion.

  // 4. State API Action Methods

  // Reset ALL data to active samples
  const resetToSamples = () => {
    saveTasksToLocalForage(SAMPLE_TASKS);
    setActiveTaskId(null);
    localforage.removeItem('haeyaji_active_task_id');
  };

  // Import raw JSON data
  const importRawData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        saveTasksToLocalForage(parsed);
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
    saveTasksToLocalForage(updated);
  };

  const updateTask = (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    saveTasksToLocalForage(updated);
  };

  const deleteTask = (id: string) => {
    if (activeTaskId === id) {
      setActiveTaskId(null);
      localforage.removeItem('haeyaji_active_task_id');
    }
    const updated = tasks.filter((t) => t.id !== id);
    saveTasksToLocalForage(updated);
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
    localforage.setItem('haeyaji_active_task_id', id);
    saveTasksToLocalForage(updated);
  };

  const pauseTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, status: 'pending' as const };
      }
      return t;
    });
    setActiveTaskId(null);
    localforage.removeItem('haeyaji_active_task_id');
    saveTasksToLocalForage(updated);
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
      localforage.removeItem('haeyaji_active_task_id');
    }
    saveTasksToLocalForage(updated);
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
      localforage.removeItem('haeyaji_active_task_id');
    }
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
  };

  const removeSubtaskFromTask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) };
      }
      return t;
    });
    saveTasksToLocalForage(updated);
  };

  const cheerTask = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, cheersCount: t.cheersCount + 1 };
      }
      return t;
    });
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
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
    saveTasksToLocalForage(updated);
  };

  return {
    isInitialized,
    tasks,
    activeTaskId,
    activeTask: tasks.find((t) => t.id === activeTaskId) || null,
    settings,
    saveSettings: saveSettingsToLocalForage,
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
