/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task, AppSettings } from '../types';
import { CHEER_MESSAGES, DEFAULT_TAG_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Search, Filter, AlertTriangle, HelpCircle, Flame, Plus, Clock, History, ChevronDown, ChevronUp, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { formatKoreanDate, getElapsedHumanized, getDurationElapsedText, getDaysElapsed, getFriendlyDaysAgo } from '../utils/dateUtils';

interface HomeViewProps {
  tasks: Task[];
  settings: AppSettings;
  onStartTask: (id: string) => void;
  onSelectView: (view: 'home' | 'add' | 'analytics' | 'archive' | 'settings' | 'active') => void;
  onSelectTaskToEdit?: (task: Task) => void;
  urgeIndex?: number;
  onSetUrgeIndex?: React.Dispatch<React.SetStateAction<number>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  filterTags: Record<string, string[]>;
  setFilterTags: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  homeHighlightTaskId?: string | null;
  titleOnlyMode?: boolean;
}

export function HomeView({
  tasks,
  settings,
  onStartTask,
  onSelectView,
  onSelectTaskToEdit,
  urgeIndex,
  onSetUrgeIndex,
  searchTerm,
  setSearchTerm,
  filterTags,
  setFilterTags,
  sortBy,
  setSortBy,
  homeHighlightTaskId,
  titleOnlyMode = false
}: HomeViewProps) {
  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'pending' || t.status === 'active'), [tasks]);
  
  // Custom tag categories schema
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;

  // Stable session seed for deterministic random shuffling that does not cause layout flicker on small state updates
  const [sessionSeed] = useState(() => Math.random());

  // Repetition history modal states
  const [selectedHistoryTitle, setSelectedHistoryTitle] = useState<string | null>(null);
  const [expandedInstanceIds, setExpandedInstanceIds] = useState<Record<string, boolean>>({});

  // Format accumulated seconds spent to a visual duration format
  const formatDurationSeconds = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0초';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}초`);
    return parts.join(' ');
  };

  const getBaseTitle = (title: string): string => {
    const match = title.trim().match(/^(.*?)\s*(\d+)회차$/);
    return match ? match[1].trim() : title.trim();
  };

  // Memoized historical instances for the selected recurrent task title
  const historyInstances = useMemo(() => {
    if (!selectedHistoryTitle) return [];
    const baseTitleSelected = getBaseTitle(selectedHistoryTitle).toLowerCase();
    return tasks.filter(t => getBaseTitle(t.title).toLowerCase() === baseTitleSelected);
  }, [tasks, selectedHistoryTitle]);

  const sortedHistoryInstances = useMemo(() => {
    return [...historyInstances].sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [historyInstances]);

  // Deterministic stable hashing function
  const getStableRandomValue = (taskId: string, seed: number) => {
    let hash = 0;
    const str = taskId + seed.toString();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  };

  const isDefaultState = !searchTerm && sortBy === 'severity' && categories.every(cat => {
    const selected = filterTags[cat.id];
    return selected === undefined || selected.length === cat.options.length;
  });

  // Custom renderer for subtasks summary matching user requested logic:
  // 1. Most recently completed subtask (if any)
  // 2. Earliest uncompleted subtask (if any)
  const renderSubTaskSummary = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return (
        <p className="text-xs text-zinc-650 font-normal italic">
          등록된 세부 실천 단계가 없습니다. 터치하여 첫 실천 단계를 적어보세요!
        </p>
      );
    }

    const completed = task.subtasks.filter(st => st.completed);
    const uncompleted = task.subtasks.filter(st => !st.completed);

    // Find last completed
    let lastCompleted = null;
    if (completed.length > 0) {
      const hasCompletedAt = completed.some(st => st.completedAt);
      if (hasCompletedAt) {
        lastCompleted = [...completed].sort((a, b) => {
          const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return tB - tA;
        })[0];
      } else {
        lastCompleted = completed[completed.length - 1];
      }
    }

    // Find first uncompleted (with the lowest order index among those not completed)
    const firstUncompleted = uncompleted.length > 0 ? uncompleted[0] : null;

    if (!lastCompleted && !firstUncompleted) {
      return (
        <p className="text-xs text-zinc-650 font-normal italic">
          등록된 세부 실천 단계가 없습니다.
        </p>
      );
    }

    return (
      <div className="space-y-2.5 pt-1">
        {lastCompleted && (
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-xs font-normal bg-zinc-100 text-zinc-500 border border-zinc-300 px-2 py-0.5 shrink-0 uppercase tracking-tight">완료✓</span>
            <span className="font-normal line-through text-zinc-400 text-sm truncate">
              {lastCompleted.title}
            </span>
          </div>
        )}
        {firstUncompleted && (
          <div className="flex items-center gap-2 text-black">
            <span className="text-xs font-normal bg-[#FF4D00] text-white border border-black px-2 py-0.5 shrink-0 uppercase tracking-tight animate-pulse">지정🎯</span>
            <span className="font-normal text-sm truncate text-[#FF4D00]">
              {firstUncompleted.title}
            </span>
          </div>
        )}
        {task.subtasks.length > ( (lastCompleted ? 1 : 0) + (firstUncompleted ? 1 : 0) ) && (
          <p className="text-xs text-[#FF4D00] font-normal italic pl-1 mt-1">
            (전체 {task.subtasks.length}단계 중 남은 실천 계획들이 더 있습니다)
          </p>
        )}
      </div>
    );
  };


  // Random Urger Task state (using prop state if provided, fallback to local state)
  const [localUrgeIndex, setLocalUrgeIndex] = useState(0);
  const activeUrgeIndex = urgeIndex !== undefined ? urgeIndex : localUrgeIndex;
  const activeSetUrgeIndex = onSetUrgeIndex || setLocalUrgeIndex;


  // Calculate urgency metrics or index (Procrastination Severity Index)
  const getProcrastinatedLevel = (task: Task) => {
    let score = 0;
    // When score
    switch (task.tags.createdWhen) {
      case 'today': score += 1; break;
      case 'week': score += 2; break;
      case 'week_plus': score += 4; break;
      case 'month': score += 6; break;
      case 'year_under': score += 8; break;
      case 'year_plus': score += 10; break;
      case 'distant': score += 12; break;
      default: score += 1;
    }
    // Duration score
    switch (task.tags.duration) {
      case 'under_10m': score += 4; break; // Short tasks procrastinated are more severe!
      case 'under_1h': score += 3; break;
      case 'under_1d': score += 2; break;
      case 'more': score += 1; break;
      default: score += 1;
    }
    return score;
  };

  // Helper for old pending score (merged age: 발생시점 연산결과 + 입력 후 경과일)
  const getOldScore = (task: Task) => {
    const val = task.tags.createdWhen;
    let baseDays = 0;
    if (val === 'today') baseDays = 0;
    else if (val === 'week') baseDays = 4;
    else if (val === 'week_plus') baseDays = 10;
    else if (val === 'month') baseDays = 30;
    else if (val === 'year_under') baseDays = 180;
    else if (val === 'year_plus') baseDays = 500;
    else if (val === 'distant') baseDays = 1550;

    let elapsedInApp = 0;
    try {
      const createdTime = new Date(task.createdAt).getTime();
      const diffMs = Date.now() - createdTime;
      elapsedInApp = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (elapsedInApp < 0) elapsedInApp = 0;
    } catch {
      elapsedInApp = 0;
    }
    return baseDays + elapsedInApp;
  };

  // Helper for last subtask completed time
  const getLastCompletedTime = (task: Task) => {
    const completedSubs = task.subtasks?.filter(st => st.completed) || [];
    if (completedSubs.length === 0) return 0;
    
    const times = completedSubs.map(st => {
      if (st.completedAt) {
        return new Date(st.completedAt).getTime();
      }
      return new Date(task.createdAt).getTime();
    });
    return Math.max(...times);
  };

  // Active Tag Sorting/Filtering Logic
  const filteredTasks = useMemo(() => {
    const list = pendingTasks.filter(task => {
      // 1. Search filter
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Dynamic tag filter mapping
      const matchesTags = categories.every(cat => {
        const allowedVals = filterTags[cat.id] !== undefined
          ? filterTags[cat.id]
          : cat.options.map(o => o.value);
        
        const taskVal = task.tags[cat.id];
        if (!taskVal) return true;
        return allowedVals.includes(taskVal);
      });

      return matchesSearch && matchesTags;
    });

    let sortedList: Task[] = [];
    if (isDefaultState && list.length > 0) {
      // Find the most recently operated task in this list based on lastOperatedAt or createdAt
      const sortedByRecency = [...list].sort((a, b) => {
        const timeA = a.lastOperatedAt ? new Date(a.lastOperatedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastOperatedAt ? new Date(b.lastOperatedAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      const mostRecent = sortedByRecency[0];
      const others = list.filter(t => t.id !== mostRecent.id);
      
      // Shuffle other tasks using stable random values
      const shuffledOthers = others.sort((a, b) => {
        const randA = getStableRandomValue(a.id, sessionSeed);
        const randB = getStableRandomValue(b.id, sessionSeed);
        return randA - randB;
      });
      
      sortedList = [mostRecent, ...shuffledOthers];
    } else {
      // Apply Sorting
      sortedList = [...list].sort((a, b) => {
        if (sortBy === 'oldest') {
          const scoreA = getOldScore(a);
          const scoreB = getOldScore(b);
          if (scoreA !== scoreB) {
            return scoreB - scoreA; // More days = oldest first
          }
          // If equal, sort by task registration order (earliest first)
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        
        if (sortBy === 'newest') {
          const scoreA = getOldScore(a);
          const scoreB = getOldScore(b);
          if (scoreA !== scoreB) {
            return scoreA - scoreB; // Fewer days = newest first
          }
          // If equal, sort by task registration order (latest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        if (sortBy === 'recently_touched') {
          const timeA = getLastCompletedTime(a);
          const timeB = getLastCompletedTime(b);
          if (timeA !== timeB) {
            return timeB - timeA; // Latest completed times first
          }
          // Fallback to task registration order (latest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        if (sortBy === 'longest_untouched') {
          const timeA = getLastCompletedTime(a);
          const timeB = getLastCompletedTime(b);
          if (timeA !== timeB) {
            return timeA - timeB; // Oldest completed / untouched (0) first
          }
          // Fallback to task registration order (earliest first)
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        // Default: severity score sorting
        const sevA = getProcrastinatedLevel(a);
        const sevB = getProcrastinatedLevel(b);
        if (sevA !== sevB) {
          return sevB - sevA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Move the randomly chosen task to the top if the dice feature is activated (activeUrgeIndex > 0)
    if (activeUrgeIndex > 0 && sortedList.length > 0) {
      const selectedIndex = activeUrgeIndex % sortedList.length;
      const selectedTask = sortedList[selectedIndex];
      const remainingTasks = sortedList.filter(t => t.id !== selectedTask.id);
      return [selectedTask, ...remainingTasks];
    }

    return sortedList;
  }, [pendingTasks, searchTerm, filterTags, sortBy, activeUrgeIndex, sessionSeed, isDefaultState]);

  const getSeverityBadge = (score: number) => {
    if (score >= 12) return { text: '🚨 특수 경보 - 고인물 일', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    if (score >= 8) return { text: '⚠️ 장기 수수방관', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    if (score >= 4) return { text: '⏳ 미루기 시작됨', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    return { text: '🌱 파릇파릇한 일', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  };

  return (
    <div className="space-y-8 pb-24">
      
      {/* 3. MAIN PENDING TASK LIST */}
      <div className="space-y-4">

        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const severityScore = getProcrastinatedLevel(task);
              const severity = getSeverityBadge(severityScore);
              
              // Custom colors for severity to map with brutalist look
              let severityBg = 'bg-emerald-300';
              if (severityScore >= 12) severityBg = 'bg-rose-400';
              else if (severityScore >= 8) severityBg = 'bg-amber-400';
              else if (severityScore >= 4) severityBg = 'bg-yellow-300';

              const isHighlighted = homeHighlightTaskId && task.id === homeHighlightTaskId;

              const taskBaseTitle = getBaseTitle(task.title).toLowerCase();
              const sameTitleAll = tasks.filter(t => getBaseTitle(t.title).toLowerCase() === taskBaseTitle);
              const completedCount = sameTitleAll.filter(t => t.status === 'completed').length;
              const hasHistory = sameTitleAll.length > 1;

              return (
                <motion.div
                  key={task.id}
                  layoutId={`task-card-container-${task.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                  className={`${isHighlighted ? 'ring-4 ring-[#FF4D00] ring-offset-2 rounded-none animate-pulse z-10' : ''}`}
                >
                  <div 
                    onClick={() => onStartTask(task.id)}
                    className={`w-full text-left border-4 border-black ${titleOnlyMode ? 'p-4 md:p-4.5 shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000]' : 'p-5 md:p-6 shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000]'} relative overflow-hidden transition-all duration-200 hover:bg-[#FFFDF6] hover:translate-x-0.5 hover:translate-y-0.5 group focus:outline-none block cursor-pointer ${isHighlighted ? 'bg-amber-50/80 border-[#FF4D00]' : 'bg-white'}`}
                  >
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-[#FF4D00]/10 pointer-events-none filter blur-xl" />

                    {/* Repetition metrics indicator button */}
                    {hasHistory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistoryTitle(task.title);
                        }}
                        className={`absolute ${titleOnlyMode ? 'top-3 right-3' : 'top-4 right-4'} z-20 flex items-center justify-center bg-[#FFFDF0] border-2 border-black w-8 h-8 text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FF4D00] hover:text-white hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150 cursor-pointer active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000]`}
                        title={`이전 반복 실천 이력 모아보기 (총 ${completedCount}회 완료)`}
                      >
                        <RefreshCw className="w-4 h-4 stroke-[2.5]" id={`recurr-btn-${task.id}`} />
                      </button>
                    )}

                    {titleOnlyMode ? (
                      <div className="flex items-center relative z-10 pr-12 min-h-[2rem]">
                        <h3 className="text-base md:text-lg font-bold text-black leading-tight tracking-tight uppercase">
                          &ldquo;{task.title}&rdquo;
                        </h3>
                      </div>
                    ) : (
                      <>
                        {/* Top card row: Badge */}
                        <div className="flex items-center justify-between mb-4 relative z-10 mr-24">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-normal border-2 border-black px-2 py-0.5 ${severityBg} text-black shadow-[1.5px_1.5px_0px_0px_#000]`}>
                              {severity.text}
                            </span>
                          </div>
                          {isHighlighted && (
                            <span className="bg-[#FF4D00] text-white text-[10px] font-black border-2 border-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000] uppercase tracking-wider animate-bounce">
                              🔁 반복 시작된 일 (복사본)
                            </span>
                          )}
                        </div>

                        {/* Simplified trajectory info (one-line) - Moved ABOVE title, no box, styled highlights */}
                        <p className="text-sm font-normal text-zinc-650 mb-2 leading-relaxed relative z-10">
                          <span className="text-[#FF4D00] font-normal underline">
                            {(() => {
                              const val = task.tags.createdWhen;
                              const cat = categories.find(c => c.id === 'createdWhen');
                              const opt = cat?.options.find(o => o.value === val);
                              return opt?.label || '미정';
                            })()}
                          </span>
                          전 부터 하려고{" "}
                          <span className="text-blue-600 font-normal">
                            {formatKoreanDate(task.createdAt)}
                          </span>
                          {getDaysElapsed(task.createdAt) === 0 ? (
                            <>
                              에 입력.{" "}
                              <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase animate-pulse">
                                오늘.
                              </span>
                            </>
                          ) : (
                            <>
                              에 입력, 그 후{" "}
                              <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase">
                                {getDurationElapsedText(task.createdAt)}
                              </span>
                              이 더 지남.
                            </>
                          )}
                        </p>

                        {(() => {
                          const completedSubs = task.subtasks?.filter(st => st.completed && st.completedAt) || [];
                          if (completedSubs.length === 0) return null;
                          
                          const latestCompletedAt = completedSubs.reduce((latest, current) => {
                            if (!latest) return current.completedAt!;
                            const latestTime = new Date(latest).getTime();
                            const currentTime = new Date(current.completedAt!).getTime();
                            return currentTime > latestTime ? current.completedAt! : latest;
                          }, completedSubs[0].completedAt!);
                          
                          const friendlyWhen = getFriendlyDaysAgo(latestCompletedAt);
                          return (
                            <p className="text-sm font-normal text-emerald-600 mb-2 leading-relaxed relative z-10 flex items-center gap-1.5">
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 text-xs font-normal uppercase">
                                 <span className="underline">{friendlyWhen} 함 🔥</span>
                              </span>
                            </p>
                          );
                        })()}

                        <h3 className="text-xl md:text-2xl font-bold text-black mb-3 leading-tight tracking-tight uppercase relative z-10">
                          &ldquo;{task.title}&rdquo;
                        </h3>

                        {task.description && (
                          <p className="text-[#1A1A1A]/80 text-sm md:text-base mb-4 leading-relaxed pl-3 border-l-4 border-[#FF4D00] font-normal relative z-10">
                            &ldquo;{task.description}&rdquo;
                          </p>
                        )}

                        {/* Associated Grid Tags */}
                        <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                          {categories.map((category) => {
                            const value = task.tags[category.id];
                            if (!value) return null;
                            const option = category.options.find(opt => opt.value === value);
                            if (!option) return null;
                            return (
                              <span key={category.id} className="text-xs font-normal text-[#1A1A1A] bg-[#F4F4F1] px-2.5 py-1.5 flex items-center gap-1">
                                {option.icon && <span className="mr-0.5">{option.icon}</span>}
                                {option.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* 할 일을 잘게 부순 단계 */}
                        <div
                          className="w-full text-left bg-white border-3 border-dashed border-zinc-400 p-5 text-sm relative z-10 font-sans mt-3.5 group-hover:bg-[#FFFDF0] transition-colors"
                        >
                          {renderSubTaskSummary(task)}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white border-4 border-dashed border-black p-10 text-center text-black shadow-[4px_4px_0px_0px_#000]">
              <AlertTriangle className="w-8 h-8 text-[#FF4D00] stroke-[2] mx-auto mb-3" />
              <p className="text-base font-bold uppercase">설정한 조건에 부합하는 미룬 일이 없습니다.</p>
              <p className="text-[#1A1A1A]/70 text-sm mt-1 font-normal">분류 장치를 변경하거나 필터를 초기화해보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. REPETITION HISTORY LOOKUP MODAL */}
      <AnimatePresence>
        {selectedHistoryTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHistoryTitle(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-[#FFFDF9] border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden text-black font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button check */}
              <button
                onClick={() => setSelectedHistoryTitle(null)}
                className="absolute top-4 right-4 bg-white border-2 border-black p-1 shadow-[2px_2px_0px_0px_#000] hover:bg-[#FF4D00] hover:text-white hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer z-10"
                title="닫기"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Header */}
              <div className="border-b-4 border-black pb-4 mb-4">
                <div className="flex items-center gap-2 text-[#FF4D00] mb-1">
                  <History className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-xs font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5">반복 실천 보관함</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black leading-tight text-black mt-1 break-words">
                  &ldquo;{getBaseTitle(selectedHistoryTitle)}&rdquo;
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs font-bold bg-emerald-250 border-2 border-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
                    총 실천 완료 {sortedHistoryInstances.filter(t => t.status === 'completed').length}회
                  </span>
                  <span className="text-xs font-bold bg-zinc-100 border-2 border-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
                    전체 생성 기록 {sortedHistoryInstances.length}회
                  </span>
                </div>
              </div>

              {/* Scrollable list of past instances */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {sortedHistoryInstances.map((inst) => {
                  const isCompleted = inst.status === 'completed';
                  const isAbandoned = inst.status === 'abandoned';
                  const isGivenUp = inst.status === 'given_up';
                  const isActiveOrPending = inst.status === 'active' || inst.status === 'pending';
                  
                  let cardBg = 'bg-white';
                  let statusBadge = '';
                  let statusBadgeBg = '';
                  
                  if (isCompleted) {
                    cardBg = 'bg-emerald-50/70 border-emerald-500';
                    statusBadge = '✓ 완수 완료';
                    statusBadgeBg = 'bg-emerald-300 text-black';
                  } else if (isActiveOrPending) {
                    cardBg = 'bg-amber-50/50 border-amber-500';
                    statusBadge = '● 진행 중';
                    statusBadgeBg = 'bg-amber-300 text-black';
                  } else if (isAbandoned) {
                    cardBg = 'bg-rose-50/50 border-rose-500';
                    statusBadge = '✗ 중단됨';
                    statusBadgeBg = 'bg-rose-300 text-black';
                  } else if (isGivenUp) {
                    cardBg = 'bg-zinc-50/80 border-zinc-500';
                    statusBadge = '👻 파기됨';
                    statusBadgeBg = 'bg-zinc-300 text-black';
                  }

                  const isExpanded = !!expandedInstanceIds[inst.id];
                  const hasSubtasks = inst.subtasks && inst.subtasks.length > 0;
                  const completedSubtasksCount = inst.subtasks ? inst.subtasks.filter(st => st.completed).length : 0;

                  return (
                    <div 
                      key={inst.id}
                      className={`border-3 border-black p-4 shadow-[3px_3px_0px_0px_#000] relative overflow-hidden transition-all duration-150 ${cardBg}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold border-2 border-black px-2 py-0.5 shadow-[1px_1px_0px_0px_#000] ${statusBadgeBg}`}>
                            {statusBadge}
                          </span>
                          <span className="text-[11px] font-extrabold bg-black text-white px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_#000]">
                            {(() => {
                              const match = inst.title.trim().match(/(\d+)회차$/);
                              return match ? `${match[1]}회차` : '1회차';
                            })()}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          입력: {formatKoreanDate(inst.createdAt)}
                        </span>
                      </div>

                      {/* Info lines */}
                      <div className="space-y-1.5 text-xs text-zinc-700">
                        {inst.completedAt && (
                          <p className="flex items-center gap-1.5 text-emerald-700 font-medium font-sans">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                            <span>완료 시간: {new Date(inst.completedAt).toLocaleString('ko-KR')}</span>
                          </p>
                        )}
                        {inst.completedAt && inst.completedNotes && (
                          <div className="bg-emerald-50/50 p-2 border border-emerald-200 text-[11px] text-emerald-900 border-l-3 border-l-emerald-500 my-1">
                            <p className="italic font-normal">완료 메모: &ldquo;{inst.completedNotes}&rdquo;</p>
                          </div>
                        )}
                        {isAbandoned && inst.abandonedAt && (
                          <div className="text-zinc-650 bg-zinc-50 p-2 border border-black text-[11px] space-y-1">
                            <p className="font-bold text-rose-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block" />
                              중단 시간: {new Date(inst.abandonedAt).toLocaleString('ko-KR')}
                            </p>
                            {inst.abandonReason && (
                              <p className="italic text-zinc-650">이유: &ldquo;{inst.abandonReason}&rdquo;</p>
                            )}
                          </div>
                        )}
                        {inst.timeSpent > 0 && (
                          <p className="flex items-center gap-1.5 text-blue-700">
                            <span>⏱️ 총 투입 시간:</span>
                            <span className="font-bold underline">{formatDurationSeconds(inst.timeSpent)}</span>
                          </p>
                        )}
                        {inst.description && (
                          <p className="text-zinc-500 italic text-[11px] border-l-2 border-[#FF4D00] pl-2 mt-1 py-0.5">
                            &ldquo;{inst.description}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Subtasks metrics and Expand / Collapse button */}
                      {hasSubtasks && (
                        <div className="mt-3 pt-3 border-t border-dashed border-zinc-300">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedInstanceIds(prev => ({
                                ...prev,
                                [inst.id]: !prev[inst.id]
                              }));
                            }}
                            className="w-full flex items-center justify-between text-[11px] font-bold text-black border border-black bg-white px-2 py-1 shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-zinc-50 active:translate-y-0.5 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>세부 단계 실천 ({completedSubtasksCount} / {inst.subtasks.length} 완료)</span>
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 pl-2 space-y-1.5 border-l-2 border-black/30 overflow-hidden"
                            >
                              {inst.subtasks.map((st) => (
                                <div key={st.id} className="flex items-start gap-1.5 text-[11px]">
                                  <span className={`px-1 rounded-sm text-[9px] font-bold border-2 border-black select-none ${st.completed ? 'bg-emerald-300 text-black' : 'bg-white text-zinc-400'}`}>
                                    {st.completed ? '✓' : ' '}
                                  </span>
                                  <span className={`font-normal ${st.completed ? 'line-through text-zinc-450' : 'text-zinc-800'}`}>
                                    {st.title}
                                  </span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t-3 border-black flex justify-end">
                <button
                  onClick={() => setSelectedHistoryTitle(null)}
                  className="bg-black hover:bg-[#FF4D00] text-white font-bold text-xs border-2 border-black px-4 py-2 shadow-[3px_3px_0px_0px_#444] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-1 cursor-pointer transition-all uppercase"
                >
                  보관함 닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
