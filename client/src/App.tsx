import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectForm from "@/pages/ProjectForm";
import ProjectDetail from "@/pages/ProjectDetail";
import Tasks from "@/pages/Tasks";
import AdminUsers from "@/pages/AdminUsers";
import AdminStages from "@/pages/AdminStages";
import AdminCompany from "@/pages/AdminCompany";
import CompanyCabinet from "@/pages/CompanyCabinet";
import Settings from "@/pages/Settings";
import Invite from "@/pages/Invite";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/not-found";
import "@/i18n";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div key="loading" className="h-screen w-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div key="unauthenticated">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/invite/:token" component={Invite} />
          <Route component={Landing} />
        </Switch>
      </div>
    );
  }

  if (!user?.companyId) {
    return (
      <div key="no-company">
        <Switch>
          <Route path="/invite/:token" component={Invite} />
          <Route component={Onboarding} />
        </Switch>
      </div>
    );
  }

  return (
    <div key="authenticated">
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/new" component={ProjectForm} />
          <Route path="/projects/:id/edit" component={ProjectForm} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/stages" component={AdminStages} />
          <Route path="/admin/company" component={AdminCompany} />
          <Route path="/company-cabinet" component={CompanyCabinet} />
          <Route path="/settings" component={Settings} />
          <Route path="/invite/:token" component={Invite} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
