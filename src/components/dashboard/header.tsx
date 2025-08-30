
"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Home,
  Image as ImageIcon,
  LineChart,
  Package2,
  PlayCircle,
  Settings,
  Users,
  Bot,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarTrigger } from "../ui/sidebar";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ProfilePictureDialog } from "./profile-picture-dialog";

export function DashboardHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("https://picsum.photos/32/32");
  const [username, setUsername] = useState('Admin');

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
                    <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-accent" />
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-primary/10 rounded-full p-2">
                    <Bot className="h-4 w-4 text-primary"/>
                    </div>
                    <div>
                    <p className="font-medium">Welcome to Robot Maestro!</p>
                    <p className="text-xs text-muted-foreground">
                        Explore the dashboard to get started.
                    </p>
                    </div>
                </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-green-500/10 rounded-full p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600"/>
                    </div>
                    <div>
                    <p className="font-medium">Test Run Success</p>
                    <p className="text-xs text-muted-foreground">
                        'Login tests' suite completed in 45s.
                    </p>
                    </div>
                </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-accent/10 rounded-full p-2">
                    <Sparkles className="h-4 w-4 text-accent"/>
                    </div>
                    <div>
                    <p className="font-medium">New Feature: AI Analysis</p>
                    <p className="text-xs text-muted-foreground">
                        Analyze failed test runs with AI.
                    </p>
                    </div>
                </div>
                </DropdownMenuItem>
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
