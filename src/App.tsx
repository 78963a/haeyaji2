/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from './hooks/useTasks';
import { HomeView } from './components/HomeView';
import { AddEditView } from './components/AddEditView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ActiveFocusView } from './components/ActiveFocusView';
import { Task } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Plus, Settings, Archive, Clock, Sparkles, Flame, Dices, Search, Filter, AlertTriangle } from 'lucide-react';
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
    importRawData
  } = useTasks();

  // Navigation: 'home' | 'add' | 'history' | 'settings' | 'active'
  const [activeView, setActiveView] = useState<'home' | 'add' | 'history' | 'settings' | 'active'>('home');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<null | 'unstarted' | 'inprogress' | 'completed'>(null);
  const [urgeIndex, setUrgeIndex] = useState(0);

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
  const [filterTags, setFilterTags] = useState<Record<string, string>>({});
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
  const activeFiltersCount = Object.keys(filterTags).length + (searchTerm ? 1 : 0) + (sortBy !== 'severity' ? 1 : 0);

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
                  className="text-xs font-normal uppercase text-white bg-[#FF4D00] px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-black active:translate-y-0.5 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  title="다른 미룬 일 촉구받기 (주사위 흔들기)"
                >
                  Haeyaji
                  <Dices className="w-3.5 h-3.5 text-white stroke-[2.5] animate-pulse" />
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

        {/* 1.5. COLLAPSIBLE FILTERING COMPASS (ONLY ON HOME) */}
        {activeView === 'home' && (
          <div className="max-w-xl mx-auto mt-2.5 pt-2.5 border-t-2 border-dashed border-black/20">
            <button
              id="filter-compass-toggle"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-full flex items-center justify-between bg-[#FFFDE0] hover:bg-[#FFF9C4] text-black border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all text-xs font-normal cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#FF4D00] stroke-[2]" />
                <span className="font-bold text-black text-xs">🧭 미룬 일 정교 추적 필터링 컴파스</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#FF4D00] text-white px-2 py-0.5 ml-1 text-[10px] font-bold border-2 border-black shadow-[1px_1px_0px_0px_#000]">
                    {activeFiltersCount}개 적용됨
                  </span>
                )}
              </span>
              <span className="text-[10px] bg-white border-2 border-black px-2 py-0.5 font-bold transition hover:bg-zinc-100">
                {isFilterExpanded ? '접기 ▲' : '펼치기 ▼'}
              </span>
            </button>
            
            {/* Collapsible Panel with smooth height transitions */}
            <AnimatePresence>
              {isFilterExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden bg-gradient-to-br from-[#FFFDF0] via-[#FFF3E0] to-[#FFE0B2] border-3 border-black p-4 shadow-[4px_4px_0px_0px_#000] space-y-3 mt-2"
                >
                  {/* Reset filters button when filters exist */}
                  {(Object.keys(filterTags).length > 0 || searchTerm || sortBy !== 'severity') && (
                    <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
                      <span className="text-[10px] text-zinc-550 font-normal">필터 조건 활성화 상태</span>
                      <button
                        onClick={() => {
                          setFilterTags({});
                          setSearchTerm('');
                          setSortBy('severity');
                          setUrgeIndex(0);
                        }}
                        className="text-[10px] text-zinc-700 hover:text-black font-normal bg-white hover:bg-zinc-100 border-2 border-black px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer transition shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5"
                      >
                        🧹 모든 필터 및 정렬 방식 초기화
                      </button>
                    </div>
                  )}

                  {/* Dynamic Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A] stroke-[2]" />
                    <input
                      type="text"
                      placeholder="미뤄둔 어떤 일을 구출해드릴까요? (검색어 입력)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white text-[#1A1A1A] border-2 border-black py-2 pl-9 pr-3 text-xs font-normal outline-none focus:ring-none placeholder-[#1A1A1A]/50 focus:bg-white text-black"
                    />
                  </div>

                  {/* Filters Selector Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] md:text-xs">
                    {categories.map((cat) => (
                      <div key={cat.id} className="space-y-1">
                        <span className="text-[10px] font-normal text-black block">⚙️ {cat.label}</span>
                        <select
                          value={filterTags[cat.id] || 'all'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilterTags((prev) => {
                              const next = { ...prev };
                              if (val === 'all') {
                                delete next[cat.id];
                              } else {
                                next[cat.id] = val;
                              }
                              return next;
                            });
                          }}
                          className="w-full bg-white border-2 border-black p-1.5 text-xs text-black font-normal outline-none cursor-pointer"
                        >
                          <option value="all">전체 ({cat.label.replace(/\s*\(.*?\)\s*/, '')})</option>
                          {cat.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon ? `${opt.icon} ` : ''}{opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {/* Sorting Selector */}
                    <div className="space-y-1 col-span-2 pt-1 border-t border-black/10">
                      <span className="text-[10px] font-normal text-[#FF4D00] block mb-0.5">🧭 미룬 일 정렬 방식 선택</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-[#FFF9E6] border-2 border-black p-1.5 text-xs text-black font-normal outline-none cursor-pointer"
                      >
                        <option value="severity">🚨 지연 심각도 높은 순 (기본)</option>
                        <option value="oldest">📅 발생시점 오래된 순으로 정렬</option>
                        <option value="newest">🆕 발생시점 최근 순으로 정렬</option>
                        <option value="recently_touched">🔥 최근에 실천한 순으로 정렬</option>
                        <option value="longest_untouched">❄️ 오랫동안 손대지 않았던 순으로 정렬</option>
                      </select>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

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

            {activeView === 'history' && (
              <HistoryView
                tasks={tasks}
                onStartTask={handleStartTaskAndRedirect}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
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
                onCompleteTask={completeTask}
                onAbandonTask={abandonTask}
                onGiveUpTask={giveUpTask}
                onDeleteTask={deleteTask}
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

          {/* COMPLETED/ABANDONED HISTORY BTN */}
          <button
            onClick={() => setActiveView('history')}
            className={`flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-pointer ${
              activeView === 'history' ? 'text-[#FF4D00] font-black scale-105' : 'text-[#1A1A1A]/60 hover:text-black font-semibold'
            }`}
          >
            <Archive className={`w-5.5 h-5.5 ${activeView === 'history' ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="text-xs">기록</span>
          </button>

          {/* ADD TASK COMPACT FLOATING BAR (CENTRAL) */}
          <button
            onClick={handleOpenAddView}
            className="flex flex-col items-center justify-center p-2 rounded-none bg-[#FF4D00] text-white hover:bg-black transition-all transform -translate-y-4 hover:-translate-y-5 h-12 w-12 border-3 border-black shadow-[3px_3px_0px_0px_#000] active:scale-95 focus:outline-none cursor-pointer"
            title="해야할 미룸 소환하기"
          >
            <Plus className="w-7 h-7 stroke-[4]" />
          </button>

          {/* COMPANION SHORTCUT TO ACTIVE FOCUS VIEW IF EXISTS (Neutralized) */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-0.5 p-2 focus:outline-none transition-all cursor-not-allowed text-[#1A1A1A]/40 font-semibold"
            title="미개발 기능 수록 예정지"
          >
            <Flame className="w-5.5 h-5.5 stroke-[2]" />
            <span className="text-xs">집중</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
    </div>
  );
}
