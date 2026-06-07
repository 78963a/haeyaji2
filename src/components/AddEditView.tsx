/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, TaskTags, AppSettings } from '../types';
import { DEFAULT_TAG_CATEGORIES } from '../constants';
import { Check, Plus, Trash2, ArrowLeft, ClipboardList, Info, HelpCircle } from 'lucide-react';
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
          className="inline-flex items-center gap-1.5 text-xs text-black font-black hover:underline transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" /> 뒤로 돌아가기
        </button>
        <span className="text-xs font-black bg-[#FF4D00] text-white border-2 border-black px-2.5 py-0.5">
          {taskToEdit ? '미룬 일 정밀 조정 중 ⚙️' : '미뤄왔던 숙제 소환 장치 ⚡'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: 할 일 입력 */}
        <div className="bg-white p-5 border-4 border-black space-y-4 shadow-[6px_6px_0px_0px_#000]">
          <div>
            <label className="text-xs font-black text-black block mb-1.5 uppercase">
              자꾸 마음에 걸려 미루고 있는 일 <span className="text-[#FF4D00]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 치과 스케일링 예약, 세금 신고 서류 준비 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F4F4F1] border-3 border-black py-3 px-4 text-xs font-bold text-black outline-none focus:bg-white focus:ring-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-black block mb-1.5 uppercase">
              조금 더 자세한 속사정 (선택)
            </label>
            <textarea
              placeholder="왜 이 일을 미루게 되었는지, 주의해야 할 것은 무엇인지 넋두리를 써보세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#F4F4F1] border-3 border-black py-3 px-4 text-xs font-bold text-black outline-none focus:bg-white focus:ring-none resize-none"
            />
          </div>
        </div>

        {/* Step 2: 네 가지 특별 태깅 시스템 (한글) */}
        <div className="space-y-5">
          <div className="flex items-center gap-1">
            <Info className="w-4 h-4 text-[#FF4D00] stroke-[3]" />
            <h4 className="text-xs font-black text-[#1A1A1A] uppercase">행동 실천력을 높여줄 태그 진단 시스템 (필요 시 선택)</h4>
          </div>

          {/* Dynamic Categories Rendering */}
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white p-5 border-4 border-black shadow-[6px_6px_0px_0px_#000]">
              <span className="text-xs font-black text-black block mb-4 leading-relaxed">
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
                          ? 'bg-yellow-300 border-3 border-black text-black font-black shadow-[2px_2px_0px_0px_#000]' 
                          : 'bg-white border-2 border-black text-zinc-650 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-xs">
                        {option.icon && <span className="text-xl filter drop-shadow-[1px_1px_0_#000]">{option.icon}</span>}
                        {option.label}
                      </div>
                      {option.desc && (
                        <div className="text-[10px] text-zinc-900 mt-1 leading-tight font-medium">
                          {option.desc}
                        </div>
                      )}
                      {active && <span className="absolute top-2 right-2 text-black font-black text-xs">✓</span>}
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
              <label className="text-xs font-black text-black flex items-center gap-1">
                <ClipboardList className="w-4 h-4 text-[#FF4D00] stroke-[3]" />
                프로젝트 잘개 쪼개기 (세부 행동 플랜)
              </label>
              <span className="text-[10px] font-bold bg-yellow-300 border border-black px-1.5 py-0.5 text-black">원하는 만큼 쪼개세요!</span>
            </div>
            <p className="text-[11px] text-zinc-700 mb-2 font-bold leading-relaxed">
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
                className="flex-1 bg-[#F4F4F1] border-3 border-black py-2.5 px-3 text-xs text-black font-bold outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="h-10 w-10 inline-flex items-center justify-center bg-[#FF4D00] text-white border-3 border-black shadow-[2px_2px_0px_0px_#000] active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
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
                  <span className="text-xs text-black font-bold">
                    <span className="text-[#FF4D00] font-black mr-1.5">{index + 1}.</span> {st}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(index)}
                    className="text-[#FF4D00] hover:text-black p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
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
            className="flex-1 bg-white hover:bg-zinc-100 text-black font-black py-4 border-3 border-black text-xs shadow-[4px_4px_0px_0px_#000] active:scale-95 cursor-pointer"
          >
            취소하기
          </button>

          <button
            type="submit"
            disabled={title.trim() === ''}
            className="flex-2 bg-[#FF4D00] text-white font-black py-4 border-3 border-black text-xs shadow-[4px_4px_0px_0px_#000] active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {taskToEdit ? '정밀 수정사항 반영하기 ✍️' : '소환 시스템에 등록하기 ⚡'}
          </button>
        </div>

        {/* Delete danger button during edit */}
        {taskToEdit && onDeleteTask && (
          <div className="pt-6 border-t-3 border-dashed border-black text-center">
            <button
              type="button"
              onClick={() => {
                if (confirm('이 과제를 영영 삭제하시겠습니까? 데이터는 복구할 수 없습니다.')) {
                   onDeleteTask(taskToEdit.id);
                   onCancel();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#FF4D00] font-black hover:underline cursor-pointer"
            >
              <Trash2 className="w-4 h-4 stroke-[3]" /> 이 미뤄둔 일 완전히 지워버리기
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
