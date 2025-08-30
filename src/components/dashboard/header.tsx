
"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Settings,
  Users,
  Bot,
  Sparkles,
  Inbox,
  ImageIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ProfilePictureDialog } from "./profile-picture-dialog";

type Notification = {
  id: number;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
};

const initialNotifications: Notification[] = [
    {
        id: 1,
        icon: Bot,
        iconColor: "text-primary",
        title: "Welcome to Robot Maestro!",
        description: "Explore the dashboard to get started.",
    },
    {
        id: 3,
        icon: Sparkles,
        iconColor: "text-accent",
        title: "New Feature: AI Analysis",
        description: "Analyze failed test runs with AI.",
    },
];


export function DashboardHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("https://picsum.photos/32/32");
  const [username, setUsername] = useState('Admin');
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/");
  };

  const handleComingSoon = (feature: string) => {
    toast({
      title: `${feature} page is under construction`,
      description: "This feature is not yet implemented.",
    });
  };
  
  const dismissNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <SidebarTrigger className="md:hidden" />
        <div className="w-full flex-1">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Welcome back, {username}!
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-accent animate-bounce" />
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {notifications.length > 0 ? (
                    notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} onSelect={() => dismissNotification(notification.id)} className="cursor-pointer">
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 bg-primary/10 rounded-full p-2`}>
                                <notification.icon className={`h-4 w-4 ${notification.iconColor}`} />
                            </div>
                            <div>
                                <p className="font-medium">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {notification.description}
                                </p>
                            </div>
                        </div>
                    </DropdownMenuItem>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                        <Inbox className="h-10 w-10 text-muted-foreground/50 mb-2"/>
                        <p className="font-medium">You're all caught up</p>
                        <p className="text-xs text-muted-foreground">No new notifications.</p>
                    </div>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Image
                  src={avatarUrl}
                  width={32}
                  height={32}
                  alt="Avatar"
                  className="rounded-full object-cover"
                  data-ai-hint="user avatar"
                  key={avatarUrl} // Add key to force re-render on change
                />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Change Picture</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleComingSoon('Settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleComingSoon('Support')}>
                <Users className="mr-2 h-4 w-4" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ProfilePictureDialog 
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        onAvatarChange={setAvatarUrl}
        currentAvatar={avatarUrl}
      />
    </>
  );
}
