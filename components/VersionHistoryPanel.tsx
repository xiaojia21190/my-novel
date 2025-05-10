"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RefreshCw, RotateCcw, Check, AlertTriangle, Clock, FileText, Calendar, User, Tag, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

// 版本历史项目类型
interface VersionItem {
  id: string;
  versionId: string;
  description: string;
  createdAt: string;
  createdBy: string;
  changeType: string;
  size: number;
}

// 组件属性类型
interface VersionHistoryPanelProps {
  storyId: string;
  onRestoreVersion?: (content: string) => void;
}

export function VersionHistoryPanel({ storyId, onRestoreVersion }: VersionHistoryPanelProps) {
  // 状态管理
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [versionContent, setVersionContent] = useState<string | null>(null);

  // 获取版本历史
  const fetchVersionHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/story/${storyId}/version-history`);
      if (!response.ok) {
        throw new Error("获取版本历史失败");
      }
      const data = await response.json();
      setVersions(data.data || []);
    } catch (error) {
      console.error("获取版本历史错误:", error);
      toast.error("获取版本历史失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 获取特定版本内容
  const fetchVersionContent = async (versionId: string) => {
    try {
      const response = await fetch(`/api/user/story/${storyId}/version-history/${versionId}`);
      if (!response.ok) {
        throw new Error("获取版本内容失败");
      }
      const data = await response.json();
      return data.data.content;
    } catch (error) {
      console.error("获取版本内容错误:", error);
      toast.error("获取版本内容失败");
      return null;
    }
  };

  // 恢复到特定版本
  const restoreVersion = async () => {
    if (!selectedVersion) return;

    try {
      const response = await fetch(`/api/user/story/${storyId}/version-history/${selectedVersion.versionId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("恢复版本失败");
      }

      const result = await response.json();
      toast.success("已成功恢复到所选版本");

      // 刷新版本历史
      fetchVersionHistory();

      // 如果提供了回调，将内容传递给父组件
      if (onRestoreVersion && versionContent) {
        onRestoreVersion(versionContent);
      }

      // 关闭对话框
      setShowRestoreDialog(false);
    } catch (error) {
      console.error("恢复版本错误:", error);
      toast.error("恢复版本失败");
    }
  };

  // 删除特定版本
  const deleteVersion = async () => {
    if (!selectedVersion) return;

    try {
      const response = await fetch(`/api/user/story/${storyId}/version-history/${selectedVersion.versionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除版本失败");
      }

      toast.success("版本已成功删除");

      // 刷新版本历史
      fetchVersionHistory();

      // 关闭对话框
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("删除版本错误:", error);
      toast.error("删除版本失败");
    }
  };

  // 处理版本选择
  const handleVersionSelect = async (version: VersionItem) => {
    setSelectedVersion(version);
    const content = await fetchVersionContent(version.versionId);
    setVersionContent(content);
    setShowRestoreDialog(true);
  };

  // 处理删除按钮点击
  const handleDeleteClick = (version: VersionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVersion(version);
    setShowDeleteDialog(true);
  };

  // 初始加载
  useEffect(() => {
    if (storyId) {
      fetchVersionHistory();
    }
  }, [storyId]);

  // 获取变更类型标签
  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case "manual":
        return <Badge variant="default">手动保存</Badge>;
      case "auto":
        return <Badge variant="secondary">自动保存</Badge>;
      case "restore":
        return <Badge variant="outline">恢复操作</Badge>;
      case "auto-backup":
        return <Badge variant="outline">自动备份</Badge>;
      default:
        return <Badge>{changeType}</Badge>;
    }
  };

  // 格式化大小显示
  const formatSize = (size: number) => {
    if (size < 1) return "小于1KB";
    if (size < 1024) return `${size}KB`;
    return `${(size / 1024).toFixed(2)}MB`;
  };

  // 格式化时间显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd HH:mm:ss");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>版本历史</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchVersionHistory} disabled={isLoading}>
            {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            刷新
          </Button>
        </div>
        <CardDescription>查看和恢复历史版本</CardDescription>
      </CardHeader>

      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{isLoading ? "加载中..." : "暂无版本历史记录"}</div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            {versions.map((version, index) => (
              <div key={version.id} className="mb-4">
                <div className="border rounded-md p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleVersionSelect(version)}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="font-medium">{version.description || "版本更新"}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(version.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getChangeTypeBadge(version.changeType)}
                      <Badge variant="outline" className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {formatSize(version.size)}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(version, e)} className="h-8 w-8 text-gray-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {version.createdBy}
                  </div>
                </div>
                {index < versions.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </ScrollArea>
        )}
      </CardContent>

      {/* 恢复版本对话框 */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复到历史版本</DialogTitle>
            <DialogDescription>确定要恢复到此版本吗？当前内容将被替换。</DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="py-4">
              <div className="flex items-center mb-2">
                <Tag className="w-4 h-4 mr-2" />
                <span className="font-medium">{selectedVersion.description || "版本更新"}</span>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(selectedVersion.createdAt)}</span>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <User className="w-4 h-4 mr-2" />
                <span>{selectedVersion.createdBy}</span>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>注意</AlertTitle>
                <AlertDescription>恢复操作会自动创建当前版本的备份，但建议在恢复前手动创建备份。</AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              取消
            </Button>
            <Button onClick={restoreVersion}>
              <RotateCcw className="w-4 h-4 mr-2" />
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除版本对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除版本</DialogTitle>
            <DialogDescription>确定要删除此版本吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="py-4">
              <div className="flex items-center mb-2">
                <Tag className="w-4 h-4 mr-2" />
                <span className="font-medium">{selectedVersion.description || "版本更新"}</span>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(selectedVersion.createdAt)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={deleteVersion}>
              <Trash2 className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
