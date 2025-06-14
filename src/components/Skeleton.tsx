// src/components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  // Define a forma e o tamanho do esqueleto
  width?: string; // Ex: '100px', 'w-full'
  height?: string; // Ex: '20px', 'h-4'
  className?: string; // Classes adicionais do Tailwind para customização (e.g., 'rounded-full', 'mb-2')
  count?: number; // Para replicar o esqueleto várias vezes (e.g., para linhas de texto)
  type?: 'text' | 'avatar' | 'card' | 'line'; // Tipos predefinidos para facilitar
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className,
  count = 1,
  type = 'line',
}) => {
  const baseClasses = 'bg-neutral-300 dark:bg-neutral-800 animate-pulse';
  const skeletons = Array.from({ length: count }).map((_, index) => {
    let finalClasses = baseClasses;
    let finalWidth = width;
    let finalHeight = height;

    switch (type) {
      case 'text':
        finalWidth = width || 'w-full';
        finalHeight = height || 'h-4';
        finalClasses += ' rounded';
        break;
      case 'avatar':
        finalWidth = width || 'w-10';
        finalHeight = height || 'h-10';
        finalClasses += ' rounded-full';
        break;
      case 'card':
        finalWidth = width || 'w-full';
        finalHeight = height || 'h-24';
        finalClasses += ' rounded-lg';
        break;
      case 'line': // Default text line
      default:
        finalWidth = width || 'w-full';
        finalHeight = height || 'h-4';
        finalClasses += ' rounded';
        break;
    }

    // Adiciona classes personalizadas do usuário
    if (className) {
      finalClasses += ` ${className}`;
    }

    return (
      <div
        key={index}
        className={finalClasses}
        style={{ width: finalWidth?.startsWith('w-') ? undefined : finalWidth, height: finalHeight?.startsWith('h-') ? undefined : finalHeight }}
      ></div>
    );
  });

  return <>{skeletons}</>;
};

export default Skeleton;
