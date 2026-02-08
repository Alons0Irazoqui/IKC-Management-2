
import React, { useMemo } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, className = '', onClick }) => {
  // Generate a consistent color based on the name string
  const bgColor = useMemo(() => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
      'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
      'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }, [name]);

  const initial = name.charAt(0).toUpperCase();

  if (src && src !== '') {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`object-cover ${className}`} 
        onClick={onClick}
      />
    );
  }

  return (
    <div 
      className={`flex items-center justify-center text-white font-bold select-none ${bgColor} ${className}`}
      onClick={onClick}
    >
      {initial}
    </div>
  );
};

export default Avatar;
