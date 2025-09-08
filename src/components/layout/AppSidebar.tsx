import { Shield, Upload, Settings, Activity, User, FileText } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/useAuth'

export function AppSidebar() {
  const { user } = useAuth()

  const items = [
    { title: 'Upload', icon: Upload },
    { title: 'Methods', icon: Settings },
    { title: 'Analytics', icon: Activity },
    { title: 'Reports', icon: FileText },
    { title: 'Profile', icon: User },
  ]

  return (
    <Sidebar collapsible="offcanvas" className="w-60">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <Shield className="h-5 w-5 text-primary" />
          <div className="font-semibold">PII Guardian</div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="justify-start">
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto px-3 py-4 text-xs text-muted-foreground">
          {user?.email}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
