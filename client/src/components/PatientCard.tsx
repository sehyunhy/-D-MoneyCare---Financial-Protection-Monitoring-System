import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Patient {
  id: number;
  name: string;
  age: number;
  profileImageUrl?: string;
  riskLevel: string;
  todayWithdrawal: number;
  weeklyComparison: string;
  lastTransaction: string;
}

interface PatientCardProps {
  patient: Patient;
}

export default function PatientCard({ patient }: PatientCardProps) {
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "고위험":
        return "bg-danger text-white";
      case "중위험":
        return "bg-warning text-white";
      case "저위험":
        return "bg-success text-white";
      default:
        return "bg-neutral-400 text-white";
    }
  };

  const getComparisonColor = (comparison: string) => {
    if (comparison.startsWith("+")) {
      return "text-danger";
    } else if (comparison.startsWith("-")) {
      return "text-success";
    }
    return "text-neutral-900";
  };

  const defaultProfileImages = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"
  ];

  const profileImage = patient.profileImageUrl || defaultProfileImages[patient.id % 3];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={profileImage}
              alt={`${patient.name} 프로필 사진`}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-neutral-900">{patient.name}</h3>
              <p className="text-sm text-neutral-600">{patient.age}세</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(patient.riskLevel)}`}>
            {patient.riskLevel}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">오늘 출금액</span>
            <span className="font-semibold text-neutral-900">₩{patient.todayWithdrawal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">이번 주 평균 대비</span>
            <span className={`font-semibold ${getComparisonColor(patient.weeklyComparison)}`}>
              {patient.weeklyComparison}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">마지막 거래</span>
            <span className="text-sm text-neutral-700">{patient.lastTransaction}</span>
          </div>
        </div>
        
        <Button className="w-full mt-4 bg-primary text-white hover:bg-blue-700">
          상세 보기
        </Button>
      </CardContent>
    </Card>
  );
}
