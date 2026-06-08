/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task, AppEvent } from '../types';
import { Calendar, Activity, CheckCircle, PlusCircle, Flame, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsViewProps {
  tasks: Task[];
  activityEvents: AppEvent[];
}

export function AnalyticsView({ tasks, activityEvents }: AnalyticsViewProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Set up current date metrics
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  // Days in current month
  const totalDaysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day of week index for calendar layout (0 = Sun, 1 = Mon ... 6 = Sat)
  const firstDayOfWeekIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Extract events for current month (YYYY-MM)
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const currentMonthEvents = useMemo(() => {
    return activityEvents.filter(e => e.timestamp.startsWith(monthPrefix));
  }, [activityEvents, monthPrefix]);

  // Sub-counters specifically for the current month
  const addedTasksCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'add_task').length;
  }, [currentMonthEvents]);

  const addedSubtasksCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'add_subtask').length;
  }, [currentMonthEvents]);

  const completedSubtasksCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'complete_subtask').length;
  }, [currentMonthEvents]);

  const completedTasksCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'complete_task').length;
  }, [currentMonthEvents]);

  const abandonedOrPostponedCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'abandon_task' || e.type === 'give_up_task').length;
  }, [currentMonthEvents]);

  // Map out days with details for the grid
  const daysArray = useMemo(() => {
    const list = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Calculate diligence score
      const dayEvents = activityEvents.filter(e => e.timestamp.startsWith(dateStr));
      let score = 0;
      dayEvents.forEach(e => {
        switch (e.type) {
          case 'add_task':
            score += 3;
            break;
          case 'add_subtask':
            score += 1;
            break;
          case 'complete_task':
            score += 5;
            break;
          case 'complete_subtask':
            score += 2;
            break;
          case 'edit_task':
            score += 1;
            break;
          case 'abandon_task':
          case 'give_up_task':
            score += 2;
            break;
          default:
            break;
        }
      });

      list.push({
        day: d,
        dateStr,
        score,
        events: dayEvents
      });
    }
    return list;
  }, [totalDaysInMonth, currentYear, currentMonth, activityEvents]);

  // Total monthly score accumulation
  const totalMonthlyScore = useMemo(() => {
    return daysArray.reduce((acc, curr) => acc + curr.score, 0);
  }, [daysArray]);

  // Safe background color resolver based on score
  const getIntensityClass = (score: number) => {
    if (score === 0) return 'bg-[#F9F9F6] border-zinc-250 text-zinc-400';
    if (score <= 2) return 'bg-[#BFF0D4] border-emerald-400 text-emerald-850';
    if (score <= 5) return 'bg-[#82E1AC] border-emerald-500 text-emerald-900';
    if (score <= 9) return 'bg-[#40C463] border-emerald-600 text-emerald-950 font-bold';
    return 'bg-[#216E39] border-emerald-800 text-white font-extrabold';
  };

  // Label dictionary to make events read pretty
  const typeLabels: Record<string, string> = {
    add_task: '새 미룬일 소환 📦',
    add_subtask: '세부 행동 추가 🔨',
    complete_subtask: '세부 행동 격파 ✓',
    complete_task: '미룬일 정복 완료 🎉',
    edit_task: '정보 보강 수정 📝',
    abandon_task: '내일을 위한 보류 이송 ⏸️',
    give_up_task: '지혜로운 수용적 포기 ☠️'
  };

  const selectedDayInfo = useMemo(() => {
    if (!selectedDateStr) return null;
    return daysArray.find(d => d.dateStr === selectedDateStr) || null;
  }, [selectedDateStr, daysArray]);

  return (
    <div className="space-y-6 pb-24 animate-fade-in" id="analytics-view-container">
      
      {/* 1. Monthly Summary Spotlight */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4">
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5.5 h-5.5 text-[#FF4D00] stroke-[3]" />
            <h3 className="text-base font-black tracking-tight text-black uppercase">
              {currentYear}년 {monthNames[currentMonth]} 성실 통계
            </h3>
          </div>
          <span className="text-xs font-bold font-mono bg-yellow-300 px-2 py-0.5 border-2 border-black inline-block shadow-[1.5px_1.5px_0px_0px_#000]">
            DILIGENCE SCORE {totalMonthlyScore}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#F4F4F1] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between">
            <span className="text-[11px] text-zinc-650 font-bold block leading-tight">새 미룬일</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-black font-mono">{addedTasksCount}</span>
              <span className="text-xs text-zinc-500">개</span>
            </div>
          </div>

          <div className="bg-[#F4F4F1] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between">
            <span className="text-[11px] text-zinc-650 font-bold block leading-tight">새 세부과업</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-[#FF4D00] font-mono">{addedSubtasksCount}</span>
              <span className="text-xs text-zinc-500">개</span>
            </div>
          </div>

          <div className="bg-[#F4F4F1] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] text-zinc-650 font-bold block leading-tight">격파완료 세부과업</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-emerald-600 font-mono">{completedSubtasksCount}</span>
              <span className="text-xs text-zinc-500">지점</span>
            </div>
          </div>

          <div className="bg-[#F4F4F1] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between">
            <span className="text-[11px] text-zinc-650 font-bold block leading-tight">완료한 미룬일</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-blue-600 font-mono">{completedTasksCount}</span>
              <span className="text-xs text-zinc-500">완수</span>
            </div>
          </div>

          <div className="bg-[#F4F4F1] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between">
            <span className="text-[11px] text-zinc-650 font-bold block leading-tight">보류 및 포기</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-rose-500 font-mono">{abandonedOrPostponedCount}</span>
              <span className="text-xs text-zinc-500">결심</span>
            </div>
          </div>

          <div className="bg-amber-100 border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] text-amber-800 font-bold block leading-tight">총 활동 기록</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-amber-900 font-mono">{currentMonthEvents.length}</span>
              <span className="text-xs text-amber-850">건</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GITHUB-STYLE HEATMAP BOX */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-black uppercase flex items-center gap-1.5 leading-none">
            <Calendar className="w-4 h-4 text-zinc-700 stroke-[2.5]" />
            깃하브 잔디밭 히트맵 ({monthNames[currentMonth]} 기여 달력)
          </h4>
          <span className="text-[11px] text-zinc-500 font-mono uppercase bg-[#F4F4F1] border border-black px-1.5 py-0.5">
            JUNE 2026
          </span>
        </div>

        {/* Heatmap Layout with Week Columns */}
        <div className="p-4 bg-[#F9F9F6] border-2 border-black shadow-[2px_2px_0px_0px_#000] overflow-x-auto">
          
          {/* Day Headers (Sun-Sat) */}
          <div className="grid grid-cols-7 text-center gap-1.5 mb-1.5">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <span 
                key={day} 
                className={`text-[10px] font-bold ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-zinc-500'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Core Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank Placeholder Blocks representing offsets before Month Start */}
            {Array.from({ length: firstDayOfWeekIndex }).map((_, idx) => (
              <div 
                key={`empty-${idx}`} 
                className="aspect-square w-full rounded-sm bg-transparent border-2 border-transparent" 
              />
            ))}

            {/* Actual Month Days */}
            {daysArray.map((dayObj) => {
              const isSelected = selectedDateStr === dayObj.dateStr;
              return (
                <button
                  key={dayObj.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dayObj.dateStr)}
                  className={`aspect-square w-full rounded-none border-2 transition cursor-pointer flex flex-col items-center justify-center relative shadow-[1px_1px_0px_rgba(0,0,0,0.15)] ${
                    isSelected ? 'ring-3 ring-black z-10 border-black animate-pulse' : 'hover:scale-105 active:scale-95'
                  } ${getIntensityClass(dayObj.score)}`}
                  title={`${dayObj.dateStr} (점수: ${dayObj.score}점, 로그: ${dayObj.events.length}건)`}
                  id={`heatmap-day-${dayObj.day}`}
                >
                  <span className="text-[9px] font-mono leading-none">{dayObj.day}</span>
                  {dayObj.score > 0 && (
                    <span className="absolute bottom-[2px] right-[2px] w-1 h-1 rounded-full bg-black/30" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Color Guides / Legenda */}
          <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] font-bold text-zinc-550 border-t border-dashed border-zinc-350 pt-2 padding-right">
            <span>낮음</span>
            <div className="w-3.5 h-3.5 border border-zinc-200 bg-[#F9F9F6]" />
            <div className="w-3.5 h-3.5 border border-emerald-400 bg-[#BFF0D4]" />
            <div className="w-3.5 h-3.5 border border-emerald-500 bg-[#82E1AC]" />
            <div className="w-3.5 h-3.5 border border-emerald-600 bg-[#40C463]" />
            <div className="w-3.5 h-3.5 border border-emerald-800 bg-[#216E39]" />
            <span>높음 (의지 폭발!)</span>
          </div>

        </div>

        {/* Dynamic Formula Explanation Panel */}
        <div className="bg-[#F4F4F1] border border-black p-3 flex gap-2 items-start text-xs font-normal text-zinc-700 leading-normal">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
          <div>
            <p className="font-bold text-black mb-0.5">기여도 산출 공식:</p>
            새 과업 생성 (+3점), 과업 완수 (+5점), 세부 행동 추가 (+1점), 세부 행동 해결 (+2점), 수정 (+1점), 보류 및 포기 (+2점). 성실히 의지를 표현할수록 초록색 잔디가 짙게 피어납니다.
          </div>
        </div>

      </div>

      {/* 3. DETAILED EVENT DIARY slab for selected heat point */}
      {selectedDateStr && (
        <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4 animate-fade-in" id="heatmap-day-details">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <h5 className="text-sm font-black text-black uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 stroke-[3]" />
              {selectedDateStr.replaceAll('-', '.')} 활동 일지
            </h5>
            <button
              onClick={() => setSelectedDateStr(null)}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              닫기 ✖
            </button>
          </div>

          {selectedDayInfo && selectedDayInfo.events.length > 0 ? (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {selectedDayInfo.events.map((evt, idx) => (
                <div 
                  key={evt.id || idx}
                  className="bg-[#F9F9F6] border-2 border-black p-2.5 flex items-start justify-between gap-3 text-xs shadow-[1.5px_1.5px_0px_0px_#000]"
                >
                  <div className="space-y-1 font-normal text-zinc-800">
                    <span className="font-black text-[#FF4D00]">
                      {typeLabels[evt.type] || evt.type}
                    </span>
                    {evt.taskTitle && (
                      <p className="text-zinc-[650] max-w-sm truncate">
                        과업명: <span className="font-semibold text-black">&lsquo;{evt.taskTitle}&rsquo;</span>
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#F9F9F6] border-2 border-dashed border-zinc-350">
              <p className="text-xs font-normal text-zinc-500">당일의 의지 분출 기록이 보이지 않습니다. 🌱</p>
              <p className="text-[11px] mt-1 font-normal text-zinc-450">달력의 다른 유색 타일을 클릭해 보세요!</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
