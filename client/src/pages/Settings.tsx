import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getObjectUrl } from "@/lib/objectStorage";
import { User, Camera, Mail, Briefcase, Info, Check } from "lucide-react";
import type { User as UserType } from "@shared/schema";

import orangeCatAvatar from "@assets/generated_images/orange_tabby_cat_avatar.png";
import grayCatAvatar from "@assets/generated_images/gray_fluffy_cat_avatar.png";
import blackCatAvatar from "@assets/generated_images/black_cat_avatar.png";
import whiteCatAvatar from "@assets/generated_images/white_cat_avatar.png";
import calicoCatAvatar from "@assets/generated_images/calico_cat_avatar.png";
import siameseCatAvatar from "@assets/generated_images/siamese_cat_avatar.png";
import coolCatAvatar from "@assets/generated_images/cool_ginger_cat_avatar.png";
import tuxedoCatAvatar from "@assets/generated_images/tuxedo_cat_avatar.png";

const PRESET_AVATARS = [
  { id: "orange", src: orangeCatAvatar, name: "Orange Cat" },
  { id: "gray", src: grayCatAvatar, name: "Gray Cat" },
  { id: "black", src: blackCatAvatar, name: "Black Cat" },
  { id: "white", src: whiteCatAvatar, name: "White Cat" },
  { id: "calico", src: calicoCatAvatar, name: "Calico Cat" },
  { id: "siamese", src: siameseCatAvatar, name: "Siamese Cat" },
  { id: "cool", src: coolCatAvatar, name: "Cool Cat" },
  { id: "tuxedo", src: tuxedoCatAvatar, name: "Tuxedo Cat" },
];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      jobTitle: user?.jobTitle || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", "/api/users/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("settings.profileUpdated"),
        description: t("settings.profileUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.updateError"),
        variant: "destructive",
      });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      return apiRequest("PATCH", "/api/users/me", { profileImageUrl: imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("settings.avatarUpdated"),
        description: t("settings.avatarUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.updateError"),
        variant: "destructive",
      });
    },
  });

  const handlePresetAvatarSelect = (avatarSrc: string) => {
    updateAvatarMutation.mutate(avatarSrc);
  };

  const isPresetAvatarSelected = (avatarSrc: string) => {
    return user?.profileImageUrl === avatarSrc;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t("common.error"),
        description: t("settings.invalidImageType"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("common.error"),
        description: t("settings.imageTooLarge"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const urlResponse = await fetch("/api/objects/upload-url", {
        credentials: "include",
      });

      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { url } = await urlResponse.json();
      
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const objectUrl = url.split("?")[0];
      await updateAvatarMutation.mutateAsync(objectUrl);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("settings.uploadError"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t("settings.avatar")}
            </CardTitle>
            <CardDescription>{t("settings.avatarDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={getObjectUrl(user?.profileImageUrl)} alt={user?.firstName || ""} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover-elevate transition-all"
                >
                  <Camera className="h-5 w-5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploading}
                    data-testid="input-avatar-upload"
                  />
                </label>
              </div>
              {isUploading && (
                <p className="text-sm text-muted-foreground">{t("settings.uploading")}</p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {t("settings.avatarHint")}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">{t("settings.presetAvatars")}</p>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handlePresetAvatarSelect(avatar.src)}
                    disabled={updateAvatarMutation.isPending}
                    className={`relative rounded-full overflow-hidden border-2 transition-all hover-elevate ${
                      isPresetAvatarSelected(avatar.src)
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    data-testid={`button-preset-avatar-${avatar.id}`}
                  >
                    <img
                      src={avatar.src}
                      alt={avatar.name}
                      className="w-full aspect-square object-cover"
                    />
                    {isPresetAvatarSelected(avatar.src) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.personalInfo")}
            </CardTitle>
            <CardDescription>{t("settings.personalInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("settings.email")}
                </Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">{t("settings.emailHint")}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("settings.firstName")}</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    data-testid="input-first-name"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("settings.lastName")}</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    data-testid="input-last-name"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {t("settings.jobTitle")}
                </Label>
                <Input
                  id="jobTitle"
                  placeholder={t("settings.jobTitlePlaceholder")}
                  {...form.register("jobTitle")}
                  data-testid="input-job-title"
                />
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t("settings.passwordSection")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t("settings.passwordNote")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
