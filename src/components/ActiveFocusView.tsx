/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task, AppSettings, SubTask } from '../types';
import { Play, Pause, CheckCircle, XCircle, AlertTriangle, Plus, Sliders, Trash2, Edit2, RotateCcw, X, Check, Copy } from 'lucide-react';
import { DEFAULT_TAG_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { formatKoreanDate, getDaysElapsed, getDurationElapsedText, getFriendlyDaysAgo } from '../utils/dateUtils';

interface ActiveFocusViewProps {
  task: Task;
  settings: AppSettings;
  onPauseTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onAbandonTask: (id: string, reason: string) => void;
  onGiveUpTask: (id: string, reason: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateSubtaskTitle: (taskId: string, subtaskId: string, newTitle: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTask: (task: Task) => void;
  onBackToHome: () => void;
  onSelectTaskToEdit?: (task: Task) => void;
}

export function ActiveFocusView({
  task,
  settings,
  onPauseTask,
  onCompleteTask,
  onAbandonTask,
  onGiveUpTask,
  onDeleteTask,
  onToggleSubtask,
  onUpdateSubtaskTitle,
  onAddSubtask,
  onRemoveSubtask,
  onUpdateTask,
  onBackToHome,
  onSelectTaskToEdit
}: ActiveFocusViewProps) {
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;
  const [newStepTitle, setNewStepTitle] = useState('');
  const [selectedAction, setSelectedAction] = useState<'complete' | 'abandon' | 'give_up' | 'delete' | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Subtask edit modal states
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Custom alert & confirm modal dialog states
  const [modalDialog, setModalDialog] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

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

  const handleCompleteSuccess = () => {
    onCompleteTask(task.id);
    setSelectedAction(null);
    setModalDialog({
      type: 'alert',
      title: '🎉 축하합니다!',
      message: '장하다! 드디어 미뤘던 큰 짐을 무조건 덜어내셨군요!! 고생하셨습니다.',
      confirmText: '확인',
      onConfirm: () => {
        setModalDialog(null);
        onBackToHome();
      }
    });
  };

  const handleExecuteAbandon = () => {
    const finalReason = actionReason.trim();
    if (!finalReason) {
      setModalDialog({
        type: 'alert',
        title: '⚠️ 보류 사유 필요',
        message: '보류하는 이유를 최소 1자 이상 입력해주세요!',
        confirmText: '돌아가기',
        onConfirm: () => {
          setModalDialog(null);
        }
      });
      return;
    }
    onAbandonTask(task.id, finalReason);
    setSelectedAction(null);
    setActionReason('');
    setModalDialog({
      type: 'alert',
      title: '⏸️ 보류 이송 완료',
      message: '이 할 일이 보류 보관함으로 무사히 소환되었습니다.',
      confirmText: '확인',
      onConfirm: () => {
        setModalDialog(null);
        onBackToHome();
      }
    });
  };

  const handleExecuteGiveUp = () => {
    const finalReason = actionReason.trim();
    if (!finalReason) {
      setModalDialog({
        type: 'alert',
        title: '⚠️ 포기 사유 필요',
        message: '포기하는 이유를 최소 1자 이상 입력해주세요!',
        confirmText: '돌아가기',
        onConfirm: () => {
          setModalDialog(null);
        }
      });
      return;
    }
    onGiveUpTask(task.id, finalReason);
    setSelectedAction(null);
    setActionReason('');
    setModalDialog({
      type: 'alert',
      title: '☠️ 포기 결정 완료',
      message: '이 할 일을 과감하게 털어버리고 포기함에 기양하였습니다.',
      confirmText: '확인',
      onConfirm: () => {
        setModalDialog(null);
        onBackToHome();
      }
    });
  };

  const handleExecuteDelete = () => {
    onDeleteTask(task.id);
    setSelectedAction(null);
    setModalDialog({
      type: 'alert',
      title: '💥 영구 사멸',
      message: '이 할일에 대한 모든 정보가 온데간데없이 영구 삭제되었습니다.',
      confirmText: '확인',
      onConfirm: () => {
        setModalDialog(null);
        onBackToHome();
      }
    });
  };

  const hasUncompletedSteps = useMemo(() => {
    return task.subtasks.length > 0 && task.subtasks.some(st => !st.completed);
  }, [task.subtasks]);

  return (
    <div className="pb-28 text-[#1A1A1A]">
      {/* 1. MAIN TASK HEADER CARD (With a stronger active/focused background and prominent shadow styling) */}
      <div className="bg-gradient-to-br from-[#FFFDEB] via-[#FFF9E3] to-[#FFF3CD] border-4 border-black p-5 md:p-6 shadow-[7px_7px_0px_0px_#FF4D00] relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-[#FF4D00]/20 pointer-events-none filter blur-xl" />

        {/* 1. 발생시점 및 입력정보 및 수정하기 버튼 */}
        <div className="flex items-start justify-between gap-4 mb-2 relative z-10">
          <p className="text-sm font-normal text-zinc-650 leading-relaxed">
            <span className="text-[#FF4D00] font-normal underline">
              {(() => {
                const val = task.tags.createdWhen;
                const cat = categories.find(c => c.id === 'createdWhen');
                const opt = cat?.options.find(o => o.value === val);
                return opt?.label || '미정';
              })()}
            </span>
            전 부터 하려고{" "}
            <span className="text-blue-600 font-normal text-sm">
              {formatKoreanDate(task.createdAt)}
            </span>
            {getDaysElapsed(task.createdAt) === 0 ? (
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
                  {getDurationElapsedText(task.createdAt)}
                </span>
                이 더 지남.
              </>
            )}
          </p>

          {onSelectTaskToEdit && (
            <button
              onClick={() => onSelectTaskToEdit(task)}
              className="text-xs text-black font-normal hover:bg-zinc-100 border-2 border-black bg-white px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer text-center whitespace-nowrap shrink-0"
            >
              수정하기 ⚙️
            </button>
          )}
        </div>

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
                <span className="underline">{friendlyWhen} 함</span>🔥
              </span>
            </p>
          );
        })()}

        {/* 2. 할 일 제목 */}
        <h3 className="text-xl md:text-2xl font-bold text-black mb-3 leading-tight tracking-tight uppercase relative z-10">
          &ldquo;{task.title}&rdquo;
        </h3>

        {/* 3. 메모, 자세한 설명 */}
        {task.description && (
          <p className="text-[#1A1A1A]/80 text-sm md:text-base mb-4 leading-relaxed pl-3 border-l-4 border-[#FF4D00] font-normal relative z-10">
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
              <span key={category.id} className="text-xs font-normal text-[#1A1A1A] bg-[#F4F4F1] px-2.5 py-1.5 flex items-center gap-1">
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
            <Sliders className="w-5 h-5 text-[#FF4D00] stroke-[2]" />
            <h4 className="text-sm font-normal text-black uppercase tracking-tight">
              세부 행동 단계
            </h4>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-normal text-white bg-[#FF4D00] border-2 border-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
              {completedStepsCount} / {task.subtasks.length} 완수
            </span>
          </div>
         </div>


        {/* Input box */}
        <form onSubmit={handleAddStepSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="떠오르는 다음 단계의 할 일, 또는 당장 할 수 있는 행동"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              className="flex-1 bg-[#F4F4F1] border-3 border-black p-3 text-sm text-black font-normal outline-none focus:bg-white focus:border-[#FF4D00]"
            />
            <button
              type="submit"
              className="bg-[#FF4D00] hover:bg-black text-white border-3 border-black font-normal px-6 py-3 text-sm shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer shrink-0 uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-white stroke-[2]" />
              행동 등록 ⚡
            </button>
          </div>
        </form>

        {/* Subtask / Action List */}
        <div className="space-y-3 pt-1">
          {task.subtasks.length > 0 ? (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
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
                      <motion.div
                        key={st.id}
                        layout
                        initial={{ opacity: 0, y: -15, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, y: 15 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        className={`border-3 border-dashed border-zinc-400 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-200 ${
                          isCompleted
                            ? 'bg-zinc-50/70 opacity-85'
                            : subState === 'inprogress'
                            ? 'bg-orange-50/65'
                            : subState === 'paused'
                            ? 'bg-yellow-50/65'
                            : 'bg-white'
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
                          className={`w-5.5 h-5.5 shrink-0 border-2 border-black flex items-center justify-center text-xs font-normal mt-0.5 whitespace-nowrap transition cursor-pointer ${
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
                          <p className={`text-sm md:text-base font-normal text-black leading-tight ${isCompleted ? 'line-through text-zinc-450' : ''}`}>
                            {st.title}
                          </p>

                          {/* Rich State Badges & Datetimes */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal text-zinc-500">
                            {subState === 'completed' && (
                              <span className="text-[#10B981] font-normal bg-emerald-50 px-1 py-0.5 border border-[#10B981] uppercase">
                                ✓ 행동완료
                              </span>
                            )}
                            {subState === 'inprogress' && (
                              <span className="text-[#FF4D00] font-normal bg-orange-50 px-1 py-0.5 border border-[#FF4D00] animate-pulse uppercase">
                                🔥 행동개시중 (진행중)
                              </span>
                            )}
                            {subState === 'paused' && (
                              <span className="text-amber-600 font-normal bg-amber-50 px-1 py-0.5 border border-amber-600 uppercase">
                                ⏸️ 일시정지됨
                              </span>
                            )}
                            {subState === 'unstarted' && (
                              <span className="text-zinc-500 font-normal bg-[#F4F4F1] px-1 py-0.5 border border-zinc-300 uppercase">
                                ⭐ 미수행
                              </span>
                            )}

                            {st.startedAt && (
                              <span className="text-zinc-500 font-mono text-xs">
                                시작: {formatToCustomDateTime(st.startedAt)}
                              </span>
                            )}
                            {isCompleted && st.completedAt && (
                              <span className="text-zinc-500 font-mono text-xs">
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
                              className="bg-black hover:bg-[#1A1A1A] text-white border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              🎬 행동개시
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[2]" />
                              행동완료 ✅
                            </button>
                          </>
                        )}

                        {subState === 'inprogress' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'paused')}
                              className="bg-white hover:bg-zinc-100 text-black border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              ⏸️ 일시정지
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[2]" />
                              행동완료 ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'unstarted')}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-400 text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
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
                              className="bg-black hover:bg-[#1A1A1A] text-white border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              ▶️ 행동 재개시
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'completed')}
                              className="bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[2]" />
                              행동완료 ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSubtaskState(st.id, 'unstarted')}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-400 text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                            >
                              🚫 행동취소
                            </button>
                          </>
                        )}

                        {subState === 'completed' && (
                          <button
                            type="button"
                            onClick={() => updateSubtaskState(st.id, 'unstarted')}
                            className="bg-white hover:bg-zinc-100 text-[#1A1A1A] border-2 border-zinc-400 text-xs font-normal py-1 px-2.5 shadow-[1px_1px_0px_0px_#000] active:scale-95 transition cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            완료 취소 🔄
                          </button>
                        )}

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => onAddSubtask(task.id, st.title)}
                          className="bg-white hover:bg-[#F4F4F1] text-zinc-800 border-2 border-black text-xs font-normal py-1 px-2 shadow-[1.5px_1.5px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                          title="이 행동 똑같이 복사하기 (시작전 상태로 밑에 추가)"
                        >
                          <Copy className="w-2.5 h-2.5 text-zinc-650 stroke-[2.5]" />
                          복사
                        </button>

                        {/* Edit/Delete button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubtask(st);
                            setEditTitleInput(st.title);
                          }}
                          className="bg-white hover:bg-[#F4F4F1] text-zinc-800 border-2 border-black text-xs font-normal py-1 px-2 shadow-[1.5px_1.5px_0px_0px_#000] active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                          title="해당 행동 수정/삭제"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-[#FF4D00] stroke-[2]" />
                          수정/삭제
                        </button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 font-normal text-sm bg-[#F4F4F1] border-2 border-dashed border-black">
              ⚠️ 일이 너무 거대해 보인가요? <br />
              위의 입력기에 당장 3초 내로 개시할 수 있는 일을 2~3개 쪼개 등록해보세요!
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-4 border-black p-5 md:p-6 shadow-[8px_8px_0px_0px_#000] space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
          🛠️ 이 할 일 종결 처리 (4가지 선택지)
        </h4>
        <p className="text-xs text-zinc-600 leading-relaxed font-normal">
          할 일을 깔끔하게 매듭지으세요. 끝까지 완수하여 종결하거나, 보류하여 보류함에 담거나, 과감히 포기하여 마음의 짐을 줄이거나, 영구히 소멸시킬 수 있습니다.
        </p>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Choice 1: 완료 */}
          <button
            type="button"
            onClick={() => {
              setSelectedAction('complete');
              setActionReason('');
            }}
            className={`text-left p-3.5 border-3 border-black text-black transition-all cursor-pointer relative ${
              selectedAction === 'complete'
                ? 'bg-[#a7f3d0] translate-x-1 translate-y-1 shadow-[1px_1px_0px_0px_#005]'
                : 'bg-white hover:bg-[#a7f3d0]/25 shadow-[4px_4px_0px_0px_#000]'
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <span>🎉 1. 완전히 끝냄</span>
              {selectedAction === 'complete' && '✓'}
            </div>
            <p className="text-xs text-zinc-650 font-normal mt-1">
              이 할일을 다 완료하였습니다. 나중에 완료한 일만 골아서 자랑스럽게 모아볼 수 있습니다.
            </p>
          </button>

          {/* Choice 2: 보류 */}
          <button
            type="button"
            onClick={() => {
              setSelectedAction('abandon');
              setActionReason('');
            }}
            className={`text-left p-3.5 border-3 border-black text-black transition-all cursor-pointer relative ${
              selectedAction === 'abandon'
                ? 'bg-amber-200 translate-x-1 translate-y-1 shadow-[1px_1px_0px_0px_#005]'
                : 'bg-white hover:bg-amber-100/30 shadow-[4px_4px_0px_0px_#000]'
            }`}
            style={{
              backgroundColor: selectedAction === 'abandon' ? '#fef3c7' : undefined
            }}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <span>⏸️ 2. 보류함에 보관</span>
              {selectedAction === 'abandon' && '✓'}
            </div>
            <p className="text-xs text-zinc-650 font-normal mt-1">
              나중에 할 것 같지만 지금은 아닙니다. 사유를 적고 편안하게 보류함에 보관했다 꺼내세요.
            </p>
          </button>

          {/* Choice 3: 포기 */}
          <button
            type="button"
            onClick={() => {
              setSelectedAction('give_up');
              setActionReason('');
            }}
            className={`text-left p-3.5 border-3 border-black text-black transition-all cursor-pointer relative ${
              selectedAction === 'give_up'
                ? 'bg-rose-200 translate-x-1 translate-y-1 shadow-[1px_1px_0px_0px_#005]'
                : 'bg-white hover:bg-rose-50 shadow-[4px_4px_0px_0px_#000]'
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <span>☠️ 3. 가치 상실로 포기</span>
              {selectedAction === 'give_up' && '✓'}
            </div>
            <p className="text-xs text-zinc-650 font-normal mt-1">
              모든 일을 다 할 수는 없습니다! 당장 덜 중요한 것은 버리고 과감히 포기 사유를 적어보세요.
            </p>
          </button>

          {/* Choice 4: 완전 삭제 */}
          <button
            type="button"
            onClick={() => {
              setSelectedAction('delete');
              setActionReason('');
            }}
            className={`text-left p-3.5 border-3 border-black text-black transition-all cursor-pointer relative ${
              selectedAction === 'delete'
                ? 'bg-red-500 text-white translate-x-1 translate-y-1 shadow-[1px_1px_0px_0px_#000]'
                : 'bg-white hover:bg-rose-100/60 shadow-[4px_4px_0px_0px_#000]'
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <span>🗑️ 4. 시스템 완전 삭제</span>
              {selectedAction === 'delete' && '✓'}
            </div>
            <p className={`text-xs font-normal mt-1 ${selectedAction === 'delete' ? 'text-white/95' : 'text-zinc-650'}`}>
              이 할 일에 대한 자취와 세부 기록 전체가 완전 영구 삭제됩니다. 복구가 절대 불가능합니다.
            </p>
          </button>
        </div>

        {/* Dynamic Detail Confirmation Form Modal */}
        <AnimatePresence mode="wait">
          {selectedAction && (
            <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <motion.div
                key={selectedAction}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-4 border-black p-5 md:p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_#000] relative space-y-4"
              >
                {/* Header with Title and Close button */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                    {selectedAction === 'complete' && '🎉 1. 할 일 완전히 끝내기'}
                    {selectedAction === 'abandon' && '⏸️ 2. 보류 보관함으로 이송'}
                    {selectedAction === 'give_up' && '☠️ 3. 가치 상실로 포기'}
                    {selectedAction === 'delete' && '🗑️ 4. 시스템 완전 삭제'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSelectedAction(null)}
                    className="p-1 border border-black hover:bg-zinc-100 cursor-pointer transition text-black"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>

                {selectedAction === 'complete' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 fill-emerald-100 text-emerald-600" />
                      <span>완전 완료 확인</span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                      축하합니다! 미뤘던 스트레스를 통쾌하게 무조건 박살냈습니다. 완료 징표를 기탁하고 저장하시겠습니까?
                      {hasUncompletedSteps && (
                        <span className="block mt-2 font-semibold text-amber-600 bg-amber-50 p-2.5 border border-amber-300">
                          ⚠️ 주의: 아직 완수되지 않은 {task.subtasks.filter(s => !s.completed).length}개의 세부 실천 행동이 남아있습니다. 완료 시 모두 함께 완료 처리됩니다.
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2.5 text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={handleCompleteSuccess}
                        className="bg-[#a7f3d0] hover:bg-emerald-300 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1 animate-none"
                      >
                        완전히 끝내기 기탁 🎉
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="bg-white hover:bg-zinc-100 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1 animate-none"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {selectedAction === 'abandon' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-amber-505 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>보류 사유 기탁</span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                      일을 보류하는 솔직한 사유 혹은 극성스러운 핑계를 적어주세요. 보류함 탭에서 언제든 성찰하거나 부활시킬 수 있습니다.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-black uppercase block">보류 사유 작성 (필수):</label>
                      <input
                        type="text"
                        placeholder="예: 지금 당장 집중이 너무 흐트러짐, 우선순위가 더 높은 다른 일 발생"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full bg-[#F4F4F1] border-2 border-black p-2.5 text-xs text-black outline-none font-normal focus:bg-white"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2.5 text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={handleExecuteAbandon}
                        className="bg-amber-300 hover:bg-amber-400 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        기록 저장 후 보류함 이송 ⏸️
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="bg-white hover:bg-zinc-100 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {selectedAction === 'give_up' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm">
                      <XCircle className="w-5 h-5 text-rose-500" />
                      <span>과업 포기 사유 기탁</span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                      인생의 모든 것을 전부 성공시킬 수는 없습니다. 더 작은 것, 정말 가치 없고 무마해도 되는 일은 가차없이 포기하는 것도 대단한 기술입니다. 포기하는 사유를 남기고 털어버리세요.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-black uppercase block">포기 사유 작성 (필수):</label>
                      <input
                        type="text"
                        placeholder="예: 생각해보니 지금 실익이 전혀 없음, 가사 정리보다 그냥 휴식이 더 시급함"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full bg-[#F4F4F1] border-2 border-black p-2.5 text-xs text-black outline-none font-normal focus:bg-white"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2.5 text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={handleExecuteGiveUp}
                        className="bg-rose-300 hover:bg-rose-400 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        기양하고 포기 처리 ☠️
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="bg-white hover:bg-zinc-100 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {selectedAction === 'delete' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-red-650 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>⚠️ 초강력 경고: 완전 삭제</span>
                    </div>
                    <p className="text-xs text-red-700 font-bold leading-relaxed bg-red-50 p-2.5 border border-red-300 rounded-none">
                      가급적 완전 삭제는 권장하지 않습니다! 나중에 추억이나 반성 리포트에서 참고할 수도 있으니 보류나 포기를 추천드립니다. 
                      정말로 이 할일에 대한 모든 계획, 실천 타이머 및 내역 정보를 통째로 사멸시키겠습니까?
                    </p>
                    <div className="flex gap-2.5 text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={handleExecuteDelete}
                        className="bg-red-600 hover:bg-red-700 text-white border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        네, 위험을 감수하고 완전 소멸 🗑️
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="bg-white hover:bg-zinc-100 border-2 border-black font-bold p-2.5 text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer flex-1"
                      >
                        가슴 쓸어내리고 취소
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="text-center pt-2">
          <button
            onClick={onBackToHome}
            className="text-[11px] text-zinc-500 hover:text-black font-bold transition hover:underline cursor-pointer"
          >
            첫 화면으로 돌아가기
          </button>
        </div>
      </div>

      {/* 4. MODAL FOR SUBTASK EDIT & DELETE */}
      {editingSubtask && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-5 max-w-md w-full shadow-[8px_8px_0px_0px_#FF4D00] space-y-4 relative">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <h4 className="text-sm font-normal uppercase text-black flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#FF4D00] stroke-[2]" />
                세부 실천 행동 수정 및 삭제
              </h4>
              <button
                type="button"
                onClick={() => setEditingSubtask(null)}
                className="p-1 border border-black hover:bg-zinc-100 cursor-pointer transition text-black animate-none"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-normal text-black block">
                행동 이름 수정:
              </label>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full bg-[#F4F4F1] border-3 border-black p-2.5 text-sm text-black font-normal outline-none focus:bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!editTitleInput.trim()) {
                    setModalDialog({
                      type: 'alert',
                      title: '⚠️ 입력 오류',
                      message: '행동 이름을 입력해주세요!',
                      confirmText: '확인',
                      onConfirm: () => setModalDialog(null)
                    });
                    return;
                  }
                  onUpdateSubtaskTitle(task.id, editingSubtask.id, editTitleInput.trim());
                  setEditingSubtask(null);
                }}
                className="flex-1 bg-[#a7f3d0] hover:bg-emerald-300 text-black border-2 border-black font-normal py-2.5 text-sm shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                수정 완료 💾
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalDialog({
                    type: 'confirm',
                    title: '🗑️ 실천 행동 삭제',
                    message: '이 실천 행동을 목록에서 정말 삭제하시겠습니까? 기록된 흐름이 소멸됩니다.',
                    confirmText: '네, 삭제합니다',
                    cancelText: '취소',
                    onConfirm: () => {
                      onRemoveSubtask(task.id, editingSubtask.id);
                      setEditingSubtask(null);
                      setModalDialog(null);
                    },
                    onCancel: () => setModalDialog(null)
                  });
                }}
                className="flex-1 bg-rose-200 hover:bg-rose-300 text-black border-2 border-black font-normal py-2.5 text-sm shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                행동 삭제 🗑️
              </button>
              <button
                type="button"
                onClick={() => setEditingSubtask(null)}
                className="flex-1 bg-white hover:bg-zinc-100 text-black border-2 border-black font-normal py-2.5 text-sm shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer inline-flex items-center justify-center"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOM ALERT & CONFIRM DIALOG OVERLAY MODAL */}
      {modalDialog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white border-4 border-black p-5 max-w-sm w-full shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2.5">
              {modalDialog.type === 'alert' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 stroke-[2.5]" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
              )}
              <h4 className="text-sm font-bold uppercase tracking-tight text-black">
                {modalDialog.title}
              </h4>
            </div>

            <div className="text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-line">
              {modalDialog.message}
            </div>

            <div className="flex gap-2.5 pt-1.5 justify-end text-xs">
              {modalDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    if (modalDialog.onCancel) {
                      modalDialog.onCancel();
                    } else {
                      setModalDialog(null);
                    }
                  }}
                  className="px-4 py-2 border-2 border-black font-bold bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
                >
                  {modalDialog.cancelText || '취소'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  modalDialog.onConfirm();
                }}
                className={`px-4 py-2 border-2 border-black font-bold text-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center ${
                  modalDialog.type === 'alert' ? 'bg-[#fed7aa] hover:bg-orange-200' : 'bg-[#a7f3d0] hover:bg-emerald-350'
                }`}
              >
                {modalDialog.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
