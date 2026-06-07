/**
 * Format string date to 'YYYY년 MM월 DD일' format
 */
export function formatKoreanDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    return `${year}년 ${month}월 ${date}일`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates raw days elapsed from input date to now
 */
export function getDaysElapsed(dateStr: string): number {
  try {
    const start = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Explains how much duration has elapsed since task was entered into the app until now
 */
export function getElapsedHumanized(dateStr: string): string {
  const days = getDaysElapsed(dateStr);
  if (days === 0) {
    try {
      const elapsedMs = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor(elapsedMs / (1000 * 60));
      if (hours > 0) return `오늘 입력 (${hours}시간 흐름)`;
      if (minutes > 0) return `오늘 입력 (${minutes}분 흐름)`;
      return '방금 전 입력됨';
    } catch {
      return '오늘 입력함';
    }
  }
  
  const months = Math.floor(days / 30.4);
  if (months > 0) {
    const remainingDays = Math.round(days % 30.4);
    if (remainingDays > 0) {
      return `${months}개월 ${remainingDays}일 지남`;
    }
    return `${months}개월 지남`;
  }
  return `${days}일 지남`;
}

/**
 * Returns raw simplified time unit elapsed (e.g. '15일', '1개월', '1년', '5시간')
 */
export function getDurationElapsedText(dateStr: string): string {
  const days = getDaysElapsed(dateStr);
  if (days <= 0) {
    return '오늘';
  }
  
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remDaysAfterYears = days % 365;
    const months = Math.floor(remDaysAfterYears / 30);
    const remDays = remDaysAfterYears % 30;
    
    const parts: string[] = [];
    parts.push(`${years}년`);
    if (months > 0) {
      parts.push(`${months}개월`);
    }
    if (remDays > 0) {
      parts.push(`${remDays}일`);
    }
    return parts.join(' ');
  }
  
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    
    const parts: string[] = [];
    parts.push(`${months}개월`);
    if (remDays > 0) {
      parts.push(`${remDays}일`);
    }
    return parts.join(' ');
  }
  
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    
    const parts: string[] = [];
    parts.push(`${weeks}주일`);
    if (remDays > 0) {
      parts.push(`${remDays}일`);
    }
    return parts.join(' ');
  }
  
  return `${days}일`;
}

/**
 * Returns a friendly date representation like '오늘', '어제', '2일전' based on calendar differences
 */
export function getFriendlyDaysAgo(dateStr: string): string {
  try {
    const past = new Date(dateStr);
    const now = new Date();
    
    const pastMidnight = new Date(past.getFullYear(), past.getMonth(), past.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffMs = nowMidnight.getTime() - pastMidnight.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return '오늘';
    if (diffDays === 1) return '어제';
    return `${diffDays}일전`;
  } catch {
    return '오늘';
  }
}


