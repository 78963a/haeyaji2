/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { CheckCircle2, XCircle, RotateCcw, Clock, Trophy, Trash2, Sliders, Calendar, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  tasks: Task[];
  onStartTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
}

export function HistoryView({ tasks, onStartTask, onDeleteTask, onUpdateTask }: HistoryViewProps) {
  const [activeTab, setActiveTab ] = useState<'stats' | 'completed' | 'abandoned' | 'given_up'>('stats');

  // Virtual Modal Dialog State
  const [modalDialog, setModalDialog] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Classified lists
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
  const abandonedTasks = useMemo(() => tasks.filter(t => t.status === 'abandoned'), [tasks]);
  const givenUpTasks = useMemo(() => tasks.filter(t => t.status === 'given_up'), [tasks]);
  const pendingCount = useMemo(() => tasks.filter(t => t.status === 'pending').length, [tasks]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = tasks.length;
    const resolvedCount = completedTasks.length + abandonedTasks.length + givenUpTasks.length;
    const completionRate = resolvedCount > 0 
      ? Math.round((completedTasks.length / resolvedCount) * 100) 
      : 0;
    
    const totalSubtasksSolved = tasks.reduce((acc, curr) => {
      const solved = curr.subtasks?.filter(s => s.completed).length || 0;
      return acc + solved;
    }, 0);

    // Calculate maximum days procrastinated in completed tasks
    let oldestResolvedDays = 0;
    completedTasks.forEach(task => {
      const created = new Date(task.createdAt).getTime();
      const completed = new Date(task.completedAt || Date.now()).getTime();
      const diffDays = (completed - created) / (1000 * 60 * 60 * 24);
      if (diffDays > oldestResolvedDays) {
        oldestResolvedDays = diffDays;
      }
    });

    return {
      totalCount,
      completionRate,
      totalSubtasksSolved,
      oldestResolvedDays: Math.ceil(oldestResolvedDays)
    };
  }, [tasks, completedTasks, abandonedTasks, givenUpTasks]);

  // Restore task back to pending
  const handleRestoreTask = (task: Task) => {
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

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* 1. Header Navigation Tabs for Achievement */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-3 border-black p-1 bg-[#F4F4F1] shadow-[4px_4px_0px_0px_#000] gap-1 md:gap-0">
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'stats' 
              ? 'bg-yellow-300 border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 stroke-[2]" /> 분석
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'completed' 
              ? 'bg-[#a7f3d0] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" /> 완료 ({completedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('abandoned')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'abandoned' 
              ? 'bg-[#fef3c7] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2]" /> 보류 ({abandonedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('given_up')}
          className={`py-3 text-xs md:text-sm font-normal transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'given_up' 
              ? 'bg-rose-200 border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
          style={{
            backgroundColor: activeTab === 'given_up' ? '#fecdd3' : undefined
          }}
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2]" /> 포기 ({givenUpTasks.length})
        </button>
      </div>

      {/* 2. TAB VALUES */}
      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Visual Stats Board */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-xs text-zinc-650 font-normal block uppercase tracking-wider">실천 성공율 📈</span>
                <span className="text-2xl font-black text-black block mt-1">{stats.completionRate}%</span>
                <p className="text-xs text-zinc-550 mt-1 font-normal">포기 대비 완료 비율</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-xs text-zinc-650 font-normal block uppercase tracking-wider">총 격파한 세부 행동 🔨</span>
                <span className="text-2xl font-black text-[#FF4D00] block mt-1">
                  {stats.totalSubtasksSolved}개
                </span>
                <p className="text-xs text-zinc-550 mt-1 font-normal">완료한 세부 행동 누적 수</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-xs text-zinc-650 font-normal block uppercase tracking-wider">최대 묵혀뒀던 미룸 극복 🌋</span>
                <span className="text-2xl font-black text-blue-600 block mt-1">
                  {stats.oldestResolvedDays > 0 ? `${stats.oldestResolvedDays}일` : '선수대기'}
                </span>
                <p className="text-xs text-zinc-550 mt-1 font-normal">사상 최장기간 머리싸움 승리</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-xs text-zinc-650 font-normal block uppercase tracking-wider">전체 과업 볼륨 🗃️</span>
                <span className="text-2xl font-black text-black block mt-1">{stats.totalCount}개</span>
                <p className="text-xs text-zinc-550 mt-1 font-normal">대기 {pendingCount} / 완료 {completedTasks.length}</p>
              </div>
            </div>


            {/* Micro graphs of TAG natures resolved */}
            <div className="bg-white border-3 border-black p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
              <h5 className="text-sm font-normal text-black uppercase">완성된 일의 성격 분포 분석</h5>
              {completedTasks.length > 0 ? (
                <div className="space-y-3.5 text-sm pt-1">
                  {['one_off', 'recurring', 'long_term'].map((key) => {
                    const count = completedTasks.filter(t => t.tags.nature === key).length;
                    const percent = completedTasks.length > 0 ? Math.round((count / completedTasks.length) * 100) : 0;
                    const labels: Record<string, string> = { one_off: '🎯 단판 승부형', recurring: '🔄 꾸준히 반복형', long_term: '📐 대형 프로젝트 프로젝트형' };
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-normal text-black">
                          <span>{labels[key]}</span>
                          <span className="text-[#FF4D00]">{count}개 ({percent}%)</span>
                        </div>
                        <div className="bg-[#F4F4F1] h-3.5 border-2 border-black overflow-hidden relative">
                          <div className="bg-[#FF4D00] h-full border-r-2 border-black" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-550 font-normal">완료한 과업이 등록되면 여기에 성격 분포 진단기가 소환됩니다.</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3.5"
          >
            <div className="text-sm text-black font-normal uppercase mb-1">🎯 미룸의 고리를 장렬히 돌파한 훈장터:</div>
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000]"
                >
                  <div className="space-y-1.5 flex-1">
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
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 pt-1 font-normal">
                      {task.subtasks.length > 0 && (
                        <span className="text-[#FF4D00]">
                          🔨 세부 액션 플랜 {task.subtasks.length}개 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0">
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#a5f3fc] border-2 border-black py-1.5 px-3 hover:bg-cyan-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      title="실수로 완료를 눌렀거나, 다시 반복해서 하고 싶은 경우 돌려놓으세요."
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
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
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
          >
            <div className="text-sm text-black font-normal uppercase mb-1">⏸️ 일시 보류 안식처 (잠시 내려놓은 행동 보따리):</div>
            
            <div className="bg-amber-50 border-3 border-amber-300 p-4 text-zinc-800 text-xs font-normal leading-relaxed shadow-[4px_4px_0px_0px_#000]">
              <span className="text-lg mr-1 filter drop-shadow-[1px_1px_0_#000]">⏸️</span>
              보류는 포기가 아니며, 더 최적의 타이밍 and 의지력을 준비하기 위해 잠시 일을 미루어 두는 보물 창고입니다. 마음을 가다듬고 원할 때 언제든 다시 개시해보세요.
            </div>

            {abandonedTasks.length > 0 ? (
              abandonedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000]"
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

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0">
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#fed7aa] border-2 border-black py-1.5 px-3 hover:bg-orange-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
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
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
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
          >
            <div className="text-sm text-black font-normal uppercase mb-1">☠️ 과감한 포기 무덤 (마음을 가볍게 한 비워냄):</div>
            
            <div className="bg-rose-50 border-3 border-rose-300 p-4 text-zinc-800 text-xs font-normal leading-relaxed shadow-[4px_4px_0px_0px_#000]">
              <span className="text-lg mr-1 filter drop-shadow-[1px_1px_0_#000]">☠️</span>
              포기는 또 다른 집중을 찾아 지혜롭게 물러설 줄 아는 용기 있는 실천입니다! 자책할 필요는 전혀 없으며, 덜 중요한 것들을 버려서 생긴 소중한 자원을 진짜 중요한 일에 집중시키세요.
            </div>

            {givenUpTasks.length > 0 ? (
              givenUpTasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000]"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="text-xs font-normal text-black bg-[#fecdd3] px-2 py-0.5 border-2 border-black">
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

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0">
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-normal text-black bg-[#fed7aa] border-2 border-black py-1.5 px-3 hover:bg-orange-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
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
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
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
                onClick={() => {
                  if (modalDialog.onCancel) {
                    modalDialog.onCancel();
                  } else {
                    setModalDialog(null);
                  }
                }}
                className="px-4 py-2 border-2 border-black font-bold bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  modalDialog.onConfirm();
                }}
                className="px-4 py-2 border-2 border-black font-bold text-black bg-rose-200 hover:bg-rose-300 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer flex-1 text-center"
              >
                네, 삭제합니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
