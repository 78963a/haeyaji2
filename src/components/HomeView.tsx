/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task, AppSettings } from '../types';
import { CHEER_MESSAGES, DEFAULT_TAG_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Search, Filter, AlertTriangle, HelpCircle, Flame, Plus, Clock } from 'lucide-react';
import { formatKoreanDate, getElapsedHumanized, getDurationElapsedText, getDaysElapsed, getFriendlyDaysAgo } from '../utils/dateUtils';

interface HomeViewProps {
  tasks: Task[];
  settings: AppSettings;
  onStartTask: (id: string) => void;
  onSelectView: (view: 'home' | 'add' | 'history' | 'settings' | 'active') => void;
  onSelectTaskToEdit?: (task: Task) => void;
  urgeIndex?: number;
  onSetUrgeIndex?: React.Dispatch<React.SetStateAction<number>>;
}

export function HomeView({ tasks, settings, onStartTask, onSelectView, onSelectTaskToEdit, urgeIndex, onSetUrgeIndex }: HomeViewProps) {
  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'pending'), [tasks]);
  
  // Custom tag categories schema
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;

  // Custom renderer for subtasks summary matching user requested logic:
  // 1. Most recently completed subtask (if any)
  // 2. Earliest uncompleted subtask (if any)
  const renderSubTaskSummary = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return (
        <p className="text-[10px] text-zinc-500 font-extrabold italic">
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
        <p className="text-[10px] text-zinc-500 font-extrabold italic">
          등록된 세부 실천 단계가 없습니다.
        </p>
      );
    }

    return (
      <div className="space-y-2 pt-0.5">
        {lastCompleted && (
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-[8.5px] font-black bg-zinc-100 text-zinc-400 border border-zinc-300 px-1.5 py-0.5 shrink-0 uppercase tracking-tight">완료✓</span>
            <span className="font-bold line-through text-zinc-400 text-xs truncate">
              {lastCompleted.title}
            </span>
          </div>
        )}
        {firstUncompleted && (
          <div className="flex items-center gap-2 text-black">
            <span className="text-[8.5px] font-black bg-[#FF4D00] text-white border border-black px-1.5 py-0.5 shrink-0 uppercase tracking-tight animate-pulse">지정🎯</span>
            <span className="font-black text-xs truncate text-[#FF4D00]">
              {firstUncompleted.title}
            </span>
          </div>
        )}
        {task.subtasks.length > ( (lastCompleted ? 1 : 0) + (firstUncompleted ? 1 : 0) ) && (
          <p className="text-[9px] text-[#FF4D00] font-extrabold italic pl-1 mt-1">
            (전체 {task.subtasks.length}단계 중 남은 실천 계획들이 더 있습니다)
          </p>
        )}
      </div>
    );
  };

  // States of filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTags, setFilterTags] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<string>('severity');

  // Random Urger Task state (using prop state if provided, fallback to local state)
  const [localUrgeIndex, setLocalUrgeIndex] = useState(0);
  const activeUrgeIndex = urgeIndex !== undefined ? urgeIndex : localUrgeIndex;
  const activeSetUrgeIndex = onSetUrgeIndex || setLocalUrgeIndex;

  const randomUrgedTask = useMemo(() => {
    if (pendingTasks.length === 0) return null;
    return pendingTasks[(activeUrgeIndex) % pendingTasks.length];
  }, [pendingTasks, activeUrgeIndex]);

  // Cheering phrase associated with random urged task
  const randomCheerMessage = useMemo(() => {
    const seed = activeUrgeIndex + (randomUrgedTask ? randomUrgedTask.title.length : 0);
    return CHEER_MESSAGES[seed % CHEER_MESSAGES.length];
  }, [activeUrgeIndex, randomUrgedTask]);

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
      const matchesTags = Object.entries(filterTags).every(([catId, val]) => {
        if (!val || val === 'all') return true;
        return task.tags[catId] === val;
      });

      return matchesSearch && matchesTags;
    });

    // Apply Sorting
    return [...list].sort((a, b) => {
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
  }, [pendingTasks, searchTerm, filterTags, sortBy]);

  const getSeverityBadge = (score: number) => {
    if (score >= 12) return { text: '🚨 특수 경보 - 고인물 일', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    if (score >= 8) return { text: '⚠️ 장기 수수방관', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    if (score >= 4) return { text: '⏳ 미루기 시작됨', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    return { text: '🌱 파릇파릇한 일', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  };

  return (
    <div className="space-y-8 pb-24">
      
      {/* 1. RANDOM PROCRASTINATION URGER ("해야지 해야지 하고 안 한 일 돌려보기") */}
      <AnimatePresence mode="wait">
        {randomUrgedTask ? (
          <motion.div 
            key={randomUrgedTask.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="relative bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_#000] overflow-hidden"
          >
            {/* Visual background lights */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-[#FF4D00]/10 pointer-events-none filter blur-xl" />

            {/* Simplified trajectory info (one-line) - Moved ABOVE title, no box, styled highlights */}
            <p className="text-[11.5px] font-black text-zinc-600 mb-2 leading-relaxed">
              <span className="text-[#FF4D00] font-black underline">
                {(() => {
                  const val = randomUrgedTask.tags.createdWhen;
                  const cat = categories.find(c => c.id === 'createdWhen');
                  const opt = cat?.options.find(o => o.value === val);
                  return opt?.label || '미정';
                })()}
              </span>
              전부터 하려고{" "}
              <span className="text-blue-600 font-extrabold">
                {formatKoreanDate(randomUrgedTask.createdAt)}
              </span>
              {getDaysElapsed(randomUrgedTask.createdAt) === 0 ? (
                <>
                  에 입력.{" "}
                  <span className="bg-yellow-200 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase">
                    오늘.
                  </span>
                </>
              ) : (
                <>
                  에 입력, 그 후{" "}
                  <span className="bg-yellow-200 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase">
                    {getDurationElapsedText(randomUrgedTask.createdAt)}
                  </span>
                  이 더 지남.
                </>
              )}
            </p>

            {(() => {
              const completedSubs = randomUrgedTask.subtasks?.filter(st => st.completed && st.completedAt) || [];
              if (completedSubs.length === 0) return null;
              
              const latestCompletedAt = completedSubs.reduce((latest, current) => {
                if (!latest) return current.completedAt!;
                const latestTime = new Date(latest).getTime();
                const currentTime = new Date(current.completedAt!).getTime();
                return currentTime > latestTime ? current.completedAt! : latest;
              }, completedSubs[0].completedAt!);
              
              const friendlyWhen = getFriendlyDaysAgo(latestCompletedAt);
              return (
                <p className="text-[11px] font-black text-emerald-600 mb-2 leading-relaxed flex items-center gap-1.5 animate-pulse">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-1 py-0.5 text-[9px] font-black uppercase">
                    <span className="underline">{friendlyWhen} 함</span>🔥
                  </span>
                </p>
              );
            })()}

            <h3 className="text-xl md:text-2xl font-black text-black mb-3 leading-tight tracking-tight uppercase">
              &ldquo;{randomUrgedTask.title}&rdquo;
            </h3>

            {randomUrgedTask.description && (
              <p className="text-[#1A1A1A]/80 text-xs md:text-sm mb-4 leading-relaxed pl-3 border-l-4 border-[#FF4D00] font-medium">
                &ldquo;{randomUrgedTask.description}&rdquo;
              </p>
            )}

            {/* Associated Tags for Recommended Task */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => {
                const value = randomUrgedTask.tags[category.id];
                if (!value) return null;
                const option = category.options.find(opt => opt.value === value);
                if (!option) return null;
                return (
                  <span key={category.id} className="text-[10px] font-black text-[#1A1A1A] bg-[#F4F4F1] px-2.5 py-1 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1">
                    {option.icon && <span className="mr-0.5">{option.icon}</span>}
                    {category.label.replace(/\s*\(.*?\)\s*/, '')}: {option.label}
                  </span>
                );
              })}
            </div>

            {/* 할 일을 잘게 부순 단계 (AI 응원단장 대체) - 박스 전체를 클릭 가능한 실천 시작 버튼으로 전환 */}
            <button
              type="button"
              onClick={() => onStartTask(randomUrgedTask.id)}
              className="w-full text-left bg-white border-3 border-black p-5 shadow-[5px_5px_0px_0px_#000] hover:bg-[#FFFDF0] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all cursor-pointer block group text-xs text-black"
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-black uppercase text-[#FF4D00] tracking-wider flex items-center gap-1">
                  🛠️ 과제 주요 세부 단계
                </span>
                <span className="text-[9px] font-black text-white bg-[#FF4D00] border border-black px-1.5 py-0.5 shadow-[1px_1px_0_#000] group-hover:scale-105 transition-transform">
                  ⏱️ 터치해서 즉시 실천 구속하기
                </span>
              </div>
              
              {renderSubTaskSummary(randomUrgedTask)}
            </button>

          </motion.div>
        ) : (
          <div className="bg-white border-4 border-dashed border-black p-8 text-center text-black shadow-[4px_4px_0px_0px_#000]">
            <Sparkles className="w-8 h-8 text-[#FF4D00] mx-auto mb-2.5 animate-bounce stroke-[2.5]" />
            <p className="text-sm font-black uppercase">대기 중인 과제가 일절 존재하지 않습니다!</p>
            <p className="text-[#1A1A1A]/70 text-xs mt-1 font-bold">슬쩍 미뤄뒀던 일이 혹시 있진 않으셨나요? 아래 등록기를 켜보세요.</p>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DYNAMIC SEARCH COMPASS & INTEGRATED CLASSIFICATION CONTROLLER */}
      <div className="bg-gradient-to-br from-[#FFFDF0] via-[#FFF3E0] to-[#FFE0B2] border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4">
        <h4 className="text-xs font-black text-black flex items-center gap-2 uppercase tracking-wide">
          <Filter className="w-4 h-4 text-[#FF4D00] stroke-[3]" />
          미룬 일 정교 추적 필터링 컴파스
        </h4>

        {/* Dynamic Search Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#1A1A1A]" />
          <input
            type="text"
            placeholder="미뤄둔 어떤 일을 구출해드릴까요? (검색어 입력)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F4F4F1] text-[#1A1A1A] border-3 border-black py-3 pl-11 pr-4 text-xs font-black outline-none focus:bg-white placeholder-[#1A1A1A]/50 focus:ring-none text-black"
          />
        </div>

        {/* Filters Selectors Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <span className="text-[11px] font-black text-black block">⚙️ {cat.label}</span>
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
                className="w-full bg-[#F4F4F1] border-2 border-black p-2.5 text-xs text-black font-extrabold outline-none focus:bg-white cursor-pointer select-none"
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
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-[11px] font-black text-[#FF4D00] block">🧭 미룬 일 정렬 방식 선택</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#FFF9E6] border-2 border-black p-2.5 text-xs text-black font-extrabold outline-none focus:bg-white cursor-pointer select-none transition-colors"
            >
              <option value="severity">🚨 지연 심각도 높은 순 (기본)</option>
              <option value="oldest">📅 발생시점이 오래된 순으로 정렬 (발생시점 + 입력후 경과한 날짜)</option>
              <option value="newest">🆕 발생시점이 최근 순으로 정렬 (발생시점 + 입력후 경과한 날짜)</option>
              <option value="recently_touched">🔥 최근에 실천한 순으로 정렬 (가장 최근 세부단계 완료기준)</option>
              <option value="longest_untouched">❄️ 오랫동안 손대지 않았던 순으로 정렬 (전혀 시작하지 않은 일 우선)</option>
            </select>
          </div>
        </div>

        {/* Reset filters button when filters exist */}
        {(Object.keys(filterTags).length > 0 || searchTerm || sortBy !== 'severity') && (
          <div className="pt-2">
            <button
              onClick={() => {
                setFilterTags({});
                setSearchTerm('');
                setSortBy('severity');
              }}
              className="text-[10px] text-zinc-700 hover:text-black font-black bg-zinc-100 hover:bg-zinc-200 border border-black px-2.5 py-1 inline-flex items-center gap-1 cursor-pointer transition mr-2"
            >
              🧹 모든 정복/필터 조건 및 정렬 방식 해제
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN PENDING TASK LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-black text-black uppercase tracking-wider bg-white border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000]">
            할 일 목록 <span className="text-[#FF4D00] underline">{filteredTasks.length}개</span> 대기 중
          </span>
          <span className="text-xs text-[#FF4D00] font-black underline decoration-2">
            {sortBy === 'severity' && '🚨 지연 심각도 지표 순'}
            {sortBy === 'oldest' && '📅 오래 묵은 순 정렬'}
            {sortBy === 'newest' && '🆕 최근 발생 순 정렬'}
            {sortBy === 'recently_touched' && '🔥 최근 실천 순 정렬'}
            {sortBy === 'longest_untouched' && '❄️ 오랜 방치 정렬'}
          </span>
        </div>

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

              return (
                <div 
                  key={task.id}
                  className="bg-white border-4 border-black p-5 md:p-6 shadow-[5px_5px_0px_0px_#000] relative overflow-hidden transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-[#FF4D00]/10 pointer-events-none filter blur-xl" />

                  {/* Top card row: Badge + edit helper */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black border-2 border-black px-2 py-0.5 ${severityBg} text-black shadow-[1.5px_1.5px_0px_0px_#000]`}>
                        {severity.text}
                      </span>
                    </div>
                    {onSelectTaskToEdit && (
                      <button
                        onClick={() => onSelectTaskToEdit(task)}
                        className="text-[10px] text-black font-black hover:bg-zinc-100 border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer text-center"
                      >
                        수정하기 ⚙️
                      </button>
                    )}
                  </div>

                  {/* Simplified trajectory info (one-line) - Moved ABOVE title, no box, styled highlights */}
                  <p className="text-[11.5px] font-black text-zinc-600 mb-2 leading-relaxed relative z-10">
                    <span className="text-[#FF4D00] font-black underline">
                      {(() => {
                        const val = task.tags.createdWhen;
                        const cat = categories.find(c => c.id === 'createdWhen');
                        const opt = cat?.options.find(o => o.value === val);
                        return opt?.label || '미정';
                      })()}
                    </span>
                    전 부터 하려고{" "}
                    <span className="text-blue-600 font-extrabold">
                      {formatKoreanDate(task.createdAt)}
                    </span>
                    {getDaysElapsed(task.createdAt) === 0 ? (
                      <>
                        에 입력.{" "}
                        <span className="bg-yellow-200 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase animate-pulse">
                          오늘.
                        </span>
                      </>
                    ) : (
                      <>
                        에 입력, 그 후{" "}
                        <span className="bg-yellow-200 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase">
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
                      <p className="text-[11px] font-black text-emerald-600 mb-2 leading-relaxed relative z-10 flex items-center gap-1.5">
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-1 py-0.5 text-[9px] font-black uppercase">
                           <span className="underline">{friendlyWhen} 함 🔥</span>
                        </span>
                      </p>
                    );
                  })()}

                  <h3 className="text-xl md:text-2xl font-black text-black mb-3 leading-tight tracking-tight uppercase relative z-10">
                    &ldquo;{task.title}&rdquo;
                  </h3>

                  {task.description && (
                    <p className="text-[#1A1A1A]/80 text-xs md:text-sm mb-4 leading-relaxed pl-3 border-l-4 border-[#FF4D00] font-medium relative z-10">
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
                        <span key={category.id} className="text-[10px] font-black text-[#1A1A1A] bg-[#F4F4F1] px-2.5 py-1 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1">
                          {option.icon && <span className="mr-0.5">{option.icon}</span>}
                          {category.label.replace(/\s*\(.*?\)\s*/, '')}: {option.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* 할 일을 잘게 부순 단계 (AI 응원단장 대체) - 박스 전체를 클릭 가능한 실천 시작 버튼으로 전환 */}
                  <button
                    type="button"
                    onClick={() => onStartTask(task.id)}
                    className="w-full text-left bg-white border-3 border-black p-5 shadow-[5px_5px_0px_0px_#000] hover:bg-[#FFFDF0] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all cursor-pointer block group text-xs relative z-10 font-sans"
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-black uppercase text-[#FF4D00] tracking-wider flex items-center gap-1">
                        🛠️ 할 일 세부 단계
                      </span>
                      <span className="text-[9px] font-black text-white bg-[#FF4D00] border border-black px-1.5 py-0.5 shadow-[1px_1px_0_#000] group-hover:scale-105 transition-transform">
                        ⏱️ 터치해서 지금 바로 시작하기
                      </span>
                    </div>
                    
                    {renderSubTaskSummary(task)}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="bg-white border-4 border-dashed border-black p-10 text-center text-black shadow-[4px_4px_0px_0px_#000]">
              <AlertTriangle className="w-8 h-8 text-[#FF4D00] stroke-[3] mx-auto mb-3" />
              <p className="text-sm font-black uppercase">설정한 조건에 부합하는 미룬 일이 없습니다.</p>
              <p className="text-[#1A1A1A]/70 text-xs mt-1 font-bold">분류 장치를 변경하거나 필터를 초기화해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
