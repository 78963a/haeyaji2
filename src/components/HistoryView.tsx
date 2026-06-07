/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { CheckCircle2, XCircle, RotateCcw, Clock, Trophy, Trash2, Sliders, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  tasks: Task[];
  onStartTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
}

export function HistoryView({ tasks, onStartTask, onDeleteTask, onUpdateTask }: HistoryViewProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'completed' | 'abandoned'>('stats');

  // Classified lists
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
  const abandonedTasks = useMemo(() => tasks.filter(t => t.status === 'abandoned'), [tasks]);
  const pendingCount = useMemo(() => tasks.filter(t => t.status === 'pending').length, [tasks]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = tasks.length;
    const resolvedCount = completedTasks.length + abandonedTasks.length;
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
  }, [tasks, completedTasks, abandonedTasks]);

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
      <div className="flex border-3 border-black p-1 bg-[#F4F4F1] shadow-[4px_4px_0px_0px_#000]">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'stats' 
              ? 'bg-yellow-300 border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 stroke-[2.5]" /> 실천 분석
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'completed' 
              ? 'bg-[#a7f3d0] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> 완료 ({completedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('abandoned')}
          className={`flex-1 py-3 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'abandoned' 
              ? 'bg-[#fca5a5] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
              : 'text-[#1A1A1A] hover:bg-zinc-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2.5]" /> 잠시 포기 ({abandonedTasks.length})
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
                <span className="text-[10px] text-zinc-600 font-extrabold block uppercase tracking-wider">실천 성공율 📈</span>
                <span className="text-2xl font-black text-black block mt-1">{stats.completionRate}%</span>
                <p className="text-[10px] text-zinc-500 mt-1 font-bold">포기 대비 완료 비율</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-[10px] text-zinc-600 font-extrabold block uppercase tracking-wider">총 격파한 세부 행동 🔨</span>
                <span className="text-2xl font-black text-[#FF4D00] block mt-1">
                  {stats.totalSubtasksSolved}개
                </span>
                <p className="text-[10px] text-zinc-500 mt-1 font-bold">완료한 세부 행동 누적 수</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-[10px] text-zinc-600 font-extrabold block uppercase tracking-wider">최대 묵혀뒀던 미룸 극복 🌋</span>
                <span className="text-2xl font-black text-blue-600 block mt-1">
                  {stats.oldestResolvedDays > 0 ? `${stats.oldestResolvedDays}일` : '선수대기'}
                </span>
                <p className="text-[10px] text-zinc-500 mt-1 font-bold">사상 최장기간 머리싸움 승리</p>
              </div>

              <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <span className="text-[10px] text-zinc-600 font-extrabold block uppercase tracking-wider">전체 과업 볼륨 🗃️</span>
                <span className="text-2xl font-black text-black block mt-1">{stats.totalCount}개</span>
                <p className="text-[10px] text-zinc-500 mt-1 font-bold">대기 {pendingCount} / 완료 {completedTasks.length}</p>
              </div>
            </div>

            {/* Motivational Slogan depending on rate */}
            <div className="bg-yellow-100 border-3 border-black p-4 text-center shadow-[4px_4px_0px_0px_#000]">
              <span className="text-xl inline-block mb-1">💡</span>
              <h5 className="font-black text-xs text-black uppercase">
                {stats.completionRate >= 80 ? '👑 엄청난 실천가 타입!' : '🚀 조금씩 실천 속도를 올리는 중!'}
              </h5>
              <p className="text-[11px] text-zinc-800 mt-1.5 leading-relaxed font-bold">
                해야지 앱은 데드라인 압박이 없습니다. 스스로 동기가 생겼을 때 바로 해치웠던 기록들을 보며, 다음 미뤄둔 일도 똑같이 해낼 수 있음을 믿으세요!
              </p>
            </div>

            {/* Micro graphs of TAG natures resolved */}
            <div className="bg-white border-3 border-black p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
              <h5 className="text-xs font-black text-black uppercase">완성된 일의 성격 분포 분석</h5>
              {completedTasks.length > 0 ? (
                <div className="space-y-3.5 text-xs pt-1">
                  {['one_off', 'recurring', 'long_term'].map((key) => {
                    const count = completedTasks.filter(t => t.tags.nature === key).length;
                    const percent = completedTasks.length > 0 ? Math.round((count / completedTasks.length) * 100) : 0;
                    const labels: Record<string, string> = { one_off: '🎯 단판 승부형', recurring: '🔄 꾸준히 반복형', long_term: '📐 대형 프로젝트 프로젝트형' };
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black text-black">
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
                <p className="text-[11px] text-zinc-500 font-bold">완료한 과업이 등록되면 여기에 성격 분포 진단기가 소환됩니다.</p>
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
            <div className="text-xs text-black font-black uppercase mb-1">🎯 미룸의 고리를 장렬히 돌파한 훈장터:</div>
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000]"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-black bg-[#a7f3d0] px-2 py-0.5 border-2 border-black">
                        ✓ 성공적으로 실천성공
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 bg-[#F4F4F1] border border-black px-1.5 py-0.2">
                        {task.completedAt ? formatDate(task.completedAt) : ''} 완료
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-black line-through decoration-black decoration-2">
                      {task.title}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-650 pt-1 font-bold">
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
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-[11px] font-black text-black bg-[#a5f3fc] border-2 border-black py-1.5 px-3 hover:bg-cyan-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                      title="실수로 완료를 눌렀거나, 다시 반복해서 하고 싶은 경우 돌려놓으세요."
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" /> 대기로 회수
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('완료 영구 기록을 삭제하시겠습니까? 데이터는 복구할 수 없습니다.')) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-black bg-white hover:bg-rose-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-black border-4 border-dashed border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                <p className="text-xs font-black uppercase">아직 해낸 임무 기록이 비어있습니다.</p>
                <p className="text-[10px] mt-1.5 font-bold text-zinc-600">지금 바로 홈에서 랜덤 촉구를 눌러 첫 골을 쏘아 올려보세요!</p>
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
            <div className="text-xs text-black font-black uppercase mb-1">☠️ 마음의 짐 해소 장치 (잠깐 접어둔 보물상자):</div>
            
            <div className="bg-rose-50 border-3 border-black p-4 text-zinc-800 text-[11px] font-bold leading-relaxed shadow-[4px_4px_0px_0px_#000]">
              <span className="text-lg mr-1 filter drop-shadow-[1px_1px_0_#000]">🤝</span>
              포기는 또 다른 방향을 모색하는 용기 있는 실천입니다! 가슴 아파하거나 자책할 필요 전혀 없습니다. 가뿐하게 잠시 털어두었다가, 마음이 생겼을 때 다시 소생시키세요.
            </div>

            {abandonedTasks.length > 0 ? (
              abandonedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white border-3 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-[4px_4px_0px_0px_#000]"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-black bg-[#fca5a5] px-2 py-0.5 border-2 border-black">
                        ☠️ 일시 보류/포기
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 bg-[#F4F4F1] border border-black px-1.5 py-0.2">
                        {task.abandonedAt ? formatDate(task.abandonedAt) : ''} 이송
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-black">
                      {task.title}
                    </h4>
                    
                    {task.abandonReason && (
                      <p className="text-xs text-[#FF4D00] font-bold italic leading-relaxed pt-1 bg-yellow-50 px-2 py-1 border border-dashed border-black/40 mt-1 max-w-fit">
                        &ldquo;당시 소회: {task.abandonReason}&rdquo;
                      </p>
                    )}

                    {task.subtasks.length > 0 && (
                      <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1 font-bold">
                        <span>🔨 생성해둔 세부 과업: {task.subtasks.length}개</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto pt-2 sm:pt-0 border-t border-black sm:border-t-0">
                    <button
                      onClick={() => handleRestoreTask(task)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-[11px] font-black text-black bg-[#fed7aa] border-2 border-black py-1.5 px-3 hover:bg-orange-200 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 strike-[2.5]" /> 다시 해야지! (소생)
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('이 포기 기록을 영구 삭제하시겠습니까?')) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-black bg-white hover:bg-rose-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-black border-4 border-dashed border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                <p className="text-xs font-black uppercase">보류 하거나 포기한 미련 상자가 깨끗하게 비어있습니다.</p>
                <p className="text-[10px] mt-1.5 font-bold text-zinc-600">포기 없이 뚝심있게 나아가는 모습이 멋집니다!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
