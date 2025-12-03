import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Rocket, 
  FolderOpen, 
  Users, 
  Bell,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Clock
} from "lucide-react";

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Clock,
      title: t("landing.features.timeline"),
      description: t("landing.features.timelineDesc"),
    },
    {
      icon: FolderOpen,
      title: t("landing.features.files"),
      description: t("landing.features.filesDesc"),
    },
    {
      icon: Users,
      title: t("landing.features.collaboration"),
      description: t("landing.features.collaborationDesc"),
    },
    {
      icon: Bell,
      title: t("landing.features.notifications"),
      description: t("landing.features.notificationsDesc"),
    },
  ];

  const stats = [
    { value: "99%", label: "On-time delivery" },
    { value: "50+", label: "Companies" },
    { value: "1000+", label: "Products launched" },
    { value: "24/7", label: "Support" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">LaunchFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">{t("auth.login")}</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Rocket className="h-4 w-4" />
                Product Launch Management
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
                {t("landing.title")}
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                {t("landing.subtitle")}
              </p>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t("landing.description")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild data-testid="button-cta-login">
                  <a href="/api/login">
                    {t("landing.cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-y bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-semibold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold mb-4">
                Everything you need to launch products
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From initial concept to market release, manage every stage of your product launch with precision.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-semibold mb-6">
                  Streamlined workflow for every stage
                </h2>
                <div className="space-y-4">
                  {[
                    "Render & 3D modeling",
                    "Technical documentation",
                    "Factory coordination",
                    "Sample production",
                    "Certification process",
                    "Packaging preparation",
                    "Distribution setup",
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Card className="p-6">
                  <div className="space-y-4">
                    {["Render", "3D Model", "Technical Spec", "Sample", "Certification"].map(
                      (stage, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 rounded-lg bg-background border"
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              index < 2
                                ? "bg-primary text-primary-foreground"
                                : index === 2
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium">{stage}</span>
                          {index < 2 && (
                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                          )}
                          {index === 2 && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              In Progress
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-semibold mb-4">
                Ready to streamline your product launches?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join companies that trust LaunchFlow for their product launch management.
              </p>
              <Button size="lg" asChild data-testid="button-bottom-cta">
                <a href="/api/login">
                  {t("landing.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <span className="font-semibold">LaunchFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Product Launch Management Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
