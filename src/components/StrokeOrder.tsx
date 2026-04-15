import React, { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

interface StrokeOrderProps {
  character: string;
  size?: number;
}

export const StrokeOrder: React.FC<StrokeOrderProps> = ({ character, size = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  useEffect(() => {
    if (containerRef.current && character) {
      containerRef.current.innerHTML = '';
      writerRef.current = HanziWriter.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: 5,
        showOutline: true,
        strokeColor: '#8B1A1A', // cinnabar
        outlineColor: '#EEDC82', // gold
      });
    }
  }, [character, size]);

  const animate = () => {
    if (writerRef.current) {
      writerRef.current.animateCharacter();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="bg-paper/30 rounded-2xl border border-gold/20" />
      <button
        onClick={animate}
        className="px-6 py-2 bg-cinnabar text-paper rounded-full font-serif text-sm hover:bg-cinnabar-light transition-colors shadow-md"
      >
        演示笔顺
      </button>
    </div>
  );
};
