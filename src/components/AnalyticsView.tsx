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
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  // Set up current date metrics
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // State for currently viewed year and month
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  // Days in current selected month
  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // First day of week index for calendar layout starting on Monday (0 = Mon, 1 = Tue ... 6 = Sun)
  const firstDayOfWeekIndex = useMemo(() => {
    const day = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sun, 1 is Mon...
    return day === 0 ? 6 : day - 1;
  }, [selectedYear, selectedMonth]);

  // Extract events for selected month (YYYY-MM)
  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const currentMonthEvents = useMemo(() => {
    return activityEvents.filter(e => e.timestamp.startsWith(monthPrefix));
  }, [activityEvents, monthPrefix]);

  // Sub-counters specifically for the selected month
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
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Calculate willpower/diligence score
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
  }, [totalDaysInMonth, selectedYear, selectedMonth, activityEvents]);

  // Total monthly score accumulation
  const totalMonthlyScore = useMemo(() => {
    return daysArray.reduce((acc, curr) => acc + curr.score, 0);
  }, [daysArray]);

  // Find min year and month from activity events and tasks
  const [minYear, minMonth] = useMemo(() => {
    let resultYear = currentYear;
    let resultMonth = currentMonth;

    const dates: Date[] = [];
    if (activityEvents && activityEvents.length > 0) {
      activityEvents.forEach(e => {
        if (e.timestamp) {
          const d = new Date(e.timestamp);
          if (!isNaN(d.getTime())) {
            dates.push(d);
          }
        }
      });
    }
    if (tasks && tasks.length > 0) {
      tasks.forEach(t => {
        if (t.createdAt) {
          const d = new Date(t.createdAt);
          if (!isNaN(d.getTime())) {
            dates.push(d);
          }
        }
      });
    }

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      resultYear = minDate.getFullYear();
      resultMonth = minDate.getMonth();
    }

    // Double check starting bounds (cannot be futuristic)
    if (resultYear > currentYear || (resultYear === currentYear && resultMonth > currentMonth)) {
      resultYear = currentYear;
      resultMonth = currentMonth;
    }

    return [resultYear, resultMonth];
  }, [activityEvents, tasks, currentYear, currentMonth]);

  const isPrevDisabled = selectedYear < minYear || (selectedYear === minYear && selectedMonth <= minMonth);
  const isNextDisabled = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    setSelectedDateStr(null);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(p => p - 1);
    } else {
      setSelectedMonth(p => p - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    setSelectedDateStr(null);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(p => p + 1);
    } else {
      setSelectedMonth(p => p + 1);
    }
  };

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
      
      {/* 0. Month Navigation Control */}
      <div className="flex items-center justify-between bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_#000]">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          className={`px-4 py-2 border-2 border-black font-black text-sm transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer inline-flex items-center gap-1 bg-[#F4F4F1] ${
            isPrevDisabled ? 'opacity-30 cursor-not-allowed bg-[#F4F4F1]/60 shadow-none hover:translate-none' : 'hover:bg-zinc-200'
          }`}
        >
          ◀ 이전 달
        </button>
        <div className="text-center">
          <span className="text-base sm:text-lg font-black text-black">
            {selectedYear}년 {monthNames[selectedMonth]}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isNextDisabled}
          className={`px-4 py-2 border-2 border-black font-black text-sm transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer inline-flex items-center gap-1 bg-[#F4F4F1] ${
            isNextDisabled ? 'opacity-30 cursor-not-allowed bg-[#F4F4F1]/60 shadow-none hover:translate-none' : 'hover:bg-zinc-200'
          }`}
        >
          다음 달 ▶
        </button>
      </div>

       {/* 2. GITHUB-STYLE HEATMAP BOX */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-black uppercase flex items-center gap-1.5 leading-none">
            <Calendar className="w-4 h-4 text-zinc-700 stroke-[2.5]" />
            의지력 잔디밭 히트맵 ({monthNames[selectedMonth]} 의지력 달력)
            <button
              type="button"
              onClick={() => setIsFormulaModalOpen(true)}
              className="text-zinc-500 hover:text-black focus:outline-none cursor-pointer p-0.5 transition-colors inline-flex items-center"
              title="의지력 산출 공식 보기"
              id="show-willpower-formula-button"
            >
              <HelpCircle className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          </h4>
          <span className="text-[11px] text-zinc-500 font-mono uppercase bg-[#F4F4F1] border border-black px-1.5 py-0.5">
            {new Date(selectedYear, selectedMonth).toLocaleString('en-US', { month: 'short' }).toUpperCase()} {selectedYear}
          </span>
        </div>

        {/* Heatmap Layout with Week Columns */}
        <div className="p-4 bg-[#F9F9F6] border-2 border-black shadow-[2px_2px_0px_0px_#000] overflow-x-auto">
          
          {/* Day Headers (Mon-Sun) */}
          <div className="grid grid-cols-7 text-center gap-1.5 mb-1.5">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, idx) => (
              <span 
                key={day} 
                className={`text-[10px] font-bold ${
                  idx === 6 ? 'text-red-500' : idx === 5 ? 'text-blue-500' : 'text-zinc-500'
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

      </div>

      {/* 1. Monthly Summary Spotlight */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-4">
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5.5 h-5.5 text-[#FF4D00] stroke-[3]" />
            <h3 className="text-base font-black tracking-tight text-black uppercase">
              {selectedYear}년 {monthNames[selectedMonth]} 의지력 통계
            </h3>
          </div>
          <span className="text-xs font-bold font-mono bg-yellow-300 px-2 py-0.5 border-2 border-black inline-block shadow-[1.5px_1.5px_0px_0px_#000]">
            WILLPOWER SCORE {totalMonthlyScore}
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
              <span className="text-xs text-zinc-500 font-normal">지점</span>
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

      {/* 3. DETAILED EVENT DIARY Modal Overlay for selected heat point */}
      {selectedDateStr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in" id="diary-modal-overlay">
          <div className="bg-white border-4 border-black p-6 max-w-sm sm:max-w-md w-full shadow-[8px_8px_0px_0px_#000] relative">
            
            {/* Close Button at top right */}
            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              className="absolute top-4 right-4 text-black hover:text-[#FF4D00] font-black text-lg p-1 select-none cursor-pointer focus:outline-none transition-colors"
              aria-label="닫기"
              id="diary-modal-close-x"
            >
              ✖
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2 border-b-3 border-black pb-3 mb-4">
              <Sparkles className="w-5.5 h-5.5 text-amber-500 stroke-[3]" />
              <h3 className="text-base sm:text-lg font-black text-black uppercase">
                {selectedDateStr.replaceAll('-', '.')} 활동 일지 📝
              </h3>
            </div>

            {/* Modal Content */}
            {selectedDayInfo && selectedDayInfo.events.length > 0 ? (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {selectedDayInfo.events.map((evt, idx) => (
                  <div 
                    key={evt.id || idx}
                    className="bg-[#F9F9F6] border-2 border-black p-2.5 flex items-start justify-between gap-3 text-xs shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <div className="space-y-1 font-normal text-zinc-[850] max-w-[240px] sm:max-w-xs">
                      <span className="font-black text-[#FF4D00]">
                        {typeLabels[evt.type] || evt.type}
                      </span>
                      {evt.taskTitle && (
                        <p className="text-zinc-[650] truncate text-[11px]">
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

            {/* Confirm Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDateStr(null)}
                className="px-5 py-2 border-2 border-black font-black text-xs bg-[#F4F4F1] text-black hover:bg-zinc-200 transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                id="diary-modal-close-btn"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Formula Modal Overlay */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in" id="formula-modal-overlay">
          <div className="bg-white border-4 border-black p-6 max-w-sm sm:max-w-md w-full shadow-[8px_8px_0px_0px_#000] relative">
            
            {/* Close Button at top right */}
            <button
              type="button"
              onClick={() => setIsFormulaModalOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-[#FF4D00] font-black text-lg p-1 select-none cursor-pointer focus:outline-none transition-colors"
              aria-label="닫기"
              id="formula-modal-close-x"
            >
              ✖
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2 border-b-3 border-black pb-3 mb-4">
              <HelpCircle className="w-5.5 h-5.5 text-emerald-600 stroke-[3]" />
              <h3 className="text-base sm:text-lg font-black text-black uppercase">
                의지력 산출 공식 💡
              </h3>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs sm:text-sm font-normal text-zinc-850 leading-relaxed">
              <p className="font-bold text-black bg-yellow-300 border-2 border-black px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000] inline-block">
                "성실하게 의지를 분출하세요!"
              </p>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">새 과업 생성</span>
                  <span className="font-mono font-black text-[#FF4D00] text-right text-sm">+3점</span>
                </div>
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">과업 완수</span>
                  <span className="font-mono font-black text-blue-600 text-right text-sm">+5점</span>
                </div>
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">세부 행동 추가</span>
                  <span className="font-mono font-black text-amber-600 text-right text-sm">+1점</span>
                </div>
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">세부 행동 해결</span>
                  <span className="font-mono font-black text-emerald-600 text-right text-sm">+2점</span>
                </div>
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">정보 수정</span>
                  <span className="font-mono font-black text-zinc-650 text-right text-sm">+1점</span>
                </div>
                <div className="grid grid-cols-2 bg-[#F9F9F6] border-2 border-black p-2 text-xs">
                  <span className="font-bold text-black border-r-2 border-black pr-2">보류 및 포기</span>
                  <span className="font-mono font-black text-rose-500 text-right text-sm">+2점</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-400 p-3 text-[11px] text-zinc-700 leading-normal">
                🌱 의지를 적극적으로 표현하고 완료할수록 히트맵 달력의 초록색 잔디가 더욱 짙고 풍성하게 피어납니다.
              </div>
            </div>

            {/* Confirm Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFormulaModalOpen(false)}
                className="px-5 py-2 border-2 border-black font-black text-xs bg-[#F4F4F1] text-black hover:bg-zinc-200 transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                id="formula-modal-close-btn"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
