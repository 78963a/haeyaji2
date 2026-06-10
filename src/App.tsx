/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from './hooks/useTasks';
import { HomeView } from './components/HomeView';
import { AddEditView } from './components/AddEditView';
import { AnalyticsView } from './components/AnalyticsView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { ActiveFocusView } from './components/ActiveFocusView';
import { Task } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Plus, Settings, Archive, Clock, Sparkles, Flame, Dices, Search, Filter, AlertTriangle, BarChart2 } from 'lucide-react';
import { formatKoreanDate, getElapsedHumanized, getDurationElapsedText, getDaysElapsed } from './utils/dateUtils';
import { TAG_CREATED_WHEN_MAP, DEFAULT_TAG_CATEGORIES } from './constants';

export default function App() {
  const {
    isInitialized,
    tasks,
    activeTaskId,
    activeTask,
    settings,
    saveSettings,
    addTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    completeTask,
    abandonTask,
    giveUpTask,
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
    importRawData,
    activityEvents
  } = useTasks();

  // Navigation: 'home' | 'add' | 'analytics' | 'archive' | 'settings' | 'active'
  const [activeView, setActiveView] = useState<'home' | 'add' | 'analytics' | 'archive' | 'settings' | 'active'>('home');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<null | 'unstarted' | 'inprogress' | 'completed'>(null);
  const [urgeIndex, setUrgeIndex] = useState(0);

  // Archive View routing and animation presets
  const [archiveDefaultTab, setArchiveDefaultTab] = useState<'completed' | 'abandoned' | 'given_up'>('completed');
  const [archiveHighlightTaskId, setArchiveHighlightTaskId] = useState<string | null>(null);
  const [homeHighlightTaskId, setHomeHighlightTaskId] = useState<string | null>(null);

  // Core visual status animation overlay
  const [taskTransition, setTaskTransition] = useState<{
    id: string;
    title: string;
    type: 'complete' | 'abandon' | 'give_up' | 'delete';
  } | null>(null);

  // Task restore conflict resolution state
  const [restoreConflict, setRestoreConflict] = useState<{
    archivedTask: Task;
    activeTask: Task;
  } | null>(null);

  const handleTransitionCompleteTask = (id: string, repeatOption?: 'none' | 'only_metadata' | 'with_subtasks', notes?: string) => {
    const taskObj = tasks.find(t => t.id === id);
    if (!taskObj) return;

    setTaskTransition({
      id,
      title: taskObj.title,
      type: 'complete'
    });

    setTimeout(() => {
      let finalCompletedTask = taskObj;

      // 1. If repeating is enabled, parse current round and rename if necessary
      if (repeatOption && repeatOption !== 'none') {
        const match = taskObj.title.trim().match(/^(.*?)\s*(\d+)회차$/);
        let baseTitle = taskObj.title.trim();
        
        if (!match) {
          // If first repeat, update the completed original title to the "1회차" format
          finalCompletedTask = {
            ...taskObj,
            title: `${baseTitle} 1회차`
          };
          updateTask(finalCompletedTask);
        }
      }

      completeTask(id, notes);
      setArchiveDefaultTab('completed');
      setArchiveHighlightTaskId(id);
      setActiveView('archive');
      setTaskTransition(null);

      // If repeating is requested, let's schedule returning to home and creating a clone!
      if (repeatOption && repeatOption !== 'none') {
        setTimeout(() => {
          // 1. Prepare cloned subtasks
          const subtaskTitles = repeatOption === 'with_subtasks'
            ? taskObj.subtasks.map(s => s.title)
            : [];

          // Determine cloned title round index based on final completed task's title
          const titleStr = finalCompletedTask.title;
          const match = titleStr.trim().match(/^(.*?)\s*(\d+)회차$/);
          let baseTitle = titleStr.trim();
          let currentRound = 1;
          
          if (match) {
            baseTitle = match[1].trim();
            currentRound = parseInt(match[2], 10);
          }
          const nextRound = currentRound + 1;
          const clonedTitle = `${baseTitle} ${nextRound}회차`;

          // 2. Clone/Add task
          const clonedTask = addTask(
            clonedTitle,
            taskObj.description || '',
            { ...taskObj.tags },
            subtaskTitles
          );

          if (clonedTask) {
            setHomeHighlightTaskId(clonedTask.id);
            // Clear home highlight after 4 seconds
            setTimeout(() => {
              setHomeHighlightTaskId(null);
            }, 4000);
          }

          // 3. Smoothly switch back to Home View
          setActiveView('home');
        }, 1800); // Wait on archive screen so user sees completed status, then return to home and add clone!
      }
    }, 1800);
  };

  const getBaseTitle = (title: string): string => {
    const match = title.trim().match(/^(.*?)\s*(\d+)회차$/);
    return match ? match[1].trim() : title.trim();
  };

  const performRestoreTaskDirect = (taskObj: Task) => {
    // 1. Mark task status as pending as per restore task requirement
    const updated: Task = {
      ...taskObj,
      status: 'pending',
      completedAt: undefined,
      abandonedAt: undefined,
      abandonReason: undefined,
      cheersCount: taskObj.cheersCount + 1,
      lastOperatedAt: new Date().toISOString()
    };
    
    // Save/update task via hook
    updateTask(updated);

    // 2. Set highlight on home view card
    setHomeHighlightTaskId(taskObj.id);
    setTimeout(() => {
      setHomeHighlightTaskId(null);
    }, 4000);

    // 3. Smoothly navigate to "home" view
    setActiveView('home');
  };

  const handleRestoreTaskWithAnimation = (taskObj: Task) => {
    const targetBase = getBaseTitle(taskObj.title).toLowerCase();
    const activeDuplicate = tasks.find(t => 
      t.id !== taskObj.id &&
      (t.status === 'pending' || t.status === 'active') &&
      getBaseTitle(t.title).toLowerCase() === targetBase
    );

    if (activeDuplicate) {
      setRestoreConflict({
        archivedTask: taskObj,
        activeTask: activeDuplicate
      });
      return;
    }

    performRestoreTaskDirect(taskObj);
  };

  const handleTransitionAbandonTask = (id: string, reason: string) => {
    const taskObj = tasks.find(t => t.id === id);
    if (!taskObj) return;

    setTaskTransition({
      id,
      title: taskObj.title,
      type: 'abandon'
    });

    setTimeout(() => {
      abandonTask(id, reason);
      setArchiveDefaultTab('abandoned');
      setArchiveHighlightTaskId(id);
      setActiveView('archive');
      setTaskTransition(null);
    }, 1800);
  };

  const handleTransitionGiveUpTask = (id: string, reason: string) => {
    const taskObj = tasks.find(t => t.id === id);
    if (!taskObj) return;

    setTaskTransition({
      id,
      title: taskObj.title,
      type: 'give_up'
    });

    setTimeout(() => {
      giveUpTask(id, reason);
      setArchiveDefaultTab('given_up');
      setArchiveHighlightTaskId(id);
      setActiveView('archive');
      setTaskTransition(null);
    }, 1800);
  };

  const handleTransitionDeleteTask = (id: string) => {
    const taskObj = tasks.find(t => t.id === id);
    if (!taskObj) return;

    setTaskTransition({
      id,
      title: taskObj.title,
      type: 'delete'
    });

    setTimeout(() => {
      deleteTask(id);
      setActiveView('home');
      setTaskTransition(null);
    }, 1800);
  };

  // App-wide Custom Modal State
  const [appModal, setAppModal] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // States of filter and search for the Filtering Compass
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTags, setFilterTags] = useState<Record<string, string[]>>({});
  const [sortBy, setSortBy] = useState<string>('severity');

  // Ref and state to dynamically track public header height for perfect layout spacing
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(140);

  useEffect(() => {
    if (!headerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.getBoundingClientRect().height);
      }
    });

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [activeView, isFilterExpanded, tasks.length]);

  // Automatically scroll to the top of the window on view switch
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F4F4F1] flex flex-col items-center justify-center p-6 text-black">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000] text-center max-w-sm space-y-4">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#FF4D00] border-t-transparent rounded-full mx-auto" />
          <h2 className="text-lg font-black uppercase tracking-tight">해야지 시스템 기동 중...</h2>
          <p className="text-xs text-zinc-650 font-bold leading-relaxed">
            안전하고 쾌적한 IndexedDB(localForage) 엔진을 불러오고 있습니다. 잠시만 기다려주세요!
          </p>
        </div>
      </div>
    );
  }

  // Computed counters based on user definitions:
  // 1. 쌓인 일 (Unstarted tasks: status is pending/active, with no subtasks completed)
  const unstartedTasks = tasks.filter(t => 
    (t.status === 'pending' || t.status === 'active') && 
    t.subtasks.every(st => !st.completed)
  );

  // 2. 해결중 (In-progress: status is pending/active, and has some subtasks completed)
  const inProgressTasks = tasks.filter(t => 
    (t.status === 'pending' || t.status === 'active') && 
    t.subtasks.some(st => st.completed)
  );

  // 3. 해결! (Completed tasks & completed status)
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Quick launch helper to start focusing on a task
  const handleStartTaskAndRedirect = (id: string) => {
    startTask(id);
    setActiveView('active');
  };

  // Trigger form for adding a new task
  const handleOpenAddView = () => {
    setTaskToEdit(null);
    setActiveView('add');
  };

  const handleOpenEditView = (task: Task) => {
    setTaskToEdit(task);
    setActiveView('add');
  };

  // Convert seconds into standard minute layouts for top pill
  const formatSecsToMin = (secs: number) => {
    const mins = Math.floor(secs / 60);
    return `${mins}분`;
  };

  // List of active tags categories for the Filtering Compass display
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;
  
  // Calculate active filters count (filters are active when any option is deselected)
  let activeFiltersCount = (searchTerm ? 1 : 0) + (sortBy !== 'severity' ? 1 : 0);
  categories.forEach(cat => {
    const selected = filterTags[cat.id];
    if (selected !== undefined && selected.length < cat.options.length) {
      activeFiltersCount += 1;
    }
  });

  return (
    <div className="bg-[#F4F4F1] min-h-screen text-[#1A1A1A] font-sans antialiased selection:bg-[#FF4D00] selection:text-white pb-28">
      
      {/* 1. APP HEADER */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-40 bg-[#F4F4F1]/95 backdrop-blur-md border-b-4 border-black px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="text-2xl filter drop-shadow-[1px_1px_0_#000]">🐢</span>
              {tasks.filter(t => t.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF4D00] border border-black"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-black flex items-center gap-2">
                해야지
                <button
                  onClick={() => {
                    setUrgeIndex(prev => prev + 1);
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-white bg-[#FF4D00] w-8 h-8 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-black active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="다른 미룬 일 촉구받기 (주사위 흔들기)"
                >
                  <Dices className="w-4 h-4 text-white stroke-[2.5] animate-pulse" />
                </button>
              </h1>
            </div>
          </div>

          {/* Quick Stats on Header: Three boxes for 쌓인 일, 해결중, 해결! */}
          <div className="flex items-end gap-1.5">
            {/* Box 1: 쌓인 일 (소형) */}
            <button
              onClick={() => setSelectedDetailGroup('unstarted')}
              className="flex flex-col items-center justify-center bg-white border-2 border-black p-1 h-10 w-14 hover:bg-zinc-100 active:translate-y-0.5 transition-all shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
              title="쌓인 일 목록 보기"
            >
              <span className="text-xs text-zinc-650 font-normal whitespace-nowrap leading-none mb-1">쌓인 일</span>
              <span className="text-sm font-normal text-black leading-none">{unstartedTasks.length}</span>
            </button>

            {/* Box 2: 해결중 (중간크기) */}
            <button
              onClick={() => setSelectedDetailGroup('inprogress')}
              className="flex flex-col items-center justify-center bg-yellow-250 bg-yellow-200 border-2 border-black p-1 h-11 w-15 hover:bg-yellow-300 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              title="해결 중인 일 목록 보기"
            >
              <span className="text-xs text-[#1A1A1A] font-normal whitespace-nowrap leading-none mb-1">해결중</span>
              <span className="text-sm font-normal text-black leading-none">{inProgressTasks.length}</span>
            </button>

            {/* Box 3: 해결! (완결된 일 - 기본/큰 크기) */}
            <button
              onClick={() => setSelectedDetailGroup('completed')}
              className="flex flex-col items-center justify-center bg-[#a7f3d0] border-2 border-black p-1.5 h-12 w-16 hover:bg-emerald-300 active:translate-y-0.5 transition-all shadow-[2.5px_2.5px_0px_0px_#000] cursor-pointer"
              title="해결 완료된 일 목록 보기"
            >
              <span className="text-xs text-black font-normal whitespace-nowrap leading-none mb-1">해결!</span>
              <span className="text-base font-bold text-[#FF4D00] leading-none">{completedTasks.length}</span>
            </button>
          </div>
        </div>

        {/* 1.5. COMPACT SEARCH & FILTER CONTROLS (ONLY ON HOME) */}
        {activeView === 'home' && (
          <div className="max-w-xl mx-auto mt-2.5 pt-2.5 border-t-2 border-dashed border-black/20 flex items-center justify-between gap-3 text-xs" id="compact-filter-row">
            {/* Left side: Grouped Search + Filter icons, and Active Count Badge */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(true)}
              className="flex items-center gap-2 bg-white hover:bg-zinc-50 text-black border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all text-xs font-bold cursor-pointer shrink-0"
              id="filter-compass-modal-toggle"
              title="검색 및 상세 필터 설정 열기"
            >
              <span className="flex items-center gap-1 text-[#FF4D00]">
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <Filter className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              {activeFiltersCount > 0 ? (
                <span className="bg-[#FF4D00] text-white px-1.5 py-0.5 text-[10px] font-black border border-black shadow-[1px_1px_0px_#000]">
                  적용됨 {activeFiltersCount}
                </span>
              ) : (
                <span className="text-zinc-500 text-[10px] font-bold">필터 적용하기</span>
              )}
            </button>

            {/* Right side: Sorting Selector */}
            <div className="flex items-center shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FFF9E6] border-2 border-black py-1 px-2 text-[11px] text-black font-bold outline-none cursor-pointer shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition"
                id="sorting-select-dropdown"
              >
                <option value="severity">🚨 우선 순위 (지연도)</option>
                <option value="oldest">📅 미룬지 오래된 순</option>
                <option value="newest">🆕 최근 생긴 순</option>
                <option value="recently_touched">🔥 최근 실천 순</option>
                <option value="longest_untouched">❄️ 가장 방치된 순</option>
              </select>
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS MODAL POPUP */}
        {activeView === 'home' && (
          <AnimatePresence>
            {isFilterExpanded && (
              <div 
                className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[150] overflow-y-auto"
                id="filter-modal-overlay"
                onClick={() => setIsFilterExpanded(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border-4 border-black p-5 md:p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#000] relative space-y-4 my-8 pointer-events-auto"
                  id="filter-modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close pin button at top right */}
                  <button
                    type="button"
                    onClick={() => setIsFilterExpanded(false)}
                    className="absolute top-4 right-4 p-1.5 border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                    aria-label="필터 설정 닫기"
                  >
                    <span className="font-extrabold text-sm block px-1">✖</span>
                  </button>

                  {/* Header Title */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#FF4D00] border-2 border-[#FF4D00] px-2 py-0.5 inline-block bg-[#FFF3E0]">
                      SEARCH & DETAIL FILTERS
                    </span>
                    <h3 className="text-lg font-black text-black">
                      미룬 일 검색 및 필터 설정
                    </h3>
                  </div>

                  {/* Reset filters button when filters exist */}
                  {(searchTerm || sortBy !== 'severity' || categories.some(cat => {
                    const selected = filterTags[cat.id];
                    return selected !== undefined && selected.length < cat.options.length;
                  })) && (
                    <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
                      <span className="text-[10px] text-zinc-500 font-normal">필터 조건 활성화 상태</span>
                      <button
                        onClick={() => {
                          setFilterTags({});
                          setSearchTerm('');
                          setSortBy('severity');
                          setUrgeIndex(0);
                        }}
                        className="text-[10px] text-zinc-700 hover:text-black font-semibold bg-white hover:bg-zinc-100 border-2 border-black px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer transition shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5"
                      >
                        🧹 모든 필터와 정렬 방식 초기화
                      </button>
                    </div>
                  )}

                  {/* Dynamic Search Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black block">🔍 미룬 일 설명이나 제목 검색</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black stroke-[2.5]" />
                      <input
                        type="text"
                        placeholder="검색할 할일 제목 단어를 입력하세요..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white text-black border-2 border-black py-2 pl-9 pr-3 text-xs font-normal outline-none focus:border-[#FF4D00] placeholder-zinc-450"
                      />
                    </div>
                  </div>

                  {/* Filters Selector Grid */}
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const selected = filterTags[cat.id] !== undefined
                        ? filterTags[cat.id]
                        : cat.options.map(o => o.value);
                      
                      return (
                        <div key={cat.id} className="space-y-1.5 pb-2 border-b border-black/10 last:border-b-0 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-black flex items-center gap-1">
                              ⚙️ {cat.label}
                            </span>
                            <div className="flex gap-1 text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterTags(prev => ({
                                    ...prev,
                                    [cat.id]: cat.options.map(o => o.value)
                                  }));
                                }}
                                className="px-1.5 py-0.5 bg-zinc-50 border border-black text-black hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
                              >
                                전체 선택 👍
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterTags(prev => ({
                                    ...prev,
                                    [cat.id]: []
                                  }));
                                }}
                                className="px-1.5 py-0.5 bg-zinc-50 border border-black text-black hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
                              >
                                전체 해제 👎
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {cat.options.map((opt) => {
                              const isPressed = selected.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setFilterTags((prev) => {
                                      const currentSelected = prev[cat.id] !== undefined
                                        ? prev[cat.id]
                                        : cat.options.map(o => o.value);
                                      
                                      let nextSelected: string[];
                                      if (currentSelected.includes(opt.value)) {
                                        nextSelected = currentSelected.filter(v => v !== opt.value);
                                      } else {
                                        nextSelected = [...currentSelected, opt.value];
                                      }
                                      return {
                                        ...prev,
                                        [cat.id]: nextSelected
                                      };
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs border-2 transition-all duration-150 active:scale-95 cursor-pointer font-medium flex items-center gap-1 ${
                                    isPressed
                                      ? 'bg-black text-white border-black font-semibold shadow-[1.5px_1.5px_0px_#000]'
                                      : 'bg-white text-zinc-400 border-zinc-200 line-through decoration-zinc-300'
                                  }`}
                                >
                                  {opt.icon && <span className={isPressed ? "" : "opacity-45"}>{opt.icon}</span>}
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Apply & close buttons */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFilterExpanded(false)}
                      className="w-full py-3 bg-[#FF4D00] hover:bg-[#E04400] text-white border-2 border-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] active:scale-95 transition duration-150 cursor-pointer text-center"
                    >
                      필터 설정 적용 및 닫기 👍
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        )}
      </header>

      {/* SEARCH & FILTERS MODAL POPUP */}
      {activeView === 'home' && (
        <AnimatePresence>
          {isFilterExpanded && (
            <div 
              className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[150] overflow-y-auto"
              id="filter-modal-overlay"
              onClick={() => setIsFilterExpanded(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white border-4 border-black p-5 md:p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#000] relative space-y-4 my-8 pointer-events-auto"
                id="filter-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close pin button at top right */}
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(false)}
                  className="absolute top-4 right-4 p-1.5 border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                  aria-label="필터 설정 닫기"
                >
                  <span className="font-extrabold text-sm block px-1">✖</span>
                </button>

                {/* Header Title */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#FF4D00] border-2 border-[#FF4D00] px-2 py-0.5 inline-block bg-[#FFF3E0]">
                    SEARCH & DETAIL FILTERS
                  </span>
                  <h3 className="text-lg font-black text-black">
                    미룬 일 검색 및 필터 설정
                  </h3>
                </div>

                {/* Reset filters button when filters exist */}
                {(searchTerm || sortBy !== 'severity' || categories.some(cat => {
                  const selected = filterTags[cat.id];
                  return selected !== undefined && selected.length < cat.options.length;
                })) && (
                  <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
                    <span className="text-[10px] text-zinc-500 font-normal">필터 조건 활성화 상태</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterTags({});
                        setSearchTerm('');
                        setSortBy('severity');
                        setUrgeIndex(0);
                      }}
                      className="text-[10px] text-zinc-700 hover:text-black font-semibold bg-white hover:bg-zinc-100 border-2 border-black px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer transition shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5"
                    >
                      🧹 모든 필터와 정렬 방식 초기화
                    </button>
                  </div>
                )}

                {/* Dynamic Search Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black block">🔍 미룬 일 설명이나 제목 검색</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black stroke-[2.5]" />
                    <input
                      type="text"
                      placeholder="검색할 할일 제목 단어를 입력하세요..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white text-black border-2 border-black py-2 pl-9 pr-3 text-xs font-normal outline-none focus:border-[#FF4D00] placeholder-zinc-450"
                    />
                  </div>
                </div>

                {/* Filters Selector Grid */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const selected = filterTags[cat.id] !== undefined
                      ? filterTags[cat.id]
                      : cat.options.map(o => o.value);
                    
                    return (
                      <div key={cat.id} className="space-y-1.5 pb-2 border-b border-black/10 last:border-b-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-black flex items-center gap-1">
                            ⚙️ {cat.label}
                          </span>
                          <div className="flex gap-1 text-[9px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                setFilterTags(prev => ({
                                  ...prev,
                                  [cat.id]: cat.options.map(o => o.value)
                                }));
                              }}
                              className="px-1.5 py-0.5 bg-zinc-50 border border-black text-black hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
                            >
                              전체 선택 👍
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFilterTags(prev => ({
                                  ...prev,
                                  [cat.id]: []
                                }));
                              }}
                              className="px-1.5 py-0.5 bg-zinc-50 border border-black text-black hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
                            >
                              전체 해제 👎
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {cat.options.map((opt) => {
                            const isPressed = selected.includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFilterTags((prev) => {
                                    const currentSelected = prev[cat.id] !== undefined
                                      ? prev[cat.id]
                                      : cat.options.map(o => o.value);
                                    
                                    let nextSelected: string[];
                                    if (currentSelected.includes(opt.value)) {
                                      nextSelected = currentSelected.filter(v => v !== opt.value);
                                    } else {
                                      nextSelected = [...currentSelected, opt.value];
                                    }
                                    return {
                                      ...prev,
                                      [cat.id]: nextSelected
                                    };
                                  });
                                }}
                                className={`px-2 py-1 text-xs border-2 transition-all duration-150 active:scale-95 cursor-pointer font-medium flex items-center gap-1 ${
                                  isPressed
                                    ? 'bg-black text-white border-black font-semibold shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-white text-zinc-400 border-zinc-200 line-through decoration-zinc-300'
                                }`}
                              >
                                {opt.icon && <span className={isPressed ? "" : "opacity-45"}>{opt.icon}</span>}
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply & close buttons */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterExpanded(false)}
                    className="w-full py-3 bg-[#FF4D00] hover:bg-[#E04400] text-white border-2 border-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] active:scale-95 transition duration-150 cursor-pointer text-center"
                  >
                    필터 설정 적용 및 닫기 👍
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* 2. MAIN SCROLLABLE WRAPPER (with top padding to offset fixed header) */}
      <main className="max-w-xl mx-auto px-4 pb-8 transition-all duration-300" style={{ paddingTop: `${headerHeight + 16}px` }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeView === 'home' && (
              <HomeView
                tasks={tasks}
                settings={settings}
                onStartTask={handleStartTaskAndRedirect}
                onSelectView={setActiveView}
                onSelectTaskToEdit={handleOpenEditView}
                urgeIndex={urgeIndex}
                onSetUrgeIndex={setUrgeIndex}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterTags={filterTags}
                setFilterTags={setFilterTags}
                sortBy={sortBy}
                setSortBy={setSortBy}
                homeHighlightTaskId={homeHighlightTaskId}
              />
            )}

            {activeView === 'add' && (
              <AddEditView
                taskToEdit={taskToEdit}
                settings={settings}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onCancel={() => setActiveView('home')}
              />
            )}

            {activeView === 'analytics' && (
              <AnalyticsView
                tasks={tasks}
                activityEvents={activityEvents}
              />
            )}

            {activeView === 'archive' && (
              <ArchiveView
                tasks={tasks}
                onStartTask={handleStartTaskAndRedirect}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
                onRestoreTask={handleRestoreTaskWithAnimation}
                highlightTaskId={archiveHighlightTaskId}
                defaultTab={archiveDefaultTab}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView
                settings={settings}
                tasks={tasks}
                onSaveSettings={saveSettings}
                onImportData={importRawData}
              />
            )}

             {activeView === 'active' && activeTask && (
              <ActiveFocusView
                task={activeTask}
                settings={settings}
                onPauseTask={pauseTask}
                onCompleteTask={handleTransitionCompleteTask}
                onAbandonTask={handleTransitionAbandonTask}
                onGiveUpTask={handleTransitionGiveUpTask}
                onDeleteTask={handleTransitionDeleteTask}
                onToggleSubtask={toggleSubtask}
                onUpdateSubtaskTitle={updateSubtaskTitle}
                onAddSubtask={addSubtaskToTask}
                onRemoveSubtask={removeSubtaskFromTask}
                onUpdateTask={updateTask}
                onBackToHome={() => setActiveView('home')}
                onSelectTaskToEdit={handleOpenEditView}
              />
            )}

            {activeView === 'active' && !activeTask && (
              <div className="text-center py-12 text-[#1A1A1A] bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
                <Flame className="w-10 h-10 text-[#FF4D00] mx-auto mb-3 stroke-[3]" />
                <p className="text-sm font-black uppercase tracking-tight">진행 중인 집중 사건이 없습니다.</p>
                <button
                  onClick={() => setActiveView('home')}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-none bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black px-4 py-2 text-xs font-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
                >
                  홈으로 돌아가기 ↩
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. PERSISTENT NAVIGATION BOTTOM BAR (Fixed on all screens as requested) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F4F4F1] border-t-4 border-black px-4 py-2 shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto flex items-center justify-around relative">
          
          {/* HOME NAVIGATION BTN */}
          <button
            onClick={() => setActiveView('home')}
            className={`flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-pointer ${
              activeView === 'home' ? 'text-[#FF4D00] font-black scale-105' : 'text-[#1A1A1A]/60 hover:text-black font-semibold'
            }`}
          >
            <Home className={`w-5.5 h-5.5 ${activeView === 'home' ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="text-xs">홈</span>
          </button>

          {/* ANALYTICS VIEW BTN */}
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-pointer ${
              activeView === 'analytics' ? 'text-[#FF4D00] font-black scale-105' : 'text-[#1A1A1A]/60 hover:text-black font-semibold'
            }`}
          >
            <BarChart2 className={`w-5.5 h-5.5 ${activeView === 'analytics' ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="text-xs">분석</span>
          </button>

          {/* ADD TASK COMPACT FLOATING BAR (CENTRAL) */}
          <button
            onClick={handleOpenAddView}
            className="flex flex-col items-center justify-center p-2 rounded-none bg-[#FF4D00] text-white hover:bg-black transition-all transform -translate-y-4 hover:-translate-y-5 h-12 w-12 border-3 border-black shadow-[3px_3px_0px_0px_#000] active:scale-95 focus:outline-none cursor-pointer"
            title="해야할 미룸 소환하기"
          >
            <Plus className="w-7 h-7 stroke-[4]" />
          </button>

          {/* ARCHIVE VIEW BTN */}
          <button
            onClick={() => setActiveView('archive')}
            className={`flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-pointer ${
              activeView === 'archive' ? 'text-[#FF4D00] font-black scale-105' : 'text-[#1A1A1A]/60 hover:text-black font-semibold'
            }`}
          >
            <Archive className={`w-5.5 h-5.5 ${activeView === 'archive' ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="text-xs">보관</span>
          </button>

          {/* SETTINGS NAVIGATION BTN */}
          <button
            onClick={() => setActiveView('settings')}
            className={`flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-pointer ${
              activeView === 'settings' ? 'text-[#FF4D00] font-black scale-105' : 'text-[#1A1A1A]/60 hover:text-black font-semibold'
            }`}
          >
            <Settings className={`w-5.5 h-5.5 ${activeView === 'settings' ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="text-xs">설정</span>
          </button>

        </div>
      </nav>

      {/* 4. QUANTUM HEADER STATS DETAIL PANEL (MODAL OVERLAY) */}
      <AnimatePresence>
        {selectedDetailGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with solid color or blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailGroup(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] z-10 max-h-[80vh] flex flex-col"
            >
              {/* Header inside modal */}
              <div className="flex items-start justify-between border-b-4 border-black pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-2">
                    {selectedDetailGroup === 'unstarted' && '📦 쌓인 일'}
                    {selectedDetailGroup === 'inprogress' && '🚧 해결중'}
                    {selectedDetailGroup === 'completed' && '🎉 해결 완료'}
                    <span className="text-white bg-[#FF4D00] text-sm font-normal px-2 py-0.5 border-2 border-black inline-block ml-1">
                      {selectedDetailGroup === 'unstarted' && `${unstartedTasks.length}개`}
                      {selectedDetailGroup === 'inprogress' && `${inProgressTasks.length}개`}
                      {selectedDetailGroup === 'completed' && `${completedTasks.length}개`}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-650 font-normal mt-1 text-[#1A1A1A]/80 leading-normal pr-4">
                    {selectedDetailGroup === 'unstarted' && '전혀 손대지 않고 고이 모셔둔 일들'}
                    {selectedDetailGroup === 'inprogress' && '이미 시작했고 진전이 있는 일들'}
                    {selectedDetailGroup === 'completed' && '자랑스러운 끝낸 일들'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDetailGroup(null)}
                  className="bg-rose-200 text-black border-2 border-black font-normal p-1.5 shadow-[2px_2px_0px_0px_#000] hover:bg-rose-300 active:scale-95 transition cursor-pointer text-xs uppercase"
                >
                  닫기 ✖
                </button>
              </div>

              {/* List body inside modal */}
              <div className="overflow-y-auto flex-1 space-y-3.5 pr-1 py-1">
                {selectedDetailGroup === 'unstarted' && (
                  unstartedTasks.length === 0 ? (
                    <div className="text-center py-10 bg-[#F4F4F1] border-3 border-dashed border-black">
                      <p className="text-sm font-normal text-zinc-500">이 구역의 적체가 완벽히 제로(0)입니다. 대단해요! 🌱</p>
                    </div>
                  ) : (
                    unstartedTasks.map(t => (
                      <div key={t.id} className="bg-[#F4F4F1] border-3 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                          {/* Micro-Timeline Trajectory - Moved ABOVE title, no box, styled highlights */}
                          <p className="text-xs font-normal text-zinc-650 mb-1 leading-relaxed">
                            <span className="text-[#FF4D00] font-normal underline">
                              {t.tags.createdWhen ? TAG_CREATED_WHEN_MAP[t.tags.createdWhen]?.label : '미정'}
                            </span>
                            전부터 하려고{" "}
                            <span className="text-blue-500 font-normal">
                              {formatKoreanDate(t.createdAt)}
                            </span>
                            {getDaysElapsed(t.createdAt) === 0 ? (
                              <>
                                에 입력.{" "}
                                <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase">
                                  오늘.
                                </span>
                              </>
                            ) : (
                              <>
                                에 입력, 그 후{" "}
                                <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase">
                                  {getDurationElapsedText(t.createdAt)}
                                </span>
                                이 더 지남.
                              </>
                            )}
                          </p>
                          <h4 className="text-sm font-bold text-black leading-tight">{t.title}</h4>
                          {t.description && <p className="text-xs text-zinc-700 font-normal">{t.description}</p>}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDetailGroup(null);
                            handleStartTaskAndRedirect(t.id);
                          }}
                          className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-medium px-4 py-2 text-sm shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer whitespace-nowrap self-end sm:self-auto"
                        >
                          실천 장전 ⚡
                        </button>
                      </div>
                    ))
                  )
                )}

                {selectedDetailGroup === 'inprogress' && (
                  inProgressTasks.length === 0 ? (
                    <div className="text-center py-10 bg-[#F4F4F1] border-3 border-dashed border-black">
                      <p className="text-sm font-normal text-zinc-500">진행 중인 미결 사건이 없습니다. 평온을 즐기십시오. ✨</p>
                    </div>
                  ) : (
                    inProgressTasks.map(t => (
                      <div key={t.id} className="bg-[#F4F4F1] border-3 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="bg-orange-100 text-[#FF4D00] text-xs font-normal border border-[#FF4D00] px-2 py-0.5">
                              집중 실행중
                            </span>
                            {t.subtasks.length > 0 && (
                              <span className="bg-zinc-200 text-zinc-800 text-xs font-normal border border-black px-2 py-0.5">
                                {t.subtasks.filter(s => s.completed).length}/{t.subtasks.length}단계
                              </span>
                            )}
                          </div>
                          {/* Micro-Timeline Trajectory - Moved ABOVE title, no box, styled highlights */}
                          <p className="text-xs font-normal text-zinc-650 mb-1 leading-relaxed">
                            <span className="text-[#FF4D00] font-normal underline">
                              {t.tags.createdWhen ? TAG_CREATED_WHEN_MAP[t.tags.createdWhen]?.label : '미정'}
                            </span>
                            전부터 하려고{" "}
                            <span className="text-blue-500 font-normal">
                              {formatKoreanDate(t.createdAt)}
                            </span>
                            {getDaysElapsed(t.createdAt) === 0 ? (
                              <>
                                에 입력.{" "}
                                <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase">
                                  오늘.
                                </span>
                              </>
                            ) : (
                              <>
                                에 입력, 그 후{" "}
                                <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-xs font-normal leading-none uppercase">
                                  {getDurationElapsedText(t.createdAt)}
                                </span>
                                이 더 지남.
                              </>
                            )}
                          </p>
                          <h4 className="text-sm font-bold text-black leading-tight">{t.title}</h4>
                          {t.description && <p className="text-xs text-zinc-700 font-normal">{t.description}</p>}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDetailGroup(null);
                            handleStartTaskAndRedirect(t.id);
                          }}
                          className="bg-[#a7f3d0] hover:bg-emerald-300 text-black border-2 border-black font-medium px-4 py-2 text-sm shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer whitespace-nowrap self-end sm:self-auto"
                        >
                          이어서 실천 ⚡
                        </button>
                      </div>
                    ))
                  )
                )}

                {selectedDetailGroup === 'completed' && (
                  completedTasks.length === 0 ? (
                    <div className="text-center py-10 bg-[#F4F4F1] border-3 border-dashed border-black">
                      <p className="text-sm font-normal text-zinc-500">아직 완공해낸 전적이 없습니다. 아주 자그마한 일부터 성공시켜보세요! 🏆</p>
                    </div>
                  ) : (
                    completedTasks.map(t => (
                      <div key={t.id} className="bg-green-50 border-3 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="bg-[#a7f3d0] text-emerald-950 text-xs font-normal border border-[#a7f3d0] px-2 py-0.5">
                            완벽 소탕 완료
                          </span>
                          <span className="text-xs text-zinc-550 font-normal font-mono">
                            {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <h4 className="text-sm font-normal text-black leading-tight line-through decoration-zinc-400">{t.title}</h4>
                        {t.description && <p className="text-xs text-zinc-700 font-normal italic">{t.description}</p>}
                        <div className="text-xs text-zinc-650 font-normal flex items-center gap-1.5 pt-1">
                          <span>📅 입력 시점: <span className="font-mono text-black font-normal">{formatKoreanDate(t.createdAt)}</span></span>
                          {t.subtasks.length > 0 && (
                            <>
                              <span>|</span>
                              <span>🛠️ 단계: <span className="text-black font-normal">{t.subtasks.length}단계 격파</span></span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APP-WIDE CUSTOM POPUP ALERT/CONFIRM DIALOG MODAL */}
      {appModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-white border-4 border-black p-5 max-w-sm w-full shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2.5">
              <AlertTriangle className="w-5 h-5 text-[#FF4D00] stroke-[2.5]" />
              <h4 className="text-sm font-bold uppercase tracking-tight text-black">
                {appModal.title}
              </h4>
            </div>

            <div className="text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-line">
              {appModal.message}
            </div>

            <div className="flex gap-2.5 pt-1.5 justify-end text-xs">
              {appModal.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    if (appModal.onCancel) {
                      appModal.onCancel();
                    } else {
                      setAppModal(null);
                    }
                  }}
                  className="px-4 py-2 border-2 border-black font-bold bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1"
                >
                  {appModal.cancelText || '취소'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  appModal.onConfirm();
                }}
                className="px-4 py-2 border-2 border-black font-bold text-black bg-[#a7f3d0] hover:bg-[#86efac] shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
              >
                {appModal.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GORGEOUS TASK TRANSITION OVERLAY */}
      <AnimatePresence>
        {taskTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 ${
              taskTransition.type === 'complete' ? 'bg-[#000000e5] backdrop-blur-sm' :
              taskTransition.type === 'abandon' ? 'bg-[#0a0a0aec] backdrop-blur-sm' :
              taskTransition.type === 'give_up' ? 'bg-[#0e0505ef] backdrop-blur-sm' :
              'bg-[#120000f2] backdrop-blur-sm'
            }`}
            id="task-transition-overlay"
          >
            {/* Visual Particle / Accent Circle behind */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.35, 0.2] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className={`absolute h-72 w-72 rounded-full filter blur-2xl pointer-events-none ${
                taskTransition.type === 'complete' ? 'bg-emerald-500' :
                taskTransition.type === 'abandon' ? 'bg-amber-500' :
                taskTransition.type === 'give_up' ? 'bg-rose-500' :
                'bg-red-600'
              }`}
            />

            <div className="relative text-center max-w-sm space-y-6 px-4">
              {/* Animated Icon with high-scale spring bounce */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 15 }}
                className="mx-auto flex items-center justify-center h-20 w-20 rounded-full border-4 border-black bg-white shadow-[4px_4px_0px_0px_#000]"
              >
                {taskTransition.type === 'complete' && <span className="text-4xl">🎉</span>}
                {taskTransition.type === 'abandon' && <span className="text-4xl">⏸️</span>}
                {taskTransition.type === 'give_up' && <span className="text-4xl">☠️</span>}
                {taskTransition.type === 'delete' && <span className="text-4xl">🗑️</span>}
              </motion.div>

              <div className="space-y-2">
                <motion.h3 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg md:text-xl font-black text-white uppercase tracking-tight filter drop-shadow-[1px_1px_1px_#000]"
                >
                  {taskTransition.type === 'complete' && '임무 완전 완수!'}
                  {taskTransition.type === 'abandon' && '임무 보류함 이송 완료'}
                  {taskTransition.type === 'give_up' && '미련 없이 과업 포기'}
                  {taskTransition.type === 'delete' && '흔적 없이 완전 삭제'}
                </motion.h3>

                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="text-xs text-zinc-300 font-semibold leading-relaxed"
                >
                  &ldquo;{taskTransition.title}&rdquo;
                </motion.p>
              </div>

              {/* Subtitle describing what is happening */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`py-2 px-4 border-2 border-black font-bold text-xs shadow-[3px_3px_0px_0px_#000] text-black ${
                  taskTransition.type === 'complete' ? 'bg-[#a7f3d0]' :
                  taskTransition.type === 'abandon' ? 'bg-[#fef3c7]' :
                  taskTransition.type === 'give_up' ? 'bg-[#fecdd3]' :
                  'bg-red-400 text-white'
                }`}
              >
                {taskTransition.type === 'complete' && '성공적으로 끝마쳤습니다! 보관함 이송 중...'}
                {taskTransition.type === 'abandon' && '더 완벽한 다음 기회로 보관 처리 중...'}
                {taskTransition.type === 'give_up' && '마음의 부담을 비웠습니다. 무덤으로 이동 중...'}
                {taskTransition.type === 'delete' && '기억 저편으로 온전히 격하시킨 뒤 복귀 중...'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. DUPLICATE RESTORE CONFLICT MODAL */}
      <AnimatePresence>
        {restoreConflict && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[250] flex items-center justify-center p-4 text-black font-sans"
            onClick={() => setRestoreConflict(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative bg-[#FFFDF9] border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] w-full max-w-md text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 text-[#FF4D00] border-b-4 border-black pb-3.5 mb-4">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" id="conflict-modal-icon" />
                <span className="font-extrabold text-xs tracking-wider uppercase bg-black text-white px-2.5 py-1">
                  할 일 회수 중복 경고
                </span>
              </div>

              {/* Body */}
              <div className="space-y-4">
                <p className="text-sm font-black leading-snug">
                  동일한 명칭의 할 일이 대기열에 이미 존재하고 있습니다.
                </p>

                <div className="bg-amber-50/50 border-2 border-black p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-xs font-bold text-zinc-800">
                    할 일 제목: <span className="text-black underline">&ldquo;{restoreConflict.archivedTask.title}&rdquo;</span>
                  </p>
                  <p className="text-xs text-zinc-650 leading-relaxed">
                    현재 대기열(2회차 복사본)과 완료 보관함(1회차 원본)에 해당 할 일이 모두 존재하고 있어, 그대로 회수할 경우 대기열에 동일한 일이 두 개 나타나게 됩니다.
                  </p>
                </div>

                <p className="text-xs font-bold text-zinc-700">
                  아래 방법 중 하나를 선택해 중복을 방지해 주세요:
                </p>

                {/* Option Panel */}
                <div className="space-y-3.5 pt-1">
                  {/* Option 1: Delete Clone (2회차) and Reclaim Original (1회차) */}
                  <button
                    type="button"
                    onClick={() => {
                      const archived = restoreConflict.archivedTask;
                      const active = restoreConflict.activeTask;
                      deleteTask(active.id);
                      performRestoreTaskDirect(archived);
                      setRestoreConflict(null);
                    }}
                    className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] cursor-pointer transition-all duration-150"
                  >
                    <div className="font-black text-xs text-emerald-800 flex items-center gap-1.5">
                      <span>🔥</span> 2회차 삭제 후 1회차 대기 회수
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium leading-relaxed">
                      현재 대기열의 복사본을 <span className="underline">삭제</span>하고, 보관함의 1회차 원본을 <span className="font-bold text-emerald-900">대기로 회수</span>하여 이전 기록을 이어갑니다.
                    </p>
                  </button>

                  {/* Option 2: Cancel Reclaim */}
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreConflict(null);
                    }}
                    className="w-full text-left bg-zinc-50 hover:bg-zinc-100 border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] cursor-pointer transition-all duration-150"
                  >
                    <div className="font-black text-xs text-zinc-800 flex items-center gap-1.5">
                      <span>❌</span> 1회차 회수 취소 (현재 유지)
                    </div>
                    <p className="text-[11px] text-zinc-650 mt-1 font-normal leading-relaxed">
                      작업을 취소하고 원래 상태로 둡니다. 보관함에는 원래 완수 기록이 남고, 대기열의 복사본도 그대로 남아있게 됩니다.
                    </p>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
