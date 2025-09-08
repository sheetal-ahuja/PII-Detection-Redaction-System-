import React from 'react';
import { Shield, Menu, Home, FileText, BarChart3, Settings, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FloatingNavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  activeTab = 'upload',
  onTabChange,
  className
}) => {
  const navItems = [
    { id: 'upload', icon: Home, label: 'Process', color: 'text-blue-500' },
    { id: 'history', icon: FileText, label: 'History', color: 'text-green-500' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', color: 'text-purple-500' },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-orange-500' }
  ];

  return (
    <div className={cn(
      "fixed top-6 left-1/2 transform -translate-x-1/2 z-50",
      className
    )}>
      {/* Dynamic Island Container */}
      <div className="relative">
        {/* Floating Navigation */}
        <div className="bg-black/80 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl border border-white/10">
          <div className="flex items-center gap-1">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 mr-4 px-3 py-1">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-white font-semibold text-sm hidden sm:block">
                PII Guard
              </span>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                      isActive 
                        ? "bg-white/20 text-white shadow-lg" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-white" : item.color)} />
                    <span className={cn(
                      "text-xs font-medium transition-all duration-300",
                      isActive ? "opacity-100 max-w-[60px]" : "opacity-0 max-w-0 hidden sm:block"
                    )}>
                      {item.label}
                    </span>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 ml-4 pl-3 border-l border-white/20">
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Bell className="h-4 w-4" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  3
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10 animate-pulse" />
      </div>
    </div>
  );
};