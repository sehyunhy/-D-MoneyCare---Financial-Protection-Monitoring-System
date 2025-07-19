import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Bell } from "lucide-react";
import PatientCard from "@/components/PatientCard";
import SpendingChart from "@/components/SpendingChart";
import RealTimeActivity from "@/components/RealTimeActivity";
import RiskScoreBreakdown from "@/components/RiskScoreBreakdown";
import AlertBanner from "@/components/AlertBanner";
import NotificationModal from "@/components/NotificationModal";

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeframe, setTimeframe] = useState("7");

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/dashboard/analytics"],
  });

  const urgentAlerts = alerts.filter((alert: any) => alert.severity === "high");
  const hasUnreadAlerts = alerts.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary p-2 rounded-lg">
                <Shield className="text-white text-xl w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">D-MoneyCare</h1>
                <p className="text-sm text-neutral-600">금융 보호 모니터링</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative bg-neutral-100 hover:bg-neutral-200"
                  onClick={() => setShowNotifications(true)}
                >
                  <Bell className="h-5 w-5 text-neutral-700" />
                  {hasUnreadAlerts && (
                    <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                <img 
                  src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                  alt="사용자 프로필 이미지" 
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">김보호자</p>
                  <p className="text-xs text-neutral-600">보호자</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Banner */}
        {urgentAlerts.length > 0 && (
          <AlertBanner alert={urgentAlerts[0]} />
        )}

        {/* Patient Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {patients.map((patient: any) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SpendingChart 
            timeframe={timeframe} 
            onTimeframeChange={setTimeframe}
            analytics={analytics}
          />
          <RealTimeActivity />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <RiskScoreBreakdown patientId={patients[0]?.id} />
          
          {/* Monthly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-900">월별 비교 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-neutral-500">
                월별 비교 차트 영역
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">이번 달 지출</span>
                  <span className="font-semibold text-neutral-900">₩3,450,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">지난 달 대비</span>
                  <span className="font-semibold text-danger">+156%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">평균 대비</span>
                  <span className="font-semibold text-warning">+89%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-900">알림 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">즉시 알림</p>
                    <p className="text-sm text-neutral-600">고위험 거래 시 즉시 전송</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">SMS 알림</p>
                    <p className="text-sm text-neutral-600">문자 메시지로 알림</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">일일 요약</p>
                    <p className="text-sm text-neutral-600">매일 저녁 요약 리포트</p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">위험 감지 임계값</label>
                <Select defaultValue="100000">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30000">매우 민감 (30,000원 이상)</SelectItem>
                    <SelectItem value="100000">보통 (100,000원 이상)</SelectItem>
                    <SelectItem value="300000">낮음 (300,000원 이상)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="w-full mt-4 bg-primary text-white hover:bg-blue-700">
                설정 저장
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        alerts={alerts}
      />
    </div>
  );
}
