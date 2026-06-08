/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, TaskTags, AppSettings } from '../types';
import { DEFAULT_TAG_CATEGORIES } from '../constants';
import { Check, Plus, Trash2, ArrowLeft, ClipboardList, Info, HelpCircle, AlertTriangle, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AddEditViewProps {
  taskToEdit?: Task | null;
  settings: AppSettings;
  onAddTask: (title: string, description: string, tags: TaskTags, subtaskTitles: string[], customCreatedAt?: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onCancel: () => void;
}

export function AddEditView({ taskToEdit, settings, onAddTask, onUpdateTask, onDeleteTask, onCancel }: AddEditViewProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Dynamic Tag Selections State
  const [selectedTags, setSelectedTags] = useState<TaskTags>({});

  // Subtask creation state
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handle Editing mode
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setSelectedTags(taskToEdit.tags || {});
      setSubtasks(taskToEdit.subtasks.map(s => s.title));
    } else {
      // Defaults/clean
      setTitle('');
      setDescription('');
      setSelectedTags({});
      setSubtasks([]);
    }
  }, [taskToEdit]);

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim() === '') return;
    setSubtasks([...subtasks, newSubtaskTitle.trim()]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;

    if (taskToEdit) {
      // Maintain old info, just update edited values
      const updatedTask: Task = {
        ...taskToEdit,
        title: title.trim(),
        description: description.trim() || undefined,
        createdAt: taskToEdit.createdAt,
        tags: selectedTags,
        // Map subtasks
        subtasks: subtasks.map((st, index) => {
          const existing = taskToEdit.subtasks.find(x => x.title === st);
          return {
            id: existing ? existing.id : `sub-${Date.now()}-${index}`,
            title: st,
            completed: existing ? existing.completed : false,
            completedAt: existing ? existing.completedAt : undefined
          };
        })
      };
      onUpdateTask(updatedTask);
    } else {
      onAddTask(title, description, selectedTags, subtasks);
    }
    
    // reset after save & trigger fallback
    onCancel();
  };

  // Get active categories list (either loaded custom tags or system defaults)
  const categories = settings.customTags || DEFAULT_TAG_CATEGORIES;

  return (
    <div className="pb-28">
      {/* Top Header Row with back button */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-black font-normal hover:underline transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" /> 뒤로 돌아가기
        </button>
        <span className="text-xs font-normal bg-[#FF4D00] text-white border-2 border-black px-2.5 py-0.5">
          {taskToEdit ? '미룬 일 정밀 조정 중 ⚙️' : '미뤄왔던 숙제 소환 장치 ⚡'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: 할 일 입력 */}
        <div className="bg-white p-5 border-4 border-black space-y-4 shadow-[6px_6px_0px_0px_#000]">
          <div>
            <label className="text-sm font-normal text-black block mb-1.5 uppercase">
              자꾸 마음에 걸려 미루고 있는 일 <span className="text-[#FF4D00]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 치과 스케일링 예약, 세금 신고 서류 준비 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F4F4F1] border-3 border-black py-3 px-4 text-sm font-normal text-black outline-none focus:bg-white focus:ring-none"
            />
          </div>

          <div>
            <label className="text-sm font-normal text-black block mb-1.5 uppercase">
              조금 더 자세한 속사정 (선택)
            </label>
            <textarea
              placeholder="왜 이 일을 미루게 되었는지, 주의해야 할 것은 무엇인지 넋두리를 써보세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#F4F4F1] border-3 border-black py-3 px-4 text-sm font-normal text-black outline-none focus:bg-white focus:ring-none resize-none"
            />
          </div>
        </div>

        {/* Step 2: 네 가지 특별 태깅 시스템 (한글) */}
        <div className="space-y-5">
          <div className="flex items-center gap-1">
            <Info className="w-4 h-4 text-[#FF4D00] stroke-[2]" />
            <h4 className="text-sm font-normal text-[#1A1A1A] uppercase">행동 실천력을 높여줄 태그 진단 시스템 (필요 시 선택)</h4>
          </div>

          {/* Dynamic Categories Rendering */}
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white p-5 border-4 border-black shadow-[6px_6px_0px_0px_#000]">
              <span className="text-sm font-normal text-black block mb-4 leading-relaxed">
                {index + 1}. {category.label}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {category.options.map((option) => {
                  const active = selectedTags[category.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedTags(prev => {
                          const next = { ...prev };
                          if (active) {
                            delete next[category.id];
                          } else {
                            next[category.id] = option.value;
                          }
                          return next;
                        });
                      }}
                      className={`p-3 text-left transition relative cursor-pointer ${
                        active 
                          ? 'bg-yellow-300 border-3 border-black text-black font-normal shadow-[2px_2px_0px_0px_#000]' 
                          : 'bg-white border-2 border-black text-zinc-650 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-normal text-sm">
                        {option.icon && <span className="text-xl filter drop-shadow-[1px_1px_0_#000]">{option.icon}</span>}
                        {option.label}
                      </div>
                      {option.desc && (
                        <div className="text-xs text-zinc-900 mt-1 leading-tight font-normal">
                          {option.desc}
                        </div>
                      )}
                      {active && <span className="absolute top-2 right-2 text-black font-normal text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Step 3: 프로젝트 잘개 쪼개기 (Subtasks) */}
        <div className="bg-white p-5 border-4 border-black space-y-4 shadow-[6px_6px_0px_0px_#000]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-normal text-black flex items-center gap-1">
                <ClipboardList className="w-4 h-4 text-[#FF4D00] stroke-[2]" />
                프로젝트 잘개 쪼개기 (세부 행동 플랜)
              </label>
              <span className="text-xs font-normal bg-yellow-300 border border-black px-1.5 py-0.5 text-black">원하는 만큼 쪼개세요!</span>
            </div>
            <p className="text-xs text-zinc-700 mb-2 font-normal leading-relaxed">
              일이 너무 커 보이면 미루게 됩니다. 지금 딱 2~3개 단계로 잘게 부숴보세요. 실천율이 극대화됩니다!
            </p>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: 과업을 완료하기 위한 구체적인 스텝 1"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 bg-[#F4F4F1] border-3 border-black py-2.5 px-3 text-sm text-black font-normal outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="h-10 w-10 inline-flex items-center justify-center bg-[#FF4D00] text-white border-3 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Subtask list display */}
          {subtasks.length > 0 && (
            <div className="border-3 border-black bg-[#F4F4F1] p-3 space-y-1.5 shadow-[4px_4px_0px_0px_#000]">
              {subtasks.map((st, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-white px-3 py-2 border-2 border-black"
                >
                  <span className="text-sm text-black font-normal">
                    <span className="text-[#FF4D00] font-normal mr-1.5">{index + 1}.</span> {st}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(index)}
                    className="text-[#FF4D00] hover:text-black p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-zinc-100 text-black font-normal py-4 border-3 border-black text-sm shadow-[4px_4px_0px_0px_#000] active:scale-95 cursor-pointer"
          >
            취소하기
          </button>

          <button
            type="submit"
            disabled={title.trim() === ''}
            className="flex-2 bg-[#FF4D00] text-white font-normal py-4 border-3 border-black text-sm shadow-[4px_4px_0px_0px_#000] active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {taskToEdit ? '정밀 수정사항 반영하기 ✍️' : '소환 시스템에 등록하기 ⚡'}
          </button>
        </div>

        {/* Delete danger button during edit */}
        {taskToEdit && onDeleteTask && (
          <div className="pt-6 border-t-3 border-dashed border-black text-center">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 text-sm text-[#FF4D00] font-normal hover:underline cursor-pointer bg-transparent border-0"
            >
              <Trash2 className="w-4 h-4 stroke-[2]" /> 이 미뤄둔 일 완전히 지워버리기
            </button>
          </div>
        )}

      </form>

      {/* THREE-WAY DELETE DIALOG MODAL */}
      {showDeleteModal && taskToEdit && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_#FF4D00] space-y-5 relative">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h4 className="text-sm font-normal uppercase text-black flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-[#FF4D00] stroke-[2]" />
                할 일 정리 옵션 선택
              </h4>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="p-1 border-2 border-black hover:bg-zinc-100 cursor-pointer transition text-black"
                title="닫기"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-normal text-black">
                선택한 미뤄둔 일: <span className="text-[#FF4D00] underline">"{taskToEdit.title}"</span>
              </p>
              <p className="text-sm text-zinc-650 leading-relaxed font-normal">
                이 할 일을 어떻게 처리할지 아래의 옵션 중 하나를 신중하게 선택해 주세요.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {/* Option 1: Delete completely without saving */}
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(taskToEdit.id);
                  setShowDeleteModal(false);
                  onCancel();
                }}
                className="w-full text-left bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-500 p-3.5 text-sm font-normal shadow-[3px_3px_0px_0px_#be123c] active:scale-[0.98] transition cursor-pointer flex flex-col gap-0.5"
              >
                <span className="flex items-center gap-1 text-sm">
                  🔥 저장하지 않고 완전 삭제
                </span>
                <span className="text-xs text-rose-600/90 font-normal">
                  데이터 잔재를 남기지 않고 시스템 내부에서 즉각 영구 소멸시킵니다.
                </span>
              </button>

              {/* Option 2: Save to archive and remove from todo list */}
              <button
                type="button"
                onClick={() => {
                  onUpdateTask({
                    ...taskToEdit,
                    status: 'abandoned',
                    abandonedAt: new Date().toISOString(),
                    abandonReason: '수정 단계에서 보류 상태로 기록보관소로 수용 결정됨'
                  });
                  setShowDeleteModal(false);
                  onCancel();
                }}
                className="w-full text-left bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-500 p-3.5 text-sm font-normal shadow-[3px_3px_0px_0px_#b45309] active:scale-[0.98] transition cursor-pointer flex flex-col gap-0.5"
              >
                <span className="flex items-center gap-1 text-sm">
                  📦 기록보관소에 저장하고 할일에서 치워버리기
                </span>
                <span className="text-xs text-amber-700/90 font-normal">
                  성찰을 위한 분석용 보류 흔적으로 남기고, 오늘 해야 할 일 목록에서 제외합니다.
                </span>
              </button>

              {/* Option 3: Cancel and go back */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full text-center bg-white hover:bg-zinc-100 text-zinc-700 border-2 border-zinc-400 py-3 text-sm font-normal shadow-[3px_3px_0px_0px_#6b7280] active:scale-[0.98] transition cursor-pointer"
              >
                ❌ 취소하고 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
