import React from 'react';
import { Button } from '@/components/ui/button';
import { UserDropdown } from './UserDropdown';
import { Profile } from '@/hooks/useAuth';
import { Stethoscope, PanelLeft, PanelLeftClose } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  backTooltip?: string;
  rightAction?: React.ReactNode;
  onSwitchUser?: (profile: Profile) => void;
  sidebar?: React.ReactNode;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  title,
  showBack,
  onBack,
  backTooltip = "Go back to entry screen",
  rightAction,
  onSwitchUser,
  sidebar,
  sidebarOpen,
  onToggleSidebar
}) => {
  return (
    <div className="h-screen bg-surface-subtle flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onBack}
                    className="h-9 w-9"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 19l-7-7 7-7" 
                      />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{backTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">MediVisor</span>
              </div>
            )}
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-9 w-9"
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
              </Button>
            )}
            {title && (
              <h1 className="text-base font-semibold text-foreground ml-1">
                {title}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {rightAction}
            {!sidebar && <UserDropdown onSwitchUser={onSwitchUser} />}
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {sidebar}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
