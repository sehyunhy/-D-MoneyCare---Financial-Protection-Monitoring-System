import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function RealTimeActivity() {
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activity"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "고위험":
        return "border-danger";
      case "중위험":
        return "border-warning";
      case "정상":
        return "border-success";
      default:
        return "border-neutral-300";
    }
  };

  const getRiskBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "고위험":
        return "bg-danger";
      case "중위험":
        return "bg-warning";
      case "정상":
        return "bg-success";
      default:
        return "bg-neutral-400";
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-900">실시간 활동</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm text-success">실시간 모니터링</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              현재 활동이 없습니다
            </div>
          ) : (
            activities.map((activity: any) => (
              <div key={activity.id} className={`border-l-4 ${getRiskColor(activity.riskLevel)} pl-4 pb-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-neutral-600">{activity.location}</p>
                    <p className="text-xs text-neutral-500">{activity.timeAgo}</p>
                    {activity.patientName && (
                      <p className="text-xs text-neutral-600 mt-1">환자: {activity.patientName}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`${getRiskBgColor(activity.riskLevel)} text-white px-2 py-1 rounded text-xs`}>
                      {activity.riskLevel}
                    </span>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
