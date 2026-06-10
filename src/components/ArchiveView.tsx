/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../types';
import { CheckCircle2, XCircle, RotateCcw, Trash2, AlertTriangle, Calendar, Clock, X, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatKoreanDate, getSubtaskDurationText } from '../utils/dateUtils';

interface ArchiveViewProps {
  tasks: Task[];
  onStartTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onRestoreTask?: (task: Task) => void;
  onCloneCompletedTask?: (id: string, repeatOption: 'only_metadata' | 'with_subtasks') => void;
  highlightTaskId?: string | null;
  defaultTab?: 'completed' | 'abandoned' | 'given_up';
}

export function ArchiveView({ 
  tasks, 
  onStartTask, 
  onDeleteTask, 
  onUpdateTask,
  onRestoreTask,
  onCloneCompletedTask,
  highlightTaskId,
  defaultTab
}: ArchiveViewProps) {
  const [activeTab, setActiveTab] = useState<'completed' | 'abandoned' | 'given_up'>(defaultTab || 'completed');

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Virtual Modal Dialog State
  const [modalDialog, setModalDialog] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Archive Task Detail Modal State
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);

  // Copying Selector Modal State
  const [copySelectorTask, setCopySelectorTask] = useState<Task | null>(null);

  // Classified lists
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
  const abandonedTasks = useMemo(() => tasks.filter(t => t.status === 'abandoned'), [tasks]);
  const givenUpTasks = useMemo(() => tasks.filter(t => t.status === 'given_up'), [tasks]);

  // Restore task back to pending
  const handleRestoreTask = (task: Task) => {
    if (onRestoreTask) {
      onRestoreTask(task);
      return;
    }
    const updated: Task = {
      ...task,
      status: 'pending',
      completedAt: undefined,
      abandonedAt: undefined,
      abandonReason: undefined,
      cheersCount: task.cheersCount + 1
    };
    onUpdateTask(updated);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getBaseTitle = (title: string): string => {
    const match = title.trim().match(/^(.*?)\s*(\d+)회차$/);
    return match ? match[1].trim() : title.trim();
  };

  const getRoundNumber = (title: string): number => {
    const match = title.trim().match(/^(.*?)\s*(\d+)회차$/);
    return match ? parseInt(match[2], 10) : 1;
  };

  const shouldShowCopyButton = (task: Task) => {
    const taskBase = getBaseTitle(task.title);
    const taskRound = getRoundNumber(task.title);

    // 1. Check if there exists an active/pending (incomplete) task with the same base title
    // and whose round is >= taskRound (preventing duplicates altogether).
    const hasActiveOrPendingClone = tasks.some(other => {
      if (other.status !== 'pending' && other.status !== 'active') return false;
      const otherBase = getBaseTitle(other.title);
      if (otherBase !== taskBase) return false;
      
      const otherRound = getRoundNumber(other.title);
      return otherRound >= taskRound; 
    });

    if (hasActiveOrPendingClone) {
      return false;
    }

    // 2. Check if this is the latest completed task among all completed tasks with the same base title.
    const hasNewerCompleted = tasks.some(other => {
      if (other.status !== 'completed') return false;
      const otherBase = getBaseTitle(other.title);
      if (otherBase !== taskBase) return false;

      const otherRound = getRoundNumber(other.title);
      return otherRound > taskRound;
    });

    if (hasNewerCompleted) {
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in" id="archive-view-container">
      
      {/* Tab Selectors */}
      <div className="grid grid-cols-3 border-3 border-black p-1 bg-[#F4F4F1] shadow-[4px_4px_0px_0px_#000] gap-1">
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'completed' 
              ? 'bg-[#a7f3d0] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
          id="archive-tab-completed"
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" /> 완료 (
          <motion.span
            key={completedTasks.length}
            initial={{ scale: 1.6, color: '#10B981', fontWeight: 'bold' }}
            animate={{ scale: 1, color: 'inherit' }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="inline-block"
          >
            {completedTasks.length}
          </motion.span>
          )
        </button>
        <button
          onClick={() => setActiveTab('abandoned')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'abandoned' 
              ? 'bg-[#fef3c7] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
          id="archive-tab-abandoned"
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2]" /> 보류 (
          <motion.span
            key={abandonedTasks.length}
            initial={{ scale: 1.6, color: '#D97706', fontWeight: 'bold' }}
            animate={{ scale: 1, color: 'inherit' }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="inline-block"
          >
            {abandonedTasks.length}
          </motion.span>
          )
        </button>
        <button
          onClick={() => setActiveTab('given_up')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'given_up' 
              ? 'bg-rose-250 border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
          id="archive-tab-givenup"
          style={{
            backgroundColor: activeTab === 'given_up' ? '#fecdd3' : undefined
          }}
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2]" /> 포기 (
          <motion.span
            key={givenUpTasks.length}
            initial={{ scale: 1.6, color: '#E11D48', fontWeight: 'bold' }}
            animate={{ scale: 1, color: 'inherit' }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="inline-block"
          >
            {givenUpTasks.length}
          </motion.span>
          )
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3.5"
            id="archive-panel-completed"
          >
            <div className="text-sm text-black font-normal uppercase mb-1">🎯 미룸의 끝 (해낸 일들의 요람):</div>
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={task.id === highlightTaskId ? { scale: 1.04, backgroundColor: "#d1fae5", borderColor: "#10b981", boxShadow: "0px 0px 15px rgba(16, 185, 129, 0.45)" } : { scale: 1 }}
                  animate={{ scale: 1, backgroundColor: "#ffffff", borderColor: "#000000", boxShadow: "4px 4px 0px 0px #000" }}
                  transition={task.id === highlightTaskId ? { duration: 3, delay: 0.1 } : { duration: 0.2 }}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition active:scale-[0.99] relative pr-12 sm:pr-14"
                  onClick={() => setSelectedDetailTask(task)}
                  id={`completed-task-card-${task.id}`}
                >
                   {/* Copy Button at top-right of completed card */}
                  {shouldShowCopyButton(task) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopySelectorTask(task);
                      }}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center bg-[#FFFDF0] border-2 border-black w-8 h-8 text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FF4D00] hover:text-white hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150 cursor-pointer active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000]"
                      title="이 할일을 복사하여 새로 시작하기 (회차 자동누적)"
                      id={`archive-copy-btn-${task.id}`}
                    >
                      <Copy className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}

                  <div className="space-y-1.5 flex-1 pr-4 sm:pr-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-normal text-black bg-[#a7f3d0] px-2 py-0.5 border-2 border-black">
                        ✓ 성공적으로 실천성공
                      </span>
                      <span className="text-xs font-normal text-zinc-500 bg-[#F4F4F1] border border-black px-1.5 py-0.2">
                        {task.completedAt ? formatDate(task.completedAt) : ''} 완료
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-black line-through decoration-black decoration-2">
                      {task.title}
                    </h4>

                    {task.completedNotes && (
                      <p className="text-emerald-700 italic text-[11px] border-l-2 border-emerald-400 pl-2 mt-1 py-0.5 max-w-xl break-words">
                        &ldquo;{task.completedNotes}&rdquo;
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 pt-1 font-normal">
                      {task.subtasks.length > 0 && (
                        <span className="text-[#FF4D00]">
                          🔨 세부 액션 플랜 {task.subtasks.length}개 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#a5f3fc] border-2 border-black py-1.5 px-3 hover:bg-cyan-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      title="실수로 완료를 눌렀거나, 다시 반복해서 하고 싶은 경우 돌려놓으세요."
                      id={`restore-btn-${task.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2]" /> 대기로 회수
                    </button>
                    
                    <button
                      onClick={() => {
                        setModalDialog({
                          type: 'confirm',
                          title: '🗑️ 완료 기록 영구 삭제',
                          message: '완료 영구 기록을 삭제하시겠습니까? 데이터는 복구할 수 없습니다.',
                          onConfirm: () => {
                            onDeleteTask(task.id);
                            setModalDialog(null);
                          },
                          onCancel: () => setModalDialog(null)
                        });
                      }}
                      className="p-1.5 text-black bg-white hover:bg-rose-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      id={`delete-btn-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-black border-4 border-dashed border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-normal uppercase">아직 해낸 임무 기록이 비어있습니다.</p>
                <p className="text-xs mt-1.5 font-normal text-zinc-600">지금 바로 홈에서 랜덤 촉구를 눌러 첫 골 쏘아 올려보세요!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'abandoned' && (
          <motion.div
            key="abandoned"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3.5"
            id="archive-panel-abandoned"
          >
            <div className="text-sm text-black font-normal uppercase mb-1">⏸️ 일시 보류 안식처 (잠시 내려놓은 행동 보따리):</div>
            
            <div className="bg-amber-50 border-3 border-amber-300 p-4 text-zinc-800 text-xs font-normal leading-relaxed shadow-[4px_4px_0px_0px_#000]">
              <span className="text-lg mr-1 filter drop-shadow-[1px_1px_0_#000]">⏸️</span>
              보류는 포기가 아니며, 더 최적의 타이밍 and 의지력을 준비하기 위해 잠시 일을 미루어 두는 보물 창고입니다. 마음을 가다듬고 원할 때 언제든 다시 개시해보세요.
            </div>

            {abandonedTasks.length > 0 ? (
              abandonedTasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={task.id === highlightTaskId ? { scale: 1.04, backgroundColor: "#fef3c7", borderColor: "#f59e0b", boxShadow: "0px 0px 15px rgba(245, 158, 11, 0.45)" } : { scale: 1 }}
                  animate={{ scale: 1, backgroundColor: "#ffffff", borderColor: "#000000", boxShadow: "4px 4px 0px 0px #000" }}
                  transition={task.id === highlightTaskId ? { duration: 3, delay: 0.1 } : { duration: 0.2 }}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition active:scale-[0.99]"
                  onClick={() => setSelectedDetailTask(task)}
                  id={`abandoned-task-card-${task.id}`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="text-xs font-normal text-black bg-[#fef3c7] px-2 py-0.5 border-2 border-black">
                        ⏸️ 일시 보류중
                       </span>
                      <span className="text-xs font-normal text-zinc-500 bg-[#F4F4F1] border border-black px-1.5 py-0.2">
                        {task.abandonedAt ? formatDate(task.abandonedAt) : ''} 보류 이송
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-black">
                      {task.title}
                    </h4>
                    
                    {task.abandonReason && (
                      <p className="text-xs text-amber-800 font-normal italic leading-relaxed pt-1 bg-amber-50/50 px-2 py-1 border border-dashed border-amber-500/50 mt-1 max-w-fit">
                        &ldquo;보류해둔 사유: {task.abandonReason}&rdquo;
                      </p>
                    )}

                    {task.subtasks.length > 0 && (
                      <div className="flex items-center gap-4 text-xs text-zinc-550 pt-1 font-normal">
                        <span>🔨 생성해둔 세부 과업: {task.subtasks.length}개</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#fed7aa] border-2 border-black py-1.5 px-3 hover:bg-orange-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      id={`rev_abandon-btn-${task.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2]" /> 부활시켜 지금 해야지!
                    </button>
                    
                    <button
                      onClick={() => {
                        setModalDialog({
                          type: 'confirm',
                          title: '🗑️ 보류 기록 영구 삭제',
                          message: '이 보류 기록을 영구 삭제하시겠습니까? 데이터는 복구할 수 없습니다.',
                          onConfirm: () => {
                            onDeleteTask(task.id);
                            setModalDialog(null);
                          },
                          onCancel: () => setModalDialog(null)
                        });
                      }}
                      className="p-1.5 text-black bg-white hover:bg-rose-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      id={`del_abandon-btn-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-black border-4 border-dashed border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-normal uppercase">보류 보관함이 깨끗하게 비어있습니다.</p>
                <p className="text-xs mt-1.5 font-normal text-zinc-650">미루기 없이 곧바로 실천하거나 과감히 털어내는 지혜가 빛납니다!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'given_up' && (
          <motion.div
            key="given_up"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3.5"
            id="archive-panel-given_up"
          >
            <div className="text-sm text-black font-normal uppercase mb-1">☠️ 과감히 내려놓은 무덤 (포기한 일들의 안식처):</div>
            
            {givenUpTasks.length > 0 ? (
              givenUpTasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={task.id === highlightTaskId ? { scale: 1.04, backgroundColor: "#fee2e2", borderColor: "#f43f5e", boxShadow: "0px 0px 15px rgba(244, 63, 94, 0.45)" } : { scale: 1 }}
                  animate={{ scale: 1, backgroundColor: "#ffffff", borderColor: "#000000", boxShadow: "4px 4px 0px 0px #000" }}
                  transition={task.id === highlightTaskId ? { duration: 3, delay: 0.1 } : { duration: 0.2 }}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition active:scale-[0.99]"
                  onClick={() => setSelectedDetailTask(task)}
                  id={`givenup-task-card-${task.id}`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="text-xs font-normal text-black bg-[#fecdd3] px-2 py-0.5 border-2 border-black font-semibold">
                        ☠️ 과감히 포기함
                       </span>
                      <span className="text-xs font-normal text-zinc-500 bg-[#F4F4F1] border border-black px-1.5 py-0.2">
                        {task.abandonedAt ? formatDate(task.abandonedAt) : ''} 포기 결정
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-black">
                      {task.title}
                    </h4>
                    
                    {task.abandonReason && (
                      <p className="text-xs text-rose-800 font-normal italic leading-relaxed pt-1 bg-rose-50 px-2 py-1 border border-dashed border-rose-300 mt-1 max-w-fit">
                        &ldquo;당시 포기 사유: {task.abandonReason}&rdquo;
                      </p>
                    )}

                    {task.subtasks.length > 0 && (
                      <div className="flex items-center gap-4 text-xs text-zinc-550 pt-1 font-normal">
                        <span>🔨 설계되었던 세부 과업: {task.subtasks.length}개</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#fed7aa] border-2 border-black py-1.5 px-3 hover:bg-orange-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      id={`rev_givenup-btn-${task.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2]" /> 포기 각하 및 부활
                    </button>
                    
                    <button
                      onClick={() => {
                        setModalDialog({
                          type: 'confirm',
                          title: '🗑️ 포기 기록 영구 삭제',
                          message: '이 포기 기록을 완전히 삭제하시겠습니까? 관련 통계가 소멸됩니다.',
                          onConfirm: () => {
                            onDeleteTask(task.id);
                            setModalDialog(null);
                          },
                          onCancel: () => setModalDialog(null)
                        });
                      }}
                      className="p-1.5 text-black bg-white hover:bg-rose-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      id={`del_givenup-btn-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-black border-4 border-dashed border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-normal uppercase">포기한 무덤 보관실이 깨끗하게 비어있습니다.</p>
                <p className="text-xs mt-1.5 font-normal text-zinc-650">모두 완수했거나, 일시 보류 중이며 포기한 일은 전혀 없습니다. 훌륭한 과업 지속성입니다!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRM OVERLAY MODAL */}
      {modalDialog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in" id="archive-modal-dialog">
          <div className="bg-white border-4 border-black p-5 max-w-sm w-full shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-500 stroke-[2.5]" />
              <h4 className="text-sm font-bold uppercase tracking-tight text-black">
                {modalDialog.title}
              </h4>
            </div>

            <div className="text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-line">
              {modalDialog.message}
            </div>

            <div className="flex gap-2.5 pt-1.5 justify-end text-xs">
              <button
                type="button"
                onClick={() => setModalDialog(null)}
                className="px-4 py-2 border-2 border-black font-bold bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
              >
                취소
              </button>
              <button
                type="button"
                onClick={modalDialog.onConfirm}
                className="px-4 py-2 border-2 border-black font-bold text-black bg-rose-200 hover:bg-rose-300 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
              >
                네, 삭제합니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COPY TASK REPEAT OPTIONS MODAL */}
      {copySelectorTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in" id="archive-copy-options-dialog">
          <div className="bg-white border-4 border-black p-5 max-w-sm w-full shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2.5">
              <span className="text-lg">🔁</span>
              <h4 className="text-sm font-bold uppercase tracking-tight text-black">
                같은 일 반복 시행 (Cloning Option)
              </h4>
            </div>

            <div className="text-xs text-zinc-800 leading-relaxed font-normal">
              완료된 <strong className="text-[#FF4D00]">&ldquo;{copySelectorTask.title}&rdquo;</strong> 과업을 복사하여 즉시 대기열(홈화면)에 신규 등록하고 돌아가시겠습니까?
              <p className="mt-1.5 text-[11px] text-zinc-550">
                복사 시 차수(회차)가 자동으로 증가하여 누적 계산됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 text-xs pt-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onCloneCompletedTask) {
                    onCloneCompletedTask(copySelectorTask.id, 'only_metadata');
                  }
                  setCopySelectorTask(null);
                }}
                className="w-full text-left bg-white hover:bg-zinc-50 border-2 border-black p-3 font-bold shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>📝 제목만 복사하기</span>
                <span className="text-[10px] text-zinc-500 font-normal">세부할일 제외</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCloneCompletedTask) {
                    onCloneCompletedTask(copySelectorTask.id, 'with_subtasks');
                  }
                  setCopySelectorTask(null);
                }}
                className="w-full text-left bg-white hover:bg-[#FFFDF0] border-2 border-[#FF4D00] p-3 font-bold shadow-[2px_2px_0px_0px_#FF4D00] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between text-[#FF4D00]"
              >
                <span>📋 할일까지 복사하기</span>
                <span className="text-[10px] text-[#FF4D00]/75 font-normal">미완료 상태 적용</span>
              </button>

              <button
                type="button"
                onClick={() => setCopySelectorTask(null)}
                className="w-full py-2 border-2 border-dashed border-black font-semibold bg-zinc-100 hover:bg-zinc-200 text-black active:translate-y-0.5 transition-all cursor-pointer text-center"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE TASK DETAIL MODAL */}
      {selectedDetailTask && (() => {
        const t = selectedDetailTask;
        const completedStepsCount = t.subtasks.filter(s => s.completed).length;
        const progressPercent = t.subtasks.length === 0 ? 0 : Math.round((completedStepsCount / t.subtasks.length) * 100);
        
        let statusText = '실천 성공';
        let statusBadgeClass = 'bg-[#a7f3d0] border-emerald-500 text-emerald-800';
        if (t.status === 'abandoned') {
          statusText = '일시 보류';
          statusBadgeClass = 'bg-[#fef3c7] border-amber-500 text-amber-800';
        } else if (t.status === 'given_up') {
          statusText = '의지 포기';
          statusBadgeClass = 'bg-rose-200 border-rose-505 text-rose-800';
        }

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[150] overflow-y-auto animate-fade-in" id="archive-detail-modal-container">
            <div className="bg-white border-4 border-black p-6 md:p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_#000] relative space-y-5 my-8 zoom-in-95 pointer-events-auto" id="archive-detail-modal">
              {/* Close pin button at top right */}
              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                className="absolute top-4 right-4 p-1.5 border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                aria-label="상세보기 닫기"
              >
                <X className="w-5 h-5 text-black stroke-[2.5]" />
              </button>

              {/* Header Title with Custom Decorative Label */}
              <div className="space-y-2">
                <span className={`text-[11px] font-bold border-2 px-2.5 py-1 inline-block select-none ${statusBadgeClass}`}>
                  🎯 {statusText} 과업 상세 정보
                </span>
                <h3 className="text-xl md:text-2xl font-black text-black leading-tight uppercase">
                  &ldquo;{t.title}&rdquo;
                </h3>
              </div>

              {/* Description box */}
              {t.description && (
                <div className="bg-zinc-50 border-l-4 border-[#FF4D00] pl-3 py-1 font-normal italic text-sm text-zinc-800 leading-relaxed pt-1.5 border-t border-zinc-200">
                  &ldquo;{t.description}&rdquo;
                </div>
              )}

              {/* Reason box if any */}
              {t.abandonReason && (
                <div className={`p-4 border-2 border-black leading-relaxed text-xs font-normal ${
                  t.status === 'abandoned' ? 'bg-[#fef3c7] text-amber-950 border-amber-400' : 'bg-rose-50 text-rose-950 border-rose-300'
                }`}>
                  <p className="font-bold flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                    {t.status === 'abandoned' ? '보류 사유 요약' : '당시 포기 결정 사유 입력기록'}
                  </p>
                  <p className="italic">&ldquo;{t.abandonReason}&rdquo;</p>
                </div>
              )}

              {t.status === 'completed' && t.completedNotes && (
                <div className="p-4 border-2 border-black bg-emerald-50 text-emerald-950 border-emerald-300 leading-relaxed text-xs font-normal">
                  <p className="font-bold flex items-center gap-1 mb-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    기록된 완료 소감 / 성찰 메모
                  </p>
                  <p className="italic">&ldquo;{t.completedNotes}&rdquo;</p>
                </div>
              )}

              {/* Custom steps progress percentage */}
              {t.subtasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-zinc-700">🔨 실천 계획 완료 상태</span>
                    <span className="text-[#FF4D00]">{progressPercent}% ({completedStepsCount}/{t.subtasks.length})</span>
                  </div>
                  <div className="w-full bg-zinc-100 border-2 border-black h-4 overflow-hidden relative shadow-[1px_1px_0px_0px_#000]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="bg-[#FF4D00] h-full"
                    />
                  </div>
                </div>
              )}

              {/* Step checklist */}
              {t.subtasks.length > 0 ? (
                <div className="space-y-2.5">
                  <h5 className="text-xs font-black uppercase text-zinc-650 tracking-wider">📋 실천 단계별 상세 타임라인</h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {t.subtasks.map((st) => (
                      <div
                        key={st.id}
                        className={`border-2 border-black p-3 flex items-start justify-between gap-3 text-xs ${
                          st.completed 
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-400' 
                            : 'bg-white text-black'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 mt-0.5 ${
                            st.completed ? 'bg-zinc-200 border-zinc-400 text-zinc-500' : 'bg-white'
                          }`}>
                            {st.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="space-y-1">
                            <span className={`font-normal block text-sm ${st.completed ? 'line-through decoration-zinc-300 text-zinc-400' : 'text-black'}`}>
                              {st.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">등록된 세부 실천 단계가 없습니다.</p>
              )}

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-650 pt-3 border-t border-zinc-200 font-normal">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>시작 등록일: {formatKoreanDate(t.createdAt)}</span>
                </div>
                {t.status === 'completed' && t.completedAt && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>최종 완결일: {formatKoreanDate(t.completedAt)}</span>
                  </div>
                )}
                {t.status === 'abandoned' && t.abandonedAt && (
                  <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>일시 보류일: {formatKoreanDate(t.abandonedAt)}</span>
                  </div>
                )}
                {t.status === 'given_up' && t.abandonedAt && (
                  <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>포기 탈락일: {formatKoreanDate(t.abandonedAt)}</span>
                  </div>
                )}
              </div>

              {/* Action Close buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailTask(null)}
                  className="w-full py-3 border-2 border-black font-semibold text-black bg-zinc-150 hover:bg-zinc-200 shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer text-center text-sm uppercase tracking-tight"
                >
                  상세 보기 닫기 ✖
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
