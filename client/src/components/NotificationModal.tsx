import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Alert {
  id: number;
  title: string;
  message: string;
  severity: string;
  type: string;
  createdAt: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
}

export default function NotificationModal({ isOpen, onClose, alerts }: NotificationModalProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-danger bg-red-50";
      case "medium":
        return "border-warning bg-yellow-50";
      case "low":
        return "border-primary bg-blue-50";
      default:
        return "border-neutral-300 bg-neutral-50";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes === 0) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-neutral-900">최근 알림</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              새로운 알림이 없습니다
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`border-l-4 p-3 rounded ${getSeverityColor(alert.severity)}`}>
                <p className="text-sm font-medium text-neutral-900">{alert.title}</p>
                <p className="text-xs text-neutral-600 mt-1">{alert.message}</p>
                <p className="text-xs text-neutral-500 mt-2">{getTimeAgo(alert.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
