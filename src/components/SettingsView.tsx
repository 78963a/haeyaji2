/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import { AppSettings, Task, TagCategory, TagChoice } from '../types';
import { ShieldAlert, Trash2, Database, Download, Upload, Plus, Tag, FolderPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_TAG_CATEGORIES } from '../constants';

interface SettingsViewProps {
  settings: AppSettings;
  tasks: Task[];
  onSaveSettings: (settings: AppSettings) => void;
  onImportData: (jsonStr: string) => boolean;
}

export function SettingsView({ settings, tasks, onSaveSettings, onImportData }: SettingsViewProps) {
  // Tag Categories editing state
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  
  // Category-specific inputs dictionary state
  const [optionLabelInputs, setOptionLabelInputs] = useState<Record<string, string>>({});
  const [optionIconInputs, setOptionIconInputs] = useState<Record<string, string>>({});

  // Sync internal categories state and profile preferences with settings when parent settings update
  useEffect(() => {
    if (settings.customTags && settings.customTags.length > 0) {
      setCategories(settings.customTags);
    } else {
      setCategories(DEFAULT_TAG_CATEGORIES);
    }
  }, [settings]);

  // JSON file-based backup restore state
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [saveAlert, setSaveAlert] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showDeleteOptionModal, setShowDeleteOptionModal] = useState(false);
  const [deleteOptionTarget, setDeleteOptionTarget] = useState<{
    catId: string;
    catLabel: string;
    optValue: string;
    optLabel: string;
  } | null>(null);

  // Generate database export string
  const exportDataString = JSON.stringify(tasks, null, 2);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      customTags: categories.length > 0 ? categories : undefined
    });
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPendingRestoreJson(content);
        setShowRestoreConfirmModal(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = () => {
    if (!pendingRestoreJson) return;
    const success = onImportData(pendingRestoreJson);
    if (success) {
      alert('백업 데이터가 성공적으로 완벽 복구되었습니다!');
    } else {
      alert('데이터 포맷이 잘못되었습니다. 유효한 해야지 백업 JSON 파일인지 확인해주세요.');
    }
    setShowRestoreConfirmModal(false);
    setPendingRestoreJson('');
  };

  // Custom Category & Options action mechanics
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    const newCatId = `cat_${Date.now()}`;
    const newCat: TagCategory = {
      id: newCatId,
      label: `${newCategoryLabel.trim()} (커스텀)`,
      isDefault: false,
      options: []
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCategoryLabel('');
    
    // Propagate changes persistently
    onSaveSettings({
      ...settings,
      customTags: updated
    });
    alert(`'${newCategoryLabel.trim()}' 태그 카테고리가 새로 소환되었습니다.`);
  };

  const handleDeleteCategory = (catId: string, label: string) => {
    if (confirm(`'${label}' 카테고리를 영구 삭제하시겠습니까? 해당 태깅 분류를 사용 중인 일들의 태그도 자동으로 무효화됩니다.`)) {
      const updated = categories.filter((c) => c.id !== catId);
      setCategories(updated);
      onSaveSettings({
        ...settings,
        customTags: updated
      });
    }
  };

  const handleCreateOption = (catId: string) => {
    const label = optionLabelInputs[catId] || '';
    const icon = optionIconInputs[catId] || '';
    if (!label.trim()) return;

    const optValue = `val_${Date.now()}`;
    const newChoice: TagChoice = {
      value: optValue,
      label: label.trim(),
      icon: icon.trim() || undefined
    };

    const updated = categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          options: [...cat.options, newChoice]
        };
      }
      return cat;
    });

    setCategories(updated);
    setOptionLabelInputs(prev => ({ ...prev, [catId]: '' }));
    setOptionIconInputs(prev => ({ ...prev, [catId]: '' }));

    onSaveSettings({
      ...settings,
      customTags: updated
    });
  };

  const handleDeleteOption = (catId: string, optValue: string, optLabel: string) => {
    const parentCat = categories.find((c) => c.id === catId);
    const catLabel = parentCat ? parentCat.label : '분류';
    setDeleteOptionTarget({
      catId,
      catLabel,
      optValue,
      optLabel
    });
    setShowDeleteOptionModal(true);
  };

  const executeDeleteOption = () => {
    if (!deleteOptionTarget) return;
    const { catId, optValue } = deleteOptionTarget;

    const updated = categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          options: cat.options.filter((o) => o.value !== optValue)
        };
      }
      return cat;
    });

    setCategories(updated);
    onSaveSettings({
      ...settings,
      customTags: updated
    });

    setShowDeleteOptionModal(false);
    setDeleteOptionTarget(null);
  };

  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportDataString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "haeyaji_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 2. Custom Tags Administration Card */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000]">
        <h4 className="text-sm font-black text-black mb-1.5 flex items-center gap-2 uppercase">
          🏷️ 사용자 태그 설정
        </h4>
        <p className="text-[11px] text-zinc-700 leading-relaxed font-bold mb-5">
          기본 제공되는 네 가지 태그(시점, 성격, 도구, 시간) 내부의 옵션을 지우거나 새 옵션을 추가할 수 있으며, 이외에도 무제한으로 자신만의 태그 카테고리(예: '우선순위', '장소', '감정')를 생성할 수 있습니다.
          <br />
          <span className="text-[#FF4D00]">* 변경 사항은 즉시 태깅 및 검색 필터에 자동으로 실시간 반영됩니다.</span>
        </p>

        {/* 2A. Create new custom category form */}
        <form onSubmit={handleCreateCategory} className="border-3 border-dashed border-zinc-400 p-4 mb-6 bg-[#FFFDF0]">
          <span className="text-xs font-black text-[#FF4D00] flex items-center gap-1 mb-2.5">
            <FolderPlus className="w-4 h-4 stroke-[3]" /> 새 카테고리 추가
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="예: 우선순위, 공부장소, 협력 파트너 등"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="flex-1 bg-white border-2 border-black py-2 px-3 text-xs text-black font-extrabold outline-none"
            />
            <button
              type="submit"
              disabled={!newCategoryLabel.trim()}
              className="bg-black hover:bg-zinc-800 text-white font-black px-4 py-2 border-2 border-black text-xs shadow-[2px_2px_0px_0px_#FF4D00] transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              카테고리 생성 ➕
            </button>
          </div>
        </form>

        {/* 2B. Map lists of active Categories and editable inner option badges */}
        <div className="space-y-5">
          {categories.map((cat, index) => (
            <div key={cat.id} className="border-3 border-black p-4 bg-white shadow-[4px_4px_0px_0px_#000] relative">
              
              {/* Category Header Row */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12.5px] font-black text-black">
                  📌 {index + 1}. {cat.label}
                  {cat.isDefault && <span className="text-[9px] font-bold bg-[#F4F4F1] border border-zinc-300 text-zinc-650 px-1.5 py-0.5 rounded-none ml-2">시스템 기본 탑재</span>}
                </span>
                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.label)}
                    className="text-[10px] text-zinc-550 border border-black hover:bg-rose-100 hover:text-rose-600 bg-white px-2 py-0.5 font-bold transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-[#FF4D00]" /> 카테고리 폐기
                  </button>
                )}
              </div>

              {/* Editable inner options visualization */}
              <div className="flex flex-wrap gap-2.5 mb-4 border-b border-zinc-200 pb-3.5">
                {cat.options && cat.options.length > 0 ? (
                  cat.options.map((opt) => (
                    <span 
                      key={opt.value} 
                      className="inline-flex items-center gap-1 text-[11px] font-black bg-[#F4F4F1] text-black border-2 border-black py-1 px-2.5 shadow-[1.5px_1.5px_0px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition"
                    >
                      {opt.icon && <span className="filter drop-shadow-[0.5px_0.5px_0_#000]">{opt.icon}</span>}
                      <span>{opt.label}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(cat.id, opt.value, opt.label)}
                        className="text-[#FF4D00] hover:text-red-700 font-extrabold ml-1.5 text-xs outline-none cursor-pointer focus:scale-110 shrink-0"
                        title="이 분류 삭제"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-zinc-500 font-medium italic py-1">
                    아직 이 카테고리에 할당된 세부 하위 분류(옵션)가 존재하지 않습니다.
                  </span>
                )}
              </div>

              {/* Add an option inside this specific category */}
              <div className="space-y-2 bg-[#F4F4F1] p-3 border-2 border-black">
                <span className="text-[10px] font-black text-black block">💡 이 카테고리 안에 세부 하위 선택지 추가하기</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="분류 명칭 (예: 집안, 긴급함, 노트북)"
                    value={optionLabelInputs[cat.id] || ''}
                    onChange={(e) => setOptionLabelInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    className="flex-1 bg-white border-2 border-black py-1 px-2 text-[11px] font-bold outline-none"
                  />
                  <input
                    type="text"
                    placeholder="아이콘 이모지(선택) (예: 💻, 🎒)"
                    value={optionIconInputs[cat.id] || ''}
                    maxLength={2}
                    onChange={(e) => setOptionIconInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    className="w-full sm:w-44 bg-white border-2 border-black py-1 px-2 text-[11px] font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateOption(cat.id)}
                    disabled={!(optionLabelInputs[cat.id] || '').trim()}
                    className="bg-[#fed7aa] hover:bg-orange-200 border-2 border-black px-3.5 py-1 text-[11px] font-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000] active:scale-95 disabled:opacity-40 transition shrink-0"
                  >
                    분류 추가 ➕
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* 3. Simple JSON Backup and Restore Section */}
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000]">
        <h4 className="text-sm font-black text-black mb-3 flex items-center gap-2 uppercase">
          <Database className="w-4 h-4 text-[#FF4D00] stroke-[3]" />
          JSON 백업 및 복원
        </h4>
        <p className="text-[11px] text-[#1A1A1A]/85 mb-4 leading-relaxed font-bold">
          브라우저 내부에 보관 중인 실천 데이터를 JSON 파일로 다운로드하여 백업하거나, 과거에 다운로드한 백업 파일을 직접 실어 안전하게 복원할 수 있습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5">
          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-300 hover:bg-yellow-400 text-black py-3 font-black text-xs border-3 border-black shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[3]" /> JSON 백업 파일 다운로드 (.json) 📥
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Restore Trigger Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-zinc-800 text-white py-3 font-black text-xs border-3 border-black shadow-[3px_3px_0px_0px_#FF4D00] active:scale-95 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[3]" /> JSON 백업 파일로 복원하기 📦
          </button>
        </div>
      </div>

      {/* 4. Dangerous / Diagnostic features */}
      <div className="bg-white border-4 border-black p-5 border-rose-500 shadow-[6px_6px_0px_0px_#000]">
        <h4 className="text-sm font-black text-rose-500 mb-2.5 flex items-center gap-2 uppercase">
          <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
          데이터 완전 초기화
        </h4>
        
        <div className="space-y-3.5 font-bold text-black">
          <p className="text-[11.5px] text-zinc-700 leading-relaxed font-bold">
            시스템 오작동이 발생하거나, 모든 실천 상태를 비우고 완전히 제로 베이스에서 다시 시작하고 싶다면 아래 청소 버튼을 수행해 주십시오. 모든 상태 데이터가 안전하게 파괴됩니다.
          </p>

          <div className="flex flex-col gap-3">
            {/* Clear all */}
            <button
              onClick={() => {
                setResetConfirmText('');
                setShowResetModal(true);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-200 hover:bg-rose-300 border-3 border-black text-rose-950 py-3 text-xs font-black shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              로컬 데이터 영구 청소하기
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOM DATA DESTRUCTION CONFIRMATION MODAL ('해야지' INPUT REQUIRED) */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_#FF4D00] space-y-5 relative text-black">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h4 className="text-sm font-black uppercase text-rose-600 flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 stroke-[3]" />
                ⚠️ 앱 데이터 영구 청소 확인
              </h4>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-800 leading-relaxed">
                이 작업은 <span className="text-rose-600 font-black underline">절대로 되돌릴 수 없는 영구 소멸</span> 작업입니다. 
                현재까지 쌓아온 소중한 미뤄둔 일 진행 상태, 행동 개시 로그, 개인 설정 태그 등이 아낌없이 날아가 버립니다.
              </p>
              <p className="text-xs font-black text-black bg-rose-50 p-3 border-2 border-dashed border-rose-400">
                정말 데이터 세팅을 완전히 파괴하고 초기화하시겠습니까? 
                동의하고 진행하시려면 아래의 입력란에 정확히 <span className="text-rose-600 font-extrabold underline">해야지</span> 라고 입력해 주십시오.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-zinc-700">인증 텍스트 입력</label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="해야지"
                className="w-full text-center text-sm font-black border-3 border-black bg-[#F4F4F1] p-2.5 shadow-[2px_2px_0px_0px_#000] focus:ring-0 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1.5">
              {/* Option 1: Execute complete destruction */}
              <button
                type="button"
                disabled={resetConfirmText !== '해야지'}
                onClick={() => {
                  localStorage.clear();
                  localforage.clear()
                    .then(() => {
                      window.location.reload();
                    })
                    .catch((err) => {
                      console.error('Failed to clear localforage store', err);
                      window.location.reload();
                    });
                }}
                className={`w-full inline-flex items-center justify-center gap-1.5 py-3 text-xs font-black border-3 border-black shadow-[3px_3px_0px_0px_#000] transition active:scale-95 ${
                  resetConfirmText === '해야지'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50 shadow-[1.5px_1.5px_0px_0px_#000]'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                정말 모두 삭제하고 초기화하기
              </button>

              {/* Option 2: Go back cancel */}
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-700 border-2 border-zinc-400 py-3 text-xs font-black shadow-[3px_3px_0px_0px_#6b7280] active:scale-[0.98] transition cursor-pointer"
              >
                ❌ 취소하고 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL FOR TAG OPTION DELETION */}
      {showDeleteOptionModal && deleteOptionTarget && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_#000] space-y-5 relative text-black">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h4 className="text-sm font-black uppercase text-[#FF4D00] flex items-center gap-1.5">
                <Tag className="w-5 h-5 text-[#FF4D00] stroke-[3]" />
                태그 분류 삭제 경고
              </h4>
            </div>

            <div className="space-y-3 py-1">
              <p className="text-sm font-black text-black leading-relaxed">
                {deleteOptionTarget.catLabel}의 {deleteOptionTarget.optLabel} 태그를 삭제하시겠습니까.
              </p>
              <p className="text-xs text-zinc-650 leading-relaxed font-bold">
                이 태그를 제거하면 기존 할 일에 설정된 이 태깅 정보도 함께 무효화 및 제외 처리됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {/* Option 1: Delete Option */}
              <button
                type="button"
                onClick={executeDeleteOption}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white py-3 text-xs font-black border-3 border-black shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer"
              >
                삭제하기
              </button>

              {/* Option 2: Cancel and go back */}
              <button
                type="button"
                onClick={() => {
                  setShowDeleteOptionModal(false);
                  setDeleteOptionTarget(null);
                }}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-700 border-2 border-zinc-400 py-3 text-xs font-black shadow-[3px_3px_0px_0px_#6b7280] active:scale-[0.98] transition cursor-pointer"
              >
                취소하고 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRMATION DIALOG MODAL FOR FILE BACKUP RESTORE */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_#FF4D00] space-y-5 relative text-black">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h4 className="text-sm font-black uppercase text-amber-600 flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 stroke-[3]" />
                ⚠️ 백업 데이터 복원 주의
              </h4>
            </div>

            <div className="space-y-3 py-1">
              <p className="text-sm font-black text-rose-600 leading-relaxed">
                현재 보관 중인 모든 정보가 영구적으로 파괴되고 백업 파일의 데이터로 완전히 대체됩니다.
              </p>
              <p className="text-xs text-zinc-650 leading-relaxed font-bold">
                이 작업을 수행하면 지금 진행 중인 할 일 목록, 시간 기록, 상태 정보 등이 백업 시점 상태로 완전히 덮어씌워집니다. 계속 진행하시겠습니까?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {/* Option 1: Execute complete overwrite */}
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white py-3 text-xs font-black border-3 border-black shadow-[3px_3px_0px_0px_#000] active:scale-95 transition cursor-pointer"
              >
                기존 정보 모두 지우고 덮어씌워 복원하기 📦
              </button>

              {/* Option 2: Cancel and go back */}
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirmModal(false);
                  setPendingRestoreJson('');
                }}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-700 border-2 border-zinc-400 py-3 text-xs font-black shadow-[3px_3px_0px_0px_#6b7280] active:scale-[0.98] transition cursor-pointer"
              >
                취소하고 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
