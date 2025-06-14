// src/components/FeedbackPopup.tsx
'use client'

import { useEffect } from 'react';
import { useFeedbackStore } from '@/store/feedbackStore';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi'; // Ícones para os tipos de feedback

export default function FeedbackPopup() {
  const { message, type, show, clearFeedback } = useFeedbackStore();

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type || 'info']; // Fallback para 'info' se type for null

  const Icon = {
    success: FiCheckCircle,
    error: FiXCircle,
    info: FiInfo,
  }[type || 'info']; // Fallback para FiInfo se type for null

  if (!show || !message) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white flex items-center gap-3 z-50 transition-all duration-300
        ${show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        ${bgColor}`}
      role="alert"
    >
      {Icon && <Icon className="text-xl" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={clearFeedback} className="ml-4 text-white text-lg hover:opacity-80" aria-label="Fechar Notificação">
        <FiXCircle />
      </button>
    </div>
  );
}
