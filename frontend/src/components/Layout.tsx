import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload as UploadIcon, Info, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

const NavItem = ({ to, icon, label, onClick }: NavItemProps) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                isActive
                    ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(16,185,129,0.1)] border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
        >
            {icon}
            {label}
        </Link>
    );
};

const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex h-full flex-col gap-4">
        <div className="flex h-[60px] items-center px-6">
            <Link to="/" className="flex items-center gap-3 font-bold text-xl tracking-tight font-['Space_Grotesk']" onClick={onNavClick}>
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="text-primary-foreground text-lg mb-0.5">P</span>
                </div>
                <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">PixelScale</span>
            </Link>
        </div>
        <div className="flex-1 px-4">
            <ScrollArea className="h-[calc(100vh-80px)]">
                <nav className="flex flex-col gap-2">
                    <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Gallery" onClick={onNavClick} />
                    <NavItem to="/upload" icon={<UploadIcon className="h-4 w-4" />} label="Upload" onClick={onNavClick} />
                    <Separator className="my-2 bg-white/5" />
                    <NavItem to="/about" icon={<Info className="h-4 w-4" />} label="About" onClick={onNavClick} />
                </nav>
            </ScrollArea>
        </div>
    </div>
);

export default function Layout() {
    const [open, setOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();

    // Don't show header/sidebar layout for auth pages if they were inside layout, 
    // but we moved them out in App.tsx. This check is extra safety or for About page if public?
    // Actually About page is public but inside Layout.

    return (
        <div className="min-h-screen flex bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-[#050505]/80 backdrop-blur-xl fixed h-full z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar & Header */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <header className="h-16 border-b border-white/5 flex items-center px-4 md:px-6 bg-[#050505]/60 backdrop-blur-md sticky top-0 z-20">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden mr-4 hover:bg-white/5 text-muted-foreground">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64 border-r border-white/10 bg-[#050505]">
                            <SidebarContent onNavClick={() => setOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    <div className="flex-1" />

                    {user ? (
                        <div className="flex items-center gap-3 md:gap-4">
                            <span className="hidden md:block text-sm font-medium text-foreground">{user.username}</span>
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                                <User className="h-4 w-4" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={logout}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login">
                                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Login</Button>
                            </Link>
                            <Link to="/register">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    )}
                </header>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto relative">
                    {/* Ambient background glow */}
                    <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
                    </div>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
