/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  startedAt?: string;
  durationSpent?: number;
  isPaused?: boolean;
}

export type TaskStatus = 'pending' | 'active' | 'completed' | 'abandoned' | 'given_up';

// Categories defining user's procrastinated thoughts and habits
export type TagCreatedWhen = 'today' | 'week' | 'week_plus' | 'month' | 'year_under' | 'year_plus' | 'distant';
export type TagNature = 'one_off' | 'recurring' | 'long_term';
export type TagTool = 'computer' | 'housework' | 'outdoor';
export type TagDuration = 'under_10m' | 'under_1h' | 'under_1d' | 'more';

export interface TaskTags {
  createdWhen?: string;
  nature?: string;
  tool?: string;
  duration?: string;
  [key: string]: string | undefined;
}

export interface ActionLog {
  id: string;
  activityText: string;
  startedAt: string; // ISO String
  endedAt?: string; // ISO String
  durationSpent?: number; // seconds spent
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  createdAt: string; // ISO String
  lastOperatedAt?: string; // ISO String of the most recent user action on the task
  startedAt?: string; // ISO String
  completedAt?: string; // ISO String
  abandonedAt?: string; // ISO String
  abandonReason?: string;
  completedNotes?: string;
  status: TaskStatus;
  timeSpent: number; // accumulated time spent in seconds (sum of actionLogs durations + any previous timeSpent)
  tags: TaskTags;
  subtasks: SubTask[];
  cheersCount: number;
  actionLogs?: ActionLog[];
}

export interface CheerMessage {
  id: string;
  message: string;
  author: string;
}

export interface TagChoice {
  value: string;
  label: string;
  desc?: string;
  icon?: string;
}

export interface TagCategory {
  id: string; // e.g. "createdWhen", "nature", "tool", "duration", etc.
  label: string; // e.g. "발생 시점", "작업의 주기/성격"
  isDefault?: boolean;
  options: TagChoice[];
}

export interface AppSettings {
  customTags?: TagCategory[];
}

export interface AppEvent {
  id: string;
  type: 'add_task' | 'add_subtask' | 'complete_subtask' | 'complete_task' | 'edit_task' | 'abandon_task' | 'give_up_task';
  taskId?: string;
  taskTitle?: string;
  timestamp: string; // ISO string
}

