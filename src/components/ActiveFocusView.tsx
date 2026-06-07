/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task, AppSettings, SubTask } from '../types';
import { Play, Pause, CheckCircle, XCircle, AlertTriangle, Plus, Sliders, Trash2, Edit2, RotateCcw, X, Check } from 'lucide-react';
import { DEFAULT_TAG_CATEGORIES } from '../constants';
import { motion } from 'motion/react';
import { formatKoreanDate, getDaysElapsed, getDurationElapsedText, getFriendlyDaysAgo } from '../utils/dateUtils';

interface ActiveFocusViewProps {
  task: Task;
  settings: AppSettings;
  onPauseTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onAbandonTask: (id: string, reason: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateSubtaskTitle: (taskId: string, subtaskId: string, newTitle: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTask: (task: Task) => void;
  onBackToHome: () => void;
}

export function ActiveFocusView({
  task,
  settings,
  onPauseTask,
  onCompleteTask,
  onAbandonTask,
  onToggleSubtask,
  onUpdateSubtaskTitle,
  onAddSubtask,
  onRemoveSubtask,
  onUpdateTask,
  onBackToHome
}: ActiveFocusViewProps) {
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showAbandonPanel, setShowAbandonPanel] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');

  // Subtask edit modal states
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Custom datetime format helper (2026-06-07 14:55)
  const formatToCustomDateTime = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      return `${yr}-${mo}-${dy} ${hr}:${mn}`;
    } catch {
      return '';
    }
  };

  // Calculated subtasks progress
  const completedStepsCount = useMemo(() => {
    return task.subtasks.filter(s => s.completed).length;
  }, [task.subtasks]);

  const progressPercent = useMemo(() => {
    if (task.subtasks.length === 0) return 0;
    return Math.round((completedStepsCount / task.subtasks.length) * 100);
  }, [task.subtasks, completedStepsCount]);

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStepTitle.trim() === '') return;
    onAddSubtask(task.id, newStepTitle.trim());
    setNewStepTitle('');
  };

  const updateSubtaskState = (subtaskId: string, newState: 'unstarted' | 'inprogress' | 'paused' | 'completed') => {
    const updatedSubtasks = task.subtasks.map(st => {
      if (st.id === subtaskId) {
        if (newState === 'unstarted') {
          return {
            ...st,
            completed: false,
            startedAt: undefined,
            completedAt: undefined,
            isPaused: false
          };
        } else if (newState === 'inprogress') {
          return {
            ...st,
            completed: false,
            startedAt: st.startedAt || new Date().toISOString(),
            completedAt: undefined,
            isPaused: false
          };
        } else if (newState === 'paused') {
          return {
            ...st,
            completed: false,
            startedAt: st.startedAt || new Date().toISOString(),
            completedAt: undefined,
            isPaused: true
          };
        } else if (newState === 'completed') {
          return {
            ...st,
            completed: true,
            completedAt: new Date().toISOString(),
            isPaused: false
          };
        }
      }
      return st;
    });

    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks
    });
  };

  const handleExecuteAbandon = () => {
    const finalReason = abandonReason.trim() || '의지 소모로 인한 잠시 보류';
    onAbandonTask(task.id, finalReason);
    setShowAbandonPanel(false);
    setAbandonReason('');
  };

  const hasUncompletedSteps = useMemo(() => {
    return task.subtasks.length > 0 && task.subtasks.some(st => !st.completed);
  }, [task.subtasks]);

  return (
    <div className="pb-28 text-[#1A1A1A]">
      {/* 1. MAIN TASK HEADER CARD (With a stronger active/focused background and prominent shadow styling) */}
      <div className="bg-gradient-to-br from-[#FFFDEB] via-[#FFF9E3] to-[#FFF3CD] border-4 border-black p-5 md:p-6 shadow-[7px_7px_0px_0px_#FF4D00] relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-[#FF4D00]/20 pointer-events-none filter blur-xl" />
        {/* Active badge */}
        <div className="absolute top-3 right-3 bg-[#FF4D00] text-white border-2 border-black text-[9px] font-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000] uppercase tracking-wider hidden sm:block z-20 animate-bounce">
          🎯 실전 조준 집중 대상
        </div>

        {/* 1. 발생시점 및 입력정보 */}
        <p className="text-[11.5px] font-black text-zinc-650 mb-2 leading-relaxed relative z-10">
          <span className="text-[#FF4D00] font-black underline">
            {(() => {
              const val = task.tags.createdWhen;
              const cat = categories.find(c => c.id === 'createdWhen');
              const opt = cat?.options.find(o => o.value === val);
              return opt?.label || '미정';
            })()}
          </span>
          전 부터 하려고{" "}
          <span className="text-blue-600 font-extrabold text-xs">
            {formatKoreanDate(task.createdAt)}
          </span>
          {getDaysElapsed(task.createdAt) === 0 ? (
            <>
              에 입력.{" "}
              <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase">
                오늘.
              </span>
            </>
          ) : (
            <>
              에 입력, 그 후{" "}
              <span className="bg-yellow-250 text-black border border-black px-1.5 py-0.5 inline-block text-[10px] font-black leading-none uppercase">
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
            <p className="text-[11px] font-black text-emerald-600 mb-2 leading-relaxed relative z-10 flex items-center gap-1.5 animate-pulse">
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-1 py-0.5 text-[9px] font-black uppercase">
                <span className="underline">{friendlyWhen} 함</span>🔥
              </span>
            </p>
          );
        })()}

        {/* 2. 할 일 제목 */}
        <h3 className="text-xl md:text-2xl font-black text-black mb-3 leading-tight tracking-tight uppercase relative z-10">
          &ldquo;{task.title}&rdquo;
        </h3>

        {/* 3. 메모, 자세한 설명 */}
        {task.description && (
          <p className="text-[#1A1A1A]/80 text-xs md:text-sm mb-4 leading-relaxed pl-3 border-l-4 border-[#FF4D00] font-medium relative z-10">
            &ldquo;{task.description}&rdquo;
          </p>
        )}

        {/* 4. 각종 태그 */}
        <div className="flex flex-wrap gap-2 relative z-10">
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
      </div>

      {/* 2. DYNAMIC WORK SPLITTING & ACTIONS ENGINE */}
      <div className="bg-white border-4 border-black p-5 md:p-6 mb-6 space-y-5 shadow-[8px_8px_0px_0px_#000] relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-0 border-black pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#FF4D00] stroke-[3]" />
            <h4 className="text-sm font-black text-black uppercase tracking-tight">
              당장 진행할 세부 실천 행동 단계
            </h4>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-white bg-[#FF4D00] border-2 border-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
              {completedStepsCount} / {task.subtasks.length} 완수
            </span>
          </div>
         </div>


        {/* Input box */}
        <form onSubmit={handleAddStepSubmit} className="space-y-2">
          <label className="text-[10px] font-black uppercase text-black block">
            이 프로젝트가 조금이라도 진전되려면 지금 내가 할 일은:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="예: 컴퓨터 켜기, 청소장소로 가기 등"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              className="flex-1 bg-[#F4F4F1] border-3 border-black p-3 text-xs text-black font-black outline-none focus:bg-white focus:border-[#FF4D00]"
            />
            <button
              type="submit"
              className="bg-[#FF4D00] hover:bg-black text-white border-3 border-black font-black px-6 py-3 text-xs shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer shrink-0 uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-white stroke-[3.5]" />
              행동 등록 ⚡
            </button>
          </div>
        </form>

        {/* Subtask / Action List */}
        <div className="space-y-3 pt-1">
          {task.subtasks.length > 0 ? (
            <div className="space-y-2.5">
              {(() => {
                // 1. Uncompleted subtasks (newest created first)
                const activeSubs = [...task.subtasks].filter(st => !st.completed).reverse();

                // 2. Completed subtasks (newest completed first, i.e., older completed at the bottom of completed section)
                const completedSubs = [...task.subtasks]
                  .filter(st => st.completed)
                  .sort((a, b) => {
                    const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                    const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                    if (timeA !== timeB) {
                      return timeB - timeA; // Newer completed first, older at the bottom
                    }
                    const idxA = task.subtasks.findIndex(item => item.id === a.id);
                    const idxB = task.subtasks.findIndex(item => item.id === b.id);
                    return idxB - idxA;
                  });

                const sortedSubtasks = [...activeSubs, ...completedSubs];

                return sortedSubtasks.map((st) => {
                  const isCompleted = st.completed;

                  // Detect subtask state machine state
                  let subState: 'unstarted' | 'inprogress' | 'paused' | 'completed' = 'unstarted';
                  if (st.completed) {
                    subState = 'completed';
                  } else if (st.startedAt) {
                    if (st.isPaused) {
                      subState = 'paused';
                    } else {
                      subState = 'inprogress';
                    }
                  }

                  return (
                    <div
                      key={st.id}
                      className={`border-3 border-black p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                        isCompleted
                          ? 'bg-zinc-50/70 opacity-85 shadow-[1px_1px_0px_0px_#000]'
                          : subState === 'inprogress'
                          ? 'bg-orange-50/65 border-orange-500 shadow-[4px_4px_0px_0px_#FF4D00]'
                          : subState === 'paused'
                          ? 'bg-yellow-50/65 border-amber-400 shadow-[4px_4px_0px_0px_#D97706]'
                          : 'bg-white shadow-[4px_4px_0px_0px_#000]'
                      }`}
                    >
                      {/* Visual details */}
                      <div className="flex-1 flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (subState === 'completed') {
                              updateSubtaskState(st.id, 'unstarted');
                            } else {
                              updateSubtaskState(st.id, 'completed');
                            }
                          }}
                          className={`w-5.5 h-5.5 shrink-0 border-2 border-black flex items-center justify-center text-[10px] font-black mt-0.5 whitespace-nowrap transition cursor-pointer ${
                            isCompleted 
                              ? 'bg-[#a7f3d0] text-black' 
                              : subState === 'inprogress'
                              ? 'bg-orange-400 text-transparent animate-pulse'
                              : subState === 'paused'
                              ? 'bg-amber-300 text-transparent'
                              : 'bg-[#F4F4F1] hover:bg-zinc-200 text-transparent hover:text-zinc-400'
                          }`}
                        >
                          {isCompleted ? '✓' : ''}
                        </button>

                        <div className="space-y-1 flex-1">
                          <p className={`text-xs md:text-sm font-black text-black leading-tight ${isCompleted ? 'line-through text-zinc-450 font-bold' : ''}`}>
                            {st.title}
                          </p>

                          {/* Rich State Badges & Datetimes */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-zinc-500">
                            {subState === 'completed' && (
                              <span className="text-[#10B981] font-black bg-emerald-50 px-1 py-0.5 border border-[#10B981] uppercase">
                                ✓ 행동완료
                              </span>
                            )}
                            {subState === 'inprogress' && (
                              <span className="text-[#FF4D00] font-black bg-orange-50 px-1 py-0.5 border border-[#FF4D00] animate-pulse uppercase">
                                🔥 행동개시중 (진행중)
                              </span>
                            )}
                            {subState === 'paused' && (
                              <span className="text-amber-600 font-black bg-amber-50 px-1 py-0.5 border border-amber-600 uppercase">
                                ⏸️ 일시정지됨
                              </span>
                            )}
                            {subState === 'unstarted' && (
                              <span className="text-zinc-500 font-bold bg-[#F4F4F1] px-1 py-0.5 border border-zinc-300 uppercase">
                                ⭐ 미수행
                              </span>
                            )}

                            {st.startedAt && (
                              <span className="text-zinc-500 font-mono text-[8.5px]">
                                시작: {formatToCustomDateTime(st.startedAt)}
                              </span>
                            )}
                            {isCompleted && st.completedAt && (
                              <span className="text-zinc-500 font-mono text-[8.5px]">
                                완료: {formatToCustomDateTime(st.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t md:border-t-0 border-zinc-200 pt-2 md:pt-0 shrink-0">
                        {/* State machine contextual buttons */}
                        {subState === 'unstarted' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'inprogress')}
                              className="bg-black hover:bg-[#1A1A1A] text-white border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              🎬 행동개시
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                              행동완료 ✅
                            </button>
                          </>
                        )}

                        {subState === 'inprogress' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'paused')}
                              className="bg-white hover:bg-zinc-100 text-black border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              ⏸️ 일시정지
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                              행동완료 ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'unstarted')}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-400 text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              🚫 행동취소
                            </button>
                          </>
                        )}

                        {subState === 'paused' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'inprogress')}
                              className="bg-black hover:bg-[#1A1A1A] text-white border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              ▶️ 행동 재개시
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                              행동완료 ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'unstarted')}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-400 text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              🚫 행동취소
                            </button>
                          </>
                        )}

                        {subState === 'completed' && (
                          <button
                            type="button"
                            onClick={() => updateSubtaskState(st.id, 'unstarted')}
                            className="bg-white hover:bg-zinc-100 text-[#1A1A1A] border-2 border-zinc-400 text-[9px] font-black py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            완료 취소 🔄
                          </button>
                        )}

                        {/* Edit/Delete button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubtask(st);
                            setEditTitleInput(st.title);
                          }}
                          className="bg-white hover:bg-[#F4F4F1] text-zinc-800 border-2 border-black text-[9px] font-black py-1 px-2 shadow-[1.5px_1.5px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                          title="해당 행동 수정/삭제"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-[#FF4D00] stroke-[3]" />
                          수정/삭제
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 font-bold text-[11px] bg-[#F4F4F1] border-2 border-dashed border-black">
              ⚠️ 일이 너무 거대해 보인가요? <br />
              위의 입력기에 당장 3초 내로 개시할 수 있는 일을 2~3개 쪼개 등록해보세요!
            </div>
          )}
        </div>
      </div>

      {!showAbandonPanel ? (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {/* OVERALL COMPLETE BUTTON */}
            <button
              onClick={() => {
                if (hasUncompletedSteps) {
                  if (!confirm('아직 완료하지 않은 세부 행동들이 남아있습니다. 그래도 전체 할 일을 무조건 완료 처리하시겠습니까?')) {
                    return;
                  }
                }
                onCompleteTask(task.id);
                alert('🎉 장하다! 드디어 미뤘던 큰 짐을 무조건 덜어내셨군요!! 고생하셨습니다.');
                onBackToHome();
              }}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 bg-[#a7f3d0] hover:bg-emerald-300 text-black border-3 border-black font-black py-4 text-xs shadow-[4px_4px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#000] transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 fill-current text-black stroke-[2.5]" />
              이 할일 완전히 끝냈다!
            </button>

            {/* OVERALL ABANDON BUTTON */}
            <button
              onClick={() => setShowAbandonPanel(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#fca5a5] hover:bg-rose-300 text-black border-3 border-black font-black py-4 text-xs shadow-[4px_4px_0px_0px_#000] active:translate-y-0.5 transition cursor-pointer"
            >
              <XCircle className="w-4 h-4 stroke-[2.5]" />
              이유 쓰고 보류함에 넣기
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onBackToHome}
              className="text-[11px] text-zinc-500 hover:text-black font-bold transition hover:underline cursor-pointer"
            >
              첫 화면으로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        /* ABANDON DIALOG PANEL */
        <div className="bg-white border-4 border-black p-5 space-y-4 shadow-[8px_8px_0px_0px_#000]">
          <div className="flex items-center gap-2 text-rose-600 font-black">
            <AlertTriangle className="w-5 h-5 text-rose-500 stroke-[3]" />
            <h4 className="text-sm font-black uppercase tracking-tight">이유 쓰고 보류</h4>
          </div>
          <p className="text-xs text-zinc-650 leading-relaxed font-semibold">
            일을 왜 미루는가 솔직히 마주해야 합니다. '스마트폰 하기', '귀찮음' 등 아주 사소한 거라도 좋으니 아래에 정성껏 회피 이유를 기탁하세요. (나중에 미룸 분석 리포트에 기록됩니다).
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-black block">솔직 거부 사유 작성:</label>
            <input
              type="text"
              placeholder="예: 침대가 너무 포근했음, 롤 한 판 하고 싶음, 스마트폰의 마력에 유인당함"
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
              className="w-full bg-[#F4F4F1] border-3 border-black p-3 text-xs text-black font-bold outline-none focus:bg-white"
            />
          </div>

          <div className="flex gap-3.5 text-xs pt-1.5">
            <button
              onClick={() => setShowAbandonPanel(false)}
              className="flex-1 bg-white hover:bg-zinc-100 border-3 border-black text-black font-black py-3 text-xs shadow-[3px_3px_0px_0px_#000] active:scale-95 cursor-pointer"
            >
              다시 부딪혀볼게요! 🔥
            </button>
            <button
              onClick={handleExecuteAbandon}
              className="flex-1 bg-rose-300 text-black border-3 border-black font-black py-3 text-xs shadow-[3px_3px_0px_0px_#000] active:scale-95 cursor-pointer"
            >
              기록 기탁하고 보류 ☠️
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL FOR SUBTASK EDIT & DELETE */}
      {editingSubtask && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-5 max-w-md w-full shadow-[8px_8px_0px_0px_#FF4D00] space-y-4 relative">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <h4 className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#FF4D00] stroke-[3]" />
                세부 실천 행동 수정 및 삭제
              </h4>
              <button
                type="button"
                onClick={() => setEditingSubtask(null)}
                className="p-1 border border-black hover:bg-zinc-100 cursor-pointer transition text-black animate-none"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-black block">
                행동 이름 수정:
              </label>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full bg-[#F4F4F1] border-3 border-black p-2.5 text-xs text-black font-black outline-none focus:bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!editTitleInput.trim()) {
                    alert('행동 이름을 입력해주세요!');
                    return;
                  }
                  onUpdateSubtaskTitle(task.id, editingSubtask.id, editTitleInput.trim());
                  setEditingSubtask(null);
                }}
                className="flex-1 bg-[#a7f3d0] hover:bg-emerald-300 text-black border-2 border-black font-black py-2.5 text-xs shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                수정 완료 💾
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('이 실천 행동을 목록에서 정말 삭제하시겠습니까?')) {
                    onRemoveSubtask(task.id, editingSubtask.id);
                    setEditingSubtask(null);
                  }
                }}
                className="flex-1 bg-rose-200 hover:bg-rose-300 text-black border-2 border-black font-black py-2.5 text-xs shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                행동 삭제 🗑️
              </button>
              <button
                type="button"
                onClick={() => setEditingSubtask(null)}
                className="flex-1 bg-white hover:bg-zinc-100 text-black border-2 border-black font-black py-2.5 text-xs shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer inline-flex items-center justify-center"
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
