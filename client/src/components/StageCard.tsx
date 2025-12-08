import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getObjectUrl } from "@/lib/objectStorage";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  FileIcon,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  UserPlus,
  History,
  PlayCircle,
  Clock,
  Trash2,
  Package,
  Users,
} from "lucide-react";
import type { StageWithRelations, User, StageFile, CustomField, DistributionData, TemplateBlock, ChecklistBlockConfig, ChecklistItemConfig, Product, ProductsBlockConfig } from "@shared/schema";
import { DistributionPrepBlock } from "./DistributionPrepBlock";
import { TranslateButton } from "./TranslateButton";

interface StageCardProps {
  stage: StageWithRelations;
  projectId: string;
  responsibleUserId?: string | null;
  users: User[];
  position: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function StageCard({ stage, projectId, responsibleUserId, users, position, isExpanded, onToggle }: StageCardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deadlineReason, setDeadlineReason] = useState("");
  const [newDeadline, setNewDeadline] = useState(
    stage.deadline ? new Date(stage.deadline).toISOString().split("T")[0] : ""
  );
  const [newStartDate, setNewStartDate] = useState(
    stage.startDate ? new Date(stage.startDate).toISOString().split("T")[0] : ""
  );
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingChecklistItem, setUploadingChecklistItem] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(
    (stage.customFieldsData as Record<string, string>) || {}
  );
  const [checklistInputValues, setChecklistInputValues] = useState<Record<string, string>>(
    (stage.checklistInputData as Record<string, string>) || {}
  );
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>(
    (stage.productQuantitiesData as Record<string, number>) || {}
  );
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedAccessUsers, setSelectedAccessUsers] = useState<string[]>([]);
  const [pendingFileUpload, setPendingFileUpload] = useState<{
    file: File;
    fileUrl: string;
    checklistItemKey?: string;
  } | null>(null);
  const [editingFileAccess, setEditingFileAccess] = useState<StageFile | null>(null);

  const getChecklistItemConfigs = (): Map<string, ChecklistItemConfig> => {
    const configMap = new Map<string, ChecklistItemConfig>();
    const blocks = (stage.template?.blocks as TemplateBlock[]) || [];
    const checklistBlock = blocks.find(b => b.type === 'checklist');
    if (checklistBlock) {
      const config = checklistBlock.config as ChecklistBlockConfig;
      if (config?.items) {
        config.items.forEach(item => configMap.set(item.key, item));
      }
    }
    
    if (configMap.size === 0 && stage.template?.name === 'First Shipment') {
      const firstShipmentDefaults: ChecklistItemConfig[] = [
        { 
          key: 'hsCode', 
          label: 'HS Code', 
          labelRu: 'Код ТН ВЭД', 
          labelZh: 'HS编码',
          hasInput: true,
          inputLabel: 'Enter HS Code',
          inputLabelRu: 'Введите код ТН ВЭД',
          inputLabelZh: '输入HS编码',
          inputPlaceholder: '0000 00 000 0'
        },
        { 
          key: 'catalogPage', 
          label: 'Catalog Page', 
          labelRu: 'Страница из каталога', 
          labelZh: '目录页',
          acceptedFileTypes: ['image/*', 'application/pdf']
        },
        { 
          key: 'boxPhoto', 
          label: 'Box Photo on Scales', 
          labelRu: 'Фото коробки на весах', 
          labelZh: '称重箱照片',
          acceptedFileTypes: ['image/*']
        }
      ];
      firstShipmentDefaults.forEach(item => configMap.set(item.key, item));
    }
    
    if (configMap.size === 0 && stage.template?.name === 'Documentation Checklist') {
      const documentationDefaults: ChecklistItemConfig[] = [
        { 
          key: 'productDrawing', 
          label: 'Product Drawing', 
          labelRu: 'Чертеж продукта', 
          labelZh: '产品图纸',
          acceptedFileTypes: ['image/*', 'application/pdf', '.dwg', '.dxf']
        },
        { 
          key: 'explodedView', 
          label: 'Exploded View Diagram', 
          labelRu: 'Взрыв-схема продукта', 
          labelZh: '爆炸图',
          acceptedFileTypes: ['image/*', 'application/pdf', '.dwg', '.dxf']
        },
        { 
          key: 'installationFile', 
          label: 'Installation File', 
          labelRu: 'Установочный файл', 
          labelZh: '安装文件',
          acceptedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx']
        },
        { 
          key: 'boxDrawing', 
          label: 'Box Drawing', 
          labelRu: 'Чертеж коробки', 
          labelZh: '包装盒图纸',
          acceptedFileTypes: ['image/*', 'application/pdf', '.dwg', '.dxf']
        }
      ];
      documentationDefaults.forEach(item => configMap.set(item.key, item));
    }
    
    return configMap;
  };

  const checklistItemConfigs = getChecklistItemConfigs();

  const { data: historyData } = useQuery<{
    statusHistory: Array<{
      id: string;
      oldStatus: string;
      newStatus: string;
      createdAt: string;
      changedBy: User | null;
    }>;
    deadlineHistory: Array<{
      id: string;
      oldDeadline: string | null;
      newDeadline: string | null;
      reason: string;
      createdAt: string;
      changedBy: User | null;
    }>;
  }>({
    queryKey: ["/api/stages", stage.id, "history"],
    enabled: showHistory,
  });

  const isOrderPlacementStage = stage.template?.name === "Order Placement";
  
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/projects", projectId, "products"],
    enabled: isOrderPlacementStage,
  });

  const isCompleted = stage.status === "completed";
  const commentsCount = stage.comments?.length || 0;
  const filesCount = stage.files?.length || 0;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.statusUpdated") || "Status updated" });
    },
    onError: () => {
      toast({ title: t("stages.statusUpdateFailed") || "Failed to update status", variant: "destructive" });
    },
  });

  const updateDeadlineMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/stages/${stage.id}/deadline`, {
        deadline: newDeadline,
        reason: deadlineReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowDeadlineModal(false);
      setDeadlineReason("");
      toast({ title: t("stages.deadlineUpdated") });
    },
    onError: () => {
      toast({ title: t("stages.deadlineUpdateFailed"), variant: "destructive" });
    },
  });

  const updateStartDateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, {
        startDate: newStartDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowStartDateModal(false);
      toast({ title: t("stages.startDateUpdated") });
    },
    onError: () => {
      toast({ title: t("stages.startDateUpdateFailed"), variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/stages/${stage.id}/tasks`, {
        description: taskDescription,
        assignedToId: taskAssignee,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowTaskModal(false);
      setTaskDescription("");
      setTaskAssignee("");
      toast({ title: t("tasks.taskAssigned") || "Task assigned" });
    },
    onError: () => {
      toast({ title: t("tasks.taskAssignFailed") || "Failed to assign task", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/stages/${stage.id}/comments`, {
        content: newComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setNewComment("");
      toast({ title: t("stages.commentAdded") });
    },
    onError: () => {
      toast({ title: t("stages.commentFailed"), variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/stages/${stage.id}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.fileDeleted") || "File deleted" });
    },
    onError: () => {
      toast({ title: t("stages.fileDeleteFailed") || "Failed to delete file", variant: "destructive" });
    },
  });

  const updateFileAccessMutation = useMutation({
    mutationFn: async ({ fileId, allowedUserIds }: { fileId: string; allowedUserIds: string[] | null }) => {
      return apiRequest("PATCH", `/api/stage-files/${fileId}`, { allowedUserIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.accessControl.updated") || "Access updated" });
      setEditingFileAccess(null);
      setShowAccessDialog(false);
      setSelectedAccessUsers([]);
    },
    onError: () => {
      toast({ title: t("stages.accessControl.updateFailed") || "Failed to update access", variant: "destructive" });
    },
  });

  const updateProductQuantitiesMutation = useMutation({
    mutationFn: async (quantities: Record<string, number>) => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, { productQuantitiesData: quantities });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("products.quantitySaved") });
    },
    onError: () => {
      toast({ title: t("products.quantitySaveFailed"), variant: "destructive" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (data: { checklistData?: Record<string, boolean>; checklistInputData?: Record<string, string>; conditionalEnabled?: boolean; conditionalSubstagesData?: Record<string, boolean>; status?: string; customFieldsData?: Record<string, string> }) => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const handleChecklistItemToggle = (itemKey: string, currentValue: boolean) => {
    const newChecklistData = {
      ...(stage.checklistData || {}),
      [itemKey]: !currentValue,
    };
    updateChecklistMutation.mutate({ checklistData: newChecklistData });
  };

  const handleChecklistInputChange = (itemKey: string, value: string) => {
    const newValues = { ...checklistInputValues, [itemKey]: value };
    setChecklistInputValues(newValues);
  };

  const handleChecklistInputBlur = (itemKey: string) => {
    const serverValue = (stage.checklistInputData as Record<string, string>)?.[itemKey] || "";
    const localValue = checklistInputValues[itemKey] ?? "";
    if (localValue !== serverValue) {
      const mergedData = {
        ...((stage.checklistInputData as Record<string, string>) || {}),
        ...checklistInputValues
      };
      updateChecklistMutation.mutate({ checklistInputData: mergedData });
    }
  };

  const handleChecklistInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemKey: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const getChecklistInputLabel = (itemConfig: ChecklistItemConfig) => {
    const lang = i18n.language.substring(0, 2);
    if (lang === "ru" && itemConfig.inputLabelRu) return itemConfig.inputLabelRu;
    if (lang === "zh" && itemConfig.inputLabelZh) return itemConfig.inputLabelZh;
    return itemConfig.inputLabel || t("stages.enterValue");
  };

  const handleConditionalToggle = (enabled: boolean) => {
    updateChecklistMutation.mutate({ 
      conditionalEnabled: enabled,
      status: enabled ? "waiting" : "skip",
    });
  };

  const handleConditionalSubstageToggle = (itemKey: string, currentValue: boolean) => {
    const newSubstagesData = {
      ...(stage.conditionalSubstagesData || {}),
      [itemKey]: !currentValue,
    };
    updateChecklistMutation.mutate({ conditionalSubstagesData: newSubstagesData });
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleCustomFieldBlur = (fieldKey: string) => {
    const currentValue = (stage.customFieldsData as Record<string, string>)?.[fieldKey] || "";
    if (customFieldValues[fieldKey] !== currentValue) {
      updateChecklistMutation.mutate({ customFieldsData: customFieldValues });
    }
  };

  const handleProductQuantityChange = (productId: string, value: number) => {
    setProductQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleProductQuantityBlur = (productId: string) => {
    const currentValue = (stage.productQuantitiesData as Record<string, number>)?.[productId] || 0;
    const newValue = productQuantities[productId];
    if (newValue !== undefined && newValue !== currentValue) {
      updateProductQuantitiesMutation.mutate(productQuantities);
    }
  };

  const handleProductQuantityKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === "Enter") {
      handleProductQuantityBlur(productId);
    }
  };

  const getCustomFieldLabel = (field: CustomField) => {
    const lang = i18n.language.substring(0, 2);
    if (lang === "ru" && field.labelRu) return field.labelRu;
    if (lang === "zh" && field.labelZh) return field.labelZh;
    return field.label;
  };

  const customFields = (stage.template?.customFields as CustomField[]) || [];
  const hasChecklist = stage.template?.hasChecklist && stage.template?.checklistItems?.length;
  const checklistItems = stage.template?.checklistItems || [];
  const hasConditionalSubstages = stage.template?.hasConditionalSubstages && stage.template?.conditionalSubstages?.length;
  const conditionalSubstages = stage.template?.conditionalSubstages || [];
  
  const isDistributionPrep = stage.name === "Distribution Preparation" || 
    stage.template?.name === "Distribution Preparation" ||
    stage.template?.nameRu === "Подготовка к рассылке" ||
    stage.template?.nameRu === "Подготовка к дистрибуции";

  const filterByAccess = (file: StageFile) => {
    if (!file.allowedUserIds || file.allowedUserIds.length === 0) {
      return true;
    }
    return currentUser?.id ? file.allowedUserIds.includes(currentUser.id) : false;
  };

  const getFilesForChecklistItem = (itemKey: string) => {
    return (stage.files || []).filter(f => f.checklistItemKey === itemKey && filterByAccess(f));
  };

  const getFilePreviewIcon = (file: StageFile) => {
    const fileType = file.fileType || "";
    const fileName = file.fileName?.toLowerCase() || "";
    
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4 text-green-500" />;
    }
    if (fileType.startsWith("video/")) {
      return <Film className="h-4 w-4 text-purple-500" />;
    }
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (fileName.endsWith(".step") || fileName.endsWith(".stp") || fileName.endsWith(".stl")) {
      return <File className="h-4 w-4 text-blue-500" />;
    }
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const getAcceptedFileTypes = (stageName: string, itemKey?: string) => {
    if (stageName === "Render" || itemKey === "render") return "image/*";
    if (stageName === "3D Model") return ".step,.stp,.stl";
    if (itemKey === "boxPhoto") return "image/*";
    if (itemKey === "video") return "video/*";
    return "*";
  };

  const getChecklistItemLabel = (itemKey: string) => {
    const itemConfig = checklistItemConfigs.get(itemKey);
    if (itemConfig) {
      const lang = i18n.language.substring(0, 2);
      if (lang === "ru" && itemConfig.labelRu) return itemConfig.labelRu;
      if (lang === "zh" && itemConfig.labelZh) return itemConfig.labelZh;
      return itemConfig.label;
    }
    
    const translationPaths = [
      `stages.checklistItems.${itemKey}`,
      `stages.certificationSubstages.${itemKey}`,
      `stages.firstShipmentItems.${itemKey}`,
    ];
    
    for (const path of translationPaths) {
      const translation = t(path, { defaultValue: null as any });
      if (translation && translation !== path) {
        return translation;
      }
    }
    
    return itemKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
  };

  const isFactoryProposalStage = () => {
    const templateName = stage.template?.name || stage.name || "";
    const templateNameRu = stage.template?.nameRu || "";
    return (
      templateName === "Factory Proposal" || 
      templateName === "Quotation" ||
      templateNameRu === "Предложение от завода"
    );
  };

  const isQuotationStage = () => {
    const templateName = stage.template?.name || stage.name || "";
    return templateName === "Quotation";
  };

  const canEditFileAccess = (file: StageFile) => {
    if (!currentUser) return false;
    
    if (isQuotationStage()) {
      return currentUser.id === responsibleUserId;
    }
    
    return file.uploadedById === currentUser.id || 
           currentUser.role === "admin" || 
           currentUser.role === "superadmin";
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, checklistItemKey?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (checklistItemKey) {
      setUploadingChecklistItem(checklistItemKey);
    } else {
      setIsUploading(true);
    }
    
    try {
      const urlResponse = await fetch(
        `/api/stages/${stage.id}/upload-url?fileName=${encodeURIComponent(file.name)}`,
        { credentials: "include" }
      );
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const { url } = await urlResponse.json();
      
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed");
      }
      
      const fileUrl = url.split("?")[0];
      
      if (isFactoryProposalStage()) {
        setPendingFileUpload({ file, fileUrl, checklistItemKey });
        setSelectedAccessUsers([]);
        setShowAccessDialog(true);
        event.target.value = "";
        return;
      }
      
      await completeFileUpload(file, fileUrl, checklistItemKey);
    } catch (error) {
      console.error("File upload error:", error);
      toast({ 
        title: t("stages.fileUploadFailed"), 
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive" 
      });
      setIsUploading(false);
      setUploadingChecklistItem(null);
    } finally {
      event.target.value = "";
    }
  };

  const completeFileUpload = async (file: File, fileUrl: string, checklistItemKey?: string, allowedUserIds?: string[]) => {
    try {
      const recordResponse = await fetch(`/api/stages/${stage.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: fileUrl,
          fileType: file.type,
          fileSize: file.size,
          checklistItemKey: checklistItemKey || null,
          allowedUserIds: allowedUserIds || null,
        }),
        credentials: "include",
      });
      
      if (!recordResponse.ok) {
        const error = await recordResponse.json();
        throw new Error(error.message || "Failed to record file");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.fileUploaded") });
    } catch (error) {
      console.error("File upload error:", error);
      toast({ 
        title: t("stages.fileUploadFailed"), 
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      setUploadingChecklistItem(null);
      setPendingFileUpload(null);
    }
  };

  const handleAccessDialogConfirm = async () => {
    if (selectedAccessUsers.length === 0) {
      toast({ 
        title: t("stages.accessControl.selectUsersRequired"),
        variant: "destructive" 
      });
      return;
    }
    
    if (editingFileAccess) {
      updateFileAccessMutation.mutate({
        fileId: editingFileAccess.id,
        allowedUserIds: selectedAccessUsers,
      });
    } else if (pendingFileUpload) {
      setShowAccessDialog(false);
      await completeFileUpload(
        pendingFileUpload.file, 
        pendingFileUpload.fileUrl, 
        pendingFileUpload.checklistItemKey,
        selectedAccessUsers
      );
    }
  };

  const handleAccessDialogCancel = () => {
    setShowAccessDialog(false);
    setPendingFileUpload(null);
    setEditingFileAccess(null);
    setIsUploading(false);
    setUploadingChecklistItem(null);
    setSelectedAccessUsers([]);
  };

  const handleEditFileAccess = (file: StageFile) => {
    setEditingFileAccess(file);
    setSelectedAccessUsers(file.allowedUserIds || []);
    setShowAccessDialog(true);
  };

  const toggleUserAccess = (userId: string) => {
    setSelectedAccessUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;
  };

  const getUserInitials = (userId: string | null | undefined) => {
    if (!userId) return "?";
    const user = users.find((u) => u.id === userId);
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "?";
  };

  const getDateLocale = () => {
    const lang = i18n.language.substring(0, 2);
    if (lang === "ru") return "ru-RU";
    if (lang === "zh") return "zh-CN";
    return "en-US";
  };

  const formatDateRange = () => {
    const start = stage.startDate ? new Date(stage.startDate) : null;
    const end = stage.deadline ? new Date(stage.deadline) : null;
    const locale = getDateLocale();
    
    const formatShort = (d: Date) => {
      return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    };
    
    if (start && end) {
      return `${formatShort(start)} - ${formatShort(end)}`;
    } else if (start) {
      return formatShort(start);
    } else if (end) {
      return `- ${formatShort(end)}`;
    }
    return null;
  };

  const formatFullDate = (date: string | Date | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    const locale = getDateLocale();
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  const getStageName = () => {
    const lang = i18n.language.substring(0, 2);
    const templateName = stage.template?.name || stage.name;
    
    if (lang === "ru") {
      const ruNames: Record<string, string> = {
        "Render": "Рендер",
        "3D Model": "3D Модель",
        "3D Print": "3D Печать",
        "Technical Description": "Тех. описание",
        "Factory Proposal": "Предложение завода",
        "Tooling": "Оснастка",
        "Sample": "Образец",
        "Order Placement": "Размещение заказа",
        "Documentation Checklist": "Чеклист документации",
        "Packaging Checklist": "Чеклист упаковки",
        "Certification": "Сертификация",
        "First Shipment": "Первая отгрузка",
        "Distribution Preparation": "Подготовка к дистрибуции",
      };
      const ruName = ruNames[templateName];
      if (ruName) return `${ruName} (${templateName})`;
    }
    
    if (lang === "zh") {
      const zhNames: Record<string, string> = {
        "Render": "渲染",
        "3D Model": "3D模型",
        "3D Print": "3D打印",
        "Technical Description": "技术描述",
        "Factory Proposal": "工厂报价",
        "Tooling": "模具",
        "Sample": "样品",
        "Order Placement": "下单",
        "Documentation Checklist": "文档清单",
        "Packaging Checklist": "包装清单",
        "Certification": "认证",
        "First Shipment": "首批发货",
        "Distribution Preparation": "分销准备",
      };
      const zhName = zhNames[templateName];
      if (zhName) return `${zhName} (${templateName})`;
    }
    
    return templateName;
  };

  const getStageDescription = () => {
    const lang = i18n.language.substring(0, 2);
    const templateName = stage.template?.name || stage.name;
    
    const descriptions: Record<string, Record<string, string>> = {
      "Render": {
        en: "Create product visualization. Attach images.",
        ru: "Создание визуализации продукта. Прикрепите изображения.",
        zh: "创建产品可视化。附加图像。",
      },
      "3D Model": {
        en: "Technical model development. STEP format.",
        ru: "Разработка технической модели. Формат STEP.",
        zh: "技术模型开发。STEP格式。",
      },
      "3D Print": {
        en: "Physical prototype from 3D model.",
        ru: "Физический прототип из 3D модели.",
        zh: "从3D模型制作物理原型。",
      },
      "Technical Description": {
        en: "Complete technical specifications.",
        ru: "Полное техническое описание.",
        zh: "完整的技术规格。",
      },
      "Factory Proposal": {
        en: "Factory quotation and terms.",
        ru: "Предложение и условия завода.",
        zh: "工厂报价和条款。",
      },
      "Tooling": {
        en: "Mold and tooling preparation.",
        ru: "Подготовка пресс-формы и оснастки.",
        zh: "模具和工装准备。",
      },
      "Sample": {
        en: "Production sample review.",
        ru: "Проверка производственного образца.",
        zh: "生产样品审核。",
      },
      "Order Placement": {
        en: "Place production order.",
        ru: "Размещение производственного заказа.",
        zh: "下达生产订单。",
      },
      "Documentation Checklist": {
        en: "Complete all required documentation.",
        ru: "Заполните всю необходимую документацию.",
        zh: "完成所有必需的文档。",
      },
      "Packaging Checklist": {
        en: "Prepare packaging materials.",
        ru: "Подготовьте упаковочные материалы.",
        zh: "准备包装材料。",
      },
      "Certification": {
        en: "Product certification process.",
        ru: "Процесс сертификации продукта.",
        zh: "产品认证流程。",
      },
      "First Shipment": {
        en: "First batch shipping preparation.",
        ru: "Подготовка первой партии к отгрузке.",
        zh: "首批发货准备。",
      },
      "Distribution Preparation": {
        en: "Prepare for distribution channels.",
        ru: "Подготовка к каналам дистрибуции.",
        zh: "准备分销渠道。",
      },
    };
    
    return descriptions[templateName]?.[lang] || descriptions[templateName]?.["en"] || "";
  };

  const dateRange = formatDateRange();
  const stageFiles = (stage.files || []).filter(f => !f.checklistItemKey && filterByAccess(f));

  return (
    <>
      <Card data-testid={`card-stage-${stage.id}`}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="p-4 cursor-pointer hover-elevate">
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                  isCompleted 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                    : "bg-primary/10 text-primary"
                }`}>
                  {position}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{getStageName()}</h3>
                    {isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {dateRange && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{dateRange}</span>
                      </div>
                    )}
                    {commentsCount > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{commentsCount}</span>
                      </div>
                    )}
                    {filesCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{filesCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={stage.status || "waiting"}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate(value);
                    }}
                  >
                    <SelectTrigger 
                      className="w-32 h-8" 
                      data-testid={`select-status-${stage.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waiting">{t("stages.status.waiting")}</SelectItem>
                      <SelectItem value="in_progress">{t("stages.status.in_progress")}</SelectItem>
                      <SelectItem value="skip">{t("stages.status.skip")}</SelectItem>
                      <SelectItem value="completed">{t("stages.status.completed")}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              {getStageDescription() && (
                <p className="text-muted-foreground italic">
                  {getStageDescription()}
                </p>
              )}
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {t("stages.startDate")}
                      </p>
                      <button
                        onClick={() => setShowStartDateModal(true)}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        data-testid={`button-start-date-${stage.id}`}
                      >
                        <Calendar className="h-4 w-4" />
                        {formatFullDate(stage.startDate)}
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {t("stages.deadline")}
                      </p>
                      <button
                        onClick={() => setShowDeadlineModal(true)}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        data-testid={`button-deadline-${stage.id}`}
                      >
                        <Calendar className="h-4 w-4" />
                        {formatFullDate(stage.deadline)}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasChecklist && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium uppercase text-muted-foreground">
                    {t("stages.checklist")}
                  </h4>
                  <div className="space-y-2">
                    {checklistItems.map((itemKey: string) => {
                      const isChecked = (stage.checklistData as Record<string, boolean>)?.[itemKey] || false;
                      const itemFiles = getFilesForChecklistItem(itemKey);
                      const itemConfig = checklistItemConfigs.get(itemKey);
                      const hasInput = itemConfig?.hasInput;
                      
                      return (
                        <div key={itemKey} className="space-y-2">
                          <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleChecklistItemToggle(itemKey, isChecked)}
                              data-testid={`checkbox-${stage.id}-${itemKey}`}
                            />
                            <span className={`flex-1 ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                              {getChecklistItemLabel(itemKey)}
                            </span>
                            {itemFiles.length > 0 && (
                              <div className="flex items-center gap-1">
                                {itemFiles.slice(0, 3).map((f) => (
                                  <div key={f.id} className="flex items-center group/file">
                                    <a
                                      href={f.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 hover:bg-muted rounded"
                                    >
                                      {getFilePreviewIcon(f)}
                                    </a>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFileMutation.mutate(f.id);
                                      }}
                                      className="p-0.5 opacity-0 group-hover/file:opacity-100 text-destructive hover:bg-destructive/10 rounded transition-opacity"
                                      disabled={deleteFileMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                {itemFiles.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{itemFiles.length - 3}</span>
                                )}
                              </div>
                            )}
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept={getAcceptedFileTypes(stage.name, itemKey)}
                                onChange={(e) => handleFileUpload(e, itemKey)}
                                disabled={uploadingChecklistItem === itemKey}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                disabled={uploadingChecklistItem === itemKey}
                                asChild
                              >
                                <span>
                                  <Paperclip className="h-3.5 w-3.5" />
                                </span>
                              </Button>
                            </label>
                          </div>
                          {hasInput && itemConfig && (
                            <div className="pl-8">
                              <Input
                                placeholder={itemConfig.inputPlaceholder || getChecklistInputLabel(itemConfig)}
                                value={checklistInputValues[itemKey] || ""}
                                onChange={(e) => handleChecklistInputChange(itemKey, e.target.value)}
                                onBlur={() => handleChecklistInputBlur(itemKey)}
                                onKeyDown={(e) => handleChecklistInputKeyDown(e, itemKey)}
                                className="h-8 text-sm"
                                data-testid={`input-${stage.id}-${itemKey}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasConditionalSubstages && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={stage.conditionalEnabled !== false}
                      onCheckedChange={handleConditionalToggle}
                    />
                    <span className="text-sm font-medium">
                      {t("stages.templates.certification")}
                    </span>
                  </div>
                  {stage.conditionalEnabled !== false && (
                    <div className="pl-6 space-y-2">
                      {conditionalSubstages.map((itemKey: string) => {
                        const isChecked = (stage.conditionalSubstagesData as Record<string, boolean>)?.[itemKey] || false;
                        return (
                          <div key={itemKey} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleConditionalSubstageToggle(itemKey, isChecked)}
                            />
                            <span className={isChecked ? "line-through text-muted-foreground" : ""}>
                              {getChecklistItemLabel(itemKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {customFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium uppercase text-muted-foreground">
                    {t("stages.customFields")}
                  </h4>
                  <div className="grid gap-3">
                    {customFields.map((field) => (
                      <div key={field.key}>
                        <label className="text-sm text-muted-foreground mb-1 block">
                          {getCustomFieldLabel(field)}
                        </label>
                        {field.type === "textarea" ? (
                          <Textarea
                            value={customFieldValues[field.key] || ""}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            onBlur={() => handleCustomFieldBlur(field.key)}
                            className="min-h-[80px]"
                          />
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            value={customFieldValues[field.key] || ""}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            onBlur={() => handleCustomFieldBlur(field.key)}
                          />
                        )}
                        {customFieldValues[field.key] && field.type !== "number" && (
                          <TranslateButton text={customFieldValues[field.key]} className="mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOrderPlacementStage && products && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <h4 className="text-sm font-medium uppercase text-muted-foreground">
                      {t("products.title")}
                    </h4>
                  </div>
                  
                  {products.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                              {t("products.article")}
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                              {t("products.name")}
                            </th>
                            <th className="px-4 py-2 text-center font-medium text-muted-foreground w-32">
                              {t("products.quantity")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {products.map((product) => (
                            <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-sm">
                                {product.article || "-"}
                              </td>
                              <td className="px-4 py-3">
                                {product.name}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={productQuantities[product.id] ?? 0}
                                  onChange={(e) => handleProductQuantityChange(product.id, parseInt(e.target.value) || 0)}
                                  onBlur={() => handleProductQuantityBlur(product.id)}
                                  onKeyDown={(e) => handleProductQuantityKeyDown(e, product.id)}
                                  className="h-8 w-24 text-center mx-auto"
                                  data-testid={`input-quantity-${product.id}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("products.noProducts")}
                    </p>
                  )}
                </div>
              )}

              {isDistributionPrep && (
                <DistributionPrepBlock
                  stageId={stage.id}
                  projectId={projectId}
                  distributionData={stage.distributionData as DistributionData | null}
                />
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium uppercase text-muted-foreground">
                    {t("stages.comments")}
                  </h4>
                  
                  {stage.comments && stage.comments.length > 0 ? (
                    <div className="space-y-3">
                      {stage.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={getObjectUrl(comment.user?.profileImageUrl)} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(comment.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-sm">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{getUserName(comment.userId) || "Unknown"}</span>
                              <span>·</span>
                              <span>{comment.createdAt ? formatFullDate(comment.createdAt) : ""}</span>
                              <span>·</span>
                              <TranslateButton text={comment.content} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("comments.noComments")}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("stages.addComment") || "Add a comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newComment.trim() && newComment.length <= 500) {
                            addCommentMutation.mutate();
                          }
                        }}
                        maxLength={500}
                        data-testid={`input-comment-${stage.id}`}
                      />
                      <Button
                        size="icon"
                        onClick={() => addCommentMutation.mutate()}
                        disabled={!newComment.trim() || newComment.length > 500 || addCommentMutation.isPending}
                        data-testid={`button-send-comment-${stage.id}`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {newComment.length > 400 && (
                      <p className={`text-xs text-right ${newComment.length >= 500 ? "text-destructive" : "text-muted-foreground"}`}>
                        {newComment.length}/500
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium uppercase text-muted-foreground">
                    {t("stages.files")}
                  </h4>
                  
                  {stageFiles.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {stageFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 flex-1 min-w-0"
                            data-testid={`link-file-${file.id}`}
                          >
                            {getFilePreviewIcon(file)}
                            <span className="text-sm truncate">{file.fileName}</span>
                          </a>
                          <div className="flex items-center gap-1">
                            {isFactoryProposalStage() && file.allowedUserIds && file.allowedUserIds.length > 0 && 
                              canEditFileAccess(file) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFileAccess(file);
                                }}
                                disabled={updateFileAccessMutation.isPending}
                                data-testid={`button-edit-access-${file.id}`}
                                title={t("stages.accessControl.editAccess") || "Edit access"}
                              >
                                <Users className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(file.uploadedById === currentUser?.id || currentUser?.role === "admin" || currentUser?.role === "superadmin") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFileMutation.mutate(file.id);
                                }}
                                disabled={deleteFileMutation.isPending}
                                data-testid={`button-delete-file-${file.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("files.noFiles")}
                    </p>
                  )}
                  
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <input
                      type="file"
                      className="hidden"
                      accept={getAcceptedFileTypes(stage.name)}
                      onChange={(e) => handleFileUpload(e)}
                      disabled={isUploading}
                      data-testid={`input-file-upload-${stage.id}`}
                    />
                    <Paperclip className="h-4 w-4" />
                    {isUploading ? t("common.loading") : (t("stages.clickToUpload") || "Click to upload file")}
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskModal(true)}
                  data-testid={`button-assign-task-${stage.id}`}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("stages.assignTask")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  data-testid={`button-history-${stage.id}`}
                >
                  <History className="h-4 w-4 mr-2" />
                  {t("stages.viewHistory")}
                </Button>
              </div>

              {showHistory && historyData && (
                <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t("stages.changeHistory")}
                  </h4>
                  
                  {historyData.statusHistory && historyData.statusHistory.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase">
                        {t("stages.statusChanges")}
                      </h5>
                      {historyData.statusHistory.map((record) => (
                        <div key={record.id} className="flex items-center gap-2 text-sm">
                          <PlayCircle className="h-4 w-4 text-primary" />
                          <span>
                            {record.changedBy?.firstName || record.changedBy?.email || "Unknown"}{" "}
                            {t("stages.changedStatusFrom")}{" "}
                            <strong>{t(`stages.status.${record.oldStatus || "waiting"}`)}</strong>{" "}
                            {t("common.to")}{" "}
                            <strong>{t(`stages.status.${record.newStatus}`)}</strong>
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {formatFullDate(record.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {historyData.deadlineHistory && historyData.deadlineHistory.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase">
                        {t("stages.deadlineChanges")}
                      </h5>
                      {historyData.deadlineHistory.map((record) => (
                        <div key={record.id} className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span>
                            {record.changedBy?.firstName || record.changedBy?.email || "Unknown"}{" "}
                            {t("stages.changedDeadlineFrom")}{" "}
                            <strong>{record.oldDeadline ? formatFullDate(record.oldDeadline) : t("stages.notSet")}</strong>{" "}
                            {t("common.to")}{" "}
                            <strong>{record.newDeadline ? formatFullDate(record.newDeadline) : t("stages.notSet")}</strong>
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {formatFullDate(record.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(!historyData.statusHistory?.length && !historyData.deadlineHistory?.length) && (
                    <p className="text-sm text-muted-foreground">{t("stages.noHistory")}</p>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Dialog open={showStartDateModal} onOpenChange={setShowStartDateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stages.changeStartDate")}</DialogTitle>
            <DialogDescription>{t("stages.setStartDateDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              data-testid="input-new-start-date"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDateModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => updateStartDateMutation.mutate()}
              disabled={updateStartDateMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeadlineModal} onOpenChange={setShowDeadlineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stage.deadline ? t("stages.changeDeadline") : t("stages.setDeadline")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              data-testid="input-new-deadline"
            />
            {stage.deadline && (
              <Textarea
                placeholder={t("stages.deadlineReason")}
                value={deadlineReason}
                onChange={(e) => setDeadlineReason(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeadlineModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => updateDeadlineMutation.mutate()}
              disabled={updateDeadlineMutation.isPending || !newDeadline || (!!stage.deadline && !deadlineReason.trim())}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stages.assignTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={t("tasks.taskDescription")}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
            <Select value={taskAssignee} onValueChange={setTaskAssignee}>
              <SelectTrigger>
                <SelectValue placeholder={t("tasks.assignTo")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate()}
              disabled={createTaskMutation.isPending || !taskDescription || !taskAssignee}
            >
              {t("stages.assignTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccessDialog} onOpenChange={(open) => !open && handleAccessDialogCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFileAccess 
                ? t("stages.accessControl.editTitle") 
                : t("stages.accessControl.title")}
            </DialogTitle>
            <DialogDescription>
              {editingFileAccess 
                ? t("stages.accessControl.editDescription")
                : t("stages.accessControl.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto py-2">
            {users.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleUserAccess(user.id)}
                data-testid={`access-user-${user.id}`}
              >
                <Checkbox 
                  checked={selectedAccessUsers.includes(user.id)}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleUserAccess(user.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                      : user.email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </p>
                  {user.firstName && user.lastName && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleAccessDialogCancel}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAccessDialogConfirm}
              disabled={selectedAccessUsers.length === 0 || updateFileAccessMutation.isPending}
              data-testid="button-confirm-access"
            >
              {editingFileAccess 
                ? t("stages.accessControl.saveChanges")
                : t("stages.accessControl.confirm")} ({selectedAccessUsers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
