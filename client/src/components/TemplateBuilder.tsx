import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  CheckSquare,
  FileText,
  Upload,
  Users,
  GitBranch,
  Image,
  Minus,
  Type,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  X,
} from "lucide-react";
import type { 
  TemplateBlock, 
  BlockType, 
  BlockConfig,
  CustomField,
  ChecklistItemConfig,
} from "@shared/schema";

interface TemplateBuilderProps {
  blocks: TemplateBlock[];
  onChange: (blocks: TemplateBlock[]) => void;
  language?: string;
}

const BLOCK_TYPES: { type: BlockType; icon: React.ElementType; labelKey: string; color: string }[] = [
  { type: "comments", icon: MessageSquare, labelKey: "builder.blocks.comments", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
  { type: "checklist", icon: CheckSquare, labelKey: "builder.blocks.checklist", color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  { type: "customFields", icon: FileText, labelKey: "builder.blocks.customFields", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
  { type: "files", icon: Upload, labelKey: "builder.blocks.files", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  { type: "tasks", icon: Users, labelKey: "builder.blocks.tasks", color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" },
  { type: "substages", icon: GitBranch, labelKey: "builder.blocks.substages", color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
  { type: "gallery", icon: Image, labelKey: "builder.blocks.gallery", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
  { type: "divider", icon: Minus, labelKey: "builder.blocks.divider", color: "bg-gray-100 dark:bg-gray-800 text-gray-500" },
  { type: "header", icon: Type, labelKey: "builder.blocks.header", color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },
];

function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultConfig(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "comments":
      return { mentionsEnabled: true };
    case "checklist":
      return { items: [] };
    case "customFields":
      return { fields: [] };
    case "files":
      return { accept: [], maxFiles: 10, scope: "stage" };
    case "tasks":
      return { allowAssign: true, showAssignees: true };
    case "substages":
      return { items: [] };
    case "gallery":
      return { source: "stage_files", layout: "grid" };
    case "header":
      return { text: "", level: "h3" };
    case "divider":
      return { style: "solid" };
    default:
      return {};
  }
}

function BlockPalette({ onAddBlock }: { onAddBlock: (type: BlockType) => void }) {
  const { t } = useTranslation();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("builder.palette")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_TYPES.map((blockDef) => (
            <Button
              key={blockDef.type}
              variant="outline"
              size="sm"
              className="h-auto py-2 px-3 flex flex-col items-center gap-1 hover-elevate"
              onClick={() => onAddBlock(blockDef.type)}
              data-testid={`btn-add-block-${blockDef.type}`}
            >
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${blockDef.color}`}>
                <blockDef.icon className="h-4 w-4" />
              </div>
              <span className="text-xs text-center leading-tight">
                {t(blockDef.labelKey)}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface BlockEditorProps {
  block: TemplateBlock;
  onUpdate: (block: TemplateBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function BlockEditor({ block, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: BlockEditorProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const blockDef = BLOCK_TYPES.find((b) => b.type === block.type);

  const updateConfig = (updates: Record<string, unknown>) => {
    onUpdate({
      ...block,
      config: { ...block.config, ...updates },
    });
  };

  const renderBlockConfig = () => {
    switch (block.type) {
      case "checklist":
        return <ChecklistConfig block={block} onUpdate={onUpdate} />;
      case "customFields":
        return <CustomFieldsConfig block={block} onUpdate={onUpdate} />;
      case "substages":
        return <SubstagesConfig block={block} onUpdate={onUpdate} />;
      case "files":
        return <FilesConfig block={block} onUpdate={onUpdate} />;
      case "header":
        return <HeaderConfig block={block} onUpdate={onUpdate} />;
      case "comments":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("builder.config.mentionsEnabled")}</Label>
              <Switch
                checked={(block.config as { mentionsEnabled?: boolean }).mentionsEnabled ?? true}
                onCheckedChange={(checked) => updateConfig({ mentionsEnabled: checked })}
              />
            </div>
          </div>
        );
      case "tasks":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("builder.config.allowAssign")}</Label>
              <Switch
                checked={(block.config as { allowAssign?: boolean }).allowAssign ?? true}
                onCheckedChange={(checked) => updateConfig({ allowAssign: checked })}
              />
            </div>
          </div>
        );
      case "gallery":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">{t("builder.config.layout")}</Label>
              <Select
                value={(block.config as { layout?: string }).layout || "grid"}
                onValueChange={(value) => updateConfig({ layout: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">{t("builder.config.layoutGrid")}</SelectItem>
                  <SelectItem value="carousel">{t("builder.config.layoutCarousel")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "divider":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">{t("builder.config.dividerStyle")}</Label>
              <Select
                value={(block.config as { style?: string }).style || "solid"}
                onValueChange={(value) => updateConfig({ style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">{t("builder.config.styleSolid")}</SelectItem>
                  <SelectItem value="dashed">{t("builder.config.styleDashed")}</SelectItem>
                  <SelectItem value="dotted">{t("builder.config.styleDotted")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: blockDef?.color.includes("blue") ? "#3b82f6" : blockDef?.color.includes("green") ? "#22c55e" : blockDef?.color.includes("purple") ? "#a855f7" : blockDef?.color.includes("amber") ? "#f59e0b" : blockDef?.color.includes("cyan") ? "#06b6d4" : blockDef?.color.includes("rose") ? "#f43f5e" : blockDef?.color.includes("indigo") ? "#6366f1" : "#94a3b8" }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${blockDef?.color}`}>
            {blockDef && <blockDef.icon className="h-4 w-4" />}
          </div>
          
          <div className="flex-1">
            <span className="font-medium text-sm">{t(blockDef?.labelKey || "")}</span>
            {block.title && (
              <span className="text-xs text-muted-foreground ml-2">
                ({i18n.language === "ru" ? block.titleRu || block.title : i18n.language === "zh" ? block.titleZh || block.title : block.title})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} className="h-7 w-7">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} className="h-7 w-7">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <Separator />
          <div className="p-4 space-y-4 bg-muted/30">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">{t("builder.config.titleEn")}</Label>
                <Input
                  value={block.title || ""}
                  onChange={(e) => onUpdate({ ...block, title: e.target.value })}
                  placeholder={t(blockDef?.labelKey || "")}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("builder.config.titleRu")}</Label>
                <Input
                  value={block.titleRu || ""}
                  onChange={(e) => onUpdate({ ...block, titleRu: e.target.value })}
                  placeholder={t(blockDef?.labelKey || "")}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("builder.config.titleZh")}</Label>
                <Input
                  value={block.titleZh || ""}
                  onChange={(e) => onUpdate({ ...block, titleZh: e.target.value })}
                  placeholder={t(blockDef?.labelKey || "")}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${block.id}`}
                  checked={block.required ?? false}
                  onCheckedChange={(checked) => onUpdate({ ...block, required: checked })}
                />
                <Label htmlFor={`required-${block.id}`} className="text-sm">{t("builder.config.required")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`collapsed-${block.id}`}
                  checked={block.collapsed ?? false}
                  onCheckedChange={(checked) => onUpdate({ ...block, collapsed: checked })}
                />
                <Label htmlFor={`collapsed-${block.id}`} className="text-sm">{t("builder.config.collapsedByDefault")}</Label>
              </div>
            </div>

            {renderBlockConfig()}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ChecklistConfig({ block, onUpdate }: { block: TemplateBlock; onUpdate: (block: TemplateBlock) => void }) {
  const { t } = useTranslation();
  const config = block.config as { items?: ChecklistItemConfig[] };
  const items = config.items || [];
  const [newItem, setNewItem] = useState({ key: "", label: "", labelRu: "", labelZh: "" });

  const addItem = () => {
    if (!newItem.key || !newItem.label) return;
    const newItems = [...items, { ...newItem, required: false }];
    onUpdate({ ...block, config: { ...config, items: newItems } });
    setNewItem({ key: "", label: "", labelRu: "", labelZh: "" });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({ ...block, config: { ...config, items: newItems } });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t("builder.config.checklistItems")}</Label>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 p-2 rounded bg-background border">
            <Badge variant="outline" className="font-mono text-xs">{item.key}</Badge>
            <span className="flex-1 text-sm truncate">{item.label}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Input
          placeholder="key"
          value={newItem.key}
          onChange={(e) => setNewItem({ ...newItem, key: e.target.value.replace(/\s/g, "_") })}
          className="h-8 text-sm font-mono"
        />
        <Input
          placeholder="Label (EN)"
          value={newItem.label}
          onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Название (RU)"
          value={newItem.labelRu}
          onChange={(e) => setNewItem({ ...newItem, labelRu: e.target.value })}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={addItem} disabled={!newItem.key || !newItem.label} className="h-8">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CustomFieldsConfig({ block, onUpdate }: { block: TemplateBlock; onUpdate: (block: TemplateBlock) => void }) {
  const { t } = useTranslation();
  const config = block.config as { fields?: CustomField[] };
  const fields = config.fields || [];
  const [newField, setNewField] = useState({ key: "", label: "", labelRu: "", labelZh: "", type: "textarea" as "text" | "textarea" | "number" });

  const addField = () => {
    if (!newField.key || !newField.label) return;
    const newFields = [...fields, { ...newField, position: fields.length + 1 }];
    onUpdate({ ...block, config: { ...config, fields: newFields } });
    setNewField({ key: "", label: "", labelRu: "", labelZh: "", type: "textarea" });
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onUpdate({ ...block, config: { ...config, fields: newFields } });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t("builder.config.customFieldsList")}</Label>
      
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.key} className="flex items-center gap-2 p-2 rounded bg-background border">
            <Badge variant="outline" className="font-mono text-xs">{field.key}</Badge>
            <Badge variant="secondary" className="text-xs">{field.type}</Badge>
            <span className="flex-1 text-sm truncate">{field.label}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeField(index)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        <Input
          placeholder="key"
          value={newField.key}
          onChange={(e) => setNewField({ ...newField, key: e.target.value.replace(/\s/g, "_") })}
          className="h-8 text-sm font-mono"
        />
        <Input
          placeholder="Label (EN)"
          value={newField.label}
          onChange={(e) => setNewField({ ...newField, label: e.target.value })}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Название (RU)"
          value={newField.labelRu}
          onChange={(e) => setNewField({ ...newField, labelRu: e.target.value })}
          className="h-8 text-sm"
        />
        <Select value={newField.type} onValueChange={(v) => setNewField({ ...newField, type: v as "text" | "textarea" | "number" })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="number">Number</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addField} disabled={!newField.key || !newField.label} className="h-8">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SubstagesConfig({ block, onUpdate }: { block: TemplateBlock; onUpdate: (block: TemplateBlock) => void }) {
  const { t } = useTranslation();
  const config = block.config as { items?: { key: string; label: string; labelRu?: string; labelZh?: string }[] };
  const items = config.items || [];
  const [newItem, setNewItem] = useState({ key: "", label: "", labelRu: "", labelZh: "" });

  const addItem = () => {
    if (!newItem.key || !newItem.label) return;
    const newItems = [...items, { ...newItem }];
    onUpdate({ ...block, config: { ...config, items: newItems } });
    setNewItem({ key: "", label: "", labelRu: "", labelZh: "" });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({ ...block, config: { ...config, items: newItems } });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t("builder.config.substageItems")}</Label>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 p-2 rounded bg-background border">
            <Badge variant="outline" className="font-mono text-xs">{item.key}</Badge>
            <span className="flex-1 text-sm truncate">{item.label}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Input
          placeholder="key"
          value={newItem.key}
          onChange={(e) => setNewItem({ ...newItem, key: e.target.value.replace(/\s/g, "_") })}
          className="h-8 text-sm font-mono"
        />
        <Input
          placeholder="Label (EN)"
          value={newItem.label}
          onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Название (RU)"
          value={newItem.labelRu}
          onChange={(e) => setNewItem({ ...newItem, labelRu: e.target.value })}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={addItem} disabled={!newItem.key || !newItem.label} className="h-8">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function FilesConfig({ block, onUpdate }: { block: TemplateBlock; onUpdate: (block: TemplateBlock) => void }) {
  const { t } = useTranslation();
  const config = block.config as { accept?: string[]; maxFiles?: number; scope?: string };

  const updateFilesConfig = (updates: Partial<typeof config>) => {
    onUpdate({ ...block, config: { ...config, ...updates } as BlockConfig });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">{t("builder.config.maxFiles")}</Label>
          <Input
            type="number"
            value={config.maxFiles || 10}
            onChange={(e) => updateFilesConfig({ maxFiles: parseInt(e.target.value) || 10 })}
            className="h-8"
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t("builder.config.scope")}</Label>
          <Select
            value={config.scope || "stage"}
            onValueChange={(value) => updateFilesConfig({ scope: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stage">{t("builder.config.scopeStage")}</SelectItem>
              <SelectItem value="checklist">{t("builder.config.scopeChecklist")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function HeaderConfig({ block, onUpdate }: { block: TemplateBlock; onUpdate: (block: TemplateBlock) => void }) {
  const { t } = useTranslation();
  const config = block.config as { text?: string; textRu?: string; textZh?: string; level?: string };

  const updateHeaderConfig = (updates: Partial<typeof config>) => {
    onUpdate({ ...block, config: { ...config, ...updates } as BlockConfig });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">{t("builder.config.headerTextEn")}</Label>
          <Input
            value={config.text || ""}
            onChange={(e) => updateHeaderConfig({ text: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("builder.config.headerTextRu")}</Label>
          <Input
            value={config.textRu || ""}
            onChange={(e) => updateHeaderConfig({ textRu: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("builder.config.headerTextZh")}</Label>
          <Input
            value={config.textZh || ""}
            onChange={(e) => updateHeaderConfig({ textZh: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">{t("builder.config.headerLevel")}</Label>
        <Select
          value={config.level || "h3"}
          onValueChange={(value) => updateHeaderConfig({ level: value })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h2">H2</SelectItem>
            <SelectItem value="h3">H3</SelectItem>
            <SelectItem value="h4">H4</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BlockPreview({ blocks }: { blocks: TemplateBlock[] }) {
  const { t, i18n } = useTranslation();

  const getBlockTitle = (block: TemplateBlock, blockDef: typeof BLOCK_TYPES[0] | undefined) => {
    const customTitle = i18n.language === "ru" ? block.titleRu : i18n.language === "zh" ? block.titleZh : block.title;
    return customTitle || (blockDef ? t(blockDef.labelKey) : block.type);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {t("builder.preview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="border rounded-lg p-4 bg-background space-y-3 min-h-[200px]">
          {blocks.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {t("builder.emptyPreview")}
            </div>
          ) : (
            blocks.map((block) => {
              const blockDef = BLOCK_TYPES.find((b) => b.type === block.type);
              return (
                <div key={block.id} className="border rounded-md p-3">
                  {block.type === "divider" ? (
                    <Separator />
                  ) : block.type === "header" ? (
                    <div className="font-semibold text-muted-foreground">
                      {(block.config as { text?: string; textRu?: string }).textRu || (block.config as { text?: string }).text || t("builder.blocks.header")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {blockDef && (
                        <div className={`h-6 w-6 rounded flex items-center justify-center ${blockDef.color}`}>
                          <blockDef.icon className="h-3 w-3" />
                        </div>
                      )}
                      <span className="text-sm font-medium">{getBlockTitle(block, blockDef)}</span>
                      {block.required && <Badge variant="destructive" className="text-[10px] px-1 py-0">*</Badge>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplateBuilder({ blocks, onChange }: TemplateBuilderProps) {
  const { t } = useTranslation();

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: TemplateBlock = {
      id: generateBlockId(),
      type,
      config: getDefaultConfig(type),
    };
    onChange([...blocks, newBlock]);
  }, [blocks, onChange]);

  const updateBlock = useCallback((index: number, updatedBlock: TemplateBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  }, [blocks, onChange]);

  const moveBlock = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  }, [blocks, onChange]);

  return (
    <div className="grid grid-cols-12 gap-4 h-[600px]">
      <div className="col-span-3">
        <BlockPalette onAddBlock={addBlock} />
      </div>
      
      <div className="col-span-6">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("builder.canvas")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-3">
              {blocks.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <p className="text-sm">{t("builder.emptyCanvas")}</p>
                  <p className="text-xs mt-1">{t("builder.emptyCanvasHint")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block, index) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onUpdate={(updated) => updateBlock(index, updated)}
                      onDelete={() => deleteBlock(index)}
                      onMoveUp={() => moveBlock(index, "up")}
                      onMoveDown={() => moveBlock(index, "down")}
                      isFirst={index === 0}
                      isLast={index === blocks.length - 1}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <div className="col-span-3">
        <BlockPreview blocks={blocks} />
      </div>
    </div>
  );
}
