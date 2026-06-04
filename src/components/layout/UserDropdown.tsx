import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, ChevronUp, Users, Shield, UserCheck, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useProfiles, Profile } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserDropdownProps {
  onSwitchUser?: (profile: Profile) => void;
  variant?: 'header' | 'sidebar';
}

interface ImpersonationData {
  originalUserId: string;
  targetUserId: string;
  targetDisplayName: string;
  targetEmail: string | null;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ onSwitchUser, variant = 'header' }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { isAdmin } = useAdminRole();
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Check for impersonation on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonating');
    if (stored) {
      try {
        setImpersonation(JSON.parse(stored));
      } catch (e) {
        sessionStorage.removeItem('impersonating');
      }
    }
  }, []);

  // Fetch all profiles for admin impersonation
  useEffect(() => {
    const fetchAllProfiles = async () => {
      if (!isAdmin) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name');
      
      if (!error && data) {
        setAllProfiles(data);
      }
    };

    fetchAllProfiles();
  }, [isAdmin]);

  const handleSignOut = async () => {
    sessionStorage.removeItem('impersonating');
    await signOut();
    navigate('/auth');
  };


  const handleStopImpersonating = () => {
    sessionStorage.removeItem('impersonating');
    setImpersonation(null);
    toast.success('Returned to your account');
    navigate('/');
  };

  const handleImpersonate = (profile: Profile) => {
    const impersonationData: ImpersonationData = {
      originalUserId: user?.id || '',
      targetUserId: profile.user_id,
      targetDisplayName: profile.display_name,
      targetEmail: profile.email,
    };
    sessionStorage.setItem('impersonating', JSON.stringify(impersonationData));
    setImpersonation(impersonationData);
    toast.success(`Now viewing as ${profile.display_name}`);
    navigate('/');
  };

  const currentUserEmail = user?.email;
  const displayName = impersonation ? impersonation.targetDisplayName : currentUserEmail;

  if (!user) {
    return (
      <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
        Sign In
      </Button>
    );
  }

  const isSidebar = variant === 'sidebar';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isSidebar ? (
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 h-auto py-1.5 px-2 ${impersonation ? 'border border-warning text-warning' : ''}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {impersonation ? (
                <UserCheck className="w-3.5 h-3.5 text-warning" />
              ) : (
                <User className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Profile</p>
            </div>
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${impersonation ? 'border border-warning text-warning' : ''}`}
          >
            {impersonation ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="hidden sm:inline max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isSidebar ? 'start' : 'end'}
        side={isSidebar ? 'top' : 'bottom'}
        className="w-64 bg-card border border-border shadow-elevated z-50"
      >

        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Signed in as</p>
            <p className="text-xs text-muted-foreground truncate">{currentUserEmail}</p>
            {impersonation && (
              <div className="flex items-center gap-1 mt-1">
                <UserCheck className="w-3 h-3 text-warning" />
                <p className="text-xs text-warning">Viewing as: {impersonation.targetDisplayName}</p>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        {/* Stop Impersonating */}
        {impersonation && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleStopImpersonating} 
              className="cursor-pointer text-warning"
            >
              <X className="w-4 h-4 mr-2" />
              Stop Viewing As
            </DropdownMenuItem>
          </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              Admin
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => navigate('/admin')} 
              className="cursor-pointer"
            >
              <Users className="w-4 h-4 mr-2" />
              User Management
            </DropdownMenuItem>
            
            {/* Quick impersonate list */}
            {allProfiles.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <UserCheck className="w-3 h-3" />
                  View As User
                </DropdownMenuLabel>
                {allProfiles
                  .filter((p) => p.user_id !== user.id)
                  .slice(0, 5)
                  .map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => handleImpersonate(profile)}
                      className="cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{profile.display_name}</span>
                    </DropdownMenuItem>
                  ))}
                {allProfiles.length > 6 && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer text-primary"
                  >
                    View all users...
                  </DropdownMenuItem>
                )}
              </>
            )}
          </>
        )}

        {/* Regular user switch (POC feature) */}
        {!isAdmin && profiles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              Switch User (POC)
            </DropdownMenuLabel>
            {profiles
              .filter((p) => p.user_id !== user.id)
              .slice(0, 5)
              .map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => onSwitchUser?.(profile)}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{profile.display_name}</span>
                </DropdownMenuItem>
              ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/knowledge-base')} className="cursor-pointer">
          <Database className="w-4 h-4 mr-2" />
          Knowledge Base
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
