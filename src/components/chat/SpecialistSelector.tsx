import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Import specialist avatars
import endocrinologistAvatar from '@/assets/specialists/endocrinologist.jpg';
import cardiologistAvatar from '@/assets/specialists/cardiologist.jpg';
import neurologistAvatar from '@/assets/specialists/neurologist.jpg';
import gpAvatar from '@/assets/specialists/gp.jpg';
import orthopedicAvatar from '@/assets/specialists/orthopedic.jpg';
import naturalistAvatar from '@/assets/specialists/naturalist.jpg';
import alternativeAvatar from '@/assets/specialists/alternative.jpg';

export interface Specialist {
  id: string;
  name: string;
  avatar: string;
  prompt: string;
}

export const DEFAULT_SPECIALIST_ID = 'gp';

export const specialists: Specialist[] = [
  {
    id: 'gp',
    name: 'General Practitioner',
    avatar: gpAvatar,
    prompt: "Assess my health as a General Practitioner and suggest preventive measures.",
  },
  {
    id: 'endocrinologist',
    name: 'Endocrinologist',
    avatar: endocrinologistAvatar,
    prompt: "Review my records as an Endocrinologist and identify any hormonal concerns.",
  },
  {
    id: 'cardiologist',
    name: 'Cardiologist',
    avatar: cardiologistAvatar,
    prompt: "Analyze my cardiovascular health from a Cardiologist's perspective.",
  },
  {
    id: 'neurologist',
    name: 'Neurologist',
    avatar: neurologistAvatar,
    prompt: "Evaluate my records as a Neurologist for any neurological patterns.",
  },
  {
    id: 'orthopedic',
    name: 'Orthopedic',
    avatar: orthopedicAvatar,
    prompt: "Review my bone health and joint concerns as an Orthopedic Specialist.",
  },
  {
    id: 'naturalist',
    name: 'Naturopath',
    avatar: naturalistAvatar,
    prompt: "Analyze my health from a naturopathic perspective, focusing on natural remedies, nutrition, and lifestyle changes.",
  },
  {
    id: 'alternative',
    name: 'Alternative Medicine',
    avatar: alternativeAvatar,
    prompt: "Review my records from an alternative medicine perspective, considering holistic approaches, traditional remedies, and integrative therapies.",
  },
  {
    id: 'dermatologist',
    name: 'Dermatologist',
    avatar: cardiologistAvatar,
    prompt: "Examine my health records for any skin-related conditions or concerns.",
  },
  {
    id: 'gastroenterologist',
    name: 'Gastroenterologist',
    avatar: neurologistAvatar,
    prompt: "Analyze my digestive health and identify any gastrointestinal concerns.",
  },
  {
    id: 'psychiatrist',
    name: 'Psychiatrist',
    avatar: gpAvatar,
    prompt: "Review my records from a mental health perspective and assess psychological well-being.",
  },
  {
    id: 'pulmonologist',
    name: 'Pulmonologist',
    avatar: endocrinologistAvatar,
    prompt: "Evaluate my respiratory health and identify any lung-related concerns.",
  },
  {
    id: 'rheumatologist',
    name: 'Rheumatologist',
    avatar: orthopedicAvatar,
    prompt: "Assess my records for autoimmune and inflammatory conditions affecting joints and tissues.",
  },
];

interface SpecialistSelectorProps {
  selected: Specialist | null;
  onSelect: (specialist: Specialist) => void;
  disabled?: boolean;
}

export const SpecialistSelector: React.FC<SpecialistSelectorProps> = ({
  selected,
  onSelect,
  disabled,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Each specialist is w-14 (56px) + gap-2 (8px) = 64px per item
  // 4 specialists = 4*56 + 3*8 = 248px
  const ITEMS_PER_PAGE = 4;
  const ITEM_WIDTH = 56; // w-14
  const GAP = 8; // gap-2
  const scrollAmount = ITEMS_PER_PAGE * ITEM_WIDTH + (ITEMS_PER_PAGE - 1) * GAP;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="border-b border-border">
      <div className="mx-auto w-full max-w-[320px] px-2 pt-3 pb-4">
        <p className="text-[10px] text-muted-foreground text-center mb-2">
          {selected ? `Consulting with ${selected.name}` : 'Choose a specialist to begin'}
        </p>
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 p-1 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-hidden pb-2 mx-7 w-[248px]"
          >
            {specialists.map((specialist) => {
              const isSelected = selected?.id === specialist.id;
              const isDefault = specialist.id === DEFAULT_SPECIALIST_ID;
              return (
                <button
                  key={specialist.id}
                  onClick={() => onSelect(specialist)}
                  disabled={disabled}
                  className={cn(
                    "flex flex-col items-center gap-1 group w-14 flex-shrink-0 relative",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full overflow-hidden transition-all",
                        isSelected
                          ? "ring-2 ring-offset-1 ring-offset-background ring-primary scale-110"
                          : "opacity-70 group-hover:opacity-100 group-hover:scale-105"
                      )}
                    >
                      <img
                        src={specialist.avatar}
                        alt={specialist.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Active indicator */}
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[6px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        Active
                      </div>
                    )}
                    {/* Default badge (only show when not selected) */}
                    {isDefault && !isSelected && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[6px] font-medium px-1 py-0.5 rounded-full border border-border">
                        Default
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[8px] font-medium transition-colors text-center leading-tight max-w-[84px] whitespace-normal min-h-[18px] mt-1",
                      isSelected
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {specialist.name}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 p-1 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};