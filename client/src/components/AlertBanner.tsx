import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert {
  id: number;
  title: string;
  message: string;
  severity: string;
  type: string;
}

interface AlertBannerProps {
  alert: Alert;
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="mb-6">
      <div className="bg-danger border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="text-white mr-3 h-5 w-5" />
          <div className="flex-1">
            <h3 className="text-white font-medium">{alert.title}</h3>
            <p className="text-red-100 text-sm">{alert.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-red-100"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
